import React, { useRef } from 'react';
import type { Device, DeviceType, Connection, Port, NetworkArea, Packet, NetworkScope } from '../types/models';
import { CABLE_DEFINITIONS } from '../utils/CableDefinitions';
import { ConnectionValidator } from '../utils/ConnectionValidator';
import { TrafficEngine } from '../utils/TrafficEngine';
import { getTransformedCoordinates } from '../utils/coordinateMapper';

interface CanvasProps {
    items: Device[];
    connections: Connection[];
    onDropItem: (item: Device) => void;
    onMoveItem: (id: number, x: number, y: number) => void;
    selectedId: number | null;
    onSelect: (id: number | null) => void;
    isCableMode: boolean;
    cableSourceId: number | null;
    cableSourcePortId: string | null;
    onConnect: (sourceId: number, sourcePortId: string, targetId: number, targetPortId: string) => void;
    highlightedConnectionIds?: number[];
    onInspect: (id: number) => void;
    areas: NetworkArea[];
    onMoveArea: (id: number, x: number, y: number) => void;
    isDeleteMode: boolean;
    onDeleteConnection: (id: number) => void;
    onDeleteDevice: (id: number) => void;
    backgroundImage?: string;
    networkState?: 'STOPPED' | 'RUNNING' | 'LIMITED';
    packets?: Packet[];
    children?: React.ReactNode;
    viewState?: { zoom: number; offset: { x: number; y: number } };
    isPanMode?: boolean;
    previewArea?: { x: number, y: number, width: number, height: number } | null;
    onCanvasContentRef?: (ref: HTMLDivElement | null) => void;
    isAreaMode?: boolean;
    onDeleteArea?: (id: number) => void;
    draggedDeviceType?: string | null;
    guideStep?: number;
    networkScope?: NetworkScope | null;
}

const GRID_SIZE = 20;
const ITEM_WIDTH = 90;
const ITEM_HEIGHT = 90;

