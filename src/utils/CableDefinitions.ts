import type { CableType, CableMeta } from '../types/models';

export const CABLE_DEFINITIONS: Record<CableType, CableMeta> = {
    // Copper (Ethernet) - Traffic Capable
    'cat5': {
        type: 'cat5',
        label: 'Cat5 (100Mbps)',
        supportsTraffic: true,
        description: 'Standard copper cable for LAN traffic.'
    },
    'cat5e': {
        type: 'cat5e',
        label: 'Cat5e (1Gbps)',
        supportsTraffic: true,
        description: 'Enhanced copper cable for Gigabit Ethernet.'
    },
    'cat6': {
        type: 'cat6',
        label: 'Cat6 (10Gbps)',
        supportsTraffic: true,
        description: 'High-speed copper for modern networks.'
    },
    'cat6a': {
        type: 'cat6a',
        label: 'Cat6a (10Gbps Long)',
        supportsTraffic: true,
        description: 'Augmented Cat6 for longer distances.'
    },

    // Fiber - Traffic Capable
    'fiber_sm': {
        type: 'fiber_sm',
        label: 'Fiber (Single Mode)',
        supportsTraffic: true,
        description: 'Long-distance fiber optic cable.'
    },
    'fiber_mm': {
        type: 'fiber_mm',
        label: 'Fiber (Multi Mode)',
        supportsTraffic: true,
        description: 'Short-distance fiber optic for building backbones.'
    },

    // Wireless - Traffic Capable
    'wireless': {
        type: 'wireless',
        label: 'Wireless (Wi-Fi)',
        supportsTraffic: true,
        description: 'Wireless signal for mobile connectivity.'
    },

    // WAN Technologies - NO LAN Traffic
    'dsl': {
        type: 'dsl',
        label: 'Phone Line (DSL)',
        supportsTraffic: false,
        isWanLink: true,
        description: 'Phone line for WAN connectivity. Does not carry local LAN traffic.'
    },
    'coax': {
        type: 'coax',
        label: 'Coaxial (Cable)',
        supportsTraffic: false,
        isWanLink: true,
        description: 'Coaxial cable for Cable Internet. Does not carry local LAN traffic.'
    },

    // Management - NO Traffic
    'console': {
        type: 'console',
        label: 'Console Cable',
        supportsTraffic: false,
        description: 'Serial cable for device configuration only. No network traffic.'
    }
};

export const getCableMeta = (type: CableType): CableMeta => {
    return CABLE_DEFINITIONS[type];
};
