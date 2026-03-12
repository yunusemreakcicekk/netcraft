import type { Device, Connection, NetworkScope, NetworkArea } from "../types/models";
import { CABLE_DEFINITIONS } from "./CableDefinitions";
import { ConnectionValidator } from "./ConnectionValidator";

export interface Segment {
    id: number;
    deviceIds: number[];
}

export interface Warning {
    title: string;
    message: string;
    severity: "info" | "warning" | "error";
}

export type NetworkType = 'LAN_HOME' | 'LAN_OFFICE' | 'LAN_BUILDING' | 'MAN' | 'WAN' | 'LAN_L2' | 'UNKNOWN';

export interface HealthCheck {
    errors: string[];
    warnings: string[];
    infos: string[];
}

export interface AnalysisReport {
    status: 'valid' | 'incomplete' | 'mismatch';
    detectedType: NetworkType;
    confidence: 'Low' | 'Medium' | 'High';
    complexity: 'Low' | 'Medium' | 'High';
    message: string;
    details: string;
    missingCriteria: string[];
    educationalTip: string;
    health: HealthCheck;
    stats: {
        deviceCount: number;
        broadcastDomains: number;
    };
    segmentsOverride?: string | number;
    security?: {
        score: number;
        issues: string[];
        protection?: string;
        segmentation?: string;
        exposure?: string;
    };
}

export class TopologyAnalyzer {
    public devices: Device[];
    public connections: Connection[];

    constructor(devices: Device[], connections: Connection[]) {
        this.devices = devices;
        this.connections = connections;
    }

    // Main entry point for analysis
    public validateNetwork(scope: NetworkScope | null, areas: NetworkArea[] = []): AnalysisReport {
        // 0. Base Stats
        const routers = this.devices.filter(d => d.type === 'Router').length;
        const switches = this.devices.filter(d => d.type === 'Switch').length;
        const firewalls = this.devices.filter(d => d.type === 'Firewall').length;
        const modems = this.devices.filter(d => d.type === 'Modem').length;
        const endDevices = this.devices.filter(d => ['PC', 'Laptop', 'Printer', 'Server'].includes(d.type)).length;
        const segments = this.getSegments();

        // Count areas that have at least one switch (for analysis/reporting)
        const areasWithSwitches = new Set(
            this.devices
                .filter(d => d.type === 'Switch' && d.areaId !== undefined && d.areaId !== null)
                .map(d => d.areaId)
        );
        const validAreaCount = areasWithSwitches.size;

        // 1. Classification & Confidence
        const { detectedType, confidence, variant } = this.classifyNetworkWithConfidence(routers, switches, firewalls, modems, endDevices, areas);

        let status: 'valid' | 'incomplete' | 'mismatch' = 'valid';
        let message = '';
        let details = '';
        const missingCriteria: string[] = [];
        let educationalTip = '';
        const health: HealthCheck = { errors: [], warnings: [], infos: [] };

        // 2. SCOPE VIOLATION GUARD (Highest Priority)
        if (scope) {
            let isKillerViolation = false;

            if (scope === 'LAN_HOME' && routers > 1) {
                status = 'mismatch';
                message = '❌ Architecture Mismatch';
                details = 'Home networks rely on a single gateway. Multiple routers indicate a larger network type.';
                educationalTip = "Remove extra routers to fit the Home Network scope.";
                health.errors.push("Too many routers for a Home Network.");
                isKillerViolation = true;
            } else if (scope === 'LAN_OFFICE' && switches === 0) {
                status = 'mismatch';
                message = '❌ Missing Switching Layer';
                details = 'Office networks require switches to connect multiple workstations.';
                educationalTip = "Add a Switch to connect your devices.";
                health.errors.push("No Switch detected.");
                isKillerViolation = true;
            } else if (scope === 'MAN' && switches < 2 && routers < 2) {
                status = 'mismatch';
                message = '❌ Insufficient Infrastructure';
                details = 'MANs require a backbone and multiple local segments.';
                educationalTip = "Add more switches or routers to create a MAN.";
                health.errors.push("Not enough network devices for a MAN.");
                isKillerViolation = true;
            } else if (scope === 'WAN' && routers === 0 && firewalls === 0) {
                status = 'mismatch';
                message = '❌ Missing Edge Device';
                details = 'WANs start at the edge. You need a Router or Firewall.';
                educationalTip = "Add a Router or Firewall to connect to the Internet.";
                health.errors.push("No Edge device found.");
                isKillerViolation = true;
            }

            if (isKillerViolation) {
                return {
                    status,
                    detectedType: detectedType,
                    confidence: 'Low',
                    complexity: 'Low',
                    message,
                    details,
                    missingCriteria: [],
                    educationalTip,
                    health,
                    stats: { deviceCount: this.devices.length, broadcastDomains: segments.length }
                };
            }
        }

        // 3. EXISTENCE & CONNECTIVITY GUARD
        if (this.devices.length === 0) {
            return this.createEmptyReport();
        }

        const isolatedDevices = this.devices.filter(d => {
            return !this.connections.some(c => c.sourceId === d.id || c.targetId === d.id);
        });

        if (isolatedDevices.length > 0) {
            // We report this in Health, not as a blocker for classification if enough devices exist
            health.errors.push(`${isolatedDevices.length} devices are not connected to anything.`);
        }

        // 3.5 PHYSICAL LAYER VALIDATION
        const invalidConnections: { conn: Connection, reason: string }[] = [];
        this.connections.forEach(conn => {
            const devA = this.devices.find(d => d.id === conn.sourceId);
            const devB = this.devices.find(d => d.id === conn.targetId);
            if (devA && devB) {
                const validation = ConnectionValidator.validate(devA, devB, conn.cableType);
                if (!validation.isValid) {
                    invalidConnections.push({ conn, reason: validation.reason || "Invalid Cabling" });
                    health.errors.push(`Invalid Link: ${devA.name}-${devB.name} (${conn.cableType}) - ${validation.reason}`);
                }
            }
        });

        if (invalidConnections.length > 0) {
            status = 'mismatch';
            return {
                status: 'mismatch',
                detectedType: detectedType,
                confidence: 'Low',
                complexity: 'Low',
                message: '⚠ Physical Layer Issues Detected',
                details: `Some devices are connected using unsupported cable types.\n\nInvalid Connections:\n${invalidConnections.map(ic => {
                    const d1 = this.devices.find(d => d.id === ic.conn.sourceId)?.name;
                    const d2 = this.devices.find(d => d.id === ic.conn.targetId)?.name;
                    return `• ${d1} ↔ ${d2} (${ic.conn.cableType})`;
                }).join('\n')}\n\nEducational Insight:\nEnd devices typically use Copper Ethernet. Fiber is reserved for backbone and infrastructure links.`,
                missingCriteria: [],
                educationalTip: "Check your cable types. Infrastructure links use Fiber, workstations use Copper.",
                health,
                stats: { deviceCount: this.devices.length, broadcastDomains: segments.length }
            };
        }

        // 4. GENERATE MAIN REPORT MESSAGE
        if (scope) {
            const scopeMapping: Record<string, NetworkType> = {
                'LAN_HOME': 'LAN_HOME',
                'LAN_OFFICE': 'LAN_OFFICE',
                'MAN': 'MAN',
                'WAN': 'WAN'
            };
            const targetType = scopeMapping[scope] || 'UNKNOWN';

            // Special Case: Office Under-qualified should match Office Scope
            // The classification logic now handles this via variants, but we verify here.

            // 4a. CUSTOM MESSAGING FOR VARIANTS (Educational Output)
            const friendly = this.getFriendlyAnalysis(detectedType, variant, switches > 0, validAreaCount);

            if (detectedType === targetType) {
                status = 'valid';
                message = `✅ ${friendly.title}`;
                details = friendly.description;
                educationalTip = friendly.tip;

                // Optional: warnings for under-qualified office
                if (variant === 'under_qualified' && scope === 'LAN_OFFICE') {
                    if (!health.warnings.includes("Missing Office Resources")) {
                        health.warnings.push("Consider adding a Server or Printer.");
                    }
                }
            } else {
                // Scope Mismatch
                status = 'mismatch';
                message = `⚠️ Scope Mismatch`;
                details = `You selected ${this.getReadableName(scope)}, but built a ${friendly.title}.`;
                educationalTip = this.getMismatchTip(scope, detectedType);
                missingCriteria.push(...this.getMissingCriteria(scope, routers, firewalls, areas));
            }
        } else {
            // No Scope selected (Free Build)
            status = 'valid';
            const friendly = this.getFriendlyAnalysis(detectedType, variant, switches > 0, validAreaCount);
            message = friendly.title;
            details = friendly.description;
            educationalTip = friendly.tip;
        }

        // 5. RUN HEALTH CHECKS
        this.runHealthChecks(health, segments, routers, scope, areas, detectedType);

        // 6. Override status based on strict rules if simplified
        if (health.errors.length > 0 && status === 'valid') {
            // Keep valid but maybe add warning? In this simplified version, we don't change status to invalid for minor errors.
        }

        return {
            status,
            detectedType,
            confidence,
            complexity: this.devices.length > 10 ? 'High' : (this.devices.length > 5 ? 'Medium' : 'Low'),
            message,
            details,
            missingCriteria,
            educationalTip,
            health,
            stats: {
                deviceCount: this.devices.length,
                broadcastDomains: segments.length
            },
            security: this.getSecurityHealth()
        };
    }

