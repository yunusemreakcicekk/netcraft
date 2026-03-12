
import React, { useState, useEffect } from 'react';
import type { Device, Connection } from '../types/models';

interface DeviceDetailModalProps {
    device: Device | undefined;
    items: Device[];
    connections: Connection[];
    onClose: () => void;
    onRename: (id: number, newName: string) => void;
    onConnect?: (sourceId: number, sourcePortId: string, targetId: number, targetPortId: string) => void;
}

const getIconForType = (type: string) => {
    switch (type) {
        case 'Router': return '/assets/icons/router.png';
        case 'Switch': return '/assets/icons/switch.png';
        case 'PC': return '/assets/icons/pc.png';
        case 'Laptop': return '/assets/icons/laptop.png';
        case 'Server': return '/assets/icons/server.png';
        case 'Printer': return '/assets/icons/printer.png';
        case 'Firewall': return '/assets/icons/firewall.png';
        case 'Modem': return '/assets/icons/modem.png';
        case 'AccessPoint': return '/assets/icons/access_point.png';
        case 'Internet': return '/assets/icons/internet_cloud.png';
        default: return '/assets/icons/pc.png';
    }
};

export const DeviceDetailModal: React.FC<DeviceDetailModalProps> = ({
    device,
    items,
    connections,
    onClose,
    onRename,
    onConnect
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState('');
    const [showWifiList, setShowWifiList] = useState(false);

    useEffect(() => {
        if (device) {
            setTempName(device.name);
            setIsEditing(false); // Reset edit mode when device changes
        }
    }, [device]);

    if (!device) return null;

    const handleSaveName = () => {
        if (tempName.trim()) {
            onRename(device.id, tempName.trim());
            setIsEditing(false);
        }
    };

    const isWirelessCapable = device.ports.some(p => p.type === 'wireless');

    // Derived AP State
    const apClients = connections.filter(c => c.sourceId === device.id || c.targetId === device.id)
        .map(c => {
            const otherId = c.sourceId === device.id ? c.targetId : c.sourceId;
            return items.find(i => i.id === otherId);
        })
        .filter(d => d && d.type !== 'Router' && d.type !== 'Switch');

    const apUplink = connections.find(c => {
        if (c.sourceId === device.id || c.targetId === device.id) {
            const otherId = c.sourceId === device.id ? c.targetId : c.sourceId;
            const other = items.find(i => i.id === otherId);
            return other && (other.type === 'Router' || other.type === 'Switch');
        }
        return false;
    });

    const uplinkDevice = apUplink ? items.find(i => i.id === (apUplink.sourceId === device.id ? apUplink.targetId : apUplink.sourceId)) : null;

    const handleConnectWifi = (ap: Device) => {
        if (!onConnect) return;
        const myPort = device.ports.find(p => p.type === 'wireless' && !p.isOccupied);
        const apPort = ap.ports.find(p => p.type === 'wireless' && !p.isOccupied);

        if (!myPort) {
            alert("No free wireless adapter on this device.");
            return;
        }
        if (!apPort) {
            alert(`${ap.name} has no available wireless interfaces.`);
            return;
        }

        // Capacity Check 
        const apClientsOfAP = connections.filter(c => c.sourceId === ap.id || c.targetId === ap.id)
            .map(c => {
                const otherId = c.sourceId === ap.id ? c.targetId : c.sourceId;
                return items.find(i => i.id === otherId);
            })
            .filter(d => d && d.type !== 'Router' && d.type !== 'Switch');

        if (apClientsOfAP.length >= 20) {
            alert("Access Point capacity reached.");
            return;
        }

        onConnect(device.id, myPort.id, ap.id, apPort.id);
        setShowWifiList(false);
    };

    return (
        <div style={{
            position: 'fixed', // Fixed for modal overlay
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }} onClick={onClose}>
            <div style={{
                background: 'white',
                padding: '25px',
                borderRadius: '12px',
                width: '450px',
                maxWidth: '90%',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>

                {/* Header with Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5em',
                        cursor: 'pointer',
                        color: '#666'
                    }}
                >
                    &times;
                </button>

                {/* Device Info & Rename */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', alignItems: 'center' }}>
                    <div style={{
                        width: '80px', height: '80px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: '#f8f9fa', borderRadius: '12px', border: '1px solid #eee'
                    }}>
                        <img
                            src={getIconForType(device.type)}
                            alt="Icon"
                            style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                        />
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '5px' }}>
                            <span style={{ fontSize: '0.85em', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                {device.type}
                            </span>
                        </div>

                        {isEditing ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    autoFocus
                                    style={{
                                        fontSize: '1.2em',
                                        fontWeight: 'bold',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '2px solid #007bff',
                                        width: '100%'
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveName();
                                        if (e.key === 'Escape') setIsEditing(false);
                                    }}
                                />
                                <button onClick={handleSaveName} style={{ background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0 8px' }}>✓</button>
                                <button onClick={() => setIsEditing(false)} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0 8px' }}>✕</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{ margin: 0, fontSize: '1.5em' }}>{device.name}</h2>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '1em', opacity: 0.6
                                    }}
                                    title="Rename Device"
                                >
                                    ✏️
                                </button>
                            </div>
                        )}

                        <div style={{ marginTop: '5px', fontSize: '0.9em', color: '#555' }}>
                            ID: <strong>{device.id}</strong> &bull; Ports: <strong>{device.ports.length}</strong>
                        </div>
                    </div>
                </div>

                {/* Wireless Options For Clients */}
                {isWirelessCapable && device.type !== 'AccessPoint' && (
                    <div style={{ marginBottom: '20px', padding: '15px', background: '#eef2ff', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#3730a3' }}>Connection Options</h4>
                        {!showWifiList ? (
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => alert("To connect via Ethernet, use the Cable Picker at the bottom of the screen.")}
                                    style={{ flex: 1, padding: '8px', background: 'white', border: '1px solid #a5b4fc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#4f46e5' }}
                                >
                                    Connect via Ethernet
                                </button>
                                <button
                                    onClick={() => setShowWifiList(true)}
                                    style={{ flex: 1, padding: '8px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Connect to WiFi
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div style={{ fontSize: '0.9em', fontWeight: 'bold', marginBottom: '8px', color: '#4338ca' }}>Available WiFi Networks</div>
                                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                    {items.filter(i => i.type === 'AccessPoint').map(ap => (
                                        <div key={ap.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'white', border: '1px solid #e0e7ff', marginBottom: '4px', borderRadius: '4px' }}>
                                            <span style={{ fontWeight: 'bold', color: '#111827' }}>{ap.name}</span>
                                            <button
                                                onClick={() => handleConnectWifi(ap)}
                                                style={{ padding: '4px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85em' }}
                                            >Connect</button>
                                        </div>
                                    ))}
                                    {items.filter(i => i.type === 'AccessPoint').length === 0 && (
                                        <div style={{ color: '#6b7280', fontSize: '0.9em', fontStyle: 'italic' }}>No Access Points in range.</div>
                                    )}
                                </div>
                                <button onClick={() => setShowWifiList(false)} style={{ marginTop: '10px', width: '100%', padding: '6px', background: 'transparent', border: '1px solid #9ca3af', color: '#4b5563', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                            </div>
                        )}
                    </div>
                )}

                {/* Access Point Info */}
                {device.type === 'AccessPoint' && (
                    <div style={{ marginBottom: '20px', padding: '15px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#166534' }}>Access Point Status</h4>
                        <div style={{ fontSize: '0.9em', marginBottom: '10px' }}>
                            Connected to: <strong>{uplinkDevice ? `${uplinkDevice.name} (${uplinkDevice.type})` : 'Disconnected (Offline)'}</strong>
                        </div>

                        <div style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#15803d', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Wireless Devices Connected</span>
                            <span>({apClients.length}/20)</span>
                        </div>

                        <div style={{ maxHeight: '100px', overflowY: 'auto', marginTop: '5px', background: 'white', border: '1px solid #dcfaf8', borderRadius: '4px', padding: '5px' }}>
                            {apClients.length === 0 ? (
                                <div style={{ color: '#9ca3af', fontSize: '0.85em', fontStyle: 'italic', padding: '4px' }}>No devices connected.</div>
                            ) : (
                                apClients.map((client, idx) => (
                                    <div key={idx} style={{ padding: '2px 4px', fontSize: '0.85em', borderBottom: '1px dashed #eee' }}>
                                        • {client?.name || 'Unknown'} ({client?.type})
                                    </div>
                                ))
                            )}
                        </div>
                        {apClients.length >= 20 && (
                            <div style={{ marginTop: '8px', color: '#b91c1c', fontSize: '0.85em', fontWeight: 'bold', background: '#fee2e2', padding: '4px', borderRadius: '4px', textAlign: 'center' }}>
                                Access Point capacity reached.
                            </div>
                        )}
                    </div>
                )}

                {/* Port Status List */}
                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '10px' }}>Physical Ports</h3>
                <div style={{ maxHeight: '250px', overflowY: 'auto', background: '#f9f9f9', borderRadius: '8px', padding: '5px' }}>
                    {device.ports.filter(p => !(device.type === 'AccessPoint' && p.type === 'wireless')).map(port => {
                        // Find connection info
                        const conn = connections.find(c =>
                            (c.sourceId === device.id && c.sourcePortId === port.id) ||
                            (c.targetId === device.id && c.targetPortId === port.id)
                        );

                        let statusText = "Free";
                        let statusColor = "#28a745"; // Green for free
                        let explanation = "";

                        if (conn) {
                            const otherId = conn.sourceId === device.id ? conn.targetId : conn.sourceId;
                            const otherPortId = conn.sourceId === device.id ? conn.targetPortId : conn.sourcePortId;
                            const otherDevice = items.find(i => i.id === otherId);

                            statusText = `Connected to ${otherDevice?.name || 'Unknown'} (${otherPortId}) via ${conn.cableType}`;
                            statusColor = "#007bff"; // Blue for connected

                            // Generate Explanation
                            if (otherDevice) {
                                const typeA = device.type;
                                const typeB = otherDevice.type;

                                if ((typeA === 'PC' && typeB === 'Switch') || (typeA === 'Switch' && typeB === 'PC')) {
                                    explanation = "Standard Access Link. Connects an end-user device (PC) to the network switch.";
                                } else if ((typeA === 'Switch' && typeB === 'Switch')) {
                                    explanation = "Trunk/Uplink. Connecting switches expands the network.";
                                } else if ((typeA === 'Router' && typeB === 'Switch') || (typeA === 'Switch' && typeB === 'Router')) {
                                    explanation = "Gateway Uplink. Connects the LAN to the Router/Gateway.";
                                } else if (typeA === 'Router' && typeB === 'Router') {
                                    explanation = "WAN Link. Connects two networks/routers together.";
                                }
                            }
                        } else {
                            statusColor = "#6c757d"; // Gray for free/disconnected
                            statusText = "Disconnected";
                        }

                        return (
                            <div key={port.id} style={{
                                padding: '8px 10px',
                                borderBottom: '1px solid #eee',
                                fontSize: '0.9em',
                                background: 'white',
                                marginBottom: '2px',
                                borderRadius: '4px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <strong>{port.name}</strong>
                                    <span style={{ color: statusColor, fontWeight: 'bold' }}>{statusText}</span>
                                </div>
                                {explanation && (
                                    <div style={{ fontSize: '0.85em', color: '#666', marginTop: '2px', fontStyle: 'italic' }}>
                                        {explanation}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 20px',
                            cursor: 'pointer',
                            background: '#f1f1f1',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            color: '#333'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
