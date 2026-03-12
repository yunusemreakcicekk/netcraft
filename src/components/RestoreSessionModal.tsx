import React from 'react';

interface RestoreSessionModalProps {
    isOpen: boolean;
    timestamp: number;
    onRestore: () => void;
    onDiscard: () => void;
}

export const RestoreSessionModal: React.FC<RestoreSessionModalProps> = ({
    isOpen,
    timestamp,
    onRestore,
    onDiscard
}) => {
    if (!isOpen) return null;

    const dateStr = new Date(timestamp).toLocaleString();

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '16px',
                width: '420px',
                maxWidth: '90%',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                textAlign: 'center',
                animation: 'fadeIn 0.3s ease-out'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🧠</div>
                <h2 style={{ margin: '0 0 10px 0', color: '#1a1a1a' }}>Previous Session Found</h2>
                <p style={{ color: '#666', marginBottom: '25px', lineHeight: '1.5' }}>
                    You were working on a network from <strong>{dateStr}</strong>.<br />
                    Would you like to restore it?
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                        onClick={onRestore}
                        style={{
                            padding: '12px',
                            background: '#1976d2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#1565c0'}
                        onMouseOut={e => e.currentTarget.style.background = '#1976d2'}
                    >
                        Restore Session
                    </button>

                    <button
                        onClick={onDiscard}
                        style={{
                            padding: '12px',
                            background: 'transparent',
                            color: '#666',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.background = '#f5f5f5';
                            e.currentTarget.style.color = '#333';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#666';
                        }}
                    >
                        Start Fresh
                    </button>
                </div>
            </div>
            <style>
                {`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                `}
            </style>
        </div>
    );
};