    // New Classification Logic with Confidence
    public classifyNetworkWithConfidence(routers: number, switches: number, firewalls: number, modems: number, endDevices: number, areas: NetworkArea[]): { detectedType: NetworkType, confidence: 'High' | 'Medium' | 'Low', variant?: string } {
        const servers = this.devices.filter(d => d.type === 'Server').length;
        const printers = this.devices.filter(d => d.type === 'Printer').length;
        const hasResource = servers > 0 || printers > 0;

        // 1. WAN (Highest Priority for Edge/Backbone)
        // Rule 4: WAN Edge Confidence -> HIGH (Strict: No end devices)
        if (modems >= 1 && (routers >= 1 || firewalls >= 1) && endDevices === 0) return { detectedType: 'WAN', confidence: 'High' }; // WAN Edge
        if (firewalls >= 1 && routers >= 1) return { detectedType: 'WAN', confidence: 'High' };

        // Backbone check
        if (routers >= 2 && switches === 0) return { detectedType: 'WAN', confidence: 'Medium' };

        // 2. MAN (Campus / Multi-building)
        // Count areas that have at least one switch
        const areasWithSwitches = new Set(
            this.devices
                .filter(d => d.type === 'Switch' && d.areaId !== undefined && d.areaId !== null)
                .map(d => d.areaId)
        );
        const validAreaCount = areasWithSwitches.size;

        if (validAreaCount >= 2 && switches >= 2 && routers >= 1) {
            return { detectedType: 'MAN', confidence: 'High' };
        }

        // Rule 3: MAN SIMPLIFIED DETECTION
        // Backbone device (Router) + 2 Switches
        if (routers >= 1 && switches >= 2) {
            // If area detection failed or not enough areas assigned, but structure is right
            if (validAreaCount < 2) {
                return { detectedType: 'MAN', confidence: 'Medium', variant: 'logical_simplified' };
            }
            return { detectedType: 'MAN', confidence: 'Medium', variant: 'simplified' };
        }

        // 3. LAN OFFICE (Priority over Home)
        // Expanded Definition: Standard Office
        if (routers === 1 && hasResource && switches >= 1) {
            return { detectedType: 'LAN_OFFICE', confidence: 'High' };
        }

        // Rule 2: OFFICE SHOULD NOT FALL BACK TO HOME
        // Router + Switch + End Devices -> Office (Under-qualified)
        if (routers === 1 && switches >= 1 && endDevices >= 1) {
            return { detectedType: 'LAN_OFFICE', confidence: 'Medium', variant: 'under_qualified' };
        }

        // 4. LAN HOME (Fallback for simple single-router setups)
        // Strict: Must have NO switches (or just 1 built-in/small switch implied) and NO servers
        if (routers === 1 && switches <= 0 && endDevices >= 1 && servers === 0 && areas.length <= 1) {
            return { detectedType: 'LAN_HOME', confidence: 'High' };
        }
        // Be slightly more lenient for Home if it's just 1 router + 1 switch + PC but NO servers 
        // (Wait, Rule 2 says Router+Switch+Multiple End Devices = Office. 
        // If it's 1 Router + 1 Switch + 1 PC? -> Could be Home.
        // Let's stick to the Office priority. If it has a Switch, prefer Office or "Advanced Home"? 
        // User said: "Router + Switch + multiple End Devices -> Office".
        // If I have Router + 1 PC? -> Home.

        if (routers === 1 && switches === 0 && endDevices >= 1) {
            return { detectedType: 'LAN_HOME', confidence: 'High' };
        }

        // 5. UNKNOWN / FALLBACK
        // Try not to return UNKNOWN if we can guess.
        if (routers === 0 && switches >= 1) return { detectedType: 'LAN_L2', confidence: 'Low' }; // L2 only

        return { detectedType: 'UNKNOWN', confidence: 'Low' };
    }


