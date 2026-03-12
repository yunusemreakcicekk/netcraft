import type { DeviceType, CableType, ConnectionStatus } from '../types/models';

export interface ValidationResult {
    status: ConnectionStatus;
    message: string;
}

export class CableValidator {

    static validate(sourceType: DeviceType, targetType: DeviceType, cable: CableType): ValidationResult {
        // 1. Normalize
        const src = sourceType.toUpperCase();
        const tgt = targetType.toUpperCase();
        const cab = cable.toUpperCase();

        // Debug Log
        console.log(`[CableValidator] Validating: ${src} <-> ${tgt} via ${cab}`);

        // Helper
        const matchesPair = (a: string, b: string, x: string, y: string) => {
            return (a === x && b === y) || (a === y && b === x);
        };

        // --- COPPER (ETHERNET) ---
        if (cab.startsWith('CAT')) {
            const isLanDevice = (t: string) => ['PC', 'LAPTOP', 'SERVER', 'PRINTER', 'SWITCH', 'ROUTER', 'FIREWALL', 'ACCESSPOINT'].includes(t);

            // Allow between ANY LAN devices (Realistic physics, though design might be poor)
            if (isLanDevice(src) && isLanDevice(tgt)) {
                // Check for specific warnings if needed, but for "Realistic Behavior", if the port fits, it links.
                // Educational nuances:
                if (matchesPair(src, tgt, 'PC', 'ROUTER')) return { status: 'valid', message: "Direct connection (Auto-MDIX). Valid for basic connectivity." };
                if (matchesPair(src, tgt, 'PC', 'PC')) return { status: 'warning', message: "Peer-to-Peer. Needs static IP setup." };

                return { status: 'valid', message: "Valid Ethernet Connection." };
            }
            return { status: 'error', message: "Ethernet is for LAN devices (computers, switches, routers)." };
        }

        // --- FIBER OPTICS ---
        if (cab.includes('FIBER')) {
            if (matchesPair(src, tgt, 'SWITCH', 'SWITCH')) return { status: 'valid', message: "Valid Fiber Trunk." };
            if (matchesPair(src, tgt, 'SWITCH', 'ROUTER')) return { status: 'valid', message: "Valid Fiber Uplink." };
            if (matchesPair(src, tgt, 'ROUTER', 'ROUTER')) return { status: 'valid', message: "Valid Backbone Link." };
            if (matchesPair(src, tgt, 'ROUTER', 'FIREWALL')) return { status: 'valid', message: "Valid Edge Link." };

            // Fiber to PC/Laptop is theoretically possible but rare (NIC required). 
            // Stick to strict "Infrastructure only" as per prompt? 
            // Prompt: "Allowed between Router<->Router, Router<->Switch, Firewall<->Router". 
            // Does not list Device.
            return { status: 'error', message: "Fiber is typically used for infrastructure (Router/Switch/Firewall) interconnects." };
        }

        // --- COAXIAL ---
        if (cab === 'COAX') {
            // ISP <-> Modem Only
            if (matchesPair(src, tgt, 'CLOUD', 'MODEM')) return { status: 'valid', message: "Valid ISP Connection." };
            return { status: 'error', message: "Coaxial is used for the ISP line to the Modem." };
        }

        // --- CONSOLE ---
        if (cab === 'CONSOLE') {
            const isConsoleHost = (t: string) => ['PC', 'LAPTOP'].includes(t);
            const isNetworkDevice = (t: string) => ['ROUTER', 'SWITCH', 'FIREWALL'].includes(t);

            if (isConsoleHost(src) && isNetworkDevice(tgt)) return { status: 'valid', message: "Management Link. No data traffic." };
            if (isNetworkDevice(src) && isConsoleHost(tgt)) return { status: 'valid', message: "Management Link. No data traffic." };

            return { status: 'error', message: "Console connects a Computer to a Network Device Management Port." };
        }

        // --- WIRELESS ---
        if (cab === 'WIRELESS') {
            if (matchesPair(src, tgt, 'ACCESSPOINT', 'PC') ||
                matchesPair(src, tgt, 'ACCESSPOINT', 'LAPTOP') ||
                matchesPair(src, tgt, 'ACCESSPOINT', 'PRINTER')
            ) {
                return { status: 'valid', message: "Valid Wi-Fi connection." };
            }
            return { status: 'error', message: "Wireless is for AP <-> Devices." };
        }

        return { status: 'error', message: "Unknown or invalid connection type." };
    }
}
