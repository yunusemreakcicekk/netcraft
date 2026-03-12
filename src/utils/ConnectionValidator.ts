import type { Device, CableType } from '../types/models';

export type CableCategory = 'COPPER' | 'FIBER' | 'COAX' | 'CONSOLE' | 'WIRELESS' | 'WAN' | 'UNKNOWN';

export class ConnectionValidator {
    /**
     * Map specific cable types to general categories
     */
    public static getCableCategory(cableType: CableType): CableCategory {
        switch (cableType) {
            case 'cat5':
            case 'cat5e':
            case 'cat6':
            case 'cat6a':
                return 'COPPER';
            case 'fiber_sm':
            case 'fiber_mm':
                return 'FIBER';
            case 'coax':
                return 'COAX';
            case 'console':
                return 'CONSOLE';
            case 'wireless':
                return 'WIRELESS';
            case 'dsl':
                return 'WAN';
            default:
                return 'UNKNOWN';
        }
    }

    /**
     * Core validation logic for a connection between two devices
     */
    public static validate(devA: Device, devB: Device, cableType: CableType): { isValid: boolean, reason?: string } {
        const category = this.getCableCategory(cableType);
        console.log(`[VALIDATOR] Attempting to connect ${devA.type} to ${devB.type} via ${cableType} (Category: ${category})`);

        // Global Coaxial Rule
        if (category === 'COAX') {
            const allowedCoaxDevices = ['Modem', 'Internet'];
            if (!allowedCoaxDevices.includes(devA.type) || !allowedCoaxDevices.includes(devB.type)) {
                return { isValid: false, reason: "Coaxial cables are only used for ISP connections to a modem." };
            }
        }

        // Global Console Rule
        if (category === 'CONSOLE') {
            const isA_ManagementPC = ['Laptop', 'PC'].includes(devA.type);
            const isB_ManagementPC = ['Laptop', 'PC'].includes(devB.type);
            const isA_NetworkAppliance = ['Router', 'Switch', 'Firewall'].includes(devA.type);
            const isB_NetworkAppliance = ['Router', 'Switch', 'Firewall'].includes(devB.type);

            const isValidConsole = (isA_ManagementPC && isB_NetworkAppliance) || (isB_ManagementPC && isA_NetworkAppliance);

            if (!isValidConsole) {
                return { isValid: false, reason: "Console cables are used only for device management. Use Copper or Fiber for network connections." };
            }
            return { isValid: true }; // Valid management connection, no further checks needed.
        }

        // 1. Basic End Device Rules (PC, Laptop, Server, Printer, AP, Smartphone, Tablet)
        const isEndDevA = ['PC', 'Laptop', 'Server', 'Printer', 'AccessPoint'].includes(devA.type);
        const isEndDevB = ['PC', 'Laptop', 'Server', 'Printer', 'AccessPoint'].includes(devB.type);

        if (isEndDevA || isEndDevB) {
            const endDevType = isEndDevA ? devA.type : devB.type;

            // PC explicitly requires Copper
            if (endDevType === 'PC' && category !== 'COPPER') {
                return { isValid: false, reason: "Desktop PCs require Copper Ethernet." };
            }

            // Explicit error for laptops/PCs requesting Fiber
            if (['Laptop', 'PC'].includes(endDevType) && category === 'FIBER') {
                return { isValid: false, reason: "End devices do not support Fiber connections." };
            }

            // End devices can only use Copper or Wireless
            if (category !== 'COPPER' && category !== 'WIRELESS') {
                return {
                    isValid: false,
                    reason: `${endDevType} only supports Copper Ethernet or Wireless.`
                };
            }

            // Check if this connection involves an Access Point or a Router acting as an AP
            const hasAP = devA.type === 'AccessPoint' || devB.type === 'AccessPoint';
            const hasWirelessRouter = (devA.type === 'Router' || devB.type === 'Router') && category === 'WIRELESS';

            if (hasAP || hasWirelessRouter) {
                const isADevTheAP = devA.type === 'AccessPoint' || (devA.type === 'Router' && category === 'WIRELESS');
                const other = isADevTheAP ? devB : devA;

                if (category === 'COPPER' && hasAP) {
                    if (other.type === 'Laptop') {
                        return { isValid: false, reason: "Invalid connection. Laptops must connect to Access Points using WiFi." };
                    }
                    if (other.type === 'Printer') {
                        return { isValid: false, reason: "Invalid connection. Printers must connect to Access Points using WiFi." };
                    }
                    if (other.type !== 'Router' && other.type !== 'Switch') {
                        return { isValid: false, reason: "Access Points must connect to a Router or Switch via Copper." };
                    }
                    return { isValid: true }; // Allow Copper Uplink
                } else if (category === 'WIRELESS') {
                    if (!['Laptop', 'Printer', 'PC'].includes(other.type)) {
                        return { isValid: false, reason: "Wireless connections provide WiFi to end devices only." };
                    }
                    return { isValid: true }; // Allow Wireless Clients
                } else {
                    return { isValid: false, reason: "Wireless capable devices only support Copper (Uplink) and Wireless (Clients) for edge connections." };
                }
            }

            // If it's a normal end device (PC, Laptop, Printer, Server), it expects to connect to a Switch or Router 
            // via Copper (if it reached this block, and hasAP is false)
            if (!(hasAP || hasWirelessRouter) && category === 'WIRELESS') {
                return { isValid: false, reason: "Wireless connections are only allowed between End Devices and Access Points/Routers." };
            }
            // Standard copper connection for End Devices is allowed
            // Further rules will be handled below if the other device is a Switch or Router.

        }

        // 2. MODEM specific rules
        const isModemA = devA.type === 'Modem';
        const isModemB = devB.type === 'Modem';

        if (isModemA || isModemB) {
            const other = isModemA ? devB : devA;
            if (category === 'COAX') {
                return { isValid: true }; // Coax is fine for Modems (ISP link)
            }
            if (category === 'COPPER') {
                // Modem to Router via Copper is standard
                if (other.type === 'Router') return { isValid: true };
                return { isValid: false, reason: "Modems connect to Routers via Copper." };
            }
            if (category === 'WAN') {
                return { isValid: true }; // DSL is fine
            }
            return { isValid: false, reason: "Modems require Coax, DSL, or Copper (to Router)." };
        }

        // 3. ROUTER specific rules
        const isRouterA = devA.type === 'Router';
        const isRouterB = devB.type === 'Router';

        if (isRouterA || isRouterB) {
            if (category === 'COPPER' || category === 'FIBER' || category === 'WIRELESS') return { isValid: true };
            return { isValid: false, reason: "Routers support Copper, Fiber, or Wireless links for network traffic." };
        }

        // 4. SWITCH specific rules
        const isSwitchA = ['Switch', 'CoreSwitch'].includes(devA.type);
        const isSwitchB = ['Switch', 'CoreSwitch'].includes(devB.type);

        if (isSwitchA || isSwitchB) {
            if (category === 'COPPER' || category === 'FIBER') return { isValid: true };
            return { isValid: false, reason: "Switches support Copper or Fiber ports for network traffic." };
        }

        // 5. INTERNET Cloud rules
        const isInternetA = devA.type === 'Internet';
        const isInternetB = devB.type === 'Internet';

        if (isInternetA || isInternetB) {
            const other = isInternetA ? devB : devA;
            // Internet cloud connects to Modem or Router via WAN links (Coax, Fiber, DSL)
            if (category === 'WAN' || category === 'COAX' || category === 'FIBER') {
                if (other.type === 'Modem' || other.type === 'Router') return { isValid: true };
                return { isValid: false, reason: "Internet connects to Modems or Routers." };
            }
            return { isValid: false, reason: "Internet requires a WAN link (Coax, DSL, or Fiber)." };
        }

        // Fallback for general infrastructure
        if (category === 'COPPER') return { isValid: true };

        console.log(`[VALIDATOR] Fallen through to the end for ${devA.type} and ${devB.type} with ${category}`);
        return { isValid: false, reason: "Invalid Physical Connection" };
    }
}
