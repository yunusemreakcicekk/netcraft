import React, { useState, useRef, useEffect } from 'react';
import type { Annotation, AnnotationType, AnnotationStyle } from '../types/annotation';
import { getTransformedCoordinates } from '../utils/coordinateMapper';
import { isPolylineInCircle, isRectInCircle, isPointInCircle, splitStrokeByEraser, densifyPolyline, rectToPolyline, circleToPolyline } from '../utils/geometry';

interface AnnotationLayerProps {
    annotations: Annotation[];
    onUpdateAnnotations: (annotations: Annotation[]) => void;
    currentTool: AnnotationType;
    currentStyle: AnnotationStyle;
    isActive: boolean;
    zIndex?: number;
    canvasContentRef?: HTMLDivElement | null;
    viewportElement?: HTMLElement | null;
    applyTransform?: boolean;
    onDeleteAnnotation?: (id: string) => void;
    contentTransform?: string;
    viewState?: { zoom: number; offset: { x: number; y: number } };
    layerId?: string;
}

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
    annotations,
    onUpdateAnnotations,
    currentTool,
    currentStyle,
    isActive,
    zIndex = 50,
    viewState = { zoom: 1, offset: { x: 0, y: 0 } },
    viewportElement,
    applyTransform = true,
    onDeleteAnnotation,
    layerId = 'default'
}) => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Text Input State
    const [textInput, setTextInput] = useState<{ x: number; y: number; id: string; width?: number; height?: number } | null>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textInput && textInputRef.current) {
            // Focus is handled by autoFocus prop on textarea now
        }
    }, [textInput]);

    // Generate Transforms
    const cssTransform = `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.zoom})`;


    const getMousePos = (e: React.MouseEvent) => {
        // Use the explicit VIEWPORT element if provided, otherwise fallback to parent
        const targetElement = viewportElement || svgRef.current?.parentElement;
        if (!targetElement) return { x: 0, y: 0 };
        const rect = targetElement.getBoundingClientRect();
        const result = getTransformedCoordinates(
            e,
            viewState.zoom,
            viewState.offset.x,
            viewState.offset.y,
            rect
        );

        // DEBUG
        console.log('🔍 AnnotationLayer getMousePos:', {
            'clientX/Y': `${e.clientX}, ${e.clientY}`,
            'rect.left/top': `${rect.left}, ${rect.top}`,
            'offset': `${viewState.offset.x}, ${viewState.offset.y}`,
            'zoom': viewState.zoom,
            'calculated world': `${result.x}, ${result.y}`
        });

        return result;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isActive || textInput) return;

        // Eraser Mode: Now acts like a brush (drawing 'eraser' paths)
        // if (currentTool === 'eraser') return; // REMOVED

        const { x, y } = getMousePos(e);
        const id = Date.now().toString();

        setIsDrawing(true);

        if (currentTool === 'text') {
            // Start a text box creation (uses rectangle logic temporarily)
            const newAnnotation: Annotation = {
                id,
                type: 'text', // It's 'text' type but we track bounds like a rect
                x,
                y,
                style: { ...currentStyle },
                width: 0,
                height: 0,
                text: '' // Empty initially
            };
            setCurrentAnnotation(newAnnotation);
            return;
        }

        // Eraser: Don't create new annotation, just start tracking
        if (currentTool === 'eraser') {
            eraseAt(x, y); // Trigger erase immediately on click
            return;
        }

        const newAnnotation: Annotation = {
            id,
            type: currentTool,
            x,
            y,
            style: { ...currentStyle },
            points: (currentTool === 'free' || currentTool === 'line') ? [x, y] : undefined,
            width: 0,
            height: 0
        };
        setCurrentAnnotation(newAnnotation);
    };

    const eraseAt = (x: number, y: number) => {
        const eraserSize = currentStyle.strokeWidth || 20;
        const radius = eraserSize / 2;
        let hasChanges = false;
        const now = Date.now();

        const newAnnotations = annotations.flatMap((ann, index) => {
            const { type, x: ax, y: ay, width, height, points } = ann;

            // Partial Erase for Freehand/Lines
            if (type === 'free' || type === 'line' || type === 'eraser') {
                if (!points) return [ann];

                // 1. Densify points for better hit detection on long segments
                const densePoints = densifyPolyline(points, 5); // 5px density
                const segments = splitStrokeByEraser(densePoints, x, y, radius);

                if (segments.length === 1 && segments[0].length === densePoints.length) {
                    // Fast check: collision might happen, but if no points removed, we skip
                    if (!isPolylineInCircle(points, x, y, radius)) return [ann];
                    if (segments[0].length === densePoints.length) return [ann];
                }

                hasChanges = true;

                return segments.map((segPoints, i) => ({
                    ...ann,
                    id: `${ann.id}_split_${now}_${i}`,
                    type: 'free', // Convert lines/eraser to free
                    points: segPoints,
                    x: segPoints[0],
                    y: segPoints[1]
                }));
            }

            // Partial Erase for Shapes (Convert to Path)
            else if (type === 'rectangle' || type === 'circle') {
                // Check Intersection
                const rX = width && width < 0 ? ax + width : ax;
                const rY = height && height < 0 ? ay + height : ay;
                const rW = Math.abs(width || 0);
                const rH = Math.abs(height || 0);

                if (isRectInCircle({ x: rX, y: rY, width: rW, height: rH }, x, y, radius)) {
                    // HIT! Convert to polyline
                    let polyPoints: number[];
                    if (type === 'rectangle') {
                        polyPoints = rectToPolyline(rX, rY, rW, rH, 5);
                    } else {
                        polyPoints = circleToPolyline(rX, rY, rW, rH, 5);
                    }

                    // Now erase from this new path
                    const segments = splitStrokeByEraser(polyPoints, x, y, radius);

                    if (segments.length === 0) return []; // Fully erased

                    hasChanges = true;
                    return segments.map((segPoints, i) => ({
                        ...ann,
                        id: `${ann.id}_shape_${now}_${i}`,
                        type: 'free', // BECOMES A DRAWING
                        points: segPoints,
                        x: segPoints[0],
                        y: segPoints[1],
                        width: 0,
                        height: 0
                    }));
                }
            }

            // Full Delete for Text
            else if (type === 'text') {
                const rX = width && width < 0 ? ax + width : ax;
                const rY = height && height < 0 ? ay + height : ay;
                const rW = Math.abs(width || 0);
                const rH = Math.abs(height || 0);
                if (isRectInCircle({ x: rX, y: rY, width: rW, height: rH }, x, y, radius)) {
                    hasChanges = true;
                    return [];
                }
            }

            return [ann]; // Keep
        });

        if (hasChanges) {
            onUpdateAnnotations(newAnnotations);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing) return;

        const { x, y } = getMousePos(e);

        if (currentTool === 'eraser') {
            eraseAt(x, y);
            return;
        }

        if (!currentAnnotation) return;

        if (currentTool === 'free') {
            setCurrentAnnotation(prev => ({
                ...prev!,
                points: [...(prev!.points || []), x, y]
            }));
        } else if (currentTool === 'line') {
            setCurrentAnnotation(prev => ({
                ...prev!,
                points: [prev!.points![0], prev!.points![1], x, y]
            }));
        } else if (currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'text') {
            setCurrentAnnotation(prev => ({
                ...prev!,
                width: x - prev!.x,
                height: y - prev!.y
            }));
        }
    };

    const handleMouseUp = () => {
        if (isDrawing && currentAnnotation) {
            // Filter out accidental clicks (tiny shapes)
            // For TEXT: tiny shape = single click = default box size

            if (currentTool === 'text') {
                const width = Math.abs(currentAnnotation.width || 0);
                const height = Math.abs(currentAnnotation.height || 0);

                // If it was just a click (or tiny drag), use default size
                const finalWidth = width < 20 ? 150 : width;
                const finalHeight = height < 20 ? 40 : height;

                // Normalize x/y for negative width/height
                const finalX = currentAnnotation.width && currentAnnotation.width < 0 ? currentAnnotation.x + currentAnnotation.width : currentAnnotation.x;
                const finalY = currentAnnotation.height && currentAnnotation.height < 0 ? currentAnnotation.y + currentAnnotation.height : currentAnnotation.y;

                setTextInput({
                    x: finalX,
                    y: finalY,
                    id: currentAnnotation.id,
                    width: finalWidth,
                    height: finalHeight
                });
                setCurrentAnnotation(null);
                setIsDrawing(false);
                return;
            }

            const isValid =
                ((currentAnnotation.type === 'free' || currentAnnotation.type === 'eraser') && (currentAnnotation.points?.length || 0) > 4) ||
                (currentAnnotation.type === 'line' && (currentAnnotation.points?.length || 0) >= 4) ||
                ((currentAnnotation.type === 'rectangle' || currentAnnotation.type === 'circle') &&
                    Math.abs(currentAnnotation.width || 0) > 5 && Math.abs(currentAnnotation.height || 0) > 5);

            if (isValid) {
                onUpdateAnnotations([...annotations, currentAnnotation]);
            }
            setCurrentAnnotation(null);
            setIsDrawing(false);
        }
    };

    const handleTextSubmit = (e: React.FocusEvent) => {
        if (!textInput || !isActive) return; // Guard
        const textArea = e.target as HTMLTextAreaElement;
        const text = textArea.value.trim();

        if (text) {
            const newAnnotation: Annotation = {
                id: textInput.id,
                type: 'text',
                x: textInput.x,
                y: textInput.y,
                width: textInput.width,
                height: textInput.height,
                text: text,
                style: { ...currentStyle }
            };
            onUpdateAnnotations([...annotations, newAnnotation]);
        }
        setTextInput(null);
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: isActive ? 'auto' : 'none',
            zIndex: zIndex
        }}>
            <svg
                ref={svgRef}
                style={{ width: '100%', height: '100%', cursor: isActive ? (currentTool === 'eraser' ? 'none' : 'crosshair') : 'default', overflow: 'visible' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <g style={applyTransform ? { transform: cssTransform, transformOrigin: '0 0' } : {}}>
                    {/* Render Annotations directly - No Masking */}
                    {annotations.map(ann => (
                        <AnnotationItem
                            key={ann.id}
                            annotation={ann}
                            isEraserActive={currentTool === 'eraser'}
                            onDelete={() => onDeleteAnnotation?.(ann.id)}
                        />
                    ))}

                    {/* Render Current Drawing */}
                    {currentAnnotation && (
                        <AnnotationItem annotation={currentAnnotation} isPreview />
                    )}
                </g>
            </svg >

            {/* Custom Eraser Cursor */}
            {
                isActive && currentTool === 'eraser' && (
                    <EraserCursorWrapper
                        size={currentStyle.strokeWidth}
                        isDrawing={isDrawing}
                    />
                )
            }


            {/* Text Input Overlay - Needs same transform to match world coordinates */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                transform: cssTransform,
                transformOrigin: '0 0'
            }}>
                {textInput && (
                    <textarea
                        autoFocus
                        style={{
                            position: 'absolute',
                            left: textInput.x,
                            top: textInput.y,
                            width: textInput.width ? `${textInput.width}px` : '150px',
                            height: textInput.height ? `${textInput.height}px` : 'auto',
                            minHeight: '40px',
                            fontSize: `${currentStyle.fontSize || 16}px`,
                            color: currentStyle.strokeColor,
                            border: '1px dashed #007bff',
                            background: 'rgba(255,255,255,0.8)',
                            padding: '4px',
                            pointerEvents: 'auto', // Re-enable pointer events since parent has none
                            outline: 'none',
                            resize: 'both',
                            fontFamily: 'sans-serif',
                            zIndex: 1000
                        }}
                        onBlur={handleTextSubmit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                e.currentTarget.blur(); // Trigger submit
                            }
                            if (e.key === 'Escape') setTextInput(null);
                        }}
                    />
                )}
            </div>
        </div >
    );
};

