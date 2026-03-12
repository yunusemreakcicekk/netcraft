import type { Device, Connection, NetworkScope, NetworkArea } from '../types/models';
import type { TopologySchema } from '../types/persistence';
import type { Annotation } from '../types/annotation';

const CURRENT_VERSION = "1.0";

export class TopologyIO {
    /**
     * Serializes the current network state into a JSON string formatted as TopologySchema.
     */
    static serialize(
        scope: NetworkScope | null,
        devices: Device[],
        connections: Connection[],
        areas: NetworkArea[],
        annotations: Annotation[] = []
    ): string {
        const data: TopologySchema = {
            version: CURRENT_VERSION,
            timestamp: Date.now(),
            scope,
            devices,
            connections,
            areas,
            annotations
        };
        return JSON.stringify(data, null, 2); // Pretty print for readability
    }

    /**
     * Parsed and validates a JSON string. Returns the schema if valid, or throws error.
     */
    static deserialize(jsonString: string): TopologySchema {
        try {
            const data = JSON.parse(jsonString);

            // Basic Validation
            if (!data.version) throw new Error("Missing version in file.");
            if (!Array.isArray(data.devices)) throw new Error("Invalid devices list.");
            if (!Array.isArray(data.connections)) throw new Error("Invalid connections list.");

            // Version Check (Expand if we have 2.0 later)
            if (data.version !== "1.0") {
                console.warn(`Version mismatch: File is ${data.version}, App is ${CURRENT_VERSION}. Attempting to load...`);
            }

            return data as TopologySchema;
        } catch (e) {
            console.error("Failed to parse topology file:", e);
            throw new Error("Invalid format. Please ensure you selected a valid NetCraft JSON file.");
        }
    }

    /**
     * Triggers a browser download for the given content.
     */
    static downloadFile(filename: string, content: string) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