    // Only used for compatibility if needed, but prefer classifyNetworkWithConfidence
    public classifyNetwork(routers: number, switches: number, firewalls: number, endDevices: number, areas: NetworkArea[]): NetworkType {
        return this.classifyNetworkWithConfidence(routers, switches, firewalls, 0, endDevices, areas).detectedType;
    }

    private runHealthChecks(health: HealthCheck, segments: Segment[], routers: number, scope: string | null, areas: NetworkArea[], detectedType: NetworkType) {
        // 1. LOOPS (INFO ONLY)
        const loop = this.detectLoops();
        if (loop) {
            health.infos.push("Potential switching loop detected. In real networks, STP (Spanning Tree Protocol) is used to prevent broadcast storms.");
        }

        // 2. FLAT NETWORK (WARNING)
        const largestSegment = Math.max(...segments.map(s => s.deviceIds.length), 0);
        if (largestSegment > 10) {
            health.warnings.push("Large Broadcast Domain (>10 devices). This can slow down the network. Consider using VLANs.");
        }

        // 3. SINGLE POINT OF FAILURE (INFO)
        if (routers === 1 && this.devices.length > 10) {
            health.infos.push("Single Router for many devices. A redundant gateway would improve reliability.");
        }

        // 4. MAN SPECIFIC (Checking if Areas are empty)
        if (scope === 'MAN' || detectedType === 'MAN') {
            if (areas.length < 2) {
                health.infos.push(`MANs typically consist of multiple Areas (Buildings). Detected: ${areas.length}`);
            }

            // Check if disjointed
            const switches = this.devices.filter(d => d.type === 'Switch');
            const connectedSwitches = switches.filter(s => {
                return this.connections.some(c => c.sourceId === s.id || c.targetId === s.id);
            });
            if (switches.length > connectedSwitches.length) {
                health.warnings.push("Some switches in your MAN are not connected to the backbone.");
            }
        }

        // 5. WAN SECURITY (WARNING)
        if (detectedType === 'WAN' && !this.detectDMZ() && this.devices.filter(d => d.type === 'Firewall').length === 0) {
            health.warnings.push("Missing Firewall at Internet Edge. Security risk.");
        }
    }

    private getFriendlyAnalysis(type: NetworkType, variant: string | undefined, hasLAN: boolean, areaCount: number = 0): { title: string, description: string, tip: string } {

        let title = "Unidentified Topology";
        let tip = "";

        if (type === 'LAN_HOME') title = "🏠 Home Network";
        else if (type === 'LAN_OFFICE') title = variant === 'under_qualified' ? "🏢 SOHO Network" : "🏢 Office Network Detected";
        else if (type === 'MAN') title = variant === 'logical_simplified' ? "🟡 Logical MAN (Simplified)" : "✅ Realistic MAN";
        else if (type === 'WAN') title = hasLAN ? "🌍 WAN Edge (with LAN)" : "🌍 WAN Connection";
        else if (type === 'LAN_L2') title = "🟡 Local LAN (Layer 2)";

        const features: string[] = [];

        if (this.devices.some(d => d.type === 'Router')) features.push("• Router acting as gateway");
        if (this.devices.some(d => d.type === 'Switch')) features.push("• Switch distributing wired connections");
        if (this.devices.some(d => d.type === 'AccessPoint')) features.push("• Access Point providing wireless connectivity");
        if (this.devices.some(d => d.type === 'Firewall')) features.push("• Firewall protecting the internal network");

        const hasInternet = this.hasValidInternetPath();
        const hasLocal = this.hasValidLocalPath();

        if (hasInternet) {
            features.push("• Internet connectivity detected.");
        } else if (hasLocal) {
            features.push("• Local Network Only");
        }

        if (this.detectDMZ()) {
            features.push("• DMZ segmented correctly");
        }

        if (type === 'MAN' && areaCount >= 2) {
            features.push("• Multiple areas connected through backbone");
        }

        let description = "Topology Analysis:\n" + features.join('\n');

        // Segments description (requirement 6)
        const segmentsDesc: string[] = [];

        if (type === 'MAN' && areaCount > 0) {
            for (let i = 1; i <= areaCount; i++) segmentsDesc.push(`- Area ${i}`);
            segmentsDesc.push("- Backbone");
        } else {
            if (this.devices.some(d => ['PC', 'Laptop', 'Printer', 'Server', 'Switch', 'AccessPoint'].includes(d.type))) {
                segmentsDesc.push("- 1 LAN");
            }
            if (this.detectDMZ()) {
                segmentsDesc.push("- DMZ");
            }
            if (this.devices.some(d => d.type === 'Router' || d.type === 'Internet' || d.type === 'Modem')) {
                segmentsDesc.push("- 1 WAN");
            }
        }

        if (segmentsDesc.length === 0) segmentsDesc.push("- None");

        tip = "Segments:\n" + segmentsDesc.join('\n');

        return { title, description, tip };
    }



