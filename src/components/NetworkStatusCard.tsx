import React, { useState, useRef, useEffect } from 'react';

interface NetworkStatusCardProps {
    status: 'STOPPED' | 'RUNNING' | 'LIMITED';
    info: { status: string, reason: string, tip: string } | null;
}

export const NetworkStatusCard: React.FC<NetworkStatusCardProps> = ({ status, info }) => {
    const [isMinimized, setIsMinimized] = useState(false);

    // Position State (Default: Top Right, left of Requirements)
    const [position, setPosition] = useState<{ x: number, y: number }>({ x: window.innerWidth - 600, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef<{ x: number, y: number }>({ x: 0, y: 0 });



    const handleMouseDown = (e: React.MouseEvent) => {
        // Only allow dragging from the header (and not buttons)
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;

        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        e.preventDefault(); // Prevent text selection
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.current.x,
                    y: e.clientY - dragOffset.current.y
                });
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
    }, [isDragging]);

    if (status === 'STOPPED' || !info) return null;

    return (
        <div style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '8px',
            boxShadow: isDragging ? '0 8px 25px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.2)',
            borderLeft: `5px solid ${status === 'RUNNING' ? '#28a745' : '#ffc107'}`,
            zIndex: 100,
            width: '280px',
            maxWidth: '280px',
            transition: isDragging ? 'none' : 'box-shadow 0.2s',
            overflow: 'hidden'
        }}>
            {/* Draggable Header */}
            <div
                style={{
                    padding: '10px 15px',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: isMinimized ? 'none' : '1px solid #eee',
                    userSelect: 'none'
                }}
                onMouseDown={handleMouseDown}
                onDoubleClick={() => setIsMinimized(!isMinimized)}
            >
                <h4 style={{ margin: 0, color: '#333', fontSize: '1em' }}>
                    {status === 'RUNNING' ? '🚀 Network Running' : '⚠️ Limited Connectivity'}
                </h4>
                <button
                    onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#666' }}
                    title={isMinimized ? "Expand" : "Minimize"}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {isMinimized ? '🔼' : '🔽'}
                </button>
            </div>

            {/* Content Body */}
            {!isMinimized && (
                <div style={{ padding: '15px' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#555', lineHeight: '1.4' }}>
                        {info.reason}
                    </p>
                    <div style={{ fontSize: '0.85em', background: '#f0f0f0', padding: '8px', borderRadius: '4px', color: '#333' }}>
                        <strong>Tip:</strong> {info.tip}
                    </div>
                    {status === 'RUNNING' && (
                        <div style={{ marginTop: '8px', fontSize: '0.8em', color: '#888', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span className="blink">●</span> Packet flow active
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
