import { useEffect, useState } from 'react';

interface AutoSaveIndicatorProps {
    lastSaved: Date | null;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({ lastSaved }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (lastSaved) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
            }, 2500); // Show for 2.5 seconds
            return () => clearTimeout(timer);
        }
    }, [lastSaved]);

    if (!lastSaved) return null;

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '280px', // Left of the RightPanel (width 240px + padding)
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '6px 12px',
            borderRadius: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#555',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
            pointerEvents: 'none',
            zIndex: 50,
            border: '1px solid #eee'
        }}>
            <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#4caf50',
                boxShadow: '0 0 4px #4caf50'
            }} />
            <span>
                Autosaved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
        </div>
    );
};
