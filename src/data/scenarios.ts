import type { Device, Connection, NetworkArea } from '../types/models';
import type { Annotation } from '../types/annotation';

export interface Scenario {
    id: string;
    name: string;
    description: string;
    items: Device[];
    connections: Connection[];
    areas?: NetworkArea[];
    annotations?: Annotation[];
}

export const scenarios: Scenario[] = [
    {
        id: 'home',
        name: '🏠 Home Network (12.2)',
        description: 'This topology represents a typical home network.\nAll devices are in the same broadcast domain.\nThere is no segmentation.\nThe router provides NAT and internet access.',
        items: [
            { id: 1, type: 'Router', x: 300, y: 50, name: 'Home_Router', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }, { id: 'eth1', name: 'eth1', type: 'ethernet', isOccupied: false }, { id: 'eth2', name: 'eth2', type: 'ethernet', isOccupied: false }, { id: 'eth3', name: 'eth3', type: 'ethernet', isOccupied: false }] },
            { id: 2, type: 'Switch', x: 300, y: 200, name: 'Home_Switch', ports: Array.from({ length: 8 }, (_, i) => ({ id: `eth${i}`, name: `eth${i}`, type: 'ethernet', isOccupied: i < 4 })) }, // occupied ports updated
            { id: 3, type: 'PC', x: 150, y: 350, name: 'PC_Dad', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 4, type: 'Laptop', x: 300, y: 350, name: 'Laptop_Mom', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 5, type: 'Printer', x: 450, y: 350, name: 'Home_Printer', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
        ],
        connections: [
            { id: 101, sourceId: 1, sourcePortId: 'eth0', targetId: 2, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 102, sourceId: 3, sourcePortId: 'eth0', targetId: 2, targetPortId: 'eth1', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 103, sourceId: 4, sourcePortId: 'eth0', targetId: 2, targetPortId: 'eth2', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 104, sourceId: 5, sourcePortId: 'eth0', targetId: 2, targetPortId: 'eth3', type: 'ethernet', cableType: 'cat6', status: 'valid' },
        ]
    },
    {
        id: 'office',
        name: '🏢 Office Network (12.3)',
        description: 'This topology represents a small office network.\nA single router provides connectivity.\nMultiple access switches connect end devices.\nThere is limited segmentation.',
        items: [
            { id: 1, type: 'Router', x: 400, y: 50, name: 'Office_Gateway', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }, { id: 'eth1', name: 'eth1', type: 'ethernet', isOccupied: true }, { id: 'eth2', name: 'eth2', type: 'ethernet', isOccupied: false }, { id: 'eth3', name: 'eth3', type: 'ethernet', isOccupied: false }] },
            { id: 2, type: 'Switch', x: 250, y: 200, name: 'Access_Switch_1', ports: Array.from({ length: 8 }, (_, i) => ({ id: `eth${i}`, name: `eth${i}`, type: 'ethernet', isOccupied: i < 4 })) }, // 1 uplink + 3 devices
            { id: 3, type: 'Switch', x: 550, y: 200, name: 'Access_Switch_2', ports: Array.from({ length: 8 }, (_, i) => ({ id: `eth${i}`, name: `eth${i}`, type: 'ethernet', isOccupied: i < 3 })) }, // 1 uplink + 2 devices
            { id: 4, type: 'Server', x: 150, y: 350, name: 'File_Server', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 5, type: 'PC', x: 250, y: 350, name: 'PC_1', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 6, type: 'PC', x: 350, y: 350, name: 'PC_2', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 7, type: 'Printer', x: 450, y: 350, name: 'Office_Printer', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 8, type: 'PC', x: 550, y: 350, name: 'PC_3', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
        ],
        connections: [
            // Router to Switches
            { id: 201, sourceId: 1, sourcePortId: 'eth0', targetId: 2, targetPortId: 'eth7', type: 'ethernet', cableType: 'fiber_mm', status: 'valid' },
            { id: 202, sourceId: 1, sourcePortId: 'eth1', targetId: 3, targetPortId: 'eth7', type: 'ethernet', cableType: 'fiber_mm', status: 'valid' },
            // Switch 1 Connections
            { id: 203, sourceId: 4, sourcePortId: 'eth0', targetId: 2, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 204, sourceId: 5, sourcePortId: 'eth0', targetId: 2, targetPortId: 'eth1', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 205, sourceId: 6, sourcePortId: 'eth0', targetId: 2, targetPortId: 'eth2', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            // Switch 2 Connections
            { id: 206, sourceId: 7, sourcePortId: 'eth0', targetId: 3, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 207, sourceId: 8, sourcePortId: 'eth0', targetId: 3, targetPortId: 'eth1', type: 'ethernet', cableType: 'cat6', status: 'valid' },
        ]
    },
    {
        id: 'building',
        name: '🏬 Building Network (12.4)',
        description: 'This topology represents a building network.\nMultiple switches create a large Layer 2 domain.\nThere is a risk of broadcast storms and loops.\nSpanning Tree Protocol (STP) is required to prevent loops.',
        items: [
            { id: 1, type: 'Switch', x: 400, y: 50, name: 'Core_Switch', ports: Array.from({ length: 8 }, (_, i) => ({ id: `eth${i}`, name: `eth${i}`, type: 'ethernet', isOccupied: i < 2 })) },
            { id: 2, type: 'Switch', x: 250, y: 150, name: 'Dist_Switch_A', ports: Array.from({ length: 8 }, (_, i) => ({ id: `eth${i}`, name: `eth${i}`, type: 'ethernet', isOccupied: true })) },
            { id: 3, type: 'Switch', x: 550, y: 150, name: 'Dist_Switch_B', ports: Array.from({ length: 8 }, (_, i) => ({ id: `eth${i}`, name: `eth${i}`, type: 'ethernet', isOccupied: true })) },
            { id: 4, type: 'Switch', x: 100, y: 300, name: 'Access_Floor1', ports: Array.from({ length: 8 }, (_, i) => ({ id: `eth${i}`, name: `eth${i}`, type: 'ethernet', isOccupied: true })) },
            { id: 5, type: 'Switch', x: 300, y: 300, name: 'Access_Floor2', ports: Array.from({ length: 8 }, (_, i) => ({ id: `eth${i}`, name: `eth${i}`, type: 'ethernet', isOccupied: true })) },
            { id: 6, type: 'Switch', x: 500, y: 300, name: 'Access_Floor3', ports: Array.from({ length: 8 }, (_, i) => ({ id: `eth${i}`, name: `eth${i}`, type: 'ethernet', isOccupied: true })) },
            { id: 7, type: 'Switch', x: 700, y: 300, name: 'Access_Floor4', ports: Array.from({ length: 8 }, (_, i) => ({ id: `eth${i}`, name: `eth${i}`, type: 'ethernet', isOccupied: true })) },
            { id: 8, type: 'PC', x: 100, y: 400, name: 'PC_1', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 9, type: 'PC', x: 300, y: 400, name: 'PC_2', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 10, type: 'PC', x: 500, y: 400, name: 'PC_3', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 11, type: 'PC', x: 700, y: 400, name: 'PC_4', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
        ],
        connections: [
            // Core to Dist
            { id: 301, sourceId: 1, sourcePortId: 'eth0', targetId: 2, targetPortId: 'eth7', type: 'ethernet', cableType: 'fiber_mm', status: 'valid' },
            { id: 302, sourceId: 1, sourcePortId: 'eth1', targetId: 3, targetPortId: 'eth7', type: 'ethernet', cableType: 'fiber_mm', status: 'valid' },

            // Dist A to Access (Rules: Dist A covers Floor 1 & 2)
            { id: 303, sourceId: 2, sourcePortId: 'eth0', targetId: 4, targetPortId: 'eth7', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 304, sourceId: 2, sourcePortId: 'eth1', targetId: 5, targetPortId: 'eth7', type: 'ethernet', cableType: 'cat6', status: 'valid' },

            // Dist B to Access (Rules: Dist B covers Floor 3 & 4)
            { id: 305, sourceId: 3, sourcePortId: 'eth0', targetId: 6, targetPortId: 'eth7', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 306, sourceId: 3, sourcePortId: 'eth1', targetId: 7, targetPortId: 'eth7', type: 'ethernet', cableType: 'cat6', status: 'valid' },

            // REDUNDANCY / LOOPS
            // 1. Dist A <-> Dist B (Horizontal Link)
            { id: 310, sourceId: 2, sourcePortId: 'eth6', targetId: 3, targetPortId: 'eth6', type: 'ethernet', cableType: 'fiber_mm', status: 'valid' },
            // 2. Access 1 connected to Dist B as well (Redundant path)
            { id: 311, sourceId: 4, sourcePortId: 'eth6', targetId: 3, targetPortId: 'eth5', type: 'ethernet', cableType: 'cat6', status: 'valid' },

            // Access to PCs
            { id: 320, sourceId: 4, sourcePortId: 'eth0', targetId: 8, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 321, sourceId: 5, sourcePortId: 'eth0', targetId: 9, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 322, sourceId: 6, sourcePortId: 'eth0', targetId: 10, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 323, sourceId: 7, sourcePortId: 'eth0', targetId: 11, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
        ]
    },
    {
        id: 'enterprise',
        name: '🌍 Enterprise WAN (12.5)',
        description: 'This topology represents an enterprise edge network.\nThe DMZ hosts public-facing services.\nInternal users are separated from DMZ resources.\nThis design reduces attack surface and improves security.',
        items: [
            { id: 1, type: 'Internet', x: 400, y: 50, name: 'ISP_Cloud', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 2, type: 'Router', x: 400, y: 150, name: 'Edge_Router', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }, { id: 'eth1', name: 'eth1', type: 'ethernet', isOccupied: true }, { id: 'eth2', name: 'eth2', type: 'ethernet', isOccupied: false }] },
            { id: 3, type: 'Firewall', x: 400, y: 250, name: 'Perimeter_FW', ports: [{ id: 'eth0', name: 'WAN', type: 'ethernet', isOccupied: true }, { id: 'eth1', name: 'LAN', type: 'ethernet', isOccupied: true }, { id: 'eth2', name: 'DMZ', type: 'ethernet', isOccupied: true }] },
            { id: 4, type: 'Switch', x: 250, y: 350, name: 'Internal_Switch', ports: Array.from({ length: 8 }, (_, i) => ({ id: `eth${i}`, name: `eth${i}`, type: 'ethernet', isOccupied: i < 3 })) },
            { id: 5, type: 'Switch', x: 550, y: 350, name: 'DMZ_Switch', ports: Array.from({ length: 8 }, (_, i) => ({ id: `eth${i}`, name: `eth${i}`, type: 'ethernet', isOccupied: i < 2 })) },
            { id: 6, type: 'PC', x: 150, y: 450, name: 'Internal_PC', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 7, type: 'Printer', x: 300, y: 450, name: 'Internal_Printer', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 8, type: 'Server', x: 550, y: 450, name: 'DMZ_Web_Server', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
        ],
        connections: [
            // Internet to Router
            { id: 401, sourceId: 1, sourcePortId: 'eth0', targetId: 2, targetPortId: 'eth0', type: 'ethernet', cableType: 'fiber_sm', status: 'valid' },
            // Router to Firewall
            { id: 402, sourceId: 2, sourcePortId: 'eth1', targetId: 3, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            // Firewall to Internal Switch
            { id: 403, sourceId: 3, sourcePortId: 'eth1', targetId: 4, targetPortId: 'eth7', type: 'ethernet', cableType: 'fiber_mm', status: 'valid' },
            // Firewall to DMZ Switch
            { id: 404, sourceId: 3, sourcePortId: 'eth2', targetId: 5, targetPortId: 'eth7', type: 'ethernet', cableType: 'fiber_mm', status: 'valid' },
            // Internal Switch to End Devices
            { id: 405, sourceId: 6, sourcePortId: 'eth0', targetId: 4, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 406, sourceId: 7, sourcePortId: 'eth0', targetId: 4, targetPortId: 'eth1', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            // DMZ Switch to Public Server
            { id: 407, sourceId: 8, sourcePortId: 'eth0', targetId: 5, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
        ]
    }
];