    private getMismatchTip(scope: string, detected: NetworkType): string {
        if (scope === 'MAN' && detected === 'LAN_HOME') return "You need multiple areas/switches for a MAN.";
        if (scope === 'LAN_OFFICE' && detected === 'LAN_HOME') return "Add servers or printers for an Office network.";
        return "Check the requirements panel for missing components.";
    }

    private getMissingCriteria(scope: string, routers: number, firewalls: number, areas: NetworkArea[]): string[] {
        const missing: string[] = [];
        if (scope === 'LAN_HOME') {
            if (routers !== 1) missing.push(`Requires exactly 1 Router`);
        }
        if (scope === 'LAN_OFFICE') {
            const hasResource = this.devices.some(d => d.type === 'Server' || d.type === 'Printer');
            if (!hasResource) missing.push(`Requires Server or Printer`);
        }
        if (scope === 'MAN') {
            if (areas.length < 2) missing.push(`Requires at least 2 Areas`);

            const areasWithSwitches = new Set(
                this.devices
                    .filter(d => d.type === 'Switch' && d.areaId !== undefined && d.areaId !== null)
                    .map(d => d.areaId)
            );
            if (areasWithSwitches.size < 2) missing.push(`Each Area requires a Switch`);

            if (areasWithSwitches.size >= 2) {
                // Determine if all switches can reach the main router/backbone
                const backboneRouters = this.devices.filter(d => d.type === 'Router');
                if (backboneRouters.length > 0) {
                    const allSwitchesConnected = Array.from(areasWithSwitches).every(areaId => {
                        const sw = this.devices.find(d => d.type === 'Switch' && d.areaId === areaId);
                        if (!sw) return false;
                        return backboneRouters.some(r => {
                            const path = this.findPath(sw.id, r.id);
                            return path !== null && path.length > 0;
                        });
                    });
                    if (!allSwitchesConnected) missing.push("Some areas are not connected to the backbone");
                } else {
                    missing.push("Requires a central Router to act as backbone");
                }
            }
        }
        if (scope === 'WAN') {
            if (firewalls < 1) missing.push(`Requires Firewall`);

            const hasGateway = this.hasEdgeRouter();
            const fwToRouter = this.checkFirewallToRouter();

            if (this.hasInternet() && (!hasGateway || !this.hasFirewall() || !fwToRouter)) {
                missing.push(`Perimeter path incomplete. Ensure Internet -> Edge Router -> Firewall -> Internal`);
            } else if (!this.hasValidInternetPath()) {
                missing.push(`No valid path to Internet detected.`);
            }
        }
        return missing;
    }

    private createEmptyReport(): AnalysisReport {
        return {
            status: 'incomplete',
            detectedType: 'UNKNOWN',
            confidence: 'Low',
            complexity: 'Low',
            message: 'Empty Workspace',
            details: 'Start by dragging devices from the sidebar.',
            missingCriteria: [],
            educationalTip: "Drag and drop a Router to begin.",
            health: { errors: [], warnings: [], infos: [] },
            stats: { deviceCount: 0, broadcastDomains: 0 }
        };
    }

    private getReadableName(scope: string): string {
        if (scope === 'LAN_HOME') return "Home Network";
        if (scope === 'LAN_OFFICE') return "Office Network";
        if (scope === 'LAN_BUILDING') return "Building Network";
        return scope;
    }

    // --- Graph Helpers ---

