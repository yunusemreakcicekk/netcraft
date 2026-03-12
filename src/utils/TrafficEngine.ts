import type { Device, Connection, Packet, PacketStatus, Point, PacketType, CableType } from '../types/models';
import { CABLE_DEFINITIONS } from './CableDefinitions';
import { TopologyAnalyzer } from './TopologyAnalyzer';
import { ConnectionValidator } from './ConnectionValidator';

export class TrafficEngine {
    private devices: Device[];
    private connections: Connection[];

    constructor(devices: Device[], connections: Connection[]) {
        this.devices = devices;
        this.connections = connections;
    }

    // Static Helper for UI Validation
    public static checkNetworkReadiness(devices: Device[], connections: Connection[]): boolean {
        const endDevices = devices.filter(d => ['PC', 'Laptop', 'Server', 'Printer'].includes(d.type));
        const gateways = devices.filter(d => ['Router', 'Modem', 'Firewall'].includes(d.type));

        if (endDevices.length === 0) return false;
        if (gateways.length === 0) return false;

        const analyzer = new TopologyAnalyzer(devices, connections);

        return endDevices.some(ed => {
            return gateways.some(gw => {
                const path = analyzer.findPath(ed.id, gw.id);
                if (!path || path.length === 0) return false;

                return path.every(cid => {
                    const c = connections.find(x => x.id === cid);
                    if (!c) return false;

                    const devA = devices.find(d => d.id === c.sourceId);
                    const devB = devices.find(d => d.id === c.targetId);
                    if (!devA || !devB) return false;

                    const validation = ConnectionValidator.validate(devA, devB, c.cableType);
                    return validation.isValid && (CABLE_DEFINITIONS[c.cableType]?.supportsTraffic || false);
                });
            });
        });
    }

