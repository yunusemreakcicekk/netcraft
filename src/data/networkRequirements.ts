
import type { NetworkScope, Requirement } from "../types/models";

export const getRequirements = (scope: NetworkScope): Requirement[] => {
    switch (scope) {
        case 'LAN_HOME':
            return [
                {
                    id: 'home-router',
                    label: 'Router (Gateway)',
                    description: 'Exactly 1 Router is required.',
                    required: true,
                    check: (d) => d.filter(x => x.type === 'Router').length === 1
                },
                {
                    id: 'home-end-devices',
                    label: 'End Devices',
                    description: 'At least 1 PC, Laptop, or Printer.',
                    required: true,
                    check: (d) => d.filter(x => ['PC', 'Laptop', 'Printer'].includes(x.type)).length >= 1
                },
                {
                    id: 'home-switch',
                    label: 'Switch (Optional)',
                    description: 'A switch is optional for more ports.',
                    required: false,
                    check: (d) => d.filter(x => x.type === 'Switch').length > 0
                }
            ];
        case 'LAN_OFFICE':
            return [
                {
                    id: 'office-router',
                    label: 'Router (Gateway)',
                    description: 'Exactly 1 Router is required.',
                    required: true,
                    check: (d) => d.filter(x => x.type === 'Router').length === 1
                },
                {
                    id: 'office-switches',
                    label: 'Network Switches',
                    description: 'At least 1 Switch to distribute connections.',
                    required: true,
                    check: (d) => d.filter(x => x.type === 'Switch').length >= 1
                },
                {
                    id: 'office-resources',
                    label: 'Shared Resource',
                    description: 'A Server or Printer is required.',
                    required: true,
                    check: (d) => d.some(x => x.type === 'Server' || x.type === 'Printer')
                },
                {
                    id: 'office-end-devices',
                    label: 'Workstations',
                    description: 'At least 2 End Devices (PC/Laptop).',
                    required: true,
                    check: (d) => d.filter(x => ['PC', 'Laptop'].includes(x.type)).length >= 2
                }
            ];
        case 'MAN':
            return [
                {
                    id: 'man-areas',
                    label: 'Multiple Areas',
                    description: 'At least 2 Areas (Buildings/Regions).',
                    required: true,
                    check: (_d, _c, areas) => areas.length >= 2
                },
                {
                    id: 'man-switches',
                    label: 'Local Switches',
                    description: 'Each Area typically needs a local switch (Total >= 2).',
                    required: true,
                    check: (d) => d.filter(x => x.type === 'Switch').length >= 2
                },
                {
                    id: 'man-backbone',
                    label: 'Backbone Device',
                    description: 'A Router or Core Switch to connect areas.',
                    required: true,
                    check: (d) => d.some(x => x.type === 'Router') // Simplified
                },
                {
                    id: 'man-end-devices',
                    label: 'End Devices (Per Area)',
                    description: 'At least 1 PC/Laptop/Server in each area for real traffic.',
                    required: false, // Optional -> Yellow if missing
                    check: (devices, _c, areas) => {
                        // Check if every area has at least one end device
                        if (areas.length === 0) return false;
                        // Heuristic: Check if enough end devices exist to populate areas? 
                        // Or rigor: Check geometrical inclusion? (Complex)
                        // Simplified: Just check if total end devices >= areas.length
                        const endDevs = devices.filter(x => ['PC', 'Laptop', 'Server', 'Printer'].includes(x.type)).length;
                        return endDevs >= areas.length;
                    }
                }
            ];
        case 'WAN':
            return [
                {
                    id: 'wan-edge-router',
                    label: 'Edge Router',
                    description: 'A Router to connect to the external world.',
                    required: true,
                    check: (d) => d.some(x => x.type === 'Router')
                },
                {
                    id: 'wan-firewall',
                    label: 'Firewall',
                    description: 'A Firewall is required for security.',
                    required: true,
                    check: (d) => d.some(x => x.type === 'Firewall')
                },
                {
                    id: 'wan-dmz',
                    label: 'DMZ (Servers)',
                    description: 'Public facing servers (Web/Mail).',
                    required: true,
                    check: (d) => d.some(x => x.type === 'Server')
                }
            ];
        default:
            return [];
    }
};
