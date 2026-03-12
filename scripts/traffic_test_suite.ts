
// ==========================================
// TYPES
// ==========================================
type DeviceType = 'PC' | 'Switch' | 'Router' | 'Laptop' | 'Server' | 'Printer' | 'Firewall' | 'Modem' | 'AccessPoint';

interface Port {
    id: string;
    name: string;
    type: 'ethernet';
    isOccupied: boolean;
}

interface Device {
    id: number;
    type: DeviceType;
    x: number;
    y: number;
    name: string;
    ports: Port[];
}

type ConnectionStatus = 'valid' | 'warning' | 'error';
type CableType =
    | 'cat5' | 'cat5e' | 'cat6' | 'cat6a'
    | 'fiber_sm' | 'fiber_mm'
    | 'coax'
    | 'dsl'
    | 'console'
    | 'wireless';

interface CableMeta {
    type: CableType;
    label: string;
    supportsTraffic: boolean;
    description: string;
    isWanLink?: boolean;
}

interface Connection {
    id: number;
    sourceId: number;
    sourcePortId: string;
    targetId: number;
    targetPortId: string;
    type: string;
    cableType: CableType;
    status: ConnectionStatus;
}

type NetworkScope = 'LAN_HOME' | 'LAN_OFFICE' | 'MAN' | 'WAN';

interface NetworkArea {
    id: number;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
    scope: NetworkScope;
}

interface Point {
    x: number;
    y: number;
}

type PacketStatus = "HEALTHY" | "WARNING" | "BROKEN" | "FAST" | "COMPROMISED";
type PacketType = 'LAN_INTERNAL' | 'TO_GATEWAY' | 'WAN_UPLINK';

interface Packet {
    id: string;
    type: PacketType;
    path: Point[];
    status: PacketStatus;
    speed: number;
    progress: number;
    color: string;
}

interface Segment {
    id: number;
    deviceIds: number[];
}

interface Warning {
    title: string;
    message: string;
    severity: "info" | "warning" | "error";
}

type NetworkType = 'LAN_HOME' | 'LAN_OFFICE' | 'LAN_BUILDING' | 'MAN' | 'WAN' | 'LAN_L2' | 'UNKNOWN';

interface HealthCheck {
    errors: string[];
    warnings: string[];
    infos: string[];
}

interface AnalysisReport {
    status: 'valid' | 'incomplete' | 'mismatch';
    detectedType: NetworkType;
    confidence: 'Low' | 'Medium' | 'High';
    complexity: 'Low' | 'Medium' | 'High';
    message: string;
    details: string;
    missingCriteria: string[];
    educationalTip: string;
    health: HealthCheck;
    stats: {
        deviceCount: number;
        broadcastDomains: number;
    };
}

// ==========================================
// CABLE DEFINITIONS
// ==========================================
const CABLE_DEFINITIONS: Record<CableType, CableMeta> = {
    'cat5': { type: 'cat5', label: 'Cat5 (100Mbps)', supportsTraffic: true, description: 'Standard copper cable.' },
    'cat5e': { type: 'cat5e', label: 'Cat5e (1Gbps)', supportsTraffic: true, description: 'Enhanced copper cable.' },
    'cat6': { type: 'cat6', label: 'Cat6 (10Gbps)', supportsTraffic: true, description: 'High-speed copper.' },
    'cat6a': { type: 'cat6a', label: 'Cat6a (10Gbps Long)', supportsTraffic: true, description: 'Augmented Cat6.' },
    'fiber_sm': { type: 'fiber_sm', label: 'Fiber (SM)', supportsTraffic: true, description: 'Long-distance fiber.' },
    'fiber_mm': { type: 'fiber_mm', label: 'Fiber (MM)', supportsTraffic: true, description: 'Short-distance fiber.' },
    'wireless': { type: 'wireless', label: 'Wireless', supportsTraffic: true, description: 'Wireless signal.' },
    'dsl': { type: 'dsl', label: 'DSL', supportsTraffic: false, isWanLink: true, description: 'Phone line.' },
    'coax': { type: 'coax', label: 'Coax', supportsTraffic: false, isWanLink: true, description: 'Cable internet.' },
    'console': { type: 'console', label: 'Console', supportsTraffic: false, description: 'Mgmt only.' }
};