const AnnotationItem: React.FC<{
    annotation: Annotation;
    isPreview?: boolean;
    isEraserActive?: boolean;
    onDelete?: () => void;
}> = ({ annotation, isPreview, isEraserActive, onDelete }) => {
    const { type, x, y, width, height, points, style, text } = annotation;
    const { strokeColor, fillColor, strokeWidth, fontSize } = style;

    const isEraserPath = annotation.type === 'eraser';

    // Common SVG Props
    const commonProps = {
        stroke: isEraserPath ? 'black' : strokeColor, // Eraser paths are black in the mask
        strokeWidth: strokeWidth,
        fill: isEraserPath ? 'none' : (fillColor === 'transparent' ? 'none' : fillColor),
        opacity: isPreview ? 0.6 : 1,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        // When eraser is active, we no longer need the 'all' pointer events hack since we are masking
        // But keeping 'none' for content under mask is fine?
        // Actually, if we want to interact with them (e.g. edit text later), we need pointer events.
        // But for "eraser tool", we are drawing.
        pointerEvents: isEraserActive ? 'none' as const : (isEraserPath ? 'none' as const : 'auto' as const),
        // Eraser paths should not capture events in the main view (they are in mask usually, but if rendered they shouldn't block)
        // Wait, 'isEraserActive' prop is passed from parent.
        cursor: isEraserActive ? 'none' : undefined, // Hide default cursor, we use custom one
        onClick: undefined, // Removed the click-to-delete
    };

    switch (type) {
        case 'free':
        case 'line':
            if (!points || points.length < 2) return null;
            // Convert [x1, y1, x2, y2] to "x1,y1 x2,y2 ..."
            const pointsStr = points.reduce((acc, val, i) => {
                return i % 2 === 0 ? `${acc} ${val}` : `${acc},${val}`;
            }, '').trim();
            return <polyline points={pointsStr} {...commonProps} fill="none" />;

        case 'rectangle':
            // Handle negative width/height while dragging
            const rX = width && width < 0 ? x + width : x;
            const rY = height && height < 0 ? y + height : y;
            const rW = Math.abs(width || 0);
            const rH = Math.abs(height || 0);
            return <rect x={rX} y={rY} width={rW} height={rH} {...commonProps} />;

        case 'circle':
            const cX = width && width < 0 ? x + width : x;
            const cY = height && height < 0 ? y + height : y;
            const cW = Math.abs(width || 0);
            const cH = Math.abs(height || 0);
            return <ellipse cx={cX + cW / 2} cy={cY + cH / 2} rx={cW / 2} ry={cH / 2} {...commonProps} />;

        case 'text':
            return (
                <text
                    x={x}
                    y={y}
                    fill={strokeColor}
                    fontSize={fontSize || 16}
                    dominantBaseline="hanging"
                    style={{
                        userSelect: 'none',
                        pointerEvents: isEraserActive ? 'fill' : 'none',
                        cursor: isEraserActive ? 'pointer' : undefined
                    }}
                    onClick={isEraserActive ? onDelete : undefined}
                >
                    {text}
                </text>
            );

        case 'eraser':
            if (!points || points.length < 2) return null;
            const pointsStrE = points.reduce((acc, val, i) => {
                return i % 2 === 0 ? `${acc} ${val}` : `${acc},${val}`;
            }, '').trim();
            return <polyline points={pointsStrE} {...commonProps} stroke="black" fill="none" />;

        default:
            return null;
    }
};

const EraserCursor: React.FC<{ x: number; y: number; size: number }> = ({ x, y, size }) => (
    <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        transform: `translate(${x - size / 2}px, ${y - size / 2}px)`
    }}>
        <div style={{
            width: size,
            height: size,
            borderRadius: '50%',
            border: '1px solid #000',
            background: 'rgba(255, 255, 255, 0.5)',
            boxShadow: '0 0 2px rgba(0,0,0,0.5)'
        }} />
    </div>
);

const EraserCursorWrapper: React.FC<{ size: number; isDrawing: boolean }> = ({ size, isDrawing }) => {
    const [pos, setPos] = useState({ x: -100, y: -100 });

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            setPos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, []);

    // Adjust size visually (maybe make it slightly larger than stroke width for visibility)
    // Stroke width is usually diameter, so size=strokeWidth is correct.
    return <EraserCursor x={pos.x} y={pos.y} size={size} />;
};

