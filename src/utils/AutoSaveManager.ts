import type { Device, Connection, NetworkArea, NetworkScope } from '../types/models';
import type { Annotation } from '../types/annotation';

const STORAGE_KEY = 'netcraft_autosave_v1';
const AUTO_SAVE_DELAY = 2000; // 2 seconds

export interface AutoSaveData {
    version: string;
    timestamp: number;
    scope: NetworkScope | null; // Can be null for Custom Lab
    devices: Device[];
    connections: Connection[];
    areas: NetworkArea[];
    annotations: Annotation[];
    zoom: number;
    panOffset: { x: number, y: number };
}

class AutoSaveManager {
    private saveTimeout: number | null = null;
    private lastHash: string = '';

    /**
     * Calculates a simple hash of the data to detect changes.
     * Using JSON.stringify length + some content sampling for speed.
     * For a more robust hash, we could use a dedicated library, 
     * but strictly pure JS approach is requested.
     */
    private generateHash(data: AutoSaveData): string {
        // We exclude timestamp from hash calculation
        const { timestamp, ...content } = data;
        return JSON.stringify(content);
    }

    /**
     * Debounced save function.
     * Only saves if data has actually changed.
     */
    public triggerSave(
        state: Omit<AutoSaveData, 'version' | 'timestamp'>,
        onSaveCallback?: () => void
    ) {
        // Clear pending save
        if (this.saveTimeout) {
            window.clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = window.setTimeout(() => {
            try {
                const dataToSave: AutoSaveData = {
                    ...state,
                    version: '1.0',
                    timestamp: Date.now()
                };

                const currentHash = this.generateHash(dataToSave);

                // Only save if changed
                if (currentHash !== this.lastHash) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
                    this.lastHash = currentHash;
                    console.log(`[AutoSave] Session saved at ${new Date(dataToSave.timestamp).toLocaleTimeString()}`);

                    if (onSaveCallback) {
                        onSaveCallback();
                    }
                }
            } catch (error) {
                console.error("[AutoSave] Failed to save session:", error);
            }
        }, AUTO_SAVE_DELAY);
    }

    public load(): AutoSaveData | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;

            const data = JSON.parse(raw) as AutoSaveData;

            // Basic validation
            if (data.version !== '1.0') {
                console.warn("[AutoSave] Version mismatch, ignoring save.");
                return null;
            }
            if (!Array.isArray(data.devices) || !Array.isArray(data.connections)) {
                console.warn("[AutoSave] Corrupted data, ignoring save.");
                return null;
            }

            // Initialize hash to prevent immediate re-save on load
            this.lastHash = this.generateHash(data);

            return data;
        } catch (error) {
            console.error("[AutoSave] Failed to parse save data:", error);
            // If corrupt, maybe clear it? For now, just return null.
            return null;
        }
    }

    public clear() {
        if (this.saveTimeout) {
            window.clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        localStorage.removeItem(STORAGE_KEY);
        this.lastHash = '';
        console.log("[AutoSave] Session cleared.");
    }

    public hasSave(): boolean {
        return !!localStorage.getItem(STORAGE_KEY);
    }
}

export const autoSaveManager = new AutoSaveManager();
