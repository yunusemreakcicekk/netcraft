import React from 'react';
import type { AnalysisReport } from '../utils/TopologyAnalyzer';
import type { Arena } from '../types/arena';

interface RightPanelProps {
    // Build Network
    onBuildNetwork: () => void;

    // Start/Stop Simulation
    networkState: 'STOPPED' | 'RUNNING' | 'LIMITED';
    onStartSimulation: () => void;
    onStopSimulation: () => void;
    isSimulationReady?: boolean;

    // Analyze Network
    onAnalyzeNetwork: () => void;

    // Reference Setups
    onShowReferenceSetups: () => void;

    // Cable Mode
    isCableMode: boolean;
    onToggleCable: () => void;
    selectedCableType: string;
    onSelectCableType: (type: any) => void;

    // Delete Mode
    isDeleteMode: boolean;
    onToggleDelete: () => void;

    // Area Mode
    isAreaMode: boolean;
    onToggleAreaMode: () => void;

    // Analysis results for Live Security Panel
    currentAnalysis?: AnalysisReport | null;
    arena?: Arena | null;
}

const actionBtnStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
};

export const RightPanel: React.FC<RightPanelProps> = ({
    onBuildNetwork,
    networkState,
    onStartSimulation,
    onStopSimulation,
    onAnalyzeNetwork,
    onShowReferenceSetups,
    isCableMode,
    onToggleCable,
    selectedCableType,
    onSelectCableType,
    isDeleteMode,
    onToggleDelete,
    isAreaMode,
    onToggleAreaMode,
    currentAnalysis,
    arena,
    isSimulationReady = true
}) => {
    const isRunning = networkState === 'RUNNING' || networkState === 'LIMITED';

    const cableTypes = [
        { id: 'cat6', label: 'Copper (Ethernet)', icon: '🔌' },
        { id: 'fiber_sm', label: 'Fiber Optic', icon: '💡' },
        { id: 'coax', label: 'Coaxial', icon: '📺' },
        { id: 'console', label: 'Console', icon: '💻' }
    ];

    return (
        <div style={{
            width: '240px', // Fixed width
            minWidth: '240px',
            padding: '20px 16px',
            background: '#ffffff',
            borderLeft: '1px solid #e0e0e0',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
            height: '100%',
            boxSizing: 'border-box',
            boxShadow: '-2px 0 10px rgba(0,0,0,0.02)'
        }}>
            <h3 style={{
                margin: '0 0 4px 0',
                color: '#333',
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600'
            }}>
                Actions
            </h3>

            {/* Build Network */}
            <button
                onClick={onBuildNetwork}
                style={{
                    ...actionBtnStyle,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
            >
                <span style={{ fontSize: '20px' }}>🛠️</span>
                Build Network
            </button>

            {/* Connect Devices (Cable) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                    onClick={onToggleCable}
                    style={{
                        ...actionBtnStyle,
                        background: isCableMode
                            ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                            : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        border: isCableMode ? '2px solid #2e7d32' : 'none',
                        color: isCableMode ? '#004d40' : '#fff'
                    }}
                >
                    <span style={{ fontSize: '20px' }}>🔌</span>
                    {isCableMode ? 'Exit Cable Mode' : 'Connect Devices'}
                </button>

                {isCableMode && (
                    <div style={{
                        background: '#f8f9fa',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px'
                    }}>
                        <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Select Cable Type:</span>
                        {cableTypes.map(cable => (
                            <button
                                key={cable.id}
                                onClick={() => onSelectCableType(cable.id)}
                                style={{
                                    padding: '8px',
                                    borderRadius: '6px',
                                    border: selectedCableType === cable.id ? '1px solid #007bff' : '1px solid #ddd',
                                    background: selectedCableType === cable.id ? '#e7f1ff' : 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '13px',
                                    color: selectedCableType === cable.id ? '#0056b3' : '#333'
                                }}
                            >
                                <span>{cable.icon}</span>
                                {cable.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Items */}
            <button
                onClick={onToggleDelete}
                style={{
                    ...actionBtnStyle,
                    background: isDeleteMode
                        ? 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)'
                        : 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)',
                    border: isDeleteMode ? '2px solid #c62828' : 'none',
                    color: isDeleteMode ? '#b71c1c' : '#fff'
                }}
            >
                <span style={{ fontSize: '20px' }}>🗑️</span>
                {isDeleteMode ? 'Exit Delete Mode' : 'Delete Items'}
            </button>

            {/* Create Area */}
            <button
                onClick={onToggleAreaMode}
                style={{
                    ...actionBtnStyle,
                    background: isAreaMode
                        ? 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)'
                        : 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                    border: isAreaMode ? '2px solid #e67e22' : 'none',
                    color: isAreaMode ? '#d35400' : '#004d40'
                }}
            >
                <span style={{ fontSize: '20px' }}>⬜</span>
                {isAreaMode ? 'Exit Area Mode' : 'Create Network Area'}
            </button>


            <div style={{ height: '1px', background: '#eee', margin: '8px 0' }}></div>

            {/* Start/Stop Simulation */}
            <div title={!isRunning && !isSimulationReady ? "No active data path detected. Console connections are for management only." : ""}>
                <button
                    onClick={isRunning ? onStopSimulation : onStartSimulation}
                    disabled={!isRunning && !isSimulationReady}
                    style={{
                        ...actionBtnStyle,
                        background: isRunning
                            ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                            : (!isSimulationReady
                                ? '#ccc'
                                : 'linear-gradient(135deg, #8fd3f4 0%, #84fab0 100%)'),
                        color: isRunning ? '#fff' : (!isSimulationReady ? '#666' : '#004d40'),
                        cursor: (!isRunning && !isSimulationReady) ? 'not-allowed' : 'pointer',
                        opacity: (!isRunning && !isSimulationReady) ? 0.7 : 1
                    }}
                >
                    <span style={{ fontSize: '20px' }}>{isRunning ? '⏹️' : '▶️'}</span>
                    {isRunning ? 'Stop Simulation' : 'Start Simulation'}
                </button>
            </div>

            {/* Analyze Network */}
            <button
                onClick={onAnalyzeNetwork}
                style={{
                    ...actionBtnStyle,
                    background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                    color: '#fff'
                }}
            >
                <span style={{ fontSize: '20px' }}>📊</span>
                Analyze Network
            </button>

            {/* Reference Setups */}
            <button
                onClick={onShowReferenceSetups}
                style={{
                    ...actionBtnStyle,
                    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                    color: '#444' // Darker text for light background
                }}
            >
                <span style={{ fontSize: '20px' }}>📚</span>
                Reference Setups
            </button>
            {/* Security Analysis Panel (Enterprise Specific) */}
            {arena?.id === 'WAN' && (
                <div style={{
                    marginTop: '10px',
                    padding: '16px',
                    background: '#f8f9fa',
                    borderRadius: '12px',
                    border: '1px solid #e0e0e0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '13px', color: '#444' }}>🛡️ Security Analysis</h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Perimeter Protection */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span style={{ color: '#666' }}>Perimeter Protection:</span>
                            <span style={{
                                fontWeight: 'bold',
                                color: currentAnalysis?.security?.protection === 'UNSECURED' ? '#c62828' :
                                    currentAnalysis?.security?.protection === 'SECURED' ? '#2e7d32' :
                                        (currentAnalysis?.status === 'valid' ? '#2e7d32' : '#c62828')
                            }}>
                                {currentAnalysis?.security?.protection || (currentAnalysis?.status === 'valid' ? 'SECURED' : 'VULNERABLE')}
                            </span>
                        </div>

                        {/* Segmentation */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span style={{ color: '#666' }}>Segmentation:</span>
                            <span style={{
                                fontWeight: 'bold',
                                color: currentAnalysis?.security?.segmentation === 'FLAT' ? '#f57c00' :
                                    currentAnalysis?.security?.segmentation === 'SEGMENTED' ? '#2e7d32' :
                                        (currentAnalysis?.details.includes('DMZ') ? '#2e7d32' : '#f57c00')
                            }}>
                                {currentAnalysis?.security?.segmentation || (currentAnalysis?.details.includes('DMZ') ? 'COMPLETE' : 'FLAT')}
                            </span>
                        </div>

                        {/* Public Exposure */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span style={{ color: '#666' }}>Public Exposure:</span>
                            <span style={{
                                fontWeight: 'bold',
                                color: currentAnalysis?.security?.exposure === 'HIGH RISK' ? '#c62828' :
                                    currentAnalysis?.security?.exposure === 'LOW RISK' ? '#2e7d32' :
                                        (currentAnalysis?.missingCriteria.includes('Isolated DMZ Segment') ? '#c62828' : '#2e7d32')
                            }}>
                                {currentAnalysis?.security?.exposure || (currentAnalysis?.missingCriteria.includes('Isolated DMZ Segment') ? 'HIGH RISK' : 'LOW RISK')}
                            </span>
                        </div>
                    </div>

                    <div style={{
                        height: '4px',
                        background: '#eee',
                        borderRadius: '2px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: currentAnalysis?.status === 'valid' ? '100% voice' : '40%',
                            height: '100%',
                            background: currentAnalysis?.status === 'valid' ? '#43e97b' : '#ff758c',
                            transition: 'width 0.5s ease-in-out'
                        }} />
                    </div>
                </div>
            )}
        </div>
    );
};
