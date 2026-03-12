import React from 'react';
import type { Arena } from '../types/arena';

interface GuidePanelProps {
    arena: Arena;
    currentStep: number;
    onNext: () => void;
    validation: { isValid: boolean; message?: string };
}

export const GuidePanel: React.FC<GuidePanelProps> = ({
    arena,
    currentStep,
    onNext,
    validation
}) => {
    // Local State for Dragging and Minimizing
    const [isMinimized, setIsMinimized] = React.useState(false);
    const [position, setPosition] = React.useState({ x: 0, y: 0 }); // Offset from center
    const isDragging = React.useRef(false);
    const dragStart = React.useRef({ x: 0, y: 0 });

    // Handle Dragging
    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const newX = e.clientX - dragStart.current.x;
        const newY = e.clientY - dragStart.current.y;
        setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    // If no steps or finished, don't show
    if (!arena.guideSteps || currentStep > arena.guideSteps.length) {
        return null;
    }

    const step = arena.guideSteps.find(s => s.id === currentStep);
    if (!step) return null;

    // Minimized View
    if (isMinimized) {
        return (
            <div
                onMouseDown={handleMouseDown}
                style={{
                    position: 'absolute',
                    bottom: '140px',
                    left: '50%',
                    transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    padding: '10px',
                    borderRadius: '50%', // Circle shape
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    zIndex: 100,
                    border: '1px solid rgba(0,0,0,0.1)',
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '50px',
                    height: '50px',
                    transition: 'border-radius 0.2s'
                }}
                title="Expand Guide"
            >
                <div style={{
                    width: '100%',
                    height: '100%',
                    background: '#007bff',
                    color: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '18px'
                }}>
                    {currentStep}
                </div>
                {/* Expand Button Overlay */}
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent drag start
                        setIsMinimized(false);
                    }}
                    style={{
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#333',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    ↗
                </button>
            </div>
        );
    }

    // Expanded View
    return (
        <div
            style={{
                position: 'absolute',
                bottom: '140px',
                left: '50%',
                transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                padding: '10px 15px', // Reduced padding
                borderRadius: '12px',
                boxShadow: '0 4px 25px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px', // Reduced gap
                zIndex: 100,
                border: '1px solid rgba(0,0,0,0.1)',
                minWidth: '300px', // Reduced minWidth
                maxWidth: '450px', // Reduced maxWidth
                userSelect: 'none'
            }}
        >
            {/* Drag Handle & Header */}
            <div
                onMouseDown={handleMouseDown}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '15px',
                    cursor: 'grab',
                    background: 'transparent',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px',
                    display: 'flex',
                    justifyContent: 'center'
                }}
            >
                <div style={{
                    width: '40px',
                    height: '4px',
                    background: '#ddd',
                    borderRadius: '2px',
                    marginTop: '6px'
                }} />
            </div>

            {/* Minimize Button */}
            <button
                onClick={() => setIsMinimized(true)}
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#999',
                    fontSize: '16px',
                    padding: '4px',
                    lineHeight: 1,
                    zIndex: 2
                }}
                title="Minimize"
            >
                ─
            </button>

            <div style={{
                width: '40px',
                height: '40px',
                background: '#007bff',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '18px',
                flexShrink: 0,
                marginTop: '10px' // Push down slightly due to drag handle
            }}>
                {currentStep}
            </div>

            <div style={{ flex: 1, marginTop: '10px' }}>
                <div style={{
                    fontSize: '12px',
                    color: '#666',
                    textTransform: 'uppercase',
                    fontWeight: 'bold',
                    marginBottom: '4px'
                }}>
                    Step {currentStep} of {arena.guideSteps.length}
                </div>
                <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {step.label}
                    {validation.isValid && <span style={{ color: '#28a745' }}>✅</span>}
                </div>
                {validation.message && (
                    <div style={{
                        fontSize: '11px',
                        color: validation.isValid ? '#28a745' : '#dc3545',
                        marginTop: '2px',
                        fontWeight: '500'
                    }}>
                        {validation.isValid ? 'Ready!' : `⚠️ ${validation.message}`}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                    onClick={onNext}
                    disabled={!validation.isValid}
                    style={{
                        padding: '8px 20px',
                        background: validation.isValid ? '#28a745' : '#e0e0e0',
                        color: validation.isValid ? 'white' : '#888',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: validation.isValid ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        boxShadow: validation.isValid ? '0 2px 8px rgba(40,167,69,0.3)' : 'none',
                        marginLeft: 'auto' // Push to right
                    }}
                >
                    {currentStep === arena.guideSteps.length ? 'Finish' : 'Next'}
                </button>
            </div>
        </div>
    );
};
