import React from 'react';

interface TopBarProps {
    onNew: () => void;
    onSave: () => void;
    onSaveAs: () => void;
    onLoad: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onTogglePan: () => void;
    isPanMode: boolean;
    onToggleDraw: () => void;
    isDrawMode: boolean;
    onTestConnectivity: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
    onNew,
    onSave,
    onSaveAs,
    onLoad,
    onUndo,
    onRedo,
    onZoomIn,
    onZoomOut,
    onTogglePan,
    isPanMode,
    onToggleDraw,
    isDrawMode,
    onTestConnectivity
}) => {
    const buttonStyle = (isActive: boolean = false) => ({
        padding: '8px', // Reduced padding
        borderRadius: '8px', // Slightly less rounded
        border: `1px solid ${isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)'}`,
        background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        transition: 'all 0.2s',
        minWidth: '42px', // Reduced from 60
        height: '42px',   // Reduced from 60
        fontSize: '24px', // Reduced from 34
        backdropFilter: 'blur(5px)'
    });

    return (
        <div style={{
            height: '70px', // Reduced from 100
            background: 'linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px', // Reduced padding
            justifyContent: 'space-between',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            zIndex: 20
        }}>
            {/* Left: Branding & File */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{
                    fontWeight: 800,
                    fontSize: '22px', // Reduced title size
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    letterSpacing: '0.5px'
                }}>
                    <div style={{
                        width: '28px', // Reduced logo size
                        height: '28px',
                        background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
                        borderRadius: '8px',
                        boxShadow: '0 0 10px rgba(0,198,255,0.5)'
                    }}></div>
                    NetCraft
                </div>
                <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '15px' }}>
                    <button onClick={onNew} style={buttonStyle()} title="New Project">📄</button>
                    <button onClick={onSave} style={buttonStyle()} title="Save Project">💾</button>
                    <button onClick={onSaveAs} style={buttonStyle()} title="Save As">💾✏️</button>
                    <button onClick={onLoad} style={buttonStyle()} title="Open Project">📂</button>
                </div>
            </div>

            {/* Center: Tools */}
            <div style={{
                display: 'flex',
                gap: '8px',
                background: 'rgba(255,255,255,0.1)',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <button onClick={onUndo} style={buttonStyle()} title="Undo">↩️</button>
                <button onClick={onRedo} style={buttonStyle()} title="Redo">↪️</button>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 5px' }}></div>
                <button onClick={onZoomOut} style={buttonStyle()} title="Zoom Out">➖</button>
                <button onClick={onZoomIn} style={buttonStyle()} title="Zoom In">➕</button>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 5px' }}></div>
                <button onClick={onTogglePan} style={buttonStyle(isPanMode)} title="Pan Mode (Space)">✋</button>
                <button onClick={onToggleDraw} style={buttonStyle(isDrawMode)} title="Drawing Tools">✏️</button>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 5px' }}></div>
                <button onClick={onTestConnectivity} style={buttonStyle()} title="Test Connectivity">⚡</button>
            </div>

            {/* Right: Status/Profile (Placeholder) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>v2.0.0</div>
            </div>
        </div>
    );
};
