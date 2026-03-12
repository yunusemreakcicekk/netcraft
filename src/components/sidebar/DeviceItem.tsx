import React, { useRef, useEffect } from 'react';

interface DeviceItemProps {
    type: string;
    label: string;
    icon: string;
}

export const DeviceItem: React.FC<DeviceItemProps> = ({ type, label, icon }) => {
    // We use a ref to store a pre-generated small image for dragging
    // to ensure it's ready when drag starts (avoiding sync loading issues)
    const dragImageRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        const img = new Image();
        img.src = icon;
        img.onload = () => {
            // Create a canvas to resize the image
            const canvas = document.createElement('canvas');
            canvas.width = 48;
            canvas.height = 48;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, 48, 48);
                const dataURL = canvas.toDataURL();
                const resizedImg = new Image();
                resizedImg.src = dataURL;
                dragImageRef.current = resizedImg;
            }
        };
    }, [icon]);


    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('text/plain', `NEW:${type}`);
        e.dataTransfer.effectAllowed = 'copyMove';

        if (dragImageRef.current) {
            e.dataTransfer.setDragImage(dragImageRef.current, 24, 24);
        } else {
            // Fallback if canvas gen failed (rare)
            const img = new Image();
            img.src = icon;
            // Try to force size properties, though browser support varies
            img.width = 48;
            img.height = 48;
            e.dataTransfer.setDragImage(img, 24, 24);
        }
    };

    return (
        <div
            draggable={true}
            onDragStart={handleDragStart}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px', // Reduced padding
                cursor: 'grab',
                transition: 'all 0.2s ease',
                borderRadius: '12px',
                backgroundColor: '#fff', // Explicit white bg for card look
                border: '1px solid transparent', // Ready for hover border
                height: '90px', // Reduced height as requested
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                e.currentTarget.style.zIndex = '1';
                e.currentTarget.style.border = '1px solid #e0e0e0';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.zIndex = '0';
                e.currentTarget.style.border = '1px solid transparent';
            }}
        >
            <div style={{
                width: '56px',
                height: '56px', // Slightly smaller container
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
            }}>
                <img
                    src={icon}
                    alt={label}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '100%', // Contain within 64px
                        objectFit: 'contain',
                        pointerEvents: 'none',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' // Subtle shadow for depth
                    }}
                />
            </div>

            <span style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#444',
                textAlign: 'center',
                pointerEvents: 'none',
                lineHeight: '1.2'
            }}>
                {label}
            </span>
        </div>
    );
};
