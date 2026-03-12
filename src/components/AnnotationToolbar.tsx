import React from 'react';
import type { AnnotationType, AnnotationStyle } from '../types/annotation';

interface AnnotationToolbarProps {
    currentTool: AnnotationType;
    setTool: (tool: AnnotationType) => void;
    currentStyle: AnnotationStyle;
    setStyle: (style: AnnotationStyle) => void;
    onClear: () => void;
    onClose: () => void;
}

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
    currentTool,
    setTool,
    currentStyle,
    setStyle,
    onClear,
    onClose
}) => {
    // State for Draggable
    const [position, setPosition] = React.useState({ x: 20, y: 80 });
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
    const toolbarRef = React.useRef<HTMLDivElement>(null);

    // State for Minimize
    const [isMinimized, setIsMinimized] = React.useState(false);

    const tools: { type: AnnotationType; label: string; icon: string }[] = [
        { type: 'free', label: 'Pen', icon: '🖊️' },
        { type: 'line', label: 'Line', icon: '📏' },
        { type: 'rectangle', label: 'Rect', icon: '⬜' },
        { type: 'circle', label: 'Circle', icon: '⭕' },
        { type: 'text', label: 'Text', icon: 'T' },
        { type: 'eraser', label: 'Eraser', icon: '🧽' },
    ];

    const colors = ['#000000', '#dc3545', '#28a745', '#007bff', '#ffc107', '#6f42c1'];
    // widths removed
    const fontSizes = [12, 16, 20, 24, 32];

    // ... (existing code handles usage of widths by literal [2,4..] or I need to check usage)
    // Wait, looking at lines 218-230, it uses `value={currentStyle.strokeWidth}` and `onChange`.
    // It uses a range input with min/max/step. It does NOT use the `widths` array.
    // So I can safely remove `widths`.

    // ... at the bottom of the file
    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: '0.9em',
        color: '#666',
        marginBottom: '5px',
        fontWeight: 'bold'
    };

    const miniButtonStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        fontSize: '1.2em',
        cursor: 'pointer',
        color: '#666',
        padding: '0 4px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (toolbarRef.current) {
            const rect = toolbarRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
            setIsDragging(true);
        }
    };

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                // Determine new position
                let newX = e.clientX - dragOffset.x;
                let newY = e.clientY - dragOffset.y;

                // Simple bounds checking (keep mostly on screen)
                newX = Math.max(0, Math.min(newX, window.innerWidth - 100)); // Allow partial offscreen
                newY = Math.max(0, Math.min(newY, window.innerHeight - 50));

                setPosition({ x: newX, y: newY });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);


    return (
        <div
            ref={toolbarRef}
            style={{
                position: 'fixed',
                top: `${position.y}px`,
                left: `${position.x}px`,
                background: 'white',
                padding: isMinimized ? '10px' : '15px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: isMinimized ? '0' : '15px',
                width: isMinimized ? 'auto' : '260px',
                transition: isDragging ? 'none' : 'width 0.2s, height 0.2s',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}
        >
            <div
                onMouseDown={handleMouseDown}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: isMinimized ? 'none' : '1px solid #eee',
                    paddingBottom: isMinimized ? '0' : '10px',
                    cursor: 'grab'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h4 style={{ margin: 0, userSelect: 'none' }}>🎨 {isMinimized ? '' : 'Tools'}</h4>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        style={miniButtonStyle}
                        title={isMinimized ? "Expand" : "Minimize"}
                    >
                        {isMinimized ? '➕' : '➖'}
                    </button>
                    {!isMinimized && <button onClick={onClose} style={miniButtonStyle} title="Close">✕</button>}
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Tools Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>



                        {tools.map(tool => (
                            <button
                                key={tool.type}
                                onClick={() => setTool(tool.type)}
                                style={{
                                    ...toolButtonStyle,
                                    background: currentTool === tool.type ? '#e7f1ff' : '#f8f9fa',
                                    borderColor: currentTool === tool.type ? '#007bff' : '#ddd',
                                    color: currentTool === tool.type ? '#007bff' : '#333'
                                }}
                            >
                                <span style={{ fontSize: '1.2em' }}>{tool.icon}</span>
                                <span style={{ fontSize: '0.8em', marginTop: '4px' }}>{tool.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Style Controls */}
                    <div>
                        <label style={labelStyle}>Stroke Color</label>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {colors.map(c => (
                                <div
                                    key={c}
                                    onClick={() => setStyle({ ...currentStyle, strokeColor: c })}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        background: c,
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        border: currentStyle.strokeColor === c ? '2px solid #333' : '1px solid #ddd',
                                        boxShadow: currentStyle.strokeColor === c ? '0 0 0 2px white, 0 0 0 3px #333' : 'none'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {(currentTool === 'rectangle' || currentTool === 'circle') && (
                        <div>
                            <label style={labelStyle}>Fill Color</label>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                <div
                                    onClick={() => setStyle({ ...currentStyle, fillColor: 'transparent' })}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        background: 'white', // Placeholder for transparent pattern
                                        backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                                        backgroundSize: '10px 10px',
                                        backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        border: currentStyle.fillColor === 'transparent' ? '2px solid #333' : '1px solid #ddd',
                                        boxShadow: currentStyle.fillColor === 'transparent' ? '0 0 0 2px white, 0 0 0 3px #333' : 'none',
                                        position: 'relative'
                                    }}
                                    title="No Fill"
                                >
                                    <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '12px', color: 'red' }}>✕</span>
                                </div>
                                {colors.map(c => (
                                    <div
                                        key={c}
                                        onClick={() => setStyle({ ...currentStyle, fillColor: c })}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            background: c,
                                            borderRadius: '50%',
                                            cursor: 'pointer',
                                            border: currentStyle.fillColor === c ? '2px solid #333' : '1px solid #ddd',
                                            opacity: 0.5, // Indicate fill opacity
                                            boxShadow: currentStyle.fillColor === c ? '0 0 0 2px white, 0 0 0 3px #333' : 'none'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {currentTool !== 'text' && (
                        <div>
                            <label style={labelStyle}>Thickness: {currentStyle.strokeWidth}px</label>
                            <input
                                type="range"
                                min="2"
                                max="20"
                                step="2"
                                value={currentStyle.strokeWidth}
                                onChange={(e) => setStyle({ ...currentStyle, strokeWidth: parseInt(e.target.value) })}
                                style={{ width: '100%' }}
                            />
                        </div>
                    )}

                    {currentTool === 'text' && (
                        <div>
                            <label style={labelStyle}>Font Size: {currentStyle.fontSize}px</label>
                            <select
                                value={currentStyle.fontSize}
                                onChange={(e) => setStyle({ ...currentStyle, fontSize: parseInt(e.target.value) })}
                                style={{ width: '100%', padding: '4px' }}
                            >
                                {fontSizes.map(size => (
                                    <option key={size} value={size}>{size}px</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={{ borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '5px' }}>
                        <button
                            onClick={() => {
                                if (window.confirm("Clear all drawings?")) onClear();
                            }}
                            style={{
                                width: '100%',
                                padding: '8px',
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            🗑️ Clear All
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

const toolButtonStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s'
};
