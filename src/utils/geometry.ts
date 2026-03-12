// Basic geometry helpers for hit testing

interface Point { x: number; y: number }
interface Rect { x: number; y: number; width: number; height: number }

export const isPointInCircle = (px: number, py: number, cx: number, cy: number, radius: number): boolean => {
    const dx = px - cx;
    const dy = py - cy;
    return (dx * dx + dy * dy) <= (radius * radius);
};

// Check if a line segment (p1-p2) intersects a circle (c, r)
export const isLineInCircle = (x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, radius: number): boolean => {
    // 1. Check if either endpoint is inside
    if (isPointInCircle(x1, y1, cx, cy, radius) || isPointInCircle(x2, y2, cx, cy, radius)) return true;

    // 2. Project circle center onto line segment
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return false; // Points are same, handled by 1

    const t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;

    // 3. Find closest point on segment
    // If t < 0, closest is p1 (checked). If t > 1, closest is p2 (checked).
    // If 0 <= t <= 1, closest is strictly on segment
    if (t > 0 && t < 1) {
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;
        return isPointInCircle(closestX, closestY, cx, cy, radius);
    }

    return false;
};

export const isRectInCircle = (rect: Rect, cx: number, cy: number, radius: number): boolean => {
    // Find closest point on rect to circle center
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));

    // Check distance from closest point to center
    const dx = closestX - cx;
    const dy = closestY - cy;
    return (dx * dx + dy * dy) <= (radius * radius);
};

export const isPolylineInCircle = (points: number[], cx: number, cy: number, radius: number): boolean => {
    if (!points || points.length < 2) return false;
    // Check points
    for (let i = 0; i < points.length; i += 2) {
        if (isPointInCircle(points[i], points[i + 1], cx, cy, radius)) return true;
    }
    // Check segments (more accurate for fast movements / sparse points)
    for (let i = 0; i < points.length - 2; i += 2) {
        if (isLineInCircle(points[i], points[i + 1], points[i + 2], points[i + 3], cx, cy, radius)) return true;
    }
    return false;
};

/**
 * Splits a stroke (points array) into multiple strokes based on eraser collision.
 * Removes points inside the eraser radius.
 * Returns an array of point-arrays.
 */
export const splitStrokeByEraser = (points: number[], cx: number, cy: number, radius: number): number[][] => {
    if (!points || points.length < 2) return [];

    const segments: number[][] = [];
    let currentSegment: number[] = [];

    for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        const y = points[i + 1];

        // Check if point is INSIDE eraser
        if (isPointInCircle(x, y, cx, cy, radius)) {
            // Cut here. If we have a valid segment accumulated, push it.
            if (currentSegment.length >= 4) { // Minimum 2 points (4 coords) for a visible line
                segments.push(currentSegment);
            }
            currentSegment = [];
        } else {
            // Point is safe, keep it
            currentSegment.push(x, y);
        }
    }

    // Push the last segment if valid
    if (currentSegment.length >= 4) {
        segments.push(currentSegment);
    }

    return segments;
};

const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * Adds points to a polyline so that no segment is longer than `maxDist`.
 * Important for point-based erasing of long lines.
 */
export const densifyPolyline = (points: number[], maxDist: number = 5): number[] => {
    if (!points || points.length < 4) return points;

    const newPoints: number[] = [];

    for (let i = 0; i < points.length - 2; i += 2) {
        const x1 = points[i];
        const y1 = points[i + 1];
        const x2 = points[i + 2];
        const y2 = points[i + 3];

        newPoints.push(x1, y1);

        const dist = getDistance(x1, y1, x2, y2);
        if (dist > maxDist) {
            const segments = Math.ceil(dist / maxDist);
            const dx = (x2 - x1) / segments;
            const dy = (y2 - y1) / segments;

            for (let j = 1; j < segments; j++) {
                newPoints.push(x1 + dx * j, y1 + dy * j);
            }
        }
    }

    // Add last point
    newPoints.push(points[points.length - 2], points[points.length - 1]);

    return newPoints;
};

export const rectToPolyline = (x: number, y: number, w: number, h: number, density: number = 5): number[] => {
    // TL -> TR -> BR -> BL -> TL
    const path = [
        x, y,           // TL
        x + w, y,       // TR
        x + w, y + h,   // BR
        x, y + h,       // BL
        x, y            // TL (Close loop)
    ];
    return densifyPolyline(path, density);
};

export const circleToPolyline = (x: number, y: number, w: number, h: number, density: number = 5): number[] => {
    const points: number[] = [];
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2;
    const ry = h / 2;

    // Estimate circumference to determine step count
    const circumference = Math.PI * (rx + ry); // Ramanujan approximation-ish
    const steps = Math.ceil(circumference / density);

    for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        points.push(
            cx + rx * Math.cos(theta),
            cy + ry * Math.sin(theta)
        );
    }
    return points;
};
