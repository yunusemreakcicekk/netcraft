import type { Scenario } from './scenarios';

export const goldenScenarios: Scenario[] = [
    {
        id: 'home_basic',
        name: '🏠 Home Basic',
        description: 'A modern home network with internet access.\nIncludes Modem, Router (WiFi), Wired PC, and Wireless Laptop.',
        items: [
            { id: 1, type: 'Router', x: 350, y: 300, name: 'Home_Router', ports: [{ id: 'eth0', name: 'WAN', type: 'ethernet', isOccupied: true }, { id: 'eth1', name: 'LAN1', type: 'ethernet', isOccupied: true }, { id: 'eth2', name: 'LAN2', type: 'ethernet', isOccupied: false }, { id: 'wlan0', name: 'WiFi', type: 'wireless', isOccupied: true }] },
            { id: 2, type: 'PC', x: 150, y: 450, name: 'Wired_PC', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 3, type: 'Modem', x: 350, y: 100, name: 'ISP_Modem', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 4, type: 'Laptop', x: 450, y: 400, name: 'WiFi_Laptop', ports: [{ id: 'wlan0', name: 'WiFi', type: 'wireless', isOccupied: true }, { id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: false }] }
        ],
        connections: [
            // Modem <-> Router (WAN)
            { id: 101, sourceId: 3, sourcePortId: 'eth0', targetId: 1, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            // Router <-> PC (LAN Wired)
            { id: 102, sourceId: 1, sourcePortId: 'eth1', targetId: 2, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            // Router <-> Laptop (Wireless)
            { id: 103, sourceId: 1, sourcePortId: 'wlan0', targetId: 4, targetPortId: 'wlan0', type: 'wireless', cableType: 'wireless', status: 'valid' }
        ]
    },
    {
        id: 'office_small',
        name: '🏢 Office Small',
        description: 'A realistic small office environment.\nGateway -> Firewall -> Switch -> Workstations & Resources.',
        items: [
            // Core Infrastructure
            { id: 1, type: 'Router', x: 400, y: 50, name: 'Gateway', ports: [{ id: 'eth0', name: 'WAN', type: 'ethernet', isOccupied: false }, { id: 'eth1', name: 'LAN', type: 'ethernet', isOccupied: true }] },
            { id: 2, type: 'Firewall', x: 400, y: 150, name: 'Firewall', ports: [{ id: 'eth0', name: 'WAN', type: 'ethernet', isOccupied: true }, { id: 'eth1', name: 'LAN', type: 'ethernet', isOccupied: true }, { id: 'eth2', name: 'DMZ', type: 'ethernet', isOccupied: false }, { id: 'eth3', name: 'Mgmt', type: 'ethernet', isOccupied: false }] },
            { id: 3, type: 'Switch', x: 400, y: 300, name: 'Main_Switch', ports: [{ id: 'eth0', name: 'Uplink', type: 'ethernet', isOccupied: true }, { id: 'eth1', name: 'PC1', type: 'ethernet', isOccupied: true }, { id: 'eth2', name: 'PC2', type: 'ethernet', isOccupied: true }, { id: 'eth3', name: 'Svr', type: 'ethernet', isOccupied: true }, { id: 'eth4', name: 'Prt', type: 'ethernet', isOccupied: true }, { id: 'eth5', name: 'Spare', type: 'ethernet', isOccupied: false }, { id: 'eth6', name: 'Spare', type: 'ethernet', isOccupied: false }, { id: 'eth7', name: 'Spare', type: 'ethernet', isOccupied: false }] },

            // End Points
            { id: 4, type: 'PC', x: 200, y: 450, name: 'PC1', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 5, type: 'PC', x: 350, y: 450, name: 'PC2', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 6, type: 'Server', x: 500, y: 450, name: 'File_Server', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 7, type: 'Printer', x: 650, y: 450, name: 'Office_Printer', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] }
        ],
        connections: [
            // Router -> Firewall
            { id: 201, sourceId: 1, sourcePortId: 'eth1', targetId: 2, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            // Firewall -> Switch
            { id: 202, sourceId: 2, sourcePortId: 'eth1', targetId: 3, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },

            // Switch Connections
            { id: 203, sourceId: 4, sourcePortId: 'eth0', targetId: 3, targetPortId: 'eth1', type: 'ethernet', cableType: 'cat6', status: 'valid' }, // PC1
            { id: 204, sourceId: 5, sourcePortId: 'eth0', targetId: 3, targetPortId: 'eth2', type: 'ethernet', cableType: 'cat6', status: 'valid' }, // PC2
            { id: 205, sourceId: 6, sourcePortId: 'eth0', targetId: 3, targetPortId: 'eth3', type: 'ethernet', cableType: 'cat6', status: 'valid' }, // Server
            { id: 206, sourceId: 7, sourcePortId: 'eth0', targetId: 3, targetPortId: 'eth4', type: 'ethernet', cableType: 'cat6', status: 'valid' }  // Printer
        ]
    },
    {
        id: 'campus_simple',
        name: '🏫 Campus / MAN',
        description: 'A multi-area campus network with a fiber backbone.\nCore Router -> Core Switch -> Distribution Areas.',
        items: [
            // Backbone
            { id: 1, type: 'Router', x: 400, y: 50, name: 'Core_Router', ports: [{ id: 'eth0', name: 'WAN', type: 'ethernet', isOccupied: false }, { id: 'eth1', name: 'Backbone', type: 'ethernet', isOccupied: true }] },
            { id: 2, type: 'Switch', x: 400, y: 150, name: 'Core_Switch', ports: [{ id: 'eth0', name: 'Uplink', type: 'ethernet', isOccupied: true }, { id: 'eth1', name: 'Dist_A', type: 'ethernet', isOccupied: true }, { id: 'eth2', name: 'Dist_B', type: 'ethernet', isOccupied: true }, { id: 'eth3', name: 'Dist_C', type: 'ethernet', isOccupied: true }] },

            // Area A (Left)
            { id: 10, type: 'Switch', x: 150, y: 300, name: 'Dist_SW_A', ports: [{ id: 'eth0', name: 'Uplink', type: 'ethernet', isOccupied: true }, { id: 'eth1', name: 'PC1', type: 'ethernet', isOccupied: true }, { id: 'eth2', name: 'PC2', type: 'ethernet', isOccupied: true }, { id: 'eth3', name: 'Svr', type: 'ethernet', isOccupied: true }] },
            { id: 11, type: 'PC', x: 50, y: 450, name: 'A_PC1', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 12, type: 'PC', x: 150, y: 450, name: 'A_PC2', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 13, type: 'Server', x: 250, y: 450, name: 'A_Server', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },

            // Area B (Center)
            { id: 20, type: 'Switch', x: 400, y: 300, name: 'Dist_SW_B', ports: [{ id: 'eth0', name: 'Uplink', type: 'ethernet', isOccupied: true }, { id: 'eth1', name: 'PC1', type: 'ethernet', isOccupied: true }, { id: 'eth2', name: 'PC2', type: 'ethernet', isOccupied: true }, { id: 'eth3', name: 'Prt', type: 'ethernet', isOccupied: true }] },
            { id: 21, type: 'PC', x: 350, y: 450, name: 'B_PC1', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 22, type: 'PC', x: 450, y: 450, name: 'B_PC2', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 23, type: 'Printer', x: 400, y: 550, name: 'B_Printer', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },

            // Area C (Right)
            { id: 30, type: 'Switch', x: 650, y: 300, name: 'Dist_SW_C', ports: [{ id: 'eth0', name: 'Uplink', type: 'ethernet', isOccupied: true }, { id: 'eth1', name: 'PC1', type: 'ethernet', isOccupied: true }, { id: 'eth2', name: 'PC2', type: 'ethernet', isOccupied: true }, { id: 'eth3', name: 'AP', type: 'ethernet', isOccupied: true }] },
            { id: 31, type: 'PC', x: 550, y: 450, name: 'C_PC1', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 32, type: 'PC', x: 650, y: 450, name: 'C_PC2', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 33, type: 'AccessPoint', x: 750, y: 450, name: 'C_AP', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }, { id: 'wlan0', name: 'WiFi', type: 'wireless', isOccupied: true }] },
            { id: 34, type: 'Laptop', x: 750, y: 550, name: 'C_Laptop', ports: [{ id: 'wlan0', name: 'WiFi', type: 'wireless', isOccupied: true }] }
        ],
        connections: [
            // Backbone (Fiber)
            { id: 301, sourceId: 1, sourcePortId: 'eth1', targetId: 2, targetPortId: 'eth0', type: 'ethernet', cableType: 'fiber_mm', status: 'valid' },
            { id: 302, sourceId: 2, sourcePortId: 'eth1', targetId: 10, targetPortId: 'eth0', type: 'ethernet', cableType: 'fiber_mm', status: 'valid' },
            { id: 303, sourceId: 2, sourcePortId: 'eth2', targetId: 20, targetPortId: 'eth0', type: 'ethernet', cableType: 'fiber_mm', status: 'valid' },
            { id: 304, sourceId: 2, sourcePortId: 'eth3', targetId: 30, targetPortId: 'eth0', type: 'ethernet', cableType: 'fiber_mm', status: 'valid' },

            // Area A (Copper)
            { id: 310, sourceId: 11, sourcePortId: 'eth0', targetId: 10, targetPortId: 'eth1', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 311, sourceId: 12, sourcePortId: 'eth0', targetId: 10, targetPortId: 'eth2', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 312, sourceId: 13, sourcePortId: 'eth0', targetId: 10, targetPortId: 'eth3', type: 'ethernet', cableType: 'cat6', status: 'valid' },

            // Area B (Copper)
            { id: 320, sourceId: 21, sourcePortId: 'eth0', targetId: 20, targetPortId: 'eth1', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 321, sourceId: 22, sourcePortId: 'eth0', targetId: 20, targetPortId: 'eth2', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 322, sourceId: 23, sourcePortId: 'eth0', targetId: 20, targetPortId: 'eth3', type: 'ethernet', cableType: 'cat6', status: 'valid' },

            // Area C (Copper + Wireless)
            { id: 330, sourceId: 31, sourcePortId: 'eth0', targetId: 30, targetPortId: 'eth1', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 331, sourceId: 32, sourcePortId: 'eth0', targetId: 30, targetPortId: 'eth2', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 332, sourceId: 33, sourcePortId: 'eth0', targetId: 30, targetPortId: 'eth3', type: 'ethernet', cableType: 'cat6', status: 'valid' }, // AP Wired
            { id: 333, sourceId: 33, sourcePortId: 'wlan0', targetId: 34, targetPortId: 'wlan0', type: 'wireless', cableType: 'wireless', status: 'valid' } // AP -> Laptop
        ],
        areas: [
            { id: 1, name: 'Area A (Left)', x: 0, y: 250, width: 330, height: 350, type: 'LAN', scope: 'MAN' },
            { id: 2, name: 'Area B (Center)', x: 340, y: 250, width: 230, height: 350, type: 'LAN', scope: 'MAN' },
            { id: 3, name: 'Area C (Right)', x: 580, y: 250, width: 270, height: 350, type: 'LAN', scope: 'MAN' }
        ]
    },
    {
        id: 'wan_edge',
        name: '🌐 WAN Edge (Reference)',
        description: 'WAN Edge – Enterprise perimeter network with firewall protection, internal LAN, and DMZ segmentation for public services.',
        items: [
            { id: 1, type: 'Internet', x: 400, y: 50, name: 'ISP_Cloud', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 2, type: 'Modem', x: 400, y: 150, name: 'ISP_Modem', ports: [{ id: 'eth0', name: 'WAN', type: 'ethernet', isOccupied: true }, { id: 'eth1', name: 'LAN', type: 'ethernet', isOccupied: true }] },
            { id: 3, type: 'Router', x: 400, y: 250, name: 'Edge_Router', ports: [{ id: 'eth0', name: 'WAN', type: 'ethernet', isOccupied: true }, { id: 'eth1', name: 'LAN', type: 'ethernet', isOccupied: true }, { id: 'eth2', name: 'eth2', type: 'ethernet', isOccupied: false }] },
            { id: 4, type: 'Firewall', x: 400, y: 350, name: 'Perimeter_FW', ports: [{ id: 'eth0', name: 'WAN', type: 'ethernet', isOccupied: true }, { id: 'eth1', name: 'LAN', type: 'ethernet', isOccupied: true }, { id: 'eth2', name: 'DMZ', type: 'ethernet', isOccupied: true }] },
            { id: 5, type: 'Switch', x: 250, y: 450, name: 'Internal_Switch', ports: Array.from({ length: 8 }, (_, i) => ({ id: `eth${i}`, name: `eth${i}`, type: 'ethernet', isOccupied: i < 3 })) },
            { id: 6, type: 'Switch', x: 550, y: 450, name: 'DMZ_Switch', ports: Array.from({ length: 8 }, (_, i) => ({ id: `eth${i}`, name: `eth${i}`, type: 'ethernet', isOccupied: i < 2 })) },
            { id: 7, type: 'PC', x: 150, y: 550, name: 'Internal_PC', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 8, type: 'Printer', x: 350, y: 550, name: 'Office_Printer', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
            { id: 9, type: 'Server', x: 550, y: 550, name: 'Public_Server', ports: [{ id: 'eth0', name: 'eth0', type: 'ethernet', isOccupied: true }] },
        ],
        connections: [
            // Internet to Modem
            { id: 401, sourceId: 1, sourcePortId: 'eth0', targetId: 2, targetPortId: 'eth0', type: 'ethernet', cableType: 'coax', status: 'valid' },
            // Modem to Router
            { id: 402, sourceId: 2, sourcePortId: 'eth1', targetId: 3, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            // Router to Firewall
            { id: 403, sourceId: 3, sourcePortId: 'eth1', targetId: 4, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            // Firewall to Internal Switch
            { id: 404, sourceId: 4, sourcePortId: 'eth1', targetId: 5, targetPortId: 'eth7', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            // Firewall to DMZ Switch
            { id: 405, sourceId: 4, sourcePortId: 'eth2', targetId: 6, targetPortId: 'eth7', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            // Internal Switch to Internal End Devices
            { id: 406, sourceId: 7, sourcePortId: 'eth0', targetId: 5, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            { id: 407, sourceId: 8, sourcePortId: 'eth0', targetId: 5, targetPortId: 'eth1', type: 'ethernet', cableType: 'cat6', status: 'valid' },
            // DMZ Switch to Public Server
            { id: 408, sourceId: 9, sourcePortId: 'eth0', targetId: 6, targetPortId: 'eth0', type: 'ethernet', cableType: 'cat6', status: 'valid' },
        ],
        areas: [
            { id: 1, name: 'Internal Network', x: 50, y: 400, width: 400, height: 250, type: 'LAN', scope: 'WAN' },
            { id: 2, name: 'DMZ Zone', x: 480, y: 400, width: 140, height: 250, type: 'LAN', scope: 'WAN' }
        ]
    }
];