    public getSegments(): Segment[] {
        const visited = new Set<number>();
        const segments: Segment[] = [];
        let segmentCounter = 1;

        for (const device of this.devices) {
            if (visited.has(device.id)) continue;
            // Only start traversal from non-routers to find broadcast domains
            if (device.type === 'Router') {
                visited.add(device.id);
                continue;
            }

            const currentSegmentDevices: number[] = [];
            const queue: number[] = [device.id];
            visited.add(device.id);

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                currentSegmentDevices.push(currentId);
                const currentDevice = this.devices.find(d => d.id === currentId);
                if (!currentDevice) continue;
                if (currentDevice.type === 'Router') continue; // Stop at router

                const neighbors = this.getNeighbors(currentId);
                for (const neighborId of neighbors) {
                    if (!visited.has(neighborId)) {
                        const neighbor = this.devices.find(d => d.id === neighborId);
                        // If neighbor is router, we 'visit' it (so we know it's touched) but don't add to queue or segment list generally?
                        // Actually broadcast domain includes the router interface. 
                        // Simplified: Router stops propagation.
                        if (neighbor && neighbor.type !== 'Router') {
                            visited.add(neighborId);
                            queue.push(neighborId);
                        }
                    }
                }
            }
            if (currentSegmentDevices.length > 0) {
                segments.push({ id: segmentCounter++, deviceIds: currentSegmentDevices });
            }
        }
        return segments;
    }

    public getNeighbors(deviceId: number): number[] {
        const neighborIds: number[] = [];
        for (const conn of this.connections) {
            if (conn.sourceId === deviceId) neighborIds.push(conn.targetId);
            if (conn.targetId === deviceId) neighborIds.push(conn.sourceId);
        }
        return neighborIds;
    }

    // Simplified Loop Detection: Physical loops only
    private detectLoops(): boolean {
        const visited = new Set<number>();
        const parentMap = new Map<number, number>();

        // We only care about loops involving switches/hubs. 
        // Routers break broadcast domains so L2 loops usually don't adhere to them (unless bridged).
        // For educational simplicity: Any cycle in the undirected graph = loop.

        for (const device of this.devices) {
            if (visited.has(device.id)) continue;
            const stack: number[] = [device.id];
            visited.add(device.id);
            parentMap.set(device.id, -1);

            while (stack.length > 0) {
                const u = stack[stack.length - 1];
                const neighbors = this.getNeighbors(u);
                let pushed = false;

                for (const v of neighbors) {
                    if (v === parentMap.get(u)) continue;
                    if (visited.has(v)) {
                        // Cycle found. Check if it involves at least 3 devices to be a real loop (triangle or more)
                        // A-B-A is prevented by parent check.
                        return true;
                    } else {
                        visited.add(v);
                        parentMap.set(v, u);
                        stack.push(v);
                        pushed = true;
                        break;
                    }
                }
                if (!pushed) stack.pop();
            }
        }
        return false;
    }

    public detectDMZ(): boolean {
        // DMZ is detected if a Firewall connects to a segment that contains a Server.
        // In Enterprise context, it must be a dedicated DMZ port.
        const firewall = this.devices.find(d => d.type === 'Firewall');
        if (!firewall) return false;

        const neighbors = this.getNeighbors(firewall.id);

        // 1. Direct Server connection
        const hasDirectServer = neighbors.some(nid => this.devices.find(d => d.id === nid)?.type === 'Server');
        if (hasDirectServer) return true;

        // 2. Server behind a DMZ Switch
        const neighborSwitches = neighbors.filter(nid => this.devices.find(d => d.id === nid)?.type === 'Switch');
        for (const swId of neighborSwitches) {
            const swNeighbors = this.getNeighbors(swId);
            if (swNeighbors.some(nid => this.devices.find(d => d.id === nid)?.type === 'Server')) {
                return true;
            }
        }
        return false;
    }

    /**
     * --- ENTERPRISE WAN VALIDATION HELPERS ---
     */
    public hasInternet(): boolean {
        return this.devices.some(d => d.type === 'Internet');
    }

    public hasEdgeRouter(): boolean {
        return this.devices.some(d => d.type === 'Router');
    }

    public checkRouterToInternet(): boolean {
        return this.devices.some(d => {
            if (d.type !== 'Router') return false;

            const routerNeighbors = this.getNeighbors(d.id).map(nid => this.devices.find(nd => nd.id === nid));

            // 1. Direct connection to Internet
            const hasDirectInternet = routerNeighbors.some(nd => nd?.type === 'Internet');
            if (hasDirectInternet) return true;

            // 2. Connection via a Modem
            const hasModemInternet = routerNeighbors.some(nd => {
                if (nd?.type === 'Modem') {
                    const modemNeighbors = this.getNeighbors(nd.id).map(nid => this.devices.find(mn => mn.id === nid));
                    return modemNeighbors.some(mn => mn?.type === 'Internet');
                }
                return false;
            });

            return hasModemInternet;
        });
    }

    /**
     * Returns true when an Internet Cloud device is directly connected to a Router
     * using ANY traffic-capable, non-console cable (Copper, Fiber, Coax, Wireless).
     * Console cables are explicitly excluded because they are management-only links.
     */
    public hasDirectInternetLink(): boolean {
        const internetDevice = this.devices.find(d => d.type === 'Internet');
        if (!internetDevice) return false;

        return this.connections.some(conn => {
            // Must involve the Internet Cloud
            const involvesInternet =
                conn.sourceId === internetDevice.id ||
                conn.targetId === internetDevice.id;
            if (!involvesInternet) return false;

            // Console cables are management-only → never a WAN link
            if (conn.cableType === 'console') return false;

            // The other side must be a Router (direct WAN link)
            const otherId = conn.sourceId === internetDevice.id ? conn.targetId : conn.sourceId;
            const other = this.devices.find(d => d.id === otherId);
            return other?.type === 'Router';
        });
    }

    /**
     * Returns true when an Internet Cloud device is reachable from a Router
     * through any intermediate device (e.g. Router → Modem → Internet).
     * Also excludes console cables.
     */
    public hasInternetReachableFromRouter(): boolean {
        const internetDevice = this.devices.find(d => d.type === 'Internet');
        if (!internetDevice) return false;

        const routers = this.devices.filter(d => d.type === 'Router');
        for (const router of routers) {
            // BFS from router to internet, skipping console cables
            const visited = new Set<number>();
            const queue = [router.id];
            visited.add(router.id);

            while (queue.length > 0) {
                const curr = queue.shift()!;
                if (curr === internetDevice.id) return true;

                for (const conn of this.connections) {
                    if (conn.cableType === 'console') continue; // Skip management cables

                    let neighbor = -1;
                    if (conn.sourceId === curr) neighbor = conn.targetId;
                    else if (conn.targetId === curr) neighbor = conn.sourceId;

                    if (neighbor !== -1 && !visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push(neighbor);
                    }
                }
            }
        }
        return false;
    }

    public hasFirewall(): boolean {
        return this.devices.some(d => d.type === 'Firewall');
    }

    public checkFirewallToRouter(): boolean {
        return this.devices.some(d => d.type === 'Firewall' && this.getNeighbors(d.id).some(nid => this.devices.find(nd => nd.id === nid)?.type === 'Router'));
    }

    public getInternalSwitches(): Device[] {
        const firewalls = this.devices.filter(d => d.type === 'Firewall');
        const internalSwitches: Device[] = [];
        for (const fw of firewalls) {
            const fwSwitches = this.getNeighbors(fw.id).map(nid => this.devices.find(d => d.id === nid)).filter(d => d?.type === 'Switch') as Device[];
            internalSwitches.push(...fwSwitches);
        }
        return internalSwitches;
    }

    public checkFirewallToInternalSwitch(): boolean {
        return this.getInternalSwitches().length >= 1;
    }

    public hasInternalPC(): boolean {
        return this.devices.some(d => ['PC', 'Laptop', 'Printer'].includes(d.type));
    }

    public checkPCToInternalSwitch(): boolean {
        const switches = this.getInternalSwitches();
        for (const sw of switches) {
            const neighbors = this.getNeighbors(sw.id).map(nid => this.devices.find(d => d.id === nid));
            const hasEndDevice = neighbors.some(n => ['PC', 'Laptop', 'Printer'].includes(n?.type || ''));
            const hasServer = neighbors.some(n => n?.type === 'Server');

            // To be a valid Internal switch, it must have end devices and MUST NOT have public servers.
            if (hasEndDevice && !hasServer) {
                return true;
            }
        }
        return false;
    }

    public checkFirewallToDMZSwitch(): boolean {
        const firewalls = this.devices.filter(d => d.type === 'Firewall');
        for (const fw of firewalls) {
            const fwSwitches = this.getNeighbors(fw.id).map(nid => this.devices.find(d => d.id === nid)).filter(d => d?.type === 'Switch');
            if (fwSwitches.length >= 2) return true;
        }
        return false;
    }

    public hasPublicServer(): boolean {
        return this.devices.some(d => d.type === 'Server');
    }

    public checkServerToDMZSwitch(): boolean {
        const firewalls = this.devices.filter(d => d.type === 'Firewall');
        for (const fw of firewalls) {
            const fwSwitches = this.getNeighbors(fw.id).map(nid => this.devices.find(d => d.id === nid)).filter(d => d?.type === 'Switch');
            if (fwSwitches.length >= 2) {
                for (const sw of fwSwitches) {
                    if (!sw) continue;
                    const swNeighbors = this.getNeighbors(sw.id).map(nid => this.devices.find(d => d.id === nid));

                    const hasServer = swNeighbors.some(n => n?.type === 'Server');
                    const hasEndDevice = swNeighbors.some(n => ['PC', 'Laptop', 'Printer'].includes(n?.type || ''));

                    // To be a valid DMZ switch, it must have a server and MUST NOT have internal end devices.
                    if (hasServer && !hasEndDevice) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public validateWANSeverityChain(): {
        isValid: boolean,
        missing: string[],
        dmzPresent: boolean,
        segments: number,
        securityInfo: { protection: string, segmentation: string, exposure: string }
    } {
        const missing: string[] = [];
        let segments = 0;
        let dmzPresent = false;

        const hasInternet = this.hasInternet();
        const hasRouter = this.hasEdgeRouter();
        const hasFirewall = this.hasFirewall();

        const fwToRouter = this.checkFirewallToRouter();
        const routerToInternet = this.checkRouterToInternet();

        if (!hasInternet || !hasRouter || !routerToInternet) {
            missing.push("- Internet Cloud not connected");
        }

        if (!hasFirewall || !fwToRouter) {
            missing.push("- Firewall missing between Router and Internal Network");
        }

        const internalSwitches = this.getInternalSwitches();
        if (internalSwitches.length === 0 && fwToRouter) {
            // "Internal network connected directly to Router (bypassing firewall)" handles bypassing
        }

        const routers = this.devices.filter(d => d.type === 'Router');
        let bypassFound = false;
        for (const r of routers) {
            const rNeighbors = this.getNeighbors(r.id).map(nid => this.devices.find(d => d.id === nid));
            if (rNeighbors.some(n => n?.type === 'Switch' || n?.type === 'PC' || n?.type === 'Laptop' || n?.type === 'Server' || n?.type === 'Printer')) {
                const invalidConnections = rNeighbors.filter(n => n?.type !== 'Internet' && n?.type !== 'Firewall' && n?.type !== 'Router');
                if (invalidConnections.length > 0) bypassFound = true;
            }
        }

        if (bypassFound) {
            missing.push("- Internal devices must connect through Firewall");
        }

        const servers = this.devices.filter(d => d.type === 'Server');
        let dmzSwitchId: number | null = null;
        let internalBypass = false;

        if (servers.length > 0) {
            for (const s of servers) {
                const sNeighbors = this.getNeighbors(s.id).map(nid => this.devices.find(d => d.id === nid));
                for (const n of sNeighbors) {
                    if (n?.type === 'Switch') {
                        const swNeighbors = this.getNeighbors(n.id).map(nid => this.devices.find(d => d.id === nid));
                        if (!swNeighbors.some(x => x?.type === 'Firewall')) {
                            internalBypass = true;
                        } else {
                            if (swNeighbors.some(x => ['PC', 'Laptop', 'Printer'].includes(x?.type || ''))) {
                                internalBypass = true;
                            } else {
                                dmzSwitchId = n.id;
                            }
                        }
                    } else {
                        internalBypass = true;
                    }
                }
            }
        }

        if (servers.length > 0 && internalBypass) {
            missing.push("- DMZ server must not connect directly to Internal network");
        }

        const p1 = this.checkPCToInternalSwitch();
        if (p1) segments++;

        if (dmzSwitchId) {
            segments++;
            dmzPresent = true;
        }

        const allLinksActive = this.connections.every(c => c.status === 'valid');
        if (!allLinksActive) {
            missing.push("- Required links are missing or inactive");
        }

        let protection: string;
        let segmentation: string;
        let exposure: string;

        if (bypassFound || !hasFirewall || !fwToRouter) {
            protection = 'UNSECURED';
            segmentation = 'FLAT';
            exposure = 'HIGH RISK';
        } else {
            protection = (hasInternet && hasRouter && internalSwitches.length > 0) ? 'SECURED' : 'VULNERABLE';
            if (dmzPresent) {
                segmentation = 'SEGMENTED';
                exposure = internalBypass ? 'HIGH RISK' : 'LOW RISK';
            } else {
                segmentation = internalSwitches.length > 0 ? 'BASIC' : 'FLAT';
                exposure = servers.length > 0 ? (internalBypass ? 'HIGH RISK' : 'MEDIUM RISK') : 'LOW RISK';
            }
        }

        const securityInfo = {
            protection,
            segmentation,
            exposure
        };

        return {
            isValid: missing.length === 0 && p1 && allLinksActive,
            missing,
            dmzPresent,
            segments,
            securityInfo
        };
    }

    // Helper for pathfinding
    public findPath(startId: number, endId: number): number[] | null {
        if (startId === endId) return [];
        const queue: number[] = [startId];
        const visited = new Set<number>();
        visited.add(startId);
        const pathMap = new Map<number, { from: number, viaConnection: number }>();

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (currentId === endId) {
                const connectionIds: number[] = [];
                let curr = endId;
                while (curr !== startId) {
                    const step = pathMap.get(curr);
                    if (!step) break;
                    connectionIds.push(step.viaConnection);
                    curr = step.from;
                }
                return connectionIds.reverse();
            }

            for (const conn of this.connections) {
                // Only traverse valid and active connections
                if (conn.status !== 'valid') continue;

                let neighborId = -1;
                if (conn.sourceId === currentId) neighborId = conn.targetId;
                else if (conn.targetId === currentId) neighborId = conn.sourceId;

                if (neighborId !== -1 && !visited.has(neighborId)) {
                    // For APs, strict structural checks are technically already enforced by ConnectionValidator.
                    // So if it's 'valid', it means the path is possible.
                    visited.add(neighborId);
                    pathMap.set(neighborId, { from: currentId, viaConnection: conn.id });
                    queue.push(neighborId);
                }
            }
        }
        return null;
    }

    public getDevicesFromConnectionPath(startId: number, connectionIds: number[]): Device[] {
        const pathDevices: Device[] = [];
        let currId = startId;
        for (const cid of connectionIds) {
            const conn = this.connections.find(c => c.id === cid);
            if (!conn) break;
            const nextId = conn.sourceId === currId ? conn.targetId : conn.sourceId;
            const nextDev = this.devices.find(d => d.id === nextId);
            if (nextDev) pathDevices.push(nextDev);
            currId = nextId;
        }
        return pathDevices;
    }

    public hasValidInternetPath(): boolean {
        const internetSource = this.devices.find(d => d.type === 'Internet');
        if (!internetSource) return false;

        const endDevices = this.devices.filter(d => ['PC', 'Laptop', 'Server', 'Printer'].includes(d.type));
        const gateways = this.devices.filter(d => ['Router', 'Modem', 'Firewall'].includes(d.type));

        // Check if any end device can reach the internet source via a connected path
        for (const ed of endDevices) {
            const path = this.findPath(ed.id, internetSource.id);
            if (path && path.length > 0) {
                const pathDevices = this.getDevicesFromConnectionPath(ed.id, path);
                if (pathDevices.some(d => gateways.some(gw => gw.id === d.id))) return true;
            }
        }

        // Also check if any local switch/AP config can reach it (empty LAN scenario)
        const infra = this.devices.filter(d => d.type === 'Switch' || d.type === 'AccessPoint');
        for (const dev of infra) {
            const path = this.findPath(dev.id, internetSource.id);
            if (path && path.length > 0) {
                const pathDevices = this.getDevicesFromConnectionPath(dev.id, path);
                if (pathDevices.some(d => gateways.some(gw => gw.id === d.id))) return true;
            }
        }

        return false;
    }

    public hasValidLocalPath(): boolean {
        const endDevices = this.devices.filter(d => ['PC', 'Laptop', 'Server', 'Printer'].includes(d.type));
        if (endDevices.length < 2) return false;

        // Check if at least two end devices can communicate locally
        for (let i = 0; i < endDevices.length; i++) {
            for (let j = i + 1; j < endDevices.length; j++) {
                const path = this.findPath(endDevices[i].id, endDevices[j].id);
                if (path && path.length > 0) return true;
            }
        }
        return false;
    }

    public isInside(device: Device, area: NetworkArea): boolean {
        return (
            device.x >= area.x &&
            device.x <= area.x + area.width &&
            device.y >= area.y &&
            device.y <= area.y + area.height
        );
    }

    public isInsideArea(device: Device, areas: NetworkArea[]): boolean {
        return areas.some(area => this.isInside(device, area));
    }

    // Start Network Feature: Readiness Check
    public checkNetworkReadiness(): { status: 'RUNNING' | 'LIMITED' | 'STOPPED', reason: string, tip: string } {
        // 1. Identify Key Roles
        const routers = this.devices.filter(d => d.type === 'Router');
        const firewalls = this.devices.filter(d => d.type === 'Firewall');
        const modems = this.devices.filter(d => d.type === 'Modem');
        const gateways = [...routers, ...firewalls];
        const endDevices = this.devices.filter(d => ['PC', 'Laptop', 'Server', 'Printer'].includes(d.type));

        // 2. STOPPED: Basic Existence Checks
        if (gateways.length === 0) {
            return {
                status: 'STOPPED',
                reason: 'No Gateway (Router/Firewall) found.',
                tip: 'A network needs a Gateway to route traffic. Add a Router.'
            };
        }
        if (endDevices.length === 0) {
            return {
                status: 'STOPPED',
                reason: 'No End Devices found.',
                tip: 'Add PCs, Laptops, or Servers to generate traffic.'
            };
        }

        const gatewayIds = gateways.map(g => g.id);

        let physicallyInvalidLinks = 0;
        this.connections.forEach(c => {
            const devA = this.devices.find(d => d.id === c.sourceId);
            const devB = this.devices.find(d => d.id === c.targetId);
            if (devA && devB && !ConnectionValidator.validate(devA, devB, c.cableType).isValid) {
                physicallyInvalidLinks++;
            }
        });

        const trafficCapableConnections = this.connections.filter(c => {
            const devA = this.devices.find(d => d.id === c.sourceId);
            const devB = this.devices.find(d => d.id === c.targetId);
            if (!devA || !devB) return false;

            const validation = ConnectionValidator.validate(devA, devB, c.cableType);
            const meta = CABLE_DEFINITIONS[c.cableType];
            return validation.isValid && meta && meta.supportsTraffic;
        });

        let connectedToGatewayCount = 0;
        let invalidPathHeuristic = false;

        // Helper to find path using ONLY traffic capable cables
        const findTrafficPath = (startId: number, targetIds: number[]): boolean => {
            const queue = [startId];
            const visited = new Set<number>();
            visited.add(startId);

            while (queue.length > 0) {
                const curr = queue.shift()!;
                if (targetIds.includes(curr)) return true; // Reached a gateway

                // Get neighbors using ONLY traffic connections
                const relevantConns = trafficCapableConnections.filter(c => c.sourceId === curr || c.targetId === curr);

                for (const conn of relevantConns) {
                    const neighbor = conn.sourceId === curr ? conn.targetId : conn.sourceId;
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push(neighbor);
                    }
                }
            }
            return false;
        };

        for (const device of endDevices) {
            if (findTrafficPath(device.id, gatewayIds)) {
                connectedToGatewayCount++;
            } else {
                // Check if any cable (even invalid) reaches gateway
                const physicalPath = this.findPath(device.id, gatewayIds[0]);
                if (physicalPath && physicalPath.length > 0) {
                    invalidPathHeuristic = true;
                }
            }
        }

        // 4. INTERNET AVAILABILITY
        // A WAN link exists if:
        //   (a) A Router/Modem/Firewall is connected via a DSL/Coax cable (legacy isWanLink), OR
        //   (b) The Internet Cloud is directly connected to a Router via Copper, Fiber, or Coax
        //       (topology-aware — Console cables are excluded).
        let internetAvailable = false;

        // (a) Legacy: DSL / Coax cables on gateways or modems
        const wanCables = this.connections.filter(c => {
            const meta = CABLE_DEFINITIONS[c.cableType];
            return meta && meta.isWanLink;
        });
        const wanConnectedDevices = new Set<number>();
        wanCables.forEach(c => {
            wanConnectedDevices.add(c.sourceId);
            wanConnectedDevices.add(c.targetId);
        });
        if ([...gateways, ...modems].some(d => wanConnectedDevices.has(d.id))) {
            internetAvailable = true;
        }

        // (b) Topology-aware: Internet Cloud directly connected to a Router via any
        //     non-console, valid cable (Copper, Fiber, Coax, even Wireless)
        if (!internetAvailable && this.hasInternetReachableFromRouter()) {
            internetAvailable = true;
        }


        // 5. DETERMINE STATUS (Unified Labels)
        if (physicallyInvalidLinks > 0) {
            return {
                status: (connectedToGatewayCount > 0) ? 'LIMITED' : 'STOPPED',
                reason: `❌ Invalid Cabling (${physicallyInvalidLinks} links)`,
                tip: 'End devices require Copper Ethernet. Fiber/Coax is for backbone/WAN ports.'
            };
        }

        if (connectedToGatewayCount === 0) {
            return {
                status: 'STOPPED',
                reason: invalidPathHeuristic
                    ? '🚫 Path Blocked (Invalid Cable Layer)'
                    : '⚪ Offline (No physical connection to Gateway)',
                tip: 'Connect your devices to the switch/router using valid Ethernet cables.'
            };
        }

        if (connectedToGatewayCount < endDevices.length) {
            return {
                status: 'LIMITED',
                reason: `⚠️ Partial Connectivity: ${connectedToGatewayCount}/${endDevices.length} online.`,
                tip: 'Some devices are physically disconnected from the gateway.'
            };
        }

        // Full Connectivity Logic
        if (internetAvailable) {
            return {
                status: 'RUNNING',
                reason: '✅ Internet Connected',
                tip: 'WAN link active. Packets are flowing between the network and the Internet.'
            };
        }

        return {
            status: 'RUNNING',
            reason: '🌐 Local Network Only (No WAN link)',
            tip: 'The internal LAN is functional, but there is no path to the Internet.'
        };
    }

    public getSecurityHealth(): { score: number, issues: string[] } {
        const issues: string[] = [];
        let score = 100;

        const hasEdgeRouter = this.devices.some(d => d.type === 'Router');
        const hasFirewall = this.devices.some(d => d.type === 'Firewall');
        const hasDMZ = this.detectDMZ();

        if (!hasEdgeRouter) {
            issues.push("Missing Perimeter Edge Router");
            score -= 30;
        }
        if (!hasFirewall) {
            issues.push("No Firewall Protection");
            score -= 40;
        }
        if (!hasDMZ) {
            issues.push("Flat Network (No DMZ Isolation)");
            score -= 20;
        }

        const wanLink = this.connections.some(c => CABLE_DEFINITIONS[c.cableType]?.isWanLink);
        if (!wanLink && hasEdgeRouter) {
            issues.push("Edge Router disconnected from WAN");
            score -= 10;
        }

        return { score: Math.max(score, 0), issues };
    }

    // Stub for analyze() required by app but deprecated
    public analyze(): Warning[] { return []; }
}
