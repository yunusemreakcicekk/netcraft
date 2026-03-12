export type DeviceType = 'PC' | 'Switch' | 'Router' | 'Laptop' | 'Server' | 'Printer' | 'Firewall' | 'Modem' | 'AccessPoint' | 'Internet';

export interface Port {
    id: string; // e.g., 'eth0'
    name: string;
    type: 'ethernet' | 'wireless';
    isOccupied: boolean;
}

export interface Device {
    id: number;
    type: DeviceType;
    x: number;
    y: number;
    name: string;
    ports: Port[];
    areaId?: number | null;
}

export type ConnectionStatus = 'valid' | 'warning' | 'error';
export type CableType =
    | 'cat5' | 'cat5e' | 'cat6' | 'cat6a' // Copper
    | 'fiber_sm' | 'fiber_mm'             // Fiber
    | 'coax'                              // Coaxial
    | 'dsl'                               // Telephone
    | 'console'                           // Management
    | 'wireless';                         // Wi-Fi

export interface CableMeta {
    type: CableType;
    label: string;
    supportsTraffic: boolean;
    description: string;
    isWanLink?: boolean; // For DSL/Coax/Fiber ISP links
}

export interface Connection {
    id: number;
    sourceId: number;
    sourcePortId: string;
    targetId: number;
    targetPortId: string;
    type: string; // e.g. 'ethernet'
    cableType: CableType;
    status: ConnectionStatus;
}

export type NetworkScope = 'LAN_HOME' | 'LAN_OFFICE' | 'MAN' | 'WAN';

export interface NetworkArea {
    id: number;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
    scope: NetworkScope;
}


export interface Requirement {
    id: string;
    label: string;
    description: string;
    required: boolean;
    check: (devices: Device[], connections: Connection[], areas: NetworkArea[]) => boolean;
}

export interface Point {
    x: number;
    y: number;
}

export type PacketStatus = "HEALTHY" | "WARNING" | "BROKEN" | "FAST" | "COMPROMISED";
export type PacketType = 'LAN_INTERNAL' | 'TO_GATEWAY' | 'WAN_UPLINK' | 'BROADCAST_DISCOVERY';

export interface Packet {
    id: string;
    type: PacketType;
    path: Point[];
    cableTypes?: CableType[];
    status: PacketStatus;
    speed: number;
    progress: number; // 0 to 1
    color: string;
}
