export type AnnotationType = 'free' | 'line' | 'rectangle' | 'circle' | 'text' | 'eraser';

export interface AnnotationStyle {
    strokeColor: string; // Hex code
    fillColor: string;   // Hex code or 'transparent'
    strokeWidth: number; // Pixels
    fontSize?: number;   // Pixels (for text)
}

export interface Annotation {
    id: string;
    type: AnnotationType;
    x: number;
    y: number;
    width?: number;      // For rect, circle, text wrapper
    height?: number;     // For rect, circle
    points?: number[];   // [x1, y1, x2, y2, ...] for freehand/line
    text?: string;       // Content for text tool
    style: AnnotationStyle;
}
