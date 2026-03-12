import type { Device, Connection, NetworkScope, NetworkArea } from './models';
import type { Annotation } from './annotation';

/**
 * Defines the structure of the saved topology file (JSON).
 */
export interface TopologySchema {
    version: string;     // e.g., "1.0"
    timestamp: number;   // UNIX timestamp of save
    scope: NetworkScope | null;
    devices: Device[];
    connections: Connection[];
    areas: NetworkArea[];
    annotations?: Annotation[]; // Optional for backward compatibility
}