// ==========================================
// TOPOLOGY ANALYZER
// ==========================================
class TopologyAnalyzer {
    public devices: Device[];
    public connections: Connection[];

    constructor(devices: Device[], connections: Connection[]) {
        this.devices = devices;
        this.connections = connections;
    }

    public getSegments(): Segment[] {
        const visited = new Set<number>();
        const segments: Segment[] = [];
        let segmentCounter = 1;

        for (const device of this.devices) {
            if (visited.has(device.id)) continue;
            if (device.type === 'Router') {
                visited.add(device.id);
                continue;
            }

            const currentSegmentDevices: number[] = [];
            const queue: number[] = [device.id];
            visited.add(device.id);

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                currentSegmentDevices.push(currentId);
                const currentDevice = this.devices.find(d => d.id === currentId);
                if (!currentDevice) continue;
                if (currentDevice.type === 'Router') continue;

                const neighbors = this.getNeighbors(currentId);
                for (const neighborId of neighbors) {
                    if (!visited.has(neighborId)) {
                        const neighbor = this.devices.find(d => d.id === neighborId);
                        if (neighbor && neighbor.type !== 'Router') {
                            visited.add(neighborId);
                            queue.push(neighborId);
                        }
                    }
                }
            }
            if (currentSegmentDevices.length > 0) {
                segments.push({ id: segmentCounter++, deviceIds: currentSegmentDevices });
            }
        }
        return segments;
    }

    public getNeighbors(deviceId: number): number[] {
        const neighborIds: number[] = [];
        for (const conn of this.connections) {
            if (conn.sourceId === deviceId) neighborIds.push(conn.targetId);
            if (conn.targetId === deviceId) neighborIds.push(conn.sourceId);
        }
        return neighborIds;
    }

    public findPath(startId: number, endId: number): number[] | null {
        if (startId === endId) return [];
        const queue: number[] = [startId];
        const visited = new Set<number>();
        visited.add(startId);
        const pathMap = new Map<number, { from: number, viaConnection: number }>();

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (currentId === endId) {
                const connectionIds: number[] = [];
                let curr = endId;
                while (curr !== startId) {
                    const step = pathMap.get(curr);
                    if (!step) break;
                    connectionIds.push(step.viaConnection);
                    curr = step.from;
                }
                return connectionIds.reverse();
            }

            for (const conn of this.connections) {
                let neighborId = -1;
                if (conn.sourceId === currentId) neighborId = conn.targetId;
                else if (conn.targetId === currentId) neighborId = conn.sourceId;

                if (neighborId !== -1 && !visited.has(neighborId)) {
                    visited.add(neighborId);
                    pathMap.set(neighborId, { from: currentId, viaConnection: conn.id });
                    queue.push(neighborId);
                }
            }
        }
        return null;
    }
}

// ==========================================
// TRAFFIC ENGINE
// ==========================================
class TrafficEngine {
    private devices: Device[];
    private connections: Connection[];

    constructor(devices: Device[], connections: Connection[]) {
        this.devices = devices;
        this.connections = connections;
    }

