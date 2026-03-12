/**
 * Calculates the transformed world coordinates from a mouse event,
 * compensating for zoom (scale) and pan (offset).
 * 
 * IMPORTANT: Pass the VIEWPORT rect (the container without transform),
 * not the canvas-content rect (which already has transform applied).
 * 
 * @param event The mouse event containing clientX/clientY
 * @param zoom The current zoom level (scale)
 * @param offsetX The current pan offset X
 * @param offsetY The current pan offset Y
 * @param rect The bounding client rect of the VIEWPORT (not transformed element)
 * @returns {x: number, y: number} The normalized world coordinates
 */
export const getTransformedCoordinates = (
    event: { clientX: number; clientY: number },
    zoom: number,
    offsetX: number,
    offsetY: number,
    rect: DOMRect
): { x: number; y: number } => {
    // Correct formula: subtract offset because rect is from viewport (no transform)
    return {
        x: (event.clientX - rect.left - offsetX) / zoom,
        y: (event.clientY - rect.top - offsetY) / zoom
    };
};