export const Canvas: React.FC<CanvasProps> = ({
    items,
    connections,
    onDropItem,
    onMoveItem,
    selectedId,
    onSelect,
    isCableMode,
    cableSourceId,
    cableSourcePortId,
    onConnect,
    highlightedConnectionIds = [],
    onInspect,
    areas,
    onMoveArea,
    isDeleteMode,
    onDeleteConnection,
    onDeleteDevice,
    backgroundImage,
    networkState = 'STOPPED',
    packets: _packets = [],

    children,
    viewState = { zoom: 1, offset: { x: 0, y: 0 } },
    isPanMode = false,
    previewArea = null,
    onCanvasContentRef,
    isAreaMode = false,
    onDeleteArea,
    draggedDeviceType = null,
    guideStep = 0,
    networkScope = null
}) => {
    const [mousePos, setMousePos] = React.useState<{ x: number, y: number } | null>(null);
    // Packet Animation Logic
    const [renderedPackets, setRenderedPackets] = React.useState<Packet[]>([]);
    const requestRef = useRef<number | undefined>(undefined);
    const previousTimeRef = useRef<number | undefined>(undefined);
    const engineRef = useRef<TrafficEngine | null>(null);

    // Initialize TrafficEngine
    React.useEffect(() => {
        engineRef.current = new TrafficEngine(items, connections);
    }, [items, connections]);

    // Packet Spawning Loop
    React.useEffect(() => {
        if (networkState === 'RUNNING' || networkState === 'LIMITED') {
            const interval = setInterval(() => {
                try {
                    if (engineRef.current) {
                        const newPackets = engineRef.current.generateRandomPacketsTick();
                        if (newPackets && newPackets.length > 0) {
                            setRenderedPackets(prev => [...prev, ...newPackets]);
                        }
                    }
                } catch (error) {
                    console.error("Packet generation error:", error);
                }
            }, 800);
            return () => clearInterval(interval);
        } else {
            setRenderedPackets([]);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
    }, [networkState]);

    const animate = (time: number) => {
        if (previousTimeRef.current !== undefined) {
            const _deltaTime = (time - previousTimeRef.current) / 1000; // seconds

            setRenderedPackets(prevPackets =>
                prevPackets
                    .map(packet => {
                        const step = packet.speed * _deltaTime * 0.5; // Use frame-rate independent step
                        let newProgress = packet.progress + step;

                        // Black Packet Logic (Invalid Connection)
                        // We detect Black Packets by color #000000 and status COMPROMISED
                        if (packet.color === '#000000' && packet.status === 'COMPROMISED') {
                            // Stop halfway (0.5)
                            if (newProgress > 0.5) {
                                newProgress = 0.5;
                            }
                        }

                        if (newProgress >= 1) {
                            return null; // Completed
                        }
                        return { ...packet, progress: newProgress };
                    })
                    .filter(p => p !== null) as Packet[]
            );
        }
        previousTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    };

    React.useEffect(() => {
        if (networkState === 'RUNNING' || networkState === 'LIMITED') {
            requestRef.current = requestAnimationFrame(animate);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [networkState]);

    // Expose canvas-content ref to parent
    React.useEffect(() => {
        if (onCanvasContentRef) {
            onCanvasContentRef(canvasContentRef.current);
        }
    }, [onCanvasContentRef]);


    const interpolatePosition = (path: { x: number, y: number }[], progress: number) => {
        if (!path || path.length < 2) {
            const pos = path?.[0] || { x: 0, y: 0 };
            return { x: pos.x, y: pos.y, segmentIndex: 0 };
        }

        // Total length logic is complex if segments vary.
        // Simplified: Assume equal distribution or just use indices.
        // Better: Calculate total distance, find current segment.

        // 1. Calculate total length
        let totalLength = 0;
        const segmentLengths = [];
        for (let i = 0; i < path.length - 1; i++) {
            const dx = path[i + 1].x - path[i].x;
            const dy = path[i + 1].y - path[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            segmentLengths.push(dist);
            totalLength += dist;
        }

        // 2. Find current distance
        let currentDist = totalLength * progress;

        // 3. Find segment
        let accumulated = 0;
        for (let i = 0; i < segmentLengths.length; i++) {
            if (accumulated + segmentLengths[i] >= currentDist) {
                // We are in this segment
                const segmentProgress = (currentDist - accumulated) / segmentLengths[i];
                const p1 = path[i];
                const p2 = path[i + 1];
                return {
                    x: p1.x + (p2.x - p1.x) * segmentProgress,
                    y: p1.y + (p2.y - p1.y) * segmentProgress,
                    segmentIndex: i
                };
            }
            accumulated += segmentLengths[i];
        }
        const lastPos = path[path.length - 1];
        return { x: lastPos.x, y: lastPos.y, segmentIndex: Math.max(0, path.length - 2) };
    };

    // ... (rest of helper functions)

    const getIconForType = (type: DeviceType) => {
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

    const canvasRef = useRef<HTMLDivElement>(null);
    const canvasContentRef = useRef<HTMLDivElement>(null);

    // ... (keep drag handlers same)

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setMousePos(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';

        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (canvasRect) {
            const { x, y } = getTransformedCoordinates(
                e,
                viewState.zoom,
                viewState.offset.x,
                viewState.offset.y,
                canvasRect
            );
            setMousePos({ x, y });
        }
    };

    const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

    const generatePorts = (type: DeviceType): Port[] => {
        const count = type === 'Switch' ? 8 : (type === 'Router' ? 4 : (type === 'Firewall' ? 4 : 1));
        const ports = Array.from({ length: count }, (_, i) => ({
            id: `eth${i}`,
            name: `eth${i}`,
            type: 'ethernet' as any,
            isOccupied: false
        }));

        if (type === 'Router' || type === 'AccessPoint') {
            ports.push({ id: 'wifi', name: 'WiFi', type: 'wireless', isOccupied: false });
        } else if (type === 'Laptop' || type === 'Printer') {
            ports.push({ id: 'wlan0', name: 'WiFi', type: 'wireless', isOccupied: false });
        }

        return ports;
    };

    // ...



    // ... (rest of component)

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('text/plain');
        if (!data) return;

        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;

        // Transform Mouse Coordinates to World Coordinates using shared utility
        const { x: worldX, y: worldY } = getTransformedCoordinates(
            e,
            viewState.zoom,
            viewState.offset.x,
            viewState.offset.y,
            canvasRect
        );

        // Snap to grid
        let x = snapToGrid(worldX);
        let y = snapToGrid(worldY);

        // Boundary checks (Expanded for infinite canvas feel)
        x = Math.max(0, Math.min(x, 10000));
        y = Math.max(0, Math.min(y, 10000));

        if (data.startsWith('MOVE:')) {
            const [, idStr, offsetXStr, offsetYStr] = data.split(':');
            const id = parseInt(idStr, 10);
            const offsetX = parseInt(offsetXStr, 10);
            const offsetY = parseInt(offsetYStr, 10);

            // Calculate new position in World Space
            // offsetX/Y are in World Units (local unscaled pixels of the element)
            let newX = x - offsetX;
            let newY = y - offsetY;

            newX = snapToGrid(newX);
            newY = snapToGrid(newY);

            // No strict bounds on move
            onMoveItem(id, newX, newY);
            return;
        }

        if (data.startsWith('MOVE_AREA:')) {
            const [, idStr, offsetXStr, offsetYStr] = data.split(':');
            const id = parseInt(idStr, 10);
            const offsetX = parseInt(offsetXStr, 10);
            const offsetY = parseInt(offsetYStr, 10);

            let newX = x - offsetX;
            let newY = y - offsetY;

            newX = snapToGrid(newX);
            newY = snapToGrid(newY);

            onMoveArea(id, newX, newY);
            return;
        }

        if (data.startsWith('NEW:')) {
            const type = data.split(':')[1] as DeviceType;

            const newDevice: Device = {
                id: Date.now(),
                type,
                x,
                y,
                name: `${type}-${Date.now().toString().slice(-4)}`,
                ports: generatePorts(type),
            };
            onDropItem(newDevice);
            setMousePos(null);
        }
    };

    const handlePortClick = (e: React.MouseEvent, deviceId: number, portId: string) => {
        e.stopPropagation();
        if (isCableMode) {
            // Find the device to check port occupancy
            const device = items.find(d => d.id === deviceId);
            const port = device?.ports.find(p => p.id === portId);

            if (port?.isOccupied) {
                alert("Port is already occupied!");
                return;
            }

            if (cableSourceId === null) {
                // First click: select source
                onConnect(deviceId, portId, -1, '');
            } else {
                // Second click: connect
                if (cableSourceId === deviceId) {
                    // Clicking same device
                    return;
                }

                const sourceDevice = items.find(d => d.id === cableSourceId);
                const targetDevice = items.find(d => d.id === deviceId);

                if (!sourceDevice || !targetDevice) {
                    console.error("Source or target device not found for connection validation.");
                    return;
                }

                const validationResult = ConnectionValidator.validate(
                    sourceDevice,
                    targetDevice,
                    'cat5' // Default for new connection check, actual type will be set by onConnect logic if needed
                );

                if (!validationResult.isValid) {
                    alert(`Cannot connect: ${validationResult.reason}`);
                    return;
                }

                onConnect(cableSourceId, cableSourcePortId!, deviceId, portId);
            }
        }
    };

    const handleDeviceClick = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (isCableMode) {
            return;
        } else {
            onSelect(id);
        }
    };

    // Helper to get position of a specific port
    const getPortPosition = (deviceId: number, portId: string) => {
        const device = items.find(d => d.id === deviceId);
        if (!device) return { x: 0, y: 0 };

        const portIndex = device.ports.findIndex(p => p.id === portId);
        if (portIndex === -1) return { x: device.x + ITEM_WIDTH / 2, y: device.y + ITEM_HEIGHT / 2 }; // Fallback

        // Simple layout: spread ports at bottom for now
        const totalPorts = device.ports.length;
        const spacing = ITEM_WIDTH / (totalPorts + 1);

        return {
            x: device.x + (spacing * (portIndex + 1)),
            y: device.y + ITEM_HEIGHT - 5 // Near bottom edge
        };
    };

    // Style for animated border
    const dashAnimationStyle = `
        @keyframes dash-move {
            to { stroke-dashoffset: -20; }
        }
        .area-preview-rect {
            animation: dash-move 0.5s linear infinite;
        }
        .glass-area {
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
        }
    `;

    return (
        <div
            ref={canvasRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
                if (!isCableMode) onSelect(null);
            }}
            style={{
                flex: 1,
                position: 'relative',
                background: '#fff',
                height: '100%',
                minHeight: '100%',
                overflow: 'hidden',
                zIndex: 1,
                backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)',
                backgroundSize: `${GRID_SIZE * viewState.zoom}px ${GRID_SIZE * viewState.zoom}px`,
                backgroundPosition: `${viewState.offset.x}px ${viewState.offset.y}px`,
                cursor: isAreaMode ? 'crosshair' : (isCableMode ? 'crosshair' : (isPanMode ? 'grab' : 'default')),
            }}
        >
            <style>{dashAnimationStyle}</style>
            {/* Background Image Layer */}
            {backgroundImage && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: '100% 100%',
                        backgroundPosition: 'center',
                        opacity: 0.3,
                        pointerEvents: 'none',
                        zIndex: 0
                    }}
                />
            )}

            <div
                ref={canvasContentRef}
                className="canvas-content"
                style={{
                    transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.zoom})`,
                    transformOrigin: '0 0',
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0
                }}
            >
                {/* TRANSFORME CONTENT START */}

                {children}

                {/* AREAS LAYER */}
                {
                    areas.map(area => {
                        const isSelected = selectedId === area.id;
                        return (
                            <div
                                key={area.id}
                                draggable={!isCableMode && !isPanMode}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', `MOVE_AREA:${area.id}:${e.nativeEvent.offsetX}:${e.nativeEvent.offsetY}`);
                                    e.dataTransfer.effectAllowed = 'copyMove';
                                    e.stopPropagation();
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(area.id);
                                }}
                                style={{
                                    position: 'absolute',
                                    left: area.x,
                                    top: area.y,
                                    width: area.width,
                                    height: area.height,
                                    border: isSelected ? '3px solid #0072ff' : (area.name.toUpperCase().includes('DMZ') ? '2px solid #ff7e5f' : '2px solid rgba(0, 123, 255, 0.4)'),
                                    backgroundColor: area.name.toUpperCase().includes('DMZ')
                                        ? 'rgba(255, 126, 95, 0.1)'
                                        : 'rgba(255, 255, 255, 0.4)',
                                    borderRadius: '12px',
                                    zIndex: 2,
                                    cursor: isCableMode ? 'default' : 'grab',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease',
                                    boxShadow: isSelected ? '0 8px 32px rgba(0, 114, 255, 0.3)' : '0 4px 15px rgba(0,0,0,0.05)',
                                    pointerEvents: 'all'
                                }}
                                className="glass-area"
                            >
                                <div style={{
                                    padding: '8px 12px',
                                    background: isSelected
                                        ? 'linear-gradient(90deg, rgba(0, 114, 255, 0.2) 0%, rgba(0, 114, 255, 0.05) 100%)'
                                        : 'linear-gradient(90deg, rgba(0, 123, 255, 0.1) 0%, rgba(0, 123, 255, 0.02) 100%)',
                                    borderBottom: '1px solid rgba(0, 123, 255, 0.1)',
                                    fontWeight: 700,
                                    color: isSelected ? '#0056b3' : '#2c3e50',
                                    fontSize: '13px',
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase',
                                    userSelect: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ opacity: 0.6 }}>📍</span>
                                        {area.name}
                                    </div>

                                    {isSelected && onDeleteArea && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteArea(area.id);
                                            }}
                                            style={{
                                                background: '#ffefef',
                                                border: '1px solid #ffcfcf',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                padding: '2px 6px',
                                                fontSize: '14px',
                                                color: '#d32f2f',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s'
                                            }}
                                            title="Delete Area"
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#ffe0e0')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffefef')}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                }

                {/* PREVIEW AREA (When Drawing) */}
                {
                    previewArea && (
                        <div
                            style={{
                                position: 'absolute',
                                left: previewArea.x,
                                top: previewArea.y,
                                width: previewArea.width,
                                height: previewArea.height,
                                border: '2px dashed #0072ff',
                                backgroundColor: 'rgba(0, 114, 255, 0.25)',
                                borderRadius: '12px',
                                zIndex: 1000,
                                pointerEvents: 'none',
                                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.2)',
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                            className="area-preview-rect glass-area"
                        >
                            <div style={{
                                padding: '8px 12px',
                                background: 'rgba(0, 114, 255, 0.1)',
                                borderBottom: '1px solid rgba(0, 114, 255, 0.2)',
                                fontWeight: 700,
                                color: '#0056b3',
                                fontSize: '12px',
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '16px' }}>📐</span>
                                    <span>New Area</span>
                                    <span style={{ fontSize: '9px', opacity: 0.7, marginTop: '4px' }}>Release to Confirm</span>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* SVG Layer for Connections */}
                <svg style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none', // Svg itself transparent to clicks
                    zIndex: 5,
                }}>
                    <style>
                        {`
                        @keyframes wifiDashFlow {
                            to { stroke-dashoffset: -20; }
                        }
                        `}
                    </style>
                    {connections.map(conn => {
                        const source = getPortPosition(conn.sourceId, conn.sourcePortId);
                        const target = getPortPosition(conn.targetId, conn.targetPortId);

                        // Cable Visualization Logic
                        let color = '#333'; // Default (Copper/Cat5)
                        let dashArray = 'none';
                        let width = '3';

                        switch (conn.cableType) {
                            case 'fiber_sm':
                            case 'fiber_mm':
                                color = '#007bff'; // Blue for Fiber
                                dashArray = '5,5';
                                break;
                            case 'coax':
                                color = '#fd7e14'; // Orange for Coax
                                width = '4';
                                break;
                            case 'dsl':
                                color = '#6f42c1'; // Purple for DSL
                                width = '2';
                                break;
                            case 'console':
                                color = '#17a2b8'; // Cyan for Console
                                dashArray = '2,2';
                                break;
                            case 'wireless':
                                color = '#0dcaf0'; // Cyan/Blueish
                                dashArray = '10,10'; // Large Dash for Wireless
                                width = '2';
                                // Optional: Could simulate waves with a custom path or animation if SVG allows,
                                // but dashed line is the standard diagram representation.
                                break;
                            case 'cat6':
                            case 'cat6a':
                                color = '#28a745'; // Green for High-speed Copper
                                break;
                            default:
                                color = '#333'; // Standard Black/Grey for Cat5
                        }

                        const devA = items.find(d => d.id === conn.sourceId);
                        const devB = items.find(d => d.id === conn.targetId);

                        let isPhysicalError = false;
                        let errorReason = "";

                        if (devA && devB) {
                            const validation = ConnectionValidator.validate(devA, devB, conn.cableType);
                            if (!validation.isValid) {
                                isPhysicalError = true;
                                errorReason = validation.reason || "Invalid Physical Connection";
                            }
                        }

                        // Status Overrides
                        if (conn.status === 'warning') color = '#ffc107';
                        if (conn.status === 'error' || isPhysicalError) color = '#dc3545';
                        if (isPhysicalError) dashArray = '5,5';

                        // Selection / Highlight
                        if (highlightedConnectionIds.includes(conn.id)) {
                            color = '#28a745'; // Bright Green for success
                            width = '6';
                            dashArray = 'none';
                        }

                        return (
                            <g key={conn.id}>
                                {/* Invisible Wide Line for easier clicking */}
                                <line
                                    x1={source.x}
                                    y1={source.y}
                                    x2={target.x}
                                    y2={target.y}
                                    stroke="transparent"
                                    strokeWidth="15"
                                    style={{
                                        cursor: isDeleteMode ? 'pointer' : 'default',
                                        pointerEvents: 'visibleStroke' // Capture clicks
                                    }}
                                    onClick={(e) => {
                                        if (isDeleteMode) {
                                            e.stopPropagation();
                                            onDeleteConnection(conn.id);
                                        }
                                    }}
                                >
                                    <title>{isPhysicalError ? `⚠️ ${errorReason}` : (CABLE_DEFINITIONS[conn.cableType]?.label || 'Cable')}</title>
                                </line>
                                {/* Visible Line */}
                                <line
                                    x1={source.x}
                                    y1={source.y}
                                    x2={target.x}
                                    y2={target.y}
                                    stroke={color}
                                    strokeWidth={width}
                                    strokeDasharray={dashArray}
                                    pointerEvents="none" // Let clicks pass to the wide line
                                    style={conn.cableType === 'wireless' ? { transition: 'all 0.3s', animation: 'wifiDashFlow 1s linear infinite' } : { transition: 'all 0.3s' }}
                                />
                            </g>
                        );
                    })}

                    {/* PACKET ANIMATION LAYER */}
                    {renderedPackets.map(packet => {
                        const { x, y, segmentIndex } = interpolatePosition(packet.path, packet.progress);
                        const isBlackPacket = packet.color === '#000000';
                        const opacity = (isBlackPacket && packet.progress >= 0.45) ? (0.5 - packet.progress) * 10 : 1;
                        const flicker = (isBlackPacket && Math.random() > 0.8) ? 0.3 : 1;

                        const currentCableType = packet.cableTypes?.[segmentIndex] || 'cat5';
                        const isWireless = currentCableType === 'wireless';

                        if (isWireless && !isBlackPacket) {
                            return (
                                <g key={packet.id} style={{ opacity: opacity * flicker, transition: 'opacity 0.1s ease', filter: `drop-shadow(0 0 4px #eab308)` }}>
                                    <path d={`M ${x - 6} ${y} Q ${x} ${y - 6} ${x + 6} ${y} M ${x - 10} ${y - 4} Q ${x} ${y - 12} ${x + 10} ${y - 4} M ${x - 14} ${y - 8} Q ${x} ${y - 18} ${x + 14} ${y - 8}`} fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
                                    <circle cx={x} cy={y + 3} r="2" fill="#eab308" />
                                </g>
                            );
                        }

                        return (
                            <circle
                                key={packet.id}
                                cx={x}
                                cy={y}
                                r={isBlackPacket ? 5 : 4}
                                fill={packet.color}
                                style={{
                                    filter: isBlackPacket ? 'none' : `drop-shadow(0 0 6px ${packet.color})`,
                                    opacity: opacity * flicker,
                                    transition: 'opacity 0.1s ease'
                                }}
                            />
                        );
                    })}
                </svg>

                {
                    items.map((item) => {
                        const isSelected = selectedId === item.id;
                        return (
                            <div
                                key={item.id}
                                draggable={!isCableMode && !isPanMode}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', `MOVE:${item.id}:${e.nativeEvent.offsetX}:${e.nativeEvent.offsetY}`);
                                    e.dataTransfer.effectAllowed = 'copyMove';
                                    e.stopPropagation();
                                    if (!isCableMode) onSelect(item.id);
                                }}
                                onClick={(e) => {
                                    if (isDeleteMode) {
                                        e.stopPropagation();
                                        onDeleteDevice(item.id);
                                    } else {
                                        handleDeviceClick(e, item.id);
                                    }
                                }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    onInspect(item.id);
                                }}
                                style={{
                                    position: 'absolute',
                                    left: item.x,
                                    top: item.y,
                                    width: '90px',
                                    cursor: isCableMode ? 'crosshair' : (isPanMode ? 'grab' : 'move'),
                                    userSelect: 'none',
                                    zIndex: 10,
                                }}
                            >
                                <div style={{
                                    width: '70px',
                                    height: '70px',
                                    margin: '0 auto',
                                    background: '#fff',
                                    border: `2px solid ${isSelected ? '#007bff' : '#ccc'}`,
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: isSelected ? '0 0 10px rgba(0,123,255,0.5)' : '0 2px 8px rgba(0,0,0,0.1)',
                                    position: 'relative', // For ports
                                    transition: 'all 0.2s ease'
                                }}>
                                    <img
                                        src={getIconForType(item.type)}
                                        alt={item.type}
                                        style={{ width: '60px', height: '60px', objectFit: 'contain', pointerEvents: 'none' }}
                                    />
                                    {/* Public Facing Badge for DMZ Servers */}
                                    {item.type === 'Server' && areas.some(a => a.name.toUpperCase().includes('DMZ') &&
                                        item.x >= a.x && item.x <= a.x + a.width &&
                                        item.y >= a.y && item.y <= a.y + a.height) && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '-8px',
                                                right: '-8px',
                                                background: '#ff7e5f',
                                                color: 'white',
                                                fontSize: '9px',
                                                padding: '2px 5px',
                                                borderRadius: '4px',
                                                fontWeight: 'bold',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                zIndex: 30
                                            }}>
                                                PUBLIC
                                            </div>
                                        )}
                                    {/* Ports Rendering */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '-12px',
                                        display: 'flex',
                                        gap: '3px', // Tighter overlap
                                        transform: 'translateX(-50%)', // Centering strategy might need adjustment
                                        left: '50%',
                                        width: 'max-content',
                                        zIndex: 20
                                    }}>
                                        {item.ports.map(port => {
                                            const isSelectedPort = isCableMode && (
                                                (cableSourceId === item.id && cableSourcePortId === port.id)
                                            );
                                            const sourceDevice = cableSourceId !== null ? items.find(d => d.id === cableSourceId) : null;
                                            const isConnectionValid = sourceDevice && !port.isOccupied && ConnectionValidator.validate(sourceDevice, item, 'cat5').isValid;

                                            let portColor = port.isOccupied ? '#10b981' : '#ef4444'; // Green=Occupied, Red=Free
                                            const isFwInsideTarget = networkScope === 'WAN' && guideStep === 6 && item.type === 'Firewall' && !port.isOccupied;
                                            const isFwDMZTarget = networkScope === 'WAN' && (guideStep === 8) && item.type === 'Firewall' && !port.isOccupied;

                                            if (isSelectedPort) portColor = '#2563eb'; // Blue=Selection
                                            else if (isConnectionValid) portColor = '#fbbf24'; // Yellow/Amber=Vaild Target Highlight
                                            else if (isFwInsideTarget) portColor = '#4facfe'; // Light Blue for INSIDE highlight
                                            else if (isFwDMZTarget) portColor = '#ff7e5f'; // Light Orange for DMZ highlight

                                            return (
                                                <div
                                                    key={port.id}
                                                    onClick={(e) => handlePortClick(e, item.id, port.id)}
                                                    style={{
                                                        width: '10px',
                                                        height: '10px',
                                                        borderRadius: '50%',
                                                        background: portColor,
                                                        border: (isConnectionValid || isFwInsideTarget || isFwDMZTarget) ? '2px solid #fff' : '1px solid #000',
                                                        cursor: isCableMode ? 'pointer' : 'default',
                                                        boxShadow: isConnectionValid ? '0 0 8px #fbbf24' : (isFwInsideTarget ? '0 0 12px #4facfe' : (isFwDMZTarget ? '0 0 12px #ff7e5f' : 'none')),
                                                        transition: 'all 0.2s ease',
                                                        transform: (isConnectionValid || isFwInsideTarget || isFwDMZTarget) ? 'scale(1.2)' : 'scale(1)'
                                                    }}
                                                    title={isFwInsideTarget ? "Firewall INSIDE: Connect your internal switch here" : (isFwDMZTarget ? "Firewall DMZ: Connect your DMZ switch here" : `${port.name} (${port.isOccupied ? 'Occupied' : 'Free'}) ${isConnectionValid ? '- Valid Destination' : ''}`)}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center', marginTop: '5px', fontSize: '12px' }}>{item.name}</div>
                            </div>
                        );
                    })
                }

                {/* TRANSFORM CONTENT END */}
            </div>
            {/* Ghost Preview Layer */}
            {draggedDeviceType && mousePos && (
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.zoom})`,
                    transformOrigin: '0 0',
                    zIndex: 15
                }}>
                    <div style={{
                        position: 'absolute',
                        left: snapToGrid(mousePos.x) - ITEM_WIDTH / 2,
                        top: snapToGrid(mousePos.y) - ITEM_HEIGHT / 2,
                        width: ITEM_WIDTH,
                        height: ITEM_HEIGHT,
                        opacity: 0.5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <img
                            src={getIconForType(draggedDeviceType as DeviceType)}
                            alt="Ghost"
                            style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                        />
                        <div style={{
                            marginTop: '2px',
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '10px'
                        }}>
                            Place {draggedDeviceType}
                        </div>
                    </div>
                </div>
            )}

            {/* Placement Recommendation Zones (For WAN Wizard) */}
            {draggedDeviceType && networkScope === 'WAN' && (
                <div style={{
                    position: 'absolute',
                    left: 0, top: 0, width: '100%', height: '100%',
                    pointerEvents: 'none',
                    transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.zoom})`,
                    transformOrigin: '0 0',
                    zIndex: 2
                }}>
                    {/* WAN Wizard Step Recommendations (7-Step Flow) */}
                    {guideStep === 1 && (
                        <div style={{ position: 'absolute', left: 50, top: 150, width: 200, height: 150, border: '2px dashed #4facfe', background: 'rgba(79, 172, 254, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#007bff', fontWeight: 'bold' }}>
                            Internet Cloud
                        </div>
                    )}
                    {guideStep === 2 && (
                        <div style={{ position: 'absolute', left: 300, top: 150, width: 200, height: 150, border: '2px dashed #00f2fe', background: 'rgba(0, 242, 254, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00c6fb', fontWeight: 'bold' }}>
                            Edge Router
                        </div>
                    )}
                    {/* Step 3 (Connection) visual - can highlight the path or just show a small indicator */}
                    {guideStep === 4 && (
                        <div style={{ position: 'absolute', left: 550, top: 150, width: 200, height: 150, border: '2px dashed #fa709a', background: 'rgba(250, 112, 154, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d63384', fontWeight: 'bold' }}>
                            Perimeter Firewall
                        </div>
                    )}
                    {guideStep === 6 && (
                        <div style={{ position: 'absolute', left: 550, top: 350, width: 400, height: 300, border: '2px dashed #4facfe', background: 'rgba(79, 172, 254, 0.08)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#007bff', fontWeight: 'bold' }}>
                            <span>Employee LAN</span>
                            <span style={{ fontSize: '11px', opacity: 0.8 }}>(Internal Office Network)</span>
                        </div>
                    )}
                    {/* DMZ Zone Recommendations (Steps 7-10) */}
                    {(guideStep >= 7 && guideStep <= 10) && (
                        <div style={{ position: 'absolute', left: 100, top: 350, width: 350, height: 300, border: '2px dashed #ff7e5f', background: 'rgba(255, 126, 95, 0.08)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ff7e5f', fontWeight: 'bold' }}>
                            <span>DMZ Zone</span>
                            <span style={{ fontSize: '11px', opacity: 0.8 }}>
                                {guideStep === 7 ? "(Place DMZ Switch)" :
                                    guideStep === 8 ? "(Connect to Firewall)" :
                                        guideStep === 9 ? "(Add Public Server)" :
                                            "(Connect Server to Switch)"}
                            </span>
                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', background: 'white', padding: '4px 8px', borderRadius: '15px', color: '#666', border: '1px solid #ff7e5f' }}>
                                ℹ️ DMZ isolates public servers from internal employees.
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div >
    );
};