    public generateRandomPacket(): Packet | null {
        const analyzer = new TopologyAnalyzer(this.devices, this.connections);
        const hasFirewall = this.devices.some(d => d.type === 'Firewall');
        const wanCables = this.connections.filter(c => CABLE_DEFINITIONS[c.cableType]?.isWanLink);

        if (wanCables.length > 0 && !hasFirewall) {
            if (Math.random() < 0.3) {
                const c = wanCables[Math.floor(Math.random() * wanCables.length)];
                const source = this.getPortPosition(c.sourceId, c.sourcePortId);
                const target = this.getPortPosition(c.targetId, c.targetPortId);
                return {
                    id: `security_risk_${c.id}_${Date.now()}`,
                    type: 'WAN_UPLINK',
                    path: [source, target],
                    status: 'COMPROMISED',
                    speed: 1.5,
                    progress: 0,
                    color: '#000000'
                };
            }
        }

        const endDevices = this.devices.filter(d => ['PC', 'Laptop', 'Server', 'Printer'].includes(d.type));
        const gateways = this.devices.filter(d => ['Router', 'Firewall'].includes(d.type));
        const modems = this.devices.filter(d => d.type === 'Modem');
        const routers = this.devices.filter(d => d.type === 'Router');
        const firewalls = this.devices.filter(d => d.type === 'Firewall');

        const hasGateway = modems.length > 0 || gateways.length > 0;
        if (endDevices.length === 0 && !hasGateway) return null;

        const rand = Math.random();
        let type: PacketType = 'TO_GATEWAY';

        const hasWAN = modems.length > 0 && gateways.length > 0;
        const hasLAN = endDevices.length > 1;

        if (hasLAN && rand < 0.4) type = 'LAN_INTERNAL';
        else if (hasWAN && rand > 0.8) type = 'WAN_UPLINK';

        let pathIds: number[] | null = null;
        let startDeviceId = -1;

        if (type === 'LAN_INTERNAL') {
            const segments = analyzer.getSegments();
            const validSegments = segments.filter(s => {
                const devIds = s.deviceIds.filter(id => {
                    const d = this.devices.find(dev => dev.id === id);
                    return d && ['PC', 'Laptop', 'Server', 'Printer'].includes(d.type);
                });
                return devIds.length > 1;
            });

            let source, target;
            if (validSegments.length > 0) {
                const seg = validSegments[Math.floor(Math.random() * validSegments.length)];
                const validDevIds = seg.deviceIds.filter(id => {
                    const d = this.devices.find(dev => dev.id === id);
                    return d && ['PC', 'Laptop', 'Server', 'Printer'].includes(d.type);
                });
                if (validDevIds.length > 1) {
                    const idx1 = Math.floor(Math.random() * validDevIds.length);
                    let idx2 = Math.floor(Math.random() * validDevIds.length);
                    while (idx1 === idx2) idx2 = Math.floor(Math.random() * validDevIds.length);

                    source = this.devices.find(d => d.id === validDevIds[idx1]);
                    target = this.devices.find(d => d.id === validDevIds[idx2]);
                }
            } else {
                if (endDevices.length > 1) {
                    const idx1 = Math.floor(Math.random() * endDevices.length);
                    let idx2 = Math.floor(Math.random() * endDevices.length);
                    while (idx1 === idx2) idx2 = Math.floor(Math.random() * endDevices.length);
                    source = endDevices[idx1];
                    target = endDevices[idx2];
                }
            }

            if (source && target) {
                pathIds = analyzer.findPath(source.id, target.id);
                startDeviceId = source.id;
            }

        } else if (type === 'WAN_UPLINK') {
            const gw = gateways[Math.floor(Math.random() * gateways.length)];
            const modem = modems[Math.floor(Math.random() * modems.length)];
            if (gw && modem) {
                pathIds = analyzer.findPath(gw.id, modem.id);
                startDeviceId = gw.id;
            }

        } else {
            // TO_GATEWAY
            if (endDevices.length > 0) {
                const device = endDevices[Math.floor(Math.random() * endDevices.length)];
                startDeviceId = device.id;

                const allTargets = [...modems, ...routers, ...firewalls];
                let bestPath: number[] | null = null;
                let bestTargetVal: { id: number, priority: number } | null = null;

                const getPriority = (t: string) => {
                    if (t === 'Modem') return 3;
                    if (t === 'Router') return 2;
                    if (t === 'Firewall') return 1;
                    return 0;
                };

                for (const t of allTargets) {
                    if (t.id === device.id) continue;
                    const p = analyzer.findPath(device.id, t.id);
                    if (p && p.length > 0) {
                        const isCapable = p.every(cid => {
                            const c = this.connections.find(yy => yy.id === cid);
                            return c && CABLE_DEFINITIONS[c.cableType]?.supportsTraffic;
                        });

                        if (isCapable) {
                            const pri = getPriority(t.type);
                            if (!bestTargetVal || pri > bestTargetVal.priority || (pri === bestTargetVal.priority && p.length < bestPath!.length)) {
                                bestTargetVal = { id: t.id, priority: pri };
                                bestPath = p;
                            }
                        }
                    }
                }
                pathIds = bestPath;
            }
        }

        if (pathIds && pathIds.length > 0 && startDeviceId !== -1) {
            const points = this.convertConnectionPathToPoints(startDeviceId, pathIds);
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

            return this.createPacket(
                `pkt_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                points,
                pathStatus,
                type
            );
        }

        return null;
    }

    private createPacket(id: string, path: Point[], status: PacketStatus, type: PacketType): Packet {
        let color = "#22c55e";
        let speed = 1;

        if (type === 'LAN_INTERNAL') {
            color = "#22c55e";
            speed = 1;
        } else if (type === 'WAN_UPLINK') {
            color = "#10b981";
            speed = 2;
        } else {
            color = "#fab005";
            speed = 1;
        }

        if (status === 'WARNING') speed = 0.5;
        if (status === 'FAST') speed = Math.max(speed, 1.5);

        return {
            id,
            type,
            path,
            status,
            speed,
            progress: 0,
            color
        };
    }

    private convertConnectionPathToPoints(startDeviceId: number, connectionIds: number[]): Point[] {
        const points: Point[] = [];
        let currentDeviceId = startDeviceId;

        const startDevice = this.devices.find(d => d.id === currentDeviceId);
        if (startDevice) points.push({ x: startDevice.x + 40, y: startDevice.y + 40 });

        for (const connId of connectionIds) {
            const conn = this.connections.find(c => c.id === connId);
            if (!conn) continue;
            if (conn.sourceId === currentDeviceId) {
                const targetDevice = this.devices.find(d => d.id === conn.targetId);
                if (targetDevice) {
                    points.push({ x: targetDevice.x + 40, y: targetDevice.y + 40 });
                    currentDeviceId = conn.targetId;
                }
            } else if (conn.targetId === currentDeviceId) {
                const sourceDevice = this.devices.find(d => d.id === conn.sourceId);
                if (sourceDevice) {
                    points.push({ x: sourceDevice.x + 40, y: sourceDevice.y + 40 });
                    currentDeviceId = conn.sourceId;
                }
            }
        }
        return points;
    }

    private getPortPosition(deviceId: number, portId: string): Point {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) return { x: 0, y: 0 };
        return { x: device.x + 40, y: device.y + 40 };
    }
}

// ==========================================
// TEST RUNNER
// ==========================================
let deviceIdCounter = 1;
const createDevice = (type: string, x = 0, y = 0): Device => ({
    id: deviceIdCounter++,
    type: type as any,
    name: `${type}_${deviceIdCounter}`,
    x, y,
    ports: []
});

let connIdCounter = 1;
const createConnection = (source: Device, target: Device, cableType: CableType = 'cat6'): Connection => ({
    id: connIdCounter++,
    sourceId: source.id,
    sourcePortId: 'eth0',
    targetId: target.id,
    targetPortId: 'eth0',
    type: 'ethernet',
    cableType,
    status: 'valid'
});

async function runTests() {
    console.log("🧪 STARTING TRAFFIC ENGINE TESTS...");

    console.log("\n✅ TEST 1: LAN_INTERNAL");
    {
        const pc1 = createDevice('PC');
        const pc2 = createDevice('PC');
        const server = createDevice('Server');
        const switch1 = createDevice('Switch');
        const router = createDevice('Router');

        const devices = [pc1, pc2, server, switch1, router];
        const connections = [
            createConnection(pc1, switch1),
            createConnection(pc2, switch1),
            createConnection(server, switch1),
            createConnection(switch1, router)
        ];

        const engine = new TrafficEngine(devices, connections);
        let lanCount = 0;
        let gatewayCount = 0;
        let wanCount = 0;

        const start = Date.now();
        let count = 0;
        for (let i = 0; i < 100; i++) {
            const pkt = engine.generateRandomPacket();
            if (pkt) {
                count++;
                if (pkt.type === 'LAN_INTERNAL') lanCount++;
                else if (pkt.type === 'TO_GATEWAY') gatewayCount++;
                else if (pkt.type === 'WAN_UPLINK') wanCount++;
            }
        }
        console.log(`   Packets: LAN=${lanCount}, GATEWAY=${gatewayCount}, WAN=${wanCount}`);

        if (lanCount > 0 && gatewayCount > 0) {
            console.log("   [PASS] Generated both LAN and Gateway traffic.");
        } else {
            console.log("   [CHECK] Ratios may vary slightly due to randomness.");
        }
    }

    console.log("\n✅ TEST 3: WAN_UPLINK");
    {
        const pc = createDevice('PC');
        const switch1 = createDevice('Switch');
        const router = createDevice('Router');
        const modem = createDevice('Modem');

        const devices = [pc, switch1, router, modem];
        const connections = [
            createConnection(pc, switch1),
            createConnection(switch1, router),
            createConnection(router, modem, 'cat6')
        ];

        const engine = new TrafficEngine(devices, connections);
        let wanPktCount = 0;
        let brightGreenCount = 0;

        for (let i = 0; i < 50; i++) {
            const pkt = engine.generateRandomPacket();
            if (pkt && pkt.type === 'WAN_UPLINK') {
                wanPktCount++;
                if (pkt.color === '#10b981') brightGreenCount++;
            }
        }

        console.log(`   WAN Packets: ${wanPktCount}`);
        if (wanPktCount > 0 && brightGreenCount === wanPktCount) {
            console.log("   [PASS] WAN_UPLINK generated with correct color.");
        } else {
            console.log("   [FAIL] No WAN traffic or wrong color.");
        }
    }

    console.log("\n✅ TEST 4: Isolated LAN");
    {
        const pc1 = createDevice('PC');
        const pc2 = createDevice('PC');
        const switch1 = createDevice('Switch');

        const devices = [pc1, pc2, switch1];
        const connections = [
            createConnection(pc1, switch1),
            createConnection(pc2, switch1)
        ];

        const engine = new TrafficEngine(devices, connections);
        let gatewayCount = 0;
        let wanCount = 0;
        let lanCount = 0;

        for (let i = 0; i < 50; i++) {
            const pkt = engine.generateRandomPacket();
            if (pkt) {
                if (pkt.type === 'TO_GATEWAY') gatewayCount++;
                if (pkt.type === 'WAN_UPLINK') wanCount++;
                if (pkt.type === 'LAN_INTERNAL') lanCount++;
            }
        }

        console.log(`   Packets: LAN=${lanCount}, GATEWAY=${gatewayCount}, WAN=${wanCount}`);
        if (gatewayCount === 0 && wanCount === 0 && lanCount > 0) {
            console.log("   [PASS] Only LAN traffic generated.");
        } else {
            if (lanCount === 0) console.log("   [WARN] No LAN traffic generated (maybe randomness).");
            else console.log("   [FAIL] Unexpected traffic types found.");
        }
    }

    console.log("\n✅ TEST 5: Firewall Path");
    {
        const pc = createDevice('PC');
        const switch1 = createDevice('Switch');
        const firewall = createDevice('Firewall');
        const router = createDevice('Router');
        const modem = createDevice('Modem');

        const devices = [pc, switch1, firewall, router, modem];
        const connections = [
            createConnection(pc, switch1),
            createConnection(switch1, firewall),
            createConnection(firewall, router),
            createConnection(router, modem)
        ];

        const engine = new TrafficEngine(devices, connections);

        let found = false;
        for (let i = 0; i < 50; i++) {
            const pkt = engine.generateRandomPacket();
            if (pkt && pkt.type === 'TO_GATEWAY') {
                found = true;
                break;
            }
        }
        if (found) console.log("   [PASS] Firewall traffic generated.");
        else console.log("   [FAIL] No firewall traffic.");
    }
    console.log("\n✅ TEST 6: Performance (10 Devices)");
    {
        const switch1 = createDevice('Switch');
        const devices = [switch1];
        const connections: Connection[] = [];

        for (let i = 0; i < 10; i++) {
            const pc = createDevice('PC');
            devices.push(pc);
            connections.push(createConnection(pc, switch1));
        }

        const engine = new TrafficEngine(devices, connections);
        const start = Date.now();
        let count = 0;
        for (let i = 0; i < 100; i++) {
            if (engine.generateRandomPacket()) count++;
        }
        const end = Date.now();
        console.log(`   Generated ${count} packets in 100 iterations.`);
        console.log(`   Time taken: ${(end - start).toFixed(2)}ms`);
        if ((end - start) < 500) console.log("   [PASS] Performance is good.");
        else console.log("   [WARN] Performance might be slow.");
    }
}

runTests().catch(console.error);
