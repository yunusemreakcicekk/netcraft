
import { TrafficEngine } from '../src/utils/TrafficEngine';
import { Device, Connection, Packet, DeviceType, CableType } from '../src/types/models';

type TestScenario = {
    name: string;
    devices: Device[];
    connections: Connection[];
};

function createDevice(id: number, type: DeviceType, name: string): Device {
    return { id, type, name, x: 0, y: 0, ports: [] };
}

function createConnection(id: number, sourceId: number, targetId: number, cableType: CableType = 'cat6'): Connection {
    return { id, sourceId, targetId, sourcePortId: 'p1', targetPortId: 'p2', type: 'ethernet', cableType, status: 'valid' };
}

// Helper: Run TrafficEngine and collect stats
function runTest(scenario: TestScenario, count: number = 20) {
    const engine = new TrafficEngine(scenario.devices, scenario.connections);
    const results = {
        total: 0,
        LAN_INTERNAL: 0,
        TO_GATEWAY: 0,
        WAN_UPLINK: 0,
        COMPROMISED: 0,
        NULL: 0,
        errors: [] as string[]
    };

    const startTime = performance.now();
    for (let i = 0; i < count; i++) {
        const packet = engine.generateRandomPacket();
        if (packet) {
            results.total++;
            // @ts-ignore
            if (results[packet.type] !== undefined) results[packet.type]++;
            else if (packet.status === 'COMPROMISED') results.COMPROMISED++; // Security check returns type 'WAN_UPLINK' but status 'COMPROMISED'?
            // Wait, my code sets 'WAN_UPLINK' for security risk?
            // "type: 'WAN_UPLINK', status: 'COMPROMISED'" in my replaced code.
            // Oh, let me check the code I wrote.
            // "type: 'WAN_UPLINK'" for compromised packet. Status is COMPROMISED.

            // Checking logic specific to tests
            if (packet.type === 'LAN_INTERNAL') {
                // Verify endpoints are end devices
                // source/target logic is internal to engine return (path), can't easily check IDs without reverse point lookup or adding sourceId to packet.
                // But we can check color/speed.
                if (packet.color !== '#22c55e') results.errors.push(`LAN_INTERNAL wrong color: ${packet.color}`);
            }
        } else {
            results.NULL++;
        }
    }
    const endTime = performance.now();

    console.log(`\n--- Test: ${scenario.name} ---`);
    console.log(`Packets Generated: ${results.total}/${count}`);
    console.log(`Distribution: LAN=${results.LAN_INTERNAL}, GATEWAY=${results.TO_GATEWAY}, WAN=${results.WAN_UPLINK}, NULL=${results.NULL}`);
    console.log(`Time: ${(endTime - startTime).toFixed(2)}ms`);
    if (results.errors.length > 0) console.log("Errors:", results.errors);
}

// SCENARIO 1: Simple LAN + Router
const s1_devices = [
    createDevice(1, 'Router', 'Router1'),
    createDevice(2, 'Switch', 'Switch1'),
    createDevice(3, 'PC', 'PC1'),
    createDevice(4, 'PC', 'PC2'),
    createDevice(5, 'Server', 'Server1')
];
const s1_conns = [
    createConnection(1, 1, 2), // Router-Switch
    createConnection(2, 3, 2), // PC1-Switch
    createConnection(3, 4, 2), // PC2-Switch
    createConnection(4, 5, 2)  // Server-Switch
];
runTest({ name: "1. Simple LAN + Gateway", devices: s1_devices, connections: s1_conns });

// SCENARIO 2: WAN Uplink
const s2_devices = [
    createDevice(1, 'Modem', 'Modem1'),
    createDevice(2, 'Router', 'Router1'),
    createDevice(3, 'Switch', 'Switch1'),
    createDevice(4, 'PC', 'PC1')
];
const s2_conns = [
    createConnection(1, 1, 2, 'fiber_sm'), // Modem-Router (Fiber makes it WAN link usually if set in definitions, but my logic checks `isWanLink`)
    // cableType 'fiber_sm' isWanLink? Let's assume standard definitions.
    // Logic: `CABLE_DEFINITIONS[c.cableType]?.isWanLink`
    // fiber_sm usually isWanLink=true for ISP? 
    // In `CableDefinitions.ts`: fiber_sm might be just traffic.
    // Anyway, `WAN_UPLINK` logic checks for Modem and Gateway presence.
    createConnection(2, 2, 3), // Router-Switch
    createConnection(3, 4, 3)  // PC-Switch
];
runTest({ name: "2. WAN Uplink", devices: s2_devices, connections: s2_conns });

// SCENARIO 3: Isolated LAN
const s3_devices = [
    createDevice(1, 'Switch', 'Switch1'),
    createDevice(2, 'PC', 'PC1'),
    createDevice(3, 'PC', 'PC2')
];
const s3_conns = [
    createConnection(1, 2, 1),
    createConnection(2, 3, 1)
];
runTest({ name: "3. Isolated LAN", devices: s3_devices, connections: s3_conns });

// SCENARIO 4: Firewall Path
const s4_devices = [
    createDevice(1, 'Modem', 'Modem1'),
    createDevice(2, 'Router', 'Router1'),
    createDevice(3, 'Firewall', 'Firewall1'),
    createDevice(4, 'Switch', 'Switch1'),
    createDevice(5, 'PC', 'PC1')
];
// Modem-Router-Firewall-Switch-PC
const s4_conns = [
    createConnection(1, 1, 2, 'fiber_sm'),
    createConnection(2, 2, 3),
    createConnection(3, 3, 4),
    createConnection(4, 5, 4)
];
runTest({ name: "4. Firewall Chain", devices: s4_devices, connections: s4_conns });

// SCENARIO 5: Performance (50 Devices)
const s5_devices = [];
const s5_conns = [];
// 1 Router, 4 Switches, 45 PCs
s5_devices.push(createDevice(1, 'Router', 'Core'));
for (let i = 0; i < 4; i++) {
    s5_devices.push(createDevice(2 + i, 'Switch', `Sw${i}`));
    s5_conns.push(createConnection(100 + i, 1, 2 + i)); // Connect to Router
}
for (let i = 0; i < 45; i++) {
    const swIdx = i % 4;
    s5_devices.push(createDevice(10 + i, 'PC', `PC${i}`));
    s5_conns.push(createConnection(200 + i, 10 + i, 2 + swIdx));
}
runTest({ name: "5. Performance (50 Devices)", devices: s5_devices, connections: s5_conns }, 1000);