    // Dynamic Packet Generation Strategy
    // Generates an array of packets per tick to support broadcasts
    public generateRandomPacketsTick(): Packet[] {
        const analyzer = new TopologyAnalyzer(this.devices, this.connections);

        const internetSource = this.devices.find(d => d.type === 'Internet');
        const hasFirewall = this.devices.some(d => d.type === 'Firewall');

        // Security Check: If Internet exists but no Firewall is in between
        if (internetSource && !hasFirewall) {
            // High chance to spawn threat packet if no firewall
            if (Math.random() < 0.4) {
                const neighbors = analyzer.getNeighbors(internetSource.id).map(nid => this.devices.find(d => d.id === nid));
                const target = neighbors.find(n => n?.type === 'Router' || n?.type === 'Modem');

                if (target) {
                    return [{
                        id: `sec_alert_${Date.now()}`,
                        type: 'WAN_UPLINK',
                        path: [{ x: internetSource.x + 40, y: internetSource.y + 40 }, { x: target.x + 40, y: target.y + 40 }],
                        status: 'COMPROMISED',
                        speed: 3, // Fast aggressive threat
                        progress: 0,
                        color: '#ff0000' // Pure red for critical alert
                    }];
                }
            }
        }

        let endDevices = this.devices.filter(d => ['PC', 'Laptop', 'Server', 'Printer'].includes(d.type));

        // Enforce that wireless devices only send traffic if their AP has a wired uplink
        endDevices = endDevices.filter(d => {
            const hasApConns = this.connections.some(c => {
                const isConnToCurrentDev = c.sourceId === d.id || c.targetId === d.id;
                if (!isConnToCurrentDev) return false;
                const other = this.devices.find(x => x.id === (c.sourceId === d.id ? c.targetId : c.sourceId));
                return other && other.type === 'AccessPoint';
            });

            if (hasApConns) {
                const apConns = this.connections.filter(c => c.sourceId === d.id || c.targetId === d.id);
                for (const c of apConns) {
                    const apId = c.sourceId === d.id ? c.targetId : c.sourceId;
                    const ap = this.devices.find(x => x.id === apId && x.type === 'AccessPoint');
                    if (ap) {
                        const apUplinks = this.connections.some(u =>
                            (u.sourceId === ap.id || u.targetId === ap.id) &&
                            u.id !== c.id &&
                            ['copper', 'cat5', 'cat6', 'cat6a', 'fiber_sm', 'fiber_mm'].includes(u.cableType)
                        );
                        if (apUplinks) return true;
                    }
                }
                return false;
            }
            return true;
        });
        const gateways = this.devices.filter(d => ['Router', 'Firewall'].includes(d.type));
        const modems = this.devices.filter(d => d.type === 'Modem');

        // Need at least 1 device to generate traffic
        const hasGateway = modems.length > 0 || gateways.length > 0;
        if (endDevices.length === 0 && !hasGateway) return [];

        // Heuristic to detect topology complexity
        const switches = this.devices.filter(d => d.type === 'Switch');
        const isManOrCampus = switches.length >= 2;

        // Decision Logic
        const rand = Math.random();
        let type: PacketType = 'LAN_INTERNAL';
        // Detect WAN availability:
        // (a) Classic: modem present and gateway connected
        // (b) Modern: Internet Cloud directly reachable from a Router (Copper/Fiber/Coax, no Console)
        const hasWAN = (modems.length > 0 && gateways.length > 0) ||
            (gateways.length > 0 && analyzer.hasInternetReachableFromRouter());

        // Broadcast chance for Office/LAN scenarios (15% chance to do a broadcast)
        const isBroadcast = endDevices.length >= 2 && switches.length >= 1 && rand < 0.15;

        if (isBroadcast) {
            type = 'BROADCAST_DISCOVERY';
        }
        // 10% WAN (if WAN link exists/Modem)
        else if (hasWAN && rand > 0.9) {
            type = 'WAN_UPLINK';
        }
        // 20% Gateway (if Gateway exists)
        else if (gateways.length > 0 && rand > 0.7) {
            type = 'TO_GATEWAY';
        }
        // 30% Inter-Area (if MAN)
        else if (isManOrCampus && rand > 0.4) {
            // We reuse 'LAN_INTERNAL' type but ensure path crosses switches
            // For visualization, we keep color Green, but logic will force cross-switch
            type = 'LAN_INTERNAL';
        }
        // 40% Intra-Area (LAN)
        else {
            type = 'LAN_INTERNAL';
        }

        let pathIds: number[] | null = null;
        let startDeviceId = -1;

        if (type === 'BROADCAST_DISCOVERY') {
            // Pick a random sender (PC/Laptop usually)
            const senderCandidates = endDevices.filter(d => ['PC', 'Laptop'].includes(d.type));
            if (senderCandidates.length > 0) {
                const source = senderCandidates[Math.floor(Math.random() * senderCandidates.length)];
                // Find all devices in the same collision/broadcast domain (connected to switches)
                const broadcastPackets: Packet[] = [];
                // Simple heuristic: from source -> switch -> all others
                const sourceSwitchNode = analyzer.getNeighbors(source.id).find(nid => this.devices.find(d => d.id === nid)?.type === 'Switch');
                if (sourceSwitchNode) {
                    const others = endDevices.filter(d => d.id !== source.id);
                    others.forEach(other => {
                        const path = analyzer.findPath(source.id, other.id);
                        if (path && path.length > 0 && this.isPathTrafficCapable(path)) {
                            const points = this.convertConnectionPathToPoints(source.id, path);
                            broadcastPackets.push(this.createPacket(
                                `brd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                                points,
                                'HEALTHY',
                                type,
                                path.map(cid => {
                                    const c = this.connections.find(x => x.id === cid);
                                    return c ? c.cableType : 'cat5';
                                })
                            ));
                        }
                    });
                    if (broadcastPackets.length > 0) return broadcastPackets;
                }
            }
        } else if (type === 'LAN_INTERNAL') {
            const wantInterArea = isManOrCampus && rand > 0.4 && rand <= 0.7; // The 30% slice (0.7 to 0.4)

            const switchMap = new Map<number, number[]>();
            switches.forEach(sw => {
                const neighbors = analyzer.getNeighbors(sw.id);
                const localDevs = neighbors.filter(nid => {
                    const d = this.devices.find(dev => dev.id === nid);
                    return d && ['PC', 'Laptop', 'Server', 'Printer', 'AccessPoint'].includes(d.type);
                });

                const expandedDevs: number[] = [];
                localDevs.forEach(ldId => {
                    const d = this.devices.find(dev => dev.id === ldId);
                    if (d?.type === 'AccessPoint') {
                        expandedDevs.push(ldId);
                        const apNeighbors = analyzer.getNeighbors(ldId);
                        const clients = apNeighbors.filter(cid => {
                            const c = this.devices.find(x => x.id === cid);
                            return c && ['Laptop', 'PC'].includes(c.type);
                        });
                        expandedDevs.push(...clients);
                    } else {
                        expandedDevs.push(ldId);
                    }
                });

                switchMap.set(sw.id, expandedDevs);
            });

            if (wantInterArea && switches.length >= 2) {
                const sw1 = switches[Math.floor(Math.random() * switches.length)];
                let sw2 = switches[Math.floor(Math.random() * switches.length)];
                while (sw1.id === sw2.id) sw2 = switches[Math.floor(Math.random() * switches.length)];

                const devs1 = switchMap.get(sw1.id) || [];
                const devs2 = switchMap.get(sw2.id) || [];

                if (devs1.length > 0 && devs2.length > 0) {
                    const sourceId = devs1[Math.floor(Math.random() * devs1.length)];
                    const targetId = devs2[Math.floor(Math.random() * devs2.length)];
                    startDeviceId = sourceId;
                    pathIds = analyzer.findPath(sourceId, targetId);
                }
            } else {
                const activeSwitches = switches.filter(s => (switchMap.get(s.id)?.length || 0) > 1);
                if (activeSwitches.length > 0) {
                    const sw = activeSwitches[Math.floor(Math.random() * activeSwitches.length)];
                    const devs = switchMap.get(sw.id)!;
                    const idx1 = Math.floor(Math.random() * devs.length);
                    let idx2 = Math.floor(Math.random() * devs.length);
                    while (idx1 === idx2) idx2 = Math.floor(Math.random() * devs.length);

                    startDeviceId = devs[idx1];
                    pathIds = analyzer.findPath(devs[idx1], devs[idx2]);
                } else {
                    if (endDevices.length > 1) {
                        const idx1 = Math.floor(Math.random() * endDevices.length);
                        let idx2 = Math.floor(Math.random() * endDevices.length);
                        while (idx1 === idx2) idx2 = Math.floor(Math.random() * endDevices.length);
                        startDeviceId = endDevices[idx1].id;
                        pathIds = analyzer.findPath(endDevices[idx1].id, endDevices[idx2].id);
                    }
                }
            }

        } else if (type === 'WAN_UPLINK') {
            const internet = this.devices.find(d => d.type === 'Internet');
            if (internet) {
                // Try from an end device to internet, or internet to end device
                if (endDevices.length > 0) {
                    const dev = endDevices[Math.floor(Math.random() * endDevices.length)];
                    const isDownlink = Math.random() > 0.5;
                    startDeviceId = isDownlink ? internet.id : dev.id;
                    const endId = isDownlink ? dev.id : internet.id;
                    pathIds = analyzer.findPath(startDeviceId, endId);

                    if (!pathIds || pathIds.length === 0) {
                        // Fallback if no valid full path is found, just do Edge to Internet if possible
                        const edge = this.devices.find(d => d.type === 'Router');
                        if (edge) {
                            startDeviceId = isDownlink ? internet.id : edge.id;
                            pathIds = analyzer.findPath(startDeviceId, isDownlink ? edge.id : internet.id);
                        }
                    }
                } else {
                    const edge = this.devices.find(d => d.type === 'Router');
                    if (edge) {
                        const isDownlink = Math.random() > 0.5;
                        startDeviceId = isDownlink ? internet.id : edge.id;
                        pathIds = analyzer.findPath(startDeviceId, isDownlink ? edge.id : internet.id);
                    }
                }
            } else {
                const gw = gateways[Math.floor(Math.random() * gateways.length)];
                const modem = modems[Math.floor(Math.random() * modems.length)];
                if (gw && modem) {
                    pathIds = analyzer.findPath(gw.id, modem.id);
                    startDeviceId = gw.id;
                }
            }

        } else {
            // TO_GATEWAY
            if (endDevices.length > 0) {
                const device = endDevices[Math.floor(Math.random() * endDevices.length)];
                startDeviceId = device.id;

                const routers = this.devices.filter(d => d.type === 'Router');
                const target = routers.length > 0 ? routers[0] : gateways[0];

                if (target) {
                    pathIds = analyzer.findPath(device.id, target.id);

                    // Office LAN Broken Link Logic (Missing Router Link)
                    if (!pathIds || pathIds.length === 0) {
                        const connectedSwitchId = analyzer.getNeighbors(device.id).find(nid => this.devices.find(d => d.id === nid)?.type === 'Switch');
                        if (connectedSwitchId && routers.length > 0) {
                            const swA = this.devices.find(d => d.id === connectedSwitchId);
                            const c = this.connections.find(conn => (conn.sourceId === device.id && conn.targetId === connectedSwitchId) || (conn.targetId === device.id && conn.sourceId === connectedSwitchId));
                            if (swA && c && this.isPathTrafficCapable([c.id])) {
                                const points = this.convertConnectionPathToPoints(device.id, [c.id]);
                                return [{
                                    id: `broken_gw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                                    type: 'TO_GATEWAY',
                                    path: points,
                                    cableTypes: [c.cableType],
                                    status: 'COMPROMISED',
                                    speed: 1,
                                    progress: 0,
                                    color: '#ff0000'
                                }];
                            }
                        }
                    }
                }
            }
        }

        // --- BLACK PACKET LOGIC (Invalid Cabling) ---
        if (!pathIds || pathIds.length === 0) {
            const potentialSources = endDevices.filter(d => {
                const conns = this.connections.filter(c => c.sourceId === d.id || c.targetId === d.id);
                return conns.some(c => {
                    const otherId = c.sourceId === d.id ? c.targetId : c.sourceId;
                    const other = this.devices.find(x => x.id === otherId);
                    return other && !ConnectionValidator.validate(d, other, c.cableType).isValid;
                });
            });

            if (potentialSources.length > 0 && Math.random() < 0.4) {
                const source = potentialSources[Math.floor(Math.random() * potentialSources.length)];
                const invConn = this.connections.find(c => {
                    if (c.sourceId === source.id || c.targetId === source.id) {
                        const otherId = c.sourceId === source.id ? c.targetId : c.sourceId;
                        const other = this.devices.find(x => x.id === otherId);
                        return other && !ConnectionValidator.validate(source, other, c.cableType).isValid;
                    }
                    return false;
                });

                if (invConn) {
                    const otherId = invConn.sourceId === source.id ? invConn.targetId : invConn.sourceId;
                    const other = this.devices.find(x => x.id === otherId);
                    if (other) {
                        const points = [
                            { x: source.x + 40, y: source.y + 40 },
                            { x: other.x + 40, y: other.y + 40 }
                        ];
                        return [{
                            id: `invalid_link_${invConn.id}_${Date.now()}`,
                            type: 'LAN_INTERNAL',
                            path: points,
                            cableTypes: [invConn.cableType],
                            status: 'COMPROMISED',
                            speed: 0.3,
                            progress: 0,
                            color: '#000000'
                        }];
                    }
                }
            }
        }

        if (pathIds && pathIds.length > 0 && startDeviceId !== -1) {
            // CRITICAL CHECK: Ensure path supports traffic
            if (!this.isPathTrafficCapable(pathIds)) {
                return [];
            }

            const points = this.convertConnectionPathToPoints(startDeviceId, pathIds);

            // Enterprise Logic: Firewall Interception
            const pathContainsFirewall = pathIds.some(cid => {
                const c = this.connections.find(x => x.id === cid);
                const devA = this.devices.find(d => d.id === c?.sourceId);
                const devB = this.devices.find(d => d.id === c?.targetId);
                return devA?.type === 'Firewall' || devB?.type === 'Firewall';
            });

            // Determine Status for speed logic (Path quality)
            let pathStatus: PacketStatus = 'HEALTHY';
            let hasFiber = false;
            let hasWarning = false;
            pathIds.forEach(id => {
                const c = this.connections.find(x => x.id === id);
                if (c?.status === 'warning') hasWarning = true;
                if (c?.cableType === 'cat6a' || (c?.cableType && ['fiber_sm', 'fiber_mm'].includes(c.cableType))) hasFiber = true;
            });

            if (hasWarning) pathStatus = 'WARNING';
            if (hasFiber) pathStatus = 'FAST';
            if (type === 'WAN_UPLINK') { pathStatus = 'FAST'; }
            if (type === 'LAN_INTERNAL') pathStatus = 'HEALTHY';

            // If WAN traffic doesn't hit a Firewall, it's risky (Red)
            if (type === 'WAN_UPLINK' && !pathContainsFirewall) {
                pathStatus = 'COMPROMISED';
            }

            return [this.createPacket(
                `pkt_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                points,
                pathStatus,
                type,
                pathIds.map(cid => {
                    const c = this.connections.find(x => x.id === cid);
                    return c ? c.cableType : 'cat5';
                })
            )];
        }

        return []; // No valid packet generated
    }

    // Deprecated static method to maintain compatibility if called elsewhere
    public generatePackets(): Packet[] { return []; }

    // Helper to check if path supports traffic AND is physically valid
    private isPathTrafficCapable(pIds: number[]): boolean {
        return pIds.every(cid => {
            const c = this.connections.find(yy => yy.id === cid);
            if (!c) return false;

            const devA = this.devices.find(d => d.id === c.sourceId);
            const devB = this.devices.find(d => d.id === c.targetId);
            if (!devA || !devB) return false;

            const validation = ConnectionValidator.validate(devA, devB, c.cableType);
            return validation.isValid && (CABLE_DEFINITIONS[c.cableType]?.supportsTraffic || false);
        });
    }

    private createPacket(id: string, path: Point[], status: PacketStatus, type: PacketType, cableTypes?: CableType[]): Packet {
        let color = "#22c55e"; // Green
        let speed = 1;

        if (type === 'LAN_INTERNAL') {
            color = "#22c55e"; // Green
            speed = 1;
        } else if (type === 'BROADCAST_DISCOVERY') {
            color = "#eab308"; // Yellow (Tailwind yellow-500)
            speed = 1;
        } else if (type === 'WAN_UPLINK') {
            color = "#dc3545"; // Red
            speed = 2; // Faster
        } else {
            // Gateway
            color = "#fab005"; // Yellow
            speed = 1;
        }

        if (cableTypes?.includes('wireless')) {
            color = "#eab308"; // Yellow for WiFi traffic
        }

        if (status === 'WARNING') speed = 0.5;
        if (status === 'FAST') speed = Math.max(speed, 1.5);

        return {
            id,
            type,
            path,
            cableTypes,
            status,
            speed,
            progress: 0, // Starts at 0
            color
        };
    }

    private convertConnectionPathToPoints(startDeviceId: number, connectionIds: number[]): Point[] {
        const points: Point[] = [];
        let currentDeviceId = startDeviceId;

        // Initial Point
        const startDevice = this.devices.find(d => d.id === currentDeviceId);
        if (startDevice) points.push({ x: startDevice.x + 40, y: startDevice.y + 40 }); // Center (+40)

        for (const connId of connectionIds) {
            const conn = this.connections.find(c => c.id === connId);
            if (!conn) continue;

            // Determine direction
            if (conn.sourceId === currentDeviceId) {
                // Outgoing from Source -> Target
                const targetDevice = this.devices.find(d => d.id === conn.targetId);
                if (targetDevice) {
                    points.push({ x: targetDevice.x + 40, y: targetDevice.y + 40 });
                    currentDeviceId = conn.targetId;
                }
            } else if (conn.targetId === currentDeviceId) {
                // Incoming to Source (which is actually Target in conn) -> Source
                const sourceDevice = this.devices.find(d => d.id === conn.sourceId);
                if (sourceDevice) {
                    points.push({ x: sourceDevice.x + 40, y: sourceDevice.y + 40 });
                    currentDeviceId = conn.sourceId;
                }
            }
        }
        return points;
    }
}
