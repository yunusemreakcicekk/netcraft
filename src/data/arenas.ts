import type { Arena } from "../types/arena";
import type { NetworkScope } from "../types/models";
import type { TopologyAnalyzer, AnalysisReport } from "../utils/TopologyAnalyzer";

import homeArenaBg from '../assets/arenas/home_arena.png';
import officeArenaBg from '../assets/arenas/office_arena.png';
import campusArenaBg from '../assets/arenas/campus_arena.png';
import enterpriseArenaBg from '../assets/arenas/enterprise_arena.png';

// Helper to create empty report
const createBaseReport = (analyzer: TopologyAnalyzer): AnalysisReport => {
    return {
        status: 'valid',
        detectedType: 'UNKNOWN',
        confidence: 'Low',
        complexity: 'Low',
        message: '',
        details: '',
        missingCriteria: [],
        educationalTip: '',
        health: { errors: [], warnings: [], infos: [] },
        stats: {
            deviceCount: analyzer['devices'].length,
            broadcastDomains: analyzer.getSegments().length
        }
    };
};

export const arenas: Record<NetworkScope, Arena> = {
    'LAN_HOME': {
        id: 'LAN_HOME',
        title: 'Home Network',
        description: 'A simple network for a single household. Typically uses one Router/Gateway and connects a few devices.',
        difficulty: 'Beginner',
        backgroundImage: homeArenaBg,
        requirements: [
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
            }
        ],
        guideSteps: [
            {
                id: 1,
                label: "Place Router",
                checkComplete: (analyzer) => analyzer['devices'].some(d => d.type === 'Router')
            },
            {
                id: 2,
                label: "Add End Devices",
                checkComplete: (analyzer) => analyzer['devices'].some(d => ['PC', 'Laptop', 'Printer'].includes(d.type))
            },
            {
                id: 3,
                label: "Connect Devices",
                checkComplete: (analyzer) => {
                    const routers = analyzer['devices'].filter(d => d.type === 'Router');
                    const endDevices = analyzer['devices'].filter(d => ['PC', 'Laptop', 'Printer'].includes(d.type));

                    if (routers.length === 0 || endDevices.length === 0) return false;

                    // Ensure at least one end device is physically connected to the router
                    // (either directly or via a switch, though user instructions say "connected to the router with a cable")
                    const isAnyConnected = endDevices.some(ed => {
                        return routers.some(r => {
                            const path = analyzer.findPath(r.id, ed.id);
                            return path && path.length > 0;
                        });
                    });

                    return isAnyConnected;
                }
            }
        ],
        validator: (analyzer, _areas) => {
            const report = createBaseReport(analyzer);
            const routers = analyzer['devices'].filter(d => d.type === 'Router');
            const endDevices = analyzer['devices'].filter(d => ['PC', 'Laptop', 'Printer'].includes(d.type));
            const connections = analyzer['connections'];

            const missing: string[] = [];

            if (routers.length === 0) {
                missing.push("- Router not placed");
            }
            if (endDevices.length === 0) {
                missing.push("- No end devices added");
            }

            // Check connectivity
            let hasValidPath = false;
            let allLinksActive = true;
            let totalLinksUsed = 0;

            if (routers.length > 0 && endDevices.length > 0) {
                if (connections.length === 0) {
                    missing.push("- Router and end devices are not connected");
                } else {
                    hasValidPath = endDevices.some(ed => {
                        return routers.some(r => {
                            const path = analyzer.findPath(r.id, ed.id);
                            if (path && path.length > 0) {
                                totalLinksUsed += path.length;
                                // Check if all links in this path are active
                                const pathActive = path.every(cid => {
                                    const c = connections.find(x => x.id === cid);
                                    return c && c.status === 'valid';
                                });
                                if (!pathActive) allLinksActive = false;
                                return true;
                            }
                            return false;
                        });
                    });

                    if (!hasValidPath) {
                        missing.push("- Router and end devices are not connected");
                    } else if (!allLinksActive) {
                        missing.push("- Links are not active");
                    }
                }
            }

            if (missing.length === 0 && hasValidPath && allLinksActive) {
                report.status = 'valid';
                report.detectedType = 'LAN_HOME';
                report.message = "🏠 Home Network Ready";
                report.details = "- Router connected to End Device(s)\n- All links active";
                report.educationalTip = "Tip: Good job. Your home LAN topology is correctly structured.";
                report.stats = {
                    ...report.stats,
                    broadcastDomains: 1 // Fixed to 1 for valid home network output as requested
                };
            } else {
                report.status = 'mismatch';
                report.message = "❌ Home Network Incomplete";
                report.details = missing.join('\n');
                report.missingCriteria = missing.map(m => m.replace('- ', '')); // Store raw for UI loops

                // Formulate Tip
                if (routers.length === 0) report.educationalTip = "Tip: Place exactly 1 Router on the canvas.";
                else if (endDevices.length === 0) report.educationalTip = "Tip: Add at least one End Device (PC/Laptop).";
                else if (!hasValidPath) report.educationalTip = "Tip: Connect at least one end device to the router using any available cable.";
                else if (!allLinksActive) report.educationalTip = "Tip: Verify cable types to ensure all links are active (green).";
                else report.educationalTip = "Tip: Connect at least one end device to the router using any available cable.";
            }

            return report;
        }
    },
    'LAN_OFFICE': {
        id: 'LAN_OFFICE',
        title: 'Small Office Network',
        description: 'A network for a small business. Needs shared resources (Server/Printer) and switches for more capacity.',
        difficulty: 'Intermediate',
        backgroundImage: officeArenaBg,
        requirements: [
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
        ],
        guideSteps: [
            {
                id: 1,
                label: "Step 1: Place Router",
                description: "Place exactly 1 Router.",
                checkComplete: (analyzer) => {
                    const count = analyzer['devices'].filter(d => d.type === 'Router').length;
                    if (count === 1) return true;
                    if (count > 1) return { isValid: false, message: "Only one Router is required." };
                    return false;
                }
            },
            {
                id: 2,
                label: "Step 2: Add Switch",
                description: "Place at least 1 Switch.",
                checkComplete: (analyzer) => analyzer['devices'].some(d => d.type === 'Switch')
            },
            {
                id: 3,
                label: "Step 3: Connect Router to Switch",
                description: "Connect the Router to a Switch using Copper or Fiber. (Optionally via a Firewall)",
                checkComplete: (analyzer) => {
                    const routers = analyzer['devices'].filter(d => d.type === 'Router');
                    const switches = analyzer['devices'].filter(d => d.type === 'Switch');

                    const isValid = routers.some(r => {
                        return switches.some(sw => {
                            const path = analyzer.findPath(r.id, sw.id);
                            if (!path || path.length === 0) return false;

                            const allValidCables = path.every(cid => {
                                const c = analyzer['connections'].find(conn => conn.id === cid);
                                return c && c.status === 'valid' && (c.cableType.startsWith('cat') || c.cableType.startsWith('fiber'));
                            });
                            if (!allValidCables) return false;

                            const pathDevices = analyzer.getDevicesFromConnectionPath(r.id, path);
                            const intermediateDevices = pathDevices.slice(0, -1);
                            return intermediateDevices.every(d => d.type === 'Firewall');
                        });
                    });

                    if (!isValid) return { isValid: false, message: "Ensure Router is connected to a Switch (directly or via Firewall) with Copper/Fiber." };
                    return true;
                }
            },
            {
                id: 4,
                label: "Step 4: Add End Devices",
                description: "Place at least 2 PCs/Laptops.",
                checkComplete: (analyzer) => {
                    const count = analyzer['devices'].filter(d => ['PC', 'Laptop'].includes(d.type)).length;
                    if (count >= 2) return true;
                    return { isValid: false, message: "At least 2 PCs/Laptops are required." };
                }
            },
            {
                id: 5,
                label: "Step 5: Add Shared Resource",
                description: "Place at least 1 Printer or Server.",
                checkComplete: (analyzer) => {
                    const count = analyzer['devices'].filter(d => ['Server', 'Printer'].includes(d.type)).length;
                    if (count >= 1) return true;
                    return { isValid: false, message: "At least 1 Printer or Server is required." };
                }
            },
            {
                id: 6,
                label: "Step 6: Connect End Devices to Switch",
                description: "Ensure all PCs/Laptops and Shared Resources are connected to a Switch using Copper Ethernet.",
                checkComplete: (analyzer) => {
                    const endDevices = analyzer['devices'].filter(d => ['PC', 'Laptop'].includes(d.type));
                    if (endDevices.length < 2) return false; // Inherit step 4 requirement

                    const allConnected = endDevices.every(ed => {
                        return analyzer['connections'].some(c => {
                            const devA = analyzer['devices'].find(d => d.id === c.sourceId);
                            const devB = analyzer['devices'].find(d => d.id === c.targetId);
                            if (!devA || !devB) return false;
                            const involvesEd = devA.id === ed.id || devB.id === ed.id;
                            const involvesSwitch = devA.type === 'Switch' || devB.type === 'Switch';
                            const isValidCable = c.status === 'valid' && (c.cableType.startsWith('cat'));
                            return involvesEd && involvesSwitch && isValidCable;
                        });
                    });
                    if (!allConnected) return { isValid: false, message: "Ensure all PCs/Laptops and Shared Resources are connected to a Switch using Copper Ethernet." };
                    return true;
                }
            },
            {
                id: 7,
                label: "Step 7: Connect Shared Resource to Switch",
                description: "Ensure all PCs/Laptops and Shared Resources are connected to a Switch using Copper Ethernet.",
                checkComplete: (analyzer) => {
                    const resources = analyzer['devices'].filter(d => ['Server', 'Printer'].includes(d.type));
                    if (resources.length < 1) return false; // Inherit step 5 requirement

                    const allConnected = resources.every(res => {
                        return analyzer['connections'].some(c => {
                            const devA = analyzer['devices'].find(d => d.id === c.sourceId);
                            const devB = analyzer['devices'].find(d => d.id === c.targetId);
                            if (!devA || !devB) return false;
                            const involvesRes = devA.id === res.id || devB.id === res.id;
                            const involvesSwitch = devA.type === 'Switch' || devB.type === 'Switch';
                            const isValidCable = c.status === 'valid' && (c.cableType.startsWith('cat'));
                            return involvesRes && involvesSwitch && isValidCable;
                        });
                    });
                    if (!allConnected) return { isValid: false, message: "Ensure all PCs/Laptops and Shared Resources are connected to a Switch using Copper Ethernet." };
                    return true;
                }
            }
        ],
        validator: (analyzer) => {
            const report = createBaseReport(analyzer);
            const routers = analyzer['devices'].filter(d => d.type === 'Router');
            const switches = analyzer['devices'].filter(d => d.type === 'Switch');
            const endDevices = analyzer['devices'].filter(d => ['PC', 'Laptop'].includes(d.type));
            const resources = analyzer['devices'].filter(d => ['Server', 'Printer'].includes(d.type));

            const missing: string[] = [];

            if (routers.length === 0) missing.push("Router is missing.");
            if (switches.length === 0) missing.push("Switch is missing.");

            // Check Router-Switch connection
            let routerConnectedToSwitch = false;
            if (routers.length > 0 && switches.length > 0) {
                routerConnectedToSwitch = routers.some(r => {
                    return switches.some(sw => {
                        const path = analyzer.findPath(r.id, sw.id);
                        if (!path || path.length === 0) return false;

                        const allValidCables = path.every(cid => {
                            const c = analyzer['connections'].find(conn => conn.id === cid);
                            return c && c.status === 'valid' && (c.cableType.startsWith('cat') || c.cableType.startsWith('fiber'));
                        });
                        if (!allValidCables) return false;

                        const pathDevices = analyzer.getDevicesFromConnectionPath(r.id, path);
                        const intermediateDevices = pathDevices.slice(0, -1);
                        return intermediateDevices.every(d => d.type === 'Firewall');
                    });
                });
            }

            if (routers.length > 0 && switches.length > 0 && !routerConnectedToSwitch) {
                missing.push("Router is not connected to a switch.");
            }

            if (endDevices.length < 2) missing.push("At least 2 workstations required.");
            if (resources.length < 1) missing.push("Shared resource required (Printer or Server).");

            // Check if end devices and resources are connected
            const allEndDevicesConnected = endDevices.every(ed => {
                return analyzer['connections'].some(c => {
                    const devA = analyzer['devices'].find(d => d.id === c.sourceId);
                    const devB = analyzer['devices'].find(d => d.id === c.targetId);
                    if (!devA || !devB) return false;
                    const involvesEd = devA.id === ed.id || devB.id === ed.id;
                    const involvesSwitch = devA.type === 'Switch' || devB.type === 'Switch';
                    const isValidCable = c.status === 'valid' && (c.cableType.startsWith('cat'));
                    return involvesEd && involvesSwitch && isValidCable;
                });
            });

            const allResourcesConnected = resources.every(res => {
                return analyzer['connections'].some(c => {
                    const devA = analyzer['devices'].find(d => d.id === c.sourceId);
                    const devB = analyzer['devices'].find(d => d.id === c.targetId);
                    if (!devA || !devB) return false;
                    const involvesRes = devA.id === res.id || devB.id === res.id;
                    const involvesSwitch = devA.type === 'Switch' || devB.type === 'Switch';
                    const isValidCable = c.status === 'valid' && (c.cableType.startsWith('cat'));
                    return involvesRes && involvesSwitch && isValidCable;
                });
            });

            if (endDevices.length > 0 && !allEndDevicesConnected) missing.push("Some devices are not connected to a switch.");
            if (resources.length > 0 && !allResourcesConnected) missing.push("Some shared resources are not connected to a switch.");

            // Invalid cable check
            const hasInvalidCable = analyzer['connections'].some(c => ['coax', 'console'].includes(c.cableType));
            if (hasInvalidCable && missing.length === 0) {
                // Even if requirements are technically met, restrict usage of invalid cables for Office LAN paths
                missing.push("Invalid cable type used (Coaxial or Console).");
            }

            if (missing.length === 0) {
                report.status = 'valid';
                report.detectedType = 'LAN_OFFICE';
                report.message = "🏢 Office Network Ready";
                report.details = "- Router connected to Switch\n- Minimum 2 Workstations connected\n- Shared resource connected\n- All links active";
                report.educationalTip = "Tip: Good job. Your office LAN topology is correctly structured.";
            } else {
                report.status = 'mismatch';
                report.detectedType = 'UNKNOWN';
                report.message = "❌ Architecture Mismatch";
                report.details = "Requirements for Office LAN not met.";
                report.educationalTip = "Check missing criteria to complete the Office LAN.";
                report.missingCriteria = missing;
            }

            return report;
        }
    },
    'MAN': {
        id: 'MAN',
        title: 'Metropolitan Area Network',
        description: 'Connects multiple LANs (buildings) across a city/campus. Requires distinct Areas and a Backbone.',
        difficulty: 'Advanced',
        backgroundImage: campusArenaBg,
        requirements: [
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
                description: 'Each Area must contain at least 1 Local Switch.',
                required: true,
                check: (devices, _c, areas) => {
                    if (areas.length < 2) return false;
                    return areas.every(area => {
                        return devices.some(d => d.type === 'Switch' && d.areaId === area.id);
                    });
                }
            },
            {
                id: 'man-end-devices',
                label: 'End Devices',
                description: 'Each Area must contain at least 1 End Device.',
                required: true,
                check: (devices, _c, areas) => {
                    if (areas.length < 2) return false;
                    return areas.every(area => {
                        return devices.some(d => ['PC', 'Laptop', 'Server', 'Printer'].includes(d.type) && d.areaId === area.id);
                    });
                }
            },
            {
                id: 'man-backbone',
                label: 'Backbone Device',
                description: 'A Router or Core Switch placed outside Areas.',
                required: true,
                check: (devices) => devices.some(d => ['Router', 'CoreSwitch', 'Switch'].includes(d.type) && !d.areaId)
            }
        ],
        guideSteps: [
            {
                id: 1,
                label: "Create Areas (Buildings)",
                checkComplete: (_a, areas) => areas.length >= 2
            },
            {
                id: 2,
                label: "Place Local Switches",
                checkComplete: (analyzer, areas) => {
                    if (areas.length < 2) return false;
                    return areas.every(area => {
                        return analyzer['devices'].some(d => d.type === 'Switch' && d.areaId === area.id);
                    });
                }
            },
            {
                id: 3,
                label: "Place Backbone Device (Router or Core Switch). This device connects all Areas together.",
                checkComplete: (analyzer) => {
                    return analyzer['devices'].some(d => ['Router', 'CoreSwitch', 'Switch'].includes(d.type) && !d.areaId);
                }
            },
            {
                id: 4,
                label: "Connect Areas to Backbone",
                checkComplete: (analyzer, areas) => {
                    const backboneDevices = analyzer['devices'].filter(d => ['Router', 'CoreSwitch', 'Switch'].includes(d.type) && !d.areaId);
                    if (backboneDevices.length === 0 || areas.length < 2) return false;

                    return areas.every(area => {
                        const localSwitches = analyzer['devices'].filter(d => d.type === 'Switch' && d.areaId === area.id);
                        if (localSwitches.length === 0) return false;

                        return localSwitches.some(sw => {
                            return backboneDevices.some(bb => {
                                const path = analyzer.findPath(sw.id, bb.id);
                                if (!path || path.length === 0) return false;
                                return path.every(cid => {
                                    const c = analyzer['connections'].find(conn => conn.id === cid);
                                    return c && c.status === 'valid' && (c.cableType.startsWith('cat') || c.cableType.startsWith('fiber'));
                                });
                            });
                        });
                    });
                }
            },
            {
                id: 5,
                label: "Add End Devices",
                checkComplete: (analyzer, areas) => {
                    if (areas.length < 2) return false;
                    return areas.every(area => {
                        return analyzer['devices'].some(d => ['PC', 'Laptop', 'Server', 'Printer'].includes(d.type) && d.areaId === area.id);
                    });
                }
            },
            {
                id: 6,
                label: "Connect End Devices",
                checkComplete: (analyzer, areas) => {
                    if (areas.length < 2) return false;
                    return areas.every(area => {
                        const endDevs = analyzer['devices'].filter(d => ['PC', 'Laptop', 'Server', 'Printer'].includes(d.type) && d.areaId === area.id);
                        if (endDevs.length === 0) return false;

                        return endDevs.every(ed => {
                            return analyzer['connections'].some(c => {
                                const devA = analyzer['devices'].find(d => d.id === c.sourceId);
                                const devB = analyzer['devices'].find(d => d.id === c.targetId);
                                if (!devA || !devB) return false;

                                const involvesEd = devA.id === ed.id || devB.id === ed.id;
                                const otherDev = devA.id === ed.id ? devB : devA;

                                const isLocalSwitch = otherDev.type === 'Switch' && otherDev.areaId === area.id;
                                const isValidCable = c.status === 'valid';

                                return involvesEd && isLocalSwitch && isValidCable;
                            });
                        });
                    });
                }
            }
        ],
        validator: (analyzer, areas) => {
            const report = createBaseReport(analyzer);
            const devices = analyzer['devices'];
            const connections = analyzer['connections'];

            const missing: string[] = [];
            let backboneSegmentsConnected = 0;
            let allLinksActive = true;

            // --- IMPLICIT MAN CHECK ---
            let isImplicitMAN = false;
            let implicitMissing: string[] = [];

            if (areas.length < 2) {
                const backboneCandidates = devices.filter(d => ['Router', 'CoreSwitch', 'Switch'].includes(d.type));

                for (const bb of backboneCandidates) {
                    implicitMissing = [];
                    const distSwitches = devices.filter(d => d.type === 'Switch' && d.id !== bb.id);

                    const connectedDistSwitches = distSwitches.filter(sw => {
                        const path = analyzer.findPath(sw.id, bb.id);
                        if (!path || path.length === 0) return false;
                        return path.every(cid => {
                            const c = connections.find(x => x.id === cid);
                            if (c && c.status !== 'valid') allLinksActive = false;
                            return c && c.status === 'valid' && (c.cableType.startsWith('cat') || c.cableType.startsWith('fiber'));
                        });
                    });

                    if (connectedDistSwitches.length >= 2) {
                        const validDistSwitches = connectedDistSwitches.filter(sw => {
                            const swNeighbors = analyzer.getNeighbors(sw.id)
                                .map(id => devices.find(d => d.id === id));
                            return swNeighbors.some(n => n && ['PC', 'Laptop', 'Server', 'Printer'].includes(n.type));
                        });

                        if (validDistSwitches.length >= 2) {
                            isImplicitMAN = true;
                            backboneSegmentsConnected = validDistSwitches.length;
                            break;
                        } else {
                            implicitMissing.push("- At least 2 Distribution Switches must have connected End Devices");
                        }
                    } else {
                        implicitMissing.push("- Backbone needs at least 2 connected Distribution Switches");
                    }
                }

                if (!isImplicitMAN && backboneCandidates.length === 0) {
                    implicitMissing.push("- A Router or Core Switch backbone is required");
                }
            }

            // --- EXPLICIT MAN CHECK ---
            if (areas.length >= 2) {
                areas.forEach((area, index) => {
                    const areaSwitches = devices.filter(d => d.type === 'Switch' && d.areaId === area.id);
                    if (areaSwitches.length === 0) {
                        missing.push(`- Area ${index + 1} has no Local Switch`);
                    }

                    const areaEndDevs = devices.filter(d => ['PC', 'Laptop', 'Server', 'Printer'].includes(d.type) && d.areaId === area.id);

                    if (areaEndDevs.length > 0) {
                        const correctlyConnected = areaEndDevs.every(ed => {
                            return connections.some(c => {
                                const devA = devices.find(d => d.id === c.sourceId);
                                const devB = devices.find(d => d.id === c.targetId);
                                if (!devA || !devB) return false;

                                const involvesEd = devA.id === ed.id || devB.id === ed.id;
                                const otherDev = devA.id === ed.id ? devB : devA;

                                if (involvesEd) {
                                    if (otherDev.areaId !== area.id) return false;
                                    if (c.status !== 'valid') allLinksActive = false;
                                    return otherDev.type === 'Switch';
                                }
                                return false;
                            });
                        });
                        if (!correctlyConnected) {
                            missing.push("- End Devices must connect to a Switch in the same Area");
                        }
                    }
                });

                // Check for any End Device outside of an Area
                const endDevsOutside = devices.filter(d => ['PC', 'Laptop', 'Server', 'Printer'].includes(d.type) && !d.areaId);
                if (endDevsOutside.length > 0) {
                    missing.push("- End Devices must be placed inside Areas");
                }

                const backboneDevs = devices.filter(d => ['Router', 'CoreSwitch', 'Switch'].includes(d.type) && !d.areaId);
                if (backboneDevs.length === 0) {
                    missing.push("- Backbone must be outside Areas");
                }

                if (backboneDevs.length > 0) {
                    areas.forEach((area, index) => {
                        const areaSwitches = devices.filter(d => d.type === 'Switch' && d.areaId === area.id);
                        if (areaSwitches.length > 0) {
                            const connectedToBb = areaSwitches.some(sw => {
                                return backboneDevs.some(bb => {
                                    const path = analyzer.findPath(sw.id, bb.id);
                                    if (!path || path.length === 0) return false;

                                    const validPath = path.every(cid => {
                                        const c = connections.find(x => x.id === cid);
                                        if (c && c.status !== 'valid') allLinksActive = false;
                                        return c && c.status === 'valid' && (c.cableType.startsWith('cat') || c.cableType.startsWith('fiber'));
                                    });
                                    return validPath;
                                });
                            });

                            if (connectedToBb) {
                                backboneSegmentsConnected++;
                            } else {
                                missing.push(`- Area ${index + 1} not connected to Backbone`);
                            }
                        } else {
                            missing.push(`- Area ${index + 1} not connected to Backbone`);
                        }
                    });
                }
            }

            if (!allLinksActive && !missing.includes("- All links must be active")) {
                missing.push("- All links must be active");
            }

            if (areas.length < 2 && !isImplicitMAN) {
                missing.push("- MAN requires either Explicit Network Areas or a Backbone with at least 2 Distribution Switches");
                Array.from(new Set(implicitMissing)).forEach(m => missing.push(m));
            }

            const uniqueMissing = Array.from(new Set(missing));

            if (uniqueMissing.length === 0) {
                report.status = 'valid';
                report.detectedType = 'MAN';
                report.message = "🏙️ Campus / MAN Network Ready";
                if (isImplicitMAN) {
                    report.details = "- Implicit Backbone detected\n- Distribution Switches connected to Backbone\n- End Devices connected properly\n- All links active";
                } else {
                    report.details = "- 2+ Network Areas detected\n- Each Area contains a Local Switch\n- All Areas connected to Backbone\n- End Devices correctly connected within their Areas\n- All links active";
                }
                report.educationalTip = "Tip: Good job. Your campus backbone topology is correctly structured.";
                report.segmentsOverride = backboneSegmentsConnected;
                report.stats = {
                    deviceCount: analyzer['devices'].length,
                    broadcastDomains: backboneSegmentsConnected
                };
            } else {
                report.status = 'mismatch';
                report.detectedType = 'UNKNOWN';
                report.message = "❌ Campus / MAN Network Incomplete";
                report.details = uniqueMissing.join('\n');
                report.missingCriteria = uniqueMissing.map(m => m.replace('- ', ''));
                report.educationalTip = 'Tip: Use the "Create Network Area" button and ensure each Area has its own Switch connected to the Backbone.';
                report.segmentsOverride = backboneSegmentsConnected;
                report.stats = {
                    deviceCount: analyzer['devices'].length,
                    broadcastDomains: backboneSegmentsConnected
                };
            }

            return report;
        }
    },
    'WAN': {
        id: 'WAN',
        title: 'Wide Area Network (Enterprise)',
        description: 'Professional Enterprise network connecting to the Internet. Features perimeter security, internal LAN, and a public-facing DMZ.',
        difficulty: 'Advanced',
        backgroundImage: enterpriseArenaBg,
        requirements: [
            {
                id: 'wan-internet',
                label: 'Internet Cloud',
                description: 'The starting point of the WAN.',
                required: true,
                check: (d) => d.some(x => x.type === 'Internet')
            },
            {
                id: 'wan-edge-router',
                label: 'Edge Router',
                description: 'Connects internal network to the Internet.',
                required: true,
                check: (d) => d.some(x => x.type === 'Router')
            },
            {
                id: 'wan-firewall',
                label: 'Perimeter Firewall',
                description: 'Stateful firewall for segmentation.',
                required: true,
                check: (d) => d.some(x => x.type === 'Firewall')
            }
        ],
        guideSteps: [
            {
                id: 1,
                label: "Place Internet Cloud",
                checkComplete: (analyzer) => analyzer.hasInternet()
            },
            {
                id: 2,
                label: "Place Edge Router",
                checkComplete: (analyzer) => analyzer.hasEdgeRouter()
            },
            {
                id: 3,
                label: "Connect the Edge Router's WAN port to the Internet Cloud.",
                checkComplete: (analyzer) => analyzer.checkRouterToInternet()
            },
            {
                id: 4,
                label: "Place Perimeter Firewall",
                checkComplete: (analyzer) => analyzer.hasFirewall()
            },
            {
                id: 5,
                label: "Connect the Firewall's external interface to the Edge Router.",
                checkComplete: (analyzer) => analyzer.checkFirewallToRouter()
            },
            {
                id: 6,
                label: "Step 6a: Place Internal Switch",
                checkComplete: (analyzer) => analyzer['devices'].some(d => d.type === 'Switch')
            },
            {
                id: 7,
                label: "Step 6b: Connect Firewall to Internal Switch",
                checkComplete: (analyzer) => analyzer.checkFirewallToInternalSwitch()
            },
            {
                id: 8,
                label: "Step 6c: Add at least 1 Internal PC",
                checkComplete: (analyzer) => analyzer.hasInternalPC()
            },
            {
                id: 9,
                label: "Step 6d: Connect PC to Internal Switch",
                checkComplete: (analyzer) => analyzer.checkPCToInternalSwitch()
            },
            {
                id: 10,
                label: "Step 7a: Place DMZ Switch",
                description: "The DMZ is a semi-public zone for external-facing servers.",
                checkComplete: (analyzer) => analyzer['devices'].filter(d => d.type === 'Switch').length >= 2
            },
            {
                id: 11,
                label: "Step 7b: Connect Firewall to DMZ Switch",
                checkComplete: (analyzer) => analyzer.checkFirewallToDMZSwitch()
            },
            {
                id: 12,
                label: "Step 7c: Add Public Server",
                checkComplete: (analyzer) => analyzer.hasPublicServer()
            },
            {
                id: 13,
                label: "Step 7d: Connect Server to DMZ Switch",
                checkComplete: (analyzer) => analyzer.checkServerToDMZSwitch()
            }
        ],
        validator: (analyzer) => {
            const report = createBaseReport(analyzer);
            const { isValid, missing, segments, securityInfo } = analyzer.validateWANSeverityChain();

            report.detectedType = 'WAN';

            if (isValid) {
                report.status = 'valid';
                report.message = "🌍 Enterprise WAN Ready";
                report.details = "- Internet connected to Edge Router\n- Firewall correctly positioned\n- Internal Network protected\n- DMZ properly segmented (if present)\n- All links active";
                report.educationalTip = "Good job. Your enterprise perimeter topology is correctly structured.";
            } else {
                report.status = 'mismatch';
                report.message = "❌ Enterprise WAN Incomplete";
                report.details = missing.join('\n');
                report.missingCriteria = missing.map(m => m.replace('- ', ''));
                report.educationalTip = "Ensure traffic flows Internet → Router → Firewall → Internal.";
            }

            report.segmentsOverride = segments;
            report.stats = {
                deviceCount: analyzer['devices'].length,
                broadcastDomains: segments
            };

            report.security = {
                score: isValid ? 100 : Math.max(0, 100 - (missing.length * 20)),
                issues: missing.map(m => m.replace('- ', '')),
                protection: securityInfo.protection,
                segmentation: securityInfo.segmentation,
                exposure: securityInfo.exposure
            };

            return report;
        }
    }
};
