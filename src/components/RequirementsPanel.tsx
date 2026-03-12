import React, { useState, useRef, useEffect } from 'react';
import type { Device, Connection, NetworkArea, Requirement } from '../types/models';

interface RequirementsPanelProps {
    title: string;
    requirements: Requirement[];
    devices: Device[];
    connections: Connection[];
    areas: NetworkArea[];
}

export const RequirementsPanel: React.FC<RequirementsPanelProps> = ({ title, requirements, devices, connections, areas }) => {

    const [isMinimized, setIsMinimized] = useState(false);

    // Position State (Default: Top Right)
    const [position, setPosition] = useState<{ x: number, y: number }>({ x: window.innerWidth - 300, y: 80 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef<{ x: number, y: number }>({ x: 0, y: 0 });



    const metCount = requirements.filter(r => r.check(devices, connections, areas)).length;
    const totalCount = requirements.length;
    const progressColor = metCount === totalCount ? '#28a745' : '#007bff';

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

    if (requirements.length === 0) return null;

    return (
        <div style={{
            position: 'fixed', // Changed from absolute to fixed for viewport movement
            left: position.x,
            top: position.y,
            width: '280px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: isDragging ? '0 8px 25px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.1)',
            zIndex: 900,
            border: '1px solid #ddd',
            overflow: 'hidden',
            transition: isDragging ? 'none' : 'height 0.3s ease, box-shadow 0.2s', // Disable transition during drag
            cursor: isDragging ? 'grabbing' : 'default'
        }}>
            {/* Header */}
            <div
                style={{
                    backgroundColor: '#f8f9fa',
                    padding: '10px 12px',
                    borderBottom: isMinimized ? 'none' : '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: isDragging ? 'grabbing' : 'grab', // Indicate draggable
                    userSelect: 'none'
                }}
                onMouseDown={handleMouseDown}
                onDoubleClick={() => setIsMinimized(!isMinimized)} // Double click to toggle minimize
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '16px' }}>🎯</span>
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>Requirements</div>
                        {isMinimized && (
                            <div style={{ fontSize: '11px', color: progressColor, fontWeight: '600' }}>
                                {metCount}/{totalCount} Met
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#666' }}
                        title={isMinimized ? "Expand" : "Minimize"}
                        onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
                    >
                        {isMinimized ? '🔼' : '🔽'}
                    </button>

                </div>
            </div>

            {/* Content Body */}
            {!isMinimized && (
                <div style={{ padding: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                    <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
                        Active Scope: <strong>{title}</strong>
                    </div>

                    {requirements.map(req => {
                        const isMet = req.check(devices, connections, areas);
                        return (
                            <div key={req.id} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                marginBottom: '8px',
                                padding: '8px',
                                borderRadius: '6px',
                                backgroundColor: isMet ? '#f0fff4' : (req.required ? '#fff5f5' : '#fffaf0'),
                                borderLeft: `3px solid ${isMet ? '#2f855a' : (req.required ? '#c53030' : '#b7791f')}`
                            }}>
                                <div style={{ fontSize: '1.2em' }}>
                                    {isMet ? '✅' : (req.required ? '❌' : '⚠️')}
                                </div>
                                <div>
                                    <div style={{
                                        fontWeight: 'bold',
                                        fontSize: '0.9em',
                                        color: isMet ? '#2f855a' : (req.required ? '#c53030' : '#b7791f')
                                    }}>
                                        {req.label}
                                    </div>
                                    <div style={{ fontSize: '0.8em', color: '#666', lineHeight: '1.2' }}>
                                        {req.description}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
