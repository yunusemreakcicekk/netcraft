import React from 'react';
import { sidebarData } from './sidebar/sidebarData';

interface BottomDockProps {
    onDragDeviceStart: (type: string) => void;
    onDragDeviceEnd: () => void;
}

const BottomDock: React.FC<BottomDockProps> = ({ onDragDeviceStart, onDragDeviceEnd }) => {
    // Flatten all devices from all categories
    const allDevices = sidebarData.flatMap(category => category.items);

    const handleDragStart = (e: React.DragEvent, deviceType: string) => {
        e.dataTransfer.setData('text/plain', `NEW:${deviceType}`);
        e.dataTransfer.effectAllowed = 'copy';
        onDragDeviceStart(deviceType);
    };

    const handleDragEnd = () => {
        onDragDeviceEnd();
    };

    return (
        <div style={{
            height: '135px', // Increased slightly again
            borderTop: '1px solid rgba(255, 255, 255, 0.3)',
            background: 'rgba(255, 255, 255, 0.75)', // Semi-transparent
            backdropFilter: 'blur(10px)', // Glassmorphism
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 20px',
            overflowX: 'auto',
            overflowY: 'hidden',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
            zIndex: 10,
            width: '100%' // Ensure it takes full width of container
        }}>
            <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                padding: '10px 0'
            }}>
                {allDevices.map((device, index) => (
                    <div
                        key={index}
                        draggable
                        onDragStart={(e) => handleDragStart(e, device.type)}
                        onDragEnd={handleDragEnd}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            padding: '6px',
                            width: '105px', // Larger item box
                            height: '105px',
                            background: '#f8f9fa',
                            borderRadius: '16px', // Slightly more rounded
                            border: '1px solid transparent',
                            cursor: 'grab',
                            transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            userSelect: 'none'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.borderColor = '#e0e0e0';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1) translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.background = '#f8f9fa';
                            e.currentTarget.style.borderColor = 'transparent';
                        }}
                    >
                        {device.icon ? (
                            <img
                                src={device.icon}
                                alt={device.label}
                                style={{
                                    width: '72px', // Even larger icon
                                    height: '72px',
                                    objectFit: 'contain',
                                    pointerEvents: 'none'
                                }}
                            />
                        ) : (
                            <div style={{
                                width: '72px',
                                height: '72px',
                                background: '#e0e0e0',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '32px'
                            }}>
                                📦
                            </div>
                        )}
                        <span style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#333',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            lineHeight: 1
                        }}>
                            {device.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BottomDock;
