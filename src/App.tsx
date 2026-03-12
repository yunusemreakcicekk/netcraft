import { useState, useEffect, useRef } from "react";
import { useHistory } from "./hooks/useHistory";
import { Canvas } from "./components/Canvas";
import type { Device, Connection } from './types/models';
import type { CableType, NetworkScope, NetworkArea } from './types/models';
import { TopologyAnalyzer } from "./utils/TopologyAnalyzer";
import type { Warning, Segment, AnalysisReport } from "./utils/TopologyAnalyzer";
import { RequirementsPanel } from "./components/RequirementsPanel";
import { NetworkStatusCard } from "./components/NetworkStatusCard";
import { ConnectionValidator } from "./utils/ConnectionValidator";
import { arenas } from "./data/arenas";
import type { Packet } from './types/models';
import { TrafficEngine } from "./utils/TrafficEngine";
import { goldenScenarios } from "./data/goldenScenarios";
import type { Scenario } from "./data/scenarios";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { TopologyIO } from "./utils/TopologyIO";
import { AnnotationToolbar } from "./components/AnnotationToolbar";
import { AnnotationLayer } from "./components/AnnotationLayer";
import type { Annotation, AnnotationType, AnnotationStyle } from "./types/annotation";
import { getTransformedCoordinates } from "./utils/coordinateMapper";
import { TopBar } from "./components/TopBar";
import { RightPanel } from "./components/RightPanel";
import { GuidePanel } from './components/GuidePanel';
import { RestoreSessionModal } from './components/RestoreSessionModal';
import { AutoSaveIndicator } from './components/AutoSaveIndicator';
import BottomDock from "./components/BottomDock";
import { DeviceDetailModal } from "./components/DeviceDetailModal";

// Style definitions
const scopeButtonStyle = {
    padding: '30px',
    background: '#f8f9fa',
    border: '2px solid #ddd',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
    fontSize: '1.2rem',
    minHeight: '120px',
    justifyContent: 'center'
};

declare global {
    interface Window {
        NetCraftTest: {
            addDevice: (type: string, x: number, y: number) => number;
            connect: (id1: number, id2: number) => void;
            startNetwork: () => void;
            stopNetwork: () => void;
            clear: () => void;
            getPackets: () => Packet[];
        };
    }
}

// History State Interface
interface AppState {
    items: Device[];
    connections: Connection[];
    areas: NetworkArea[];
    annotations: Annotation[];
}

function App() {
    console.log("App Component Mounting...");

    // HISTORY STATE
    const {
        state: appState,
        set: setAppState,
        undo,
        redo,
        reset: resetHistory
    } = useHistory<AppState>({
        items: [],
        connections: [],
        areas: [],
        annotations: []
    });

    // Destructure for easier access (read-only references)
    const { items, connections, areas, annotations } = appState;

    // derived setters to maintain compatibility with existing code structure
    // These wrappers allow us to keep using setItems(...) but it goes through history!
    const setItems = (action: React.SetStateAction<Device[]>) => {
        setAppState(prev => ({
            ...prev,
            items: typeof action === 'function' ? (action as any)(prev.items) : action
        }));
    };

    const setConnections = (action: React.SetStateAction<Connection[]>) => {
        setAppState(prev => ({
            ...prev,
            connections: typeof action === 'function' ? (action as any)(prev.connections) : action
        }));
    };

    const setAreas = (action: React.SetStateAction<NetworkArea[]>) => {
        setAppState(prev => ({
            ...prev,
            areas: typeof action === 'function' ? (action as any)(prev.areas) : action
        }));
    };

    const setAnnotations = (action: React.SetStateAction<Annotation[]>) => {
        setAppState(prev => ({
            ...prev,
            annotations: typeof action === 'function' ? (action as any)(prev.annotations) : action
        }));
    };

    // --- MIGRATION: Auto-add wireless ports to legacy devices ---
    useEffect(() => {
        let needsUpdate = false;
        const mappedItems = items.map(item => {
            if (item.type === 'Laptop' || item.type === 'Printer') {
                if (!item.ports.some(p => p.type === 'wireless')) {
                    needsUpdate = true;
                    return { ...item, ports: [...item.ports, { id: 'wlan0', name: 'WiFi', type: 'wireless' as any, isOccupied: false }] };
                }
            } else if (item.type === 'AccessPoint' || item.type === 'Router') {
                if (!item.ports.some(p => p.type === 'wireless')) {
                    needsUpdate = true;
                    return { ...item, ports: [...item.ports, { id: 'wifi', name: 'WiFi', type: 'wireless' as any, isOccupied: false }] };
                }
            }
            return item;
        });

        if (needsUpdate) {
            setItems(mappedItems);
        }
    }, [items]);
    // -------------------------------------------------------------

    const [viewState, setViewState] = useState<{ zoom: number; offset: { x: number; y: number } }>({
        zoom: 1,
        offset: { x: 0, y: 0 }
    });

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isCableMode, setIsCableMode] = useState(false);
    const [isPanMode, setIsPanMode] = useState(false);
    const [isAreaMode, setIsAreaMode] = useState(false); // New Area Mode
    const [previewArea, setPreviewArea] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [canvasContentRef, setCanvasContentRef] = useState<HTMLDivElement | null>(null);

    const [cableSourceId, setCableSourceId] = useState<number | null>(null);
    const [cableSourcePortId, setCableSourcePortId] = useState<string | null>(null);
    const [selectedCableType, setSelectedCableType] = useState<CableType>('cat6');
    const [packets, setPackets] = useState<Packet[]>([]); // Traffic Packets
    const [draggedDeviceType, setDraggedDeviceType] = useState<string | null>(null);

    // Test Connectivity State
    const [isTestMode, setIsTestMode] = useState(false);
    const [testSourceId, setTestSourceId] = useState<number | null>(null);
    const [highlightedPath, setHighlightedPath] = useState<number[]>([]);

    // Inspect View State
    const [inspectDeviceId, setInspectDeviceId] = useState<number | null>(null);

    // Click-to-Draw State for Areas
    const [isDrawingArea, setIsDrawingArea] = useState(false);

    // Viewport Ref (Untransformed Container)
    const viewportRef = useRef<HTMLDivElement>(null);

    // Network Scope State
    const [networkScope, setNetworkScope] = useState<NetworkScope | null>(null);
    const [showScopeModal, setShowScopeModal] = useState(true);

    // Analysis State
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const [analysisResults, setAnalysisResults] = useState<{
        report: AnalysisReport;
        warnings: Warning[];
        segments: Segment[];
    } | null>(null);

    const [showReferenceModal, setShowReferenceModal] = useState(false);

    const [networkState, setNetworkState] = useState<'STOPPED' | 'RUNNING' | 'LIMITED'>('STOPPED');
    const [networkStatusInfo, setNetworkStatusInfo] = useState<{ status: string, reason: string, tip: string } | null>(null);

    // Guided Build State (Restored)
    const [guideStep, setGuideStep] = useState<number>(0);

    // Guided Build Helpers
    const nextGuideStep = () => {
        if (!networkScope) return;
        const arena = arenas[networkScope];
        if (!arena) return;

        setGuideStep(prev => {
            const maxStep = arena.guideSteps.length;
            if (prev >= maxStep) {
                // Done
                handleAnalyze(); // Auto analyze when done
                return prev + 1; // Move to "finished" state (index > length)
            }
            return prev + 1;
        });
    };

    // File Management State
    const [isDirty, setIsDirty] = useState(false);
    const [currentFileName, setCurrentFileName] = useState<string | null>(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [fileHandle, setFileHandle] = useState<any>(null); // FileSystemFileHandle

    // Annotation State (Partially Removed)
    const [isAnnotationMode, setIsAnnotationMode] = useState(false);

    const handleDeleteAnnotation = (id: string) => {
        setAnnotations(prev => prev.filter(a => a.id !== id));
        setIsDirty(true);
    };
    const [annotationTool, setAnnotationTool] = useState<AnnotationType>('free');
    const [annotationStyle, setAnnotationStyle] = useState<AnnotationStyle>({
        strokeColor: '#000000',
        fillColor: 'transparent',
        strokeWidth: 2,
        fontSize: 16
    });

    const toggleNetworkStart = () => {
        try {
            if (networkState === 'STOPPED') {
                console.log("Starting network analysis...");
                const analyzer = new TopologyAnalyzer(items, connections);
                const readiness = analyzer.checkNetworkReadiness();
                console.log("Readiness:", readiness);

                if (readiness.status === 'STOPPED') {
                    alert(`Cannot Start Network:\n\n❌ ${readiness.reason}\n💡 ${readiness.tip}`);
                    return;
                }

                // Generate Packets for Animation
                const engine = new TrafficEngine(items, connections);
                const newPackets = engine.generatePackets();
                setPackets(newPackets);

                setNetworkStatusInfo(readiness);
                setNetworkState(readiness.status);
            } else {
                setNetworkState('STOPPED');
                setNetworkStatusInfo(null);
                setPackets([]);
            }
        } catch (error: any) {
            console.error("Error toggling network:", error);
            alert(`Error starting network: ${error.message}`);
        }
    };

    const toggleCableMode = () => {
        setIsCableMode((prev) => !prev);
        setIsTestMode(false); // Disable test mode if cables on
        setIsAreaMode(false);
        setIsDeleteMode(false);
        setCableSourceId(null);
        setCableSourcePortId(null);
        setSelectedId(null);
        setHighlightedPath([]);
    };

    const [isDeleteMode, setIsDeleteMode] = useState(false);

    const toggleTestMode = () => {
        setIsTestMode(prev => !prev);
        setIsCableMode(false); // Disable cable mode if test on
        setIsAreaMode(false);
        setIsDeleteMode(false);
        setTestSourceId(null);
        setHighlightedPath([]);
        setSelectedId(null);
    };

    const toggleDeleteMode = () => {
        setIsDeleteMode(prev => !prev);
        setIsCableMode(false);
        setIsTestMode(false);
        setIsAreaMode(false);
        setSelectedId(null);
        setTestSourceId(null);
    }

    // Escape listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isAreaMode) {
                    setIsAreaMode(false);
                    setIsDrawingArea(false);
                    setPreviewArea(null);
                }
                if (isCableMode) setIsCableMode(false);
                if (isDeleteMode) setIsDeleteMode(false);
                setSelectedId(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAreaMode, isCableMode, isDeleteMode]);

    const toggleAreaMode = () => {
        setIsAreaMode(prev => !prev);
        setIsDrawingArea(false);
        setPreviewArea(null);
        setIsCableMode(false);
        setIsTestMode(false);
        setIsDeleteMode(false);
        setSelectedId(null);
    };

    const handleDeleteArea = (id: number) => {
        if (!window.confirm("Delete this Area? Devices inside will lose their area assignment.")) return;

        setAreas(prev => prev.filter(a => a.id !== id));

        // Update devices
        setItems(prev => prev.map(item => {
            if (item.areaId === id) {
                return { ...item, areaId: null };
            }
            return item;
        }));

        if (selectedId === id) setSelectedId(null);
        setIsDirty(true);
    };

    // Guided Build Helpers - Removed

    // Auto-Save State
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoreTimestamp, setRestoreTimestamp] = useState<number>(0);
    const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);

    // Auto-Save Effect
    useEffect(() => {
        // Don't auto-save if we are in the restore modal or if scope isn't set
        if (showRestoreModal || showScopeModal) return;

        import('./utils/AutoSaveManager').then(({ autoSaveManager }) => {
            autoSaveManager.triggerSave({
                scope: networkScope,
                devices: items,
                connections: connections,
                areas: areas,
                annotations: annotations,
                zoom: viewState.zoom,
                panOffset: viewState.offset
            }, () => {
                setLastAutoSaved(new Date());
            });
        });
    }, [items, connections, areas, annotations, viewState, networkScope, showRestoreModal, showScopeModal]);

    // Restore Session Check on Mount
    useEffect(() => {
        import('./utils/AutoSaveManager').then(({ autoSaveManager }) => {
            const savedData = autoSaveManager.load();
            if (savedData) {
                console.log("Found previous session:", savedData);
                setRestoreTimestamp(savedData.timestamp);
                setShowScopeModal(false); // Hide scope modal temporarily
                setShowRestoreModal(true);
            }
        });
    }, []);

    const handleRestoreSession = () => {
        import('./utils/AutoSaveManager').then(({ autoSaveManager }) => {
            const savedData = autoSaveManager.load();
            if (savedData) {
                resetHistory({
                    items: reassignAllDevices(savedData.devices, savedData.areas || []),
                    connections: savedData.connections,
                    areas: savedData.areas,
                    annotations: savedData.annotations
                });
                setNetworkScope(savedData.scope);
                setViewState({ zoom: savedData.zoom, offset: savedData.panOffset });
                setShowRestoreModal(false);
            }
        });
    };

    const handleDiscardSession = () => {
        import('./utils/AutoSaveManager').then(({ autoSaveManager }) => {
            autoSaveManager.clear();
            setShowRestoreModal(false);
            setShowScopeModal(true); // Show scope selection again
        });
    };

    // Update Clear/Load actions to clear auto-save
    const handleScopeSelect = (scope: NetworkScope | null) => {
        import('./utils/AutoSaveManager').then(({ autoSaveManager }) => autoSaveManager.clear());

        if (items.length > 0) {
            if (!window.confirm("Building a new network will clear your current workspace. Continue?")) {
                return;
            }
        }

        // Clean Reset of Global State
        resetHistory({
            items: [],
            connections: [],
            areas: [],
            annotations: []
        });

        // Reset UI Selection & modes
        setSelectedId(null);
        setTestSourceId(null);
        setHighlightedPath([]);
        setInspectDeviceId(null);
        setPackets([]);
        setNetworkState('STOPPED');
        setNetworkStatusInfo(null);
        setAnalysisResults(null);
        setIsDirty(false);
        setCurrentFileName(null);
        setFileHandle(null);
        setIsAnnotationMode(false);

        // Reset View to center
        setViewState({ zoom: 1, offset: { x: 0, y: 0 } });

        // Apply Scope
        setNetworkScope(scope);
        setShowScopeModal(false);

        if (scope) {
            setGuideStep(1); // Start Guide
            // Show brief info
            const arena = arenas[scope];
            if (arena) {
                // Using a timeout to ensure render happens first (avoids race conditions with alert)
                setTimeout(() => {
                    alert(`${arena.title} \n\n${arena.description} `);
                }, 100);
            }
        } else {
            setGuideStep(0); // No guide for blank
        }
    };

    const resetWorkspace = () => {
        resetHistory({
            items: [],
            connections: [],
            areas: [],
            annotations: []
        });
        setNetworkScope(null);
        setSelectedId(null);
        setTestSourceId(null);
        setHighlightedPath([]);
        setInspectDeviceId(null);
        setPackets([]);
        setNetworkState('STOPPED');
        setNetworkStatusInfo(null);
        setAnalysisResults(null);
        setIsDirty(false);
        setCurrentFileName(null);
        setFileHandle(null);
        setShowScopeModal(true);
        setIsAnnotationMode(false);
        setViewState({ zoom: 1, offset: { x: 0, y: 0 } });
    };

    const handleNewTopology = () => {
        if (isDirty) {
            setShowUnsavedModal(true);
        } else {
            import('./utils/AutoSaveManager').then(({ autoSaveManager }) => autoSaveManager.clear());
            resetWorkspace();
        }
    };

    const handleSave = async (): Promise<boolean> => {
        // If we have a file handle, save directly to it (Native Save)
        if (fileHandle) {
            try {
                const json = TopologyIO.serialize(networkScope, items, connections, areas, annotations);
                // @ts-ignore
                const writable = await fileHandle.createWritable();
                await writable.write(json);
                await writable.close();
                setIsDirty(false);
                return true;
            } catch (error) {
                console.error("Failed to save to file handle:", error);
                alert("Failed to save changes. Please try 'Save As'.");
                return false;
            }
        }

        // Fallback or First Save
        if (!currentFileName) {
            return await handleSaveAs();
        }

        // Legacy Download fallback (should rarely be reached if fileHandle logic works)
        const json = TopologyIO.serialize(networkScope, items, connections, areas, annotations);
        TopologyIO.downloadFile(`${currentFileName}.json`, json);
        setIsDirty(false);
        return true;
    };

    const handleSaveAs = async (): Promise<boolean> => {
        try {
            // Native Save As
            if ('showSaveFilePicker' in window) {
                const options = {
                    suggestedName: currentFileName || `netcraft_topology_${Date.now()} `,
                    types: [{
                        description: 'NetCraft Topology',
                        accept: { 'application/json': ['.json'] },
                    }],
                };
                // @ts-ignore
                const handle = await window.showSaveFilePicker(options);
                const json = TopologyIO.serialize(networkScope, items, connections, areas, annotations);
                const writable = await handle.createWritable();
                await writable.write(json);
                await writable.close();

                setFileHandle(handle);
                setCurrentFileName(handle.name.replace('.json', ''));
                setIsDirty(false);
                return true;
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Save As failed:", error);
            }
            return false;
        }

        // Fallback to Download
        const defaultName = currentFileName || `netcraft_topology_${Date.now()} `;
        const name = window.prompt("Enter file name:", defaultName);
        if (!name) return false;

        const json = TopologyIO.serialize(networkScope, items, connections, areas, annotations);
        TopologyIO.downloadFile(`${name}.json`, json);
        setIsDirty(false);
        setCurrentFileName(name);
        return true;
    };

    const handleLoadTopology = async () => {
        import('./utils/AutoSaveManager').then(({ autoSaveManager }) => autoSaveManager.clear());

        if (items.length > 0) {
            if (!window.confirm("Loading a file will replace your current network. Continue?")) {
                return;
            }
        }

        try {
            // Native Load
            if ('showOpenFilePicker' in window) {
                const options = {
                    types: [{
                        description: 'NetCraft Topology',
                        accept: { 'application/json': ['.json'] },
                    }],
                    multiple: false
                };
                // @ts-ignore
                const [handle] = await window.showOpenFilePicker(options);
                const file = await handle.getFile();
                const content = await file.text();

                const data = TopologyIO.deserialize(content);

                // Restore State via History Reset (clears undo stack for new file)
                resetHistory({
                    items: reassignAllDevices(data.devices, data.areas || []),
                    connections: data.connections,
                    areas: data.areas,
                    annotations: data.annotations || []
                });

                setNetworkScope(data.scope);

                // Reset Runtime
                setSelectedId(null);
                setTestSourceId(null);
                setHighlightedPath([]);
                setInspectDeviceId(null);
                setPackets([]);
                setNetworkState('STOPPED');
                setNetworkStatusInfo(null);
                setAnalysisResults(null);
                setIsAnnotationMode(false);

                setIsDirty(false);
                setFileHandle(handle);
                setCurrentFileName(file.name.replace('.json', ''));
                return;
            }

            // Fallback: Trigger hidden input
            document.getElementById('hidden-file-input')?.click();

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                alert(`Error loading file: ${error.message} `);
            }
        }
    };

    const handleLoadGoldenScenario = (scenario: Scenario) => {
        import('./utils/AutoSaveManager').then(({ autoSaveManager }) => autoSaveManager.clear());

        if (items.length > 0) {
            if (!window.confirm("Loading a reference scenario will clear your current network. Continue?")) {
                return;
            }
        }

        // Auto-detect scope based on scenario ID
        let scope: NetworkScope | null = 'WAN'; // Default fallback

        if (scenario.id.includes('home')) scope = 'LAN_HOME';
        else if (scenario.id.includes('office')) scope = 'LAN_OFFICE';
        else if (scenario.id.includes('campus') || scenario.id.includes('building')) scope = 'MAN';
        else if (scenario.id.includes('enterprise') || scenario.id.includes('wan')) scope = 'WAN';

        setNetworkScope(scope);

        resetHistory({
            items: reassignAllDevices(scenario.items, scenario.areas || []),
            connections: scenario.connections,
            areas: scenario.areas || [],
            annotations: scenario.annotations || []
        });

        setSelectedId(null);
        setTestSourceId(null);
        setHighlightedPath([]);
        setInspectDeviceId(null);
        setShowReferenceModal(false);
        setShowScopeModal(false);
    };

    const getAreaForPoint = (x: number, y: number, currentAreas: NetworkArea[]): number | null => {
        const area = currentAreas.find(a =>
            x >= a.x && x <= a.x + a.width &&
            y >= a.y && y <= a.y + a.height
        );
        return area ? area.id : null;
    };

    const reassignAllDevices = (devices: Device[], currentAreas: NetworkArea[]): Device[] => {
        return devices.map(d => ({
            ...d,
            areaId: getAreaForPoint(d.x, d.y, currentAreas)
        }));
    };

    const handleDropItem = (item: Device) => {
        // --- WAN WIZARD LOCKING ---
        if (networkScope === 'WAN') {
            const currentStep = guideStep;
            let isAllowed = false;
            let errorMsg = "";

            if (currentStep === 1 && item.type === 'Internet') isAllowed = true;
            else if (currentStep === 2 && item.type === 'Router') isAllowed = true;
            else if (currentStep === 3) isAllowed = false; // Connection
            else if (currentStep === 4 && item.type === 'Firewall') isAllowed = true;
            else if (currentStep === 5) isAllowed = false; // Connection
            else if (currentStep === 6 && item.type === 'Switch') isAllowed = true; // Internal Switch
            else if (currentStep === 7) isAllowed = false; // Connection
            else if (currentStep === 8 && ['PC', 'Laptop', 'Printer'].includes(item.type)) isAllowed = true; // Internal PC
            else if (currentStep === 9) isAllowed = false; // Connection
            else if (currentStep === 10 && item.type === 'Switch') isAllowed = true; // DMZ Switch
            else if (currentStep === 11) isAllowed = false; // Connection
            else if (currentStep === 12 && item.type === 'Server') isAllowed = true; // DMZ Server
            else if (currentStep === 13) isAllowed = false; // DMZ Connection

            if (!isAllowed) {
                if (currentStep === 1) errorMsg = "Step 1: Place the Internet Cloud.";
                else if (currentStep === 2) errorMsg = "Step 2: Place the Edge Router.";
                else if (currentStep === 3) errorMsg = "Step 3: Connect the Edge Router's WAN port to the Internet Cloud.";
                else if (currentStep === 4) errorMsg = "Step 4: Place the Perimeter Firewall.";
                else if (currentStep === 5) errorMsg = "Step 5: Connect the Firewall's external interface to the Edge Router.";
                else if (currentStep === 6) errorMsg = "Step 6a: Place Internal Switch.";
                else if (currentStep === 7) errorMsg = "Step 6b: Connect Firewall to Internal Switch.";
                else if (currentStep === 8) errorMsg = "Step 6c: Add at least 1 Internal PC.";
                else if (currentStep === 9) errorMsg = "Step 6d: Connect PC to Internal Switch.";
                else if (currentStep === 10) errorMsg = "Step 7a: Place DMZ Switch.";
                else if (currentStep === 11) errorMsg = "Step 7b: Connect Firewall to DMZ Switch.";
                else if (currentStep === 12) errorMsg = "Step 7c: Add Public Server.";
                else if (currentStep === 13) errorMsg = "Step 7d: Connect Server to DMZ Switch.";
                else errorMsg = "Guided build is active. Follow the steps sequentially.";

                alert(`🚫 Placement Blocked\n\n${errorMsg}`);
                return;
            }
        }

        const areaId = getAreaForPoint(item.x, item.y, areas);
        const newItem = { ...item, areaId };
        setItems(prev => [...prev, newItem]);
        setSelectedId(item.id);
        setIsDirty(true);
    };

    const handleMoveItem = (id: number, x: number, y: number) => {
        const areaId = getAreaForPoint(x, y, areas);
        setItems(prev => prev.map(i => i.id === id ? { ...i, x, y, areaId } : i));
        setIsDirty(true);
    };

    const handleMoveArea = (id: number, x: number, y: number) => {
        const targetArea = areas.find(a => a.id === id);
        if (!targetArea) return;

        const dx = x - targetArea.x;
        const dy = y - targetArea.y;

        const updatedAreas = areas.map(a => a.id === id ? { ...a, x, y } : a);
        setAreas(updatedAreas);

        // Move devices that are logically in this area
        setItems(prevItems => prevItems.map(item => {
            if (item.areaId === id) {
                return { ...item, x: item.x + dx, y: item.y + dy };
            }
            // Also re-check areaId for all devices in case they were moved into/out of other areas
            return {
                ...item,
                areaId: getAreaForPoint(item.x, item.y, updatedAreas)
            };
        }));

        setIsDirty(true);
    };

    const handleSelect = (id: number | null) => {
        if (isTestMode && id !== null) {
            const device = items.find(i => i.id === id);
            const allowedTypes = ['PC', 'Laptop', 'Server', 'Printer'];
            if (!device || !allowedTypes.includes(device.type)) {
                alert("Connectivity test only for End Devices.");
                return;
            }
            if (testSourceId === null) {
                setTestSourceId(id);
                alert("Source selected. Select Destination.");
            } else {
                if (id === testSourceId) return;
                const analyzer = new TopologyAnalyzer(items, connections);
                const path = analyzer.findPath(testSourceId, id);
                if (path) {
                    setHighlightedPath(path);
                    alert(`Success! Path length: ${path.length} hops.`);
                } else {
                    setHighlightedPath([]);
                    alert("Connection Failed: No path.");
                }
                setTestSourceId(null);
            }
        } else {
            setSelectedId(id);
        }
    };

    const handleAnalyze = () => {
        const analyzer = new TopologyAnalyzer(items, connections);
        const warnings = analyzer.analyze();
        const segments = analyzer.getSegments();

        let report: AnalysisReport;
        if (networkScope && arenas[networkScope]) {
            report = arenas[networkScope].validator(analyzer, areas);
        } else {
            report = analyzer.validateNetwork(networkScope, areas);
        }

        setAnalysisResults({ warnings, segments, report });
        setShowAnalysisModal(true);
    };

    const handleDeleteDevice = (id?: number) => {
        const targetId = id ?? selectedId;
        if (targetId === null) return;

        if (window.confirm("Delete device and connections?")) {
            const connectionsToRemove = connections.filter(c => c.sourceId === targetId || c.targetId === targetId);
            setItems(prev => prev.filter(d => d.id !== targetId).map(d => {
                const relevant = connectionsToRemove.filter(c => c.sourceId === d.id || c.targetId === d.id);
                if (relevant.length > 0) {
                    const portsToFree = relevant.map(c => c.sourceId === d.id ? c.sourcePortId : c.targetPortId);
                    return { ...d, ports: d.ports.map(p => portsToFree.includes(p.id) ? { ...p, isOccupied: false } : p) };
                }
                return d;
            }));
            setConnections(prev => prev.filter(c => c.sourceId !== targetId && c.targetId !== targetId));

            if (selectedId === targetId) setSelectedId(null);
            if (testSourceId === targetId) setTestSourceId(null);
            setHighlightedPath([]);
            setIsDirty(true);
        }
    };

    const handleConnect = (sourceId: number, sourcePortId: string, targetId: number, targetPortId: string, forceCableType?: CableType) => {
        if (targetId === -1) {
            setCableSourceId(sourceId);
            setCableSourcePortId(sourcePortId);
        } else {
            if (sourceId === targetId) {
                alert("Cannot connect a device to itself!");
                setCableSourceId(null);
                setCableSourcePortId(null);
                return;
            }

            const exists = connections.some(
                c => (c.sourceId === sourceId && c.targetId === targetId) ||
                    (c.sourceId === targetId && c.targetId === sourceId)
            );
            if (exists) {
                alert("Connection already exists!");
                setCableSourceId(null);
                setCableSourcePortId(null);
                return;
            }

            const sourceDevice = items.find(d => d.id === sourceId);
            const targetDevice = items.find(d => d.id === targetId);
            if (!sourceDevice || !targetDevice) return;

            // Validate Cable & Connection Logic Unified
            const cableToUse = forceCableType || selectedCableType;
            const isEthernetCable = cableToUse !== 'wireless';

            // Port-Cable Mismatch Fix:
            // If an ethernet cable is used but a wireless port was clicked, auto-redirect to the
            // first free ethernet port on that device. This prevents laptop wlan0 from being
            // used as an ethernet connection (which would show WiFi animation incorrectly).
            const sourcePort = sourceDevice.ports.find(p => p.id === sourcePortId);
            const targetPort = targetDevice.ports.find(p => p.id === targetPortId);

            let resolvedSourcePortId = sourcePortId;
            let resolvedTargetPortId = targetPortId;

            if (isEthernetCable) {
                if (sourcePort && sourcePort.type === 'wireless') {
                    const freeEthPort = sourceDevice.ports.find(p => p.type === 'ethernet' && !p.isOccupied);
                    if (freeEthPort) {
                        resolvedSourcePortId = freeEthPort.id;
                    } else {
                        alert(`❌ ${sourceDevice.name} has no free Ethernet port for a cable connection.\n\nUse the WiFi option from the device detail panel to connect wirelessly.`);
                        setCableSourceId(null);
                        setCableSourcePortId(null);
                        return;
                    }
                }
                if (targetPort && targetPort.type === 'wireless') {
                    const freeEthPort = targetDevice.ports.find(p => p.type === 'ethernet' && !p.isOccupied);
                    if (freeEthPort) {
                        resolvedTargetPortId = freeEthPort.id;
                    } else {
                        alert(`❌ ${targetDevice.name} has no free Ethernet port for a cable connection.\n\nUse the WiFi option from the device detail panel to connect wirelessly.`);
                        setCableSourceId(null);
                        setCableSourcePortId(null);
                        return;
                    }
                }
            }

            const validation = ConnectionValidator.validate(sourceDevice, targetDevice, cableToUse);

            // Show Educational Alert for Warnings/Errors (Blocking if physically impossible)
            if (!validation.isValid) {
                alert(`❌ ${validation.reason} \n\nThis connection is physically invalid in NetCraft.`);
                setCableSourceId(null);
                setCableSourcePortId(null);
                return;
            }

            // Update Port Occupancy
            setItems(prev => prev.map(device => {
                if (device.id === sourceId) {
                    return { ...device, ports: device.ports.map(p => p.id === resolvedSourcePortId && !(device.type === 'AccessPoint' && p.type === 'wireless') ? { ...p, isOccupied: true } : p) };
                }
                if (device.id === targetId) {
                    return { ...device, ports: device.ports.map(p => p.id === resolvedTargetPortId && !(device.type === 'AccessPoint' && p.type === 'wireless') ? { ...p, isOccupied: true } : p) };
                }
                return device;
            }));

            const newConnection: Connection = {
                id: Date.now(),
                sourceId: sourceId,
                sourcePortId: resolvedSourcePortId || '',
                targetId: targetId,
                targetPortId: resolvedTargetPortId,
                type: cableToUse === 'wireless' ? 'wireless' : 'ethernet',
                cableType: cableToUse,
                status: 'valid'
            };

            setConnections(prev => [...prev, newConnection]);

            // Reset selection
            setCableSourceId(null);
            setCableSourcePortId(null);
            setIsDirty(true);
        }
    };

    const handleCableDelete = (id: number) => {
        if (!window.confirm("Delete this cable?")) return;

        const conn = connections.find(c => c.id === id);
        if (!conn) return;

        // Free ports
        setItems(prev => prev.map(d => {
            if (d.id === conn.sourceId || d.id === conn.targetId) {
                const relevantPortId = d.id === conn.sourceId ? conn.sourcePortId : conn.targetPortId;
                return {
                    ...d,
                    ports: d.ports.map(p => p.id === relevantPortId ? { ...p, isOccupied: false } : p)
                };
            }
            return d;
        }));

        setConnections(prev => prev.filter(c => c.id !== id));
        setIsDirty(true);
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateRows: 'auto 1fr',
            gridTemplateColumns: '1fr 240px', // Canvas | RightPanel
            gridTemplateAreas: `
    "topbar topbar"
    "canvas right"
        `,
            height: '100vh',
            overflow: 'hidden',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* TOP BAR */}
            <div style={{ gridArea: 'topbar', zIndex: 30 }}>
                <TopBar
                    onNew={handleNewTopology}
                    onSave={handleSave}
                    onSaveAs={handleSaveAs}
                    onLoad={handleLoadTopology}
                    onUndo={undo}
                    onRedo={redo}
                    onZoomIn={() => setViewState(p => ({ ...p, zoom: Math.min(p.zoom + 0.1, 2.0) }))}
                    onZoomOut={() => setViewState(p => ({ ...p, zoom: Math.max(p.zoom - 0.1, 0.5) }))}
                    onTogglePan={() => setIsPanMode(!isPanMode)}
                    isPanMode={isPanMode}
                    onToggleDraw={() => {
                        setIsAnnotationMode(prev => !prev);
                        setIsCableMode(false);
                        setIsDeleteMode(false);
                        setIsTestMode(false);
                    }}
                    isDrawMode={isAnnotationMode}
                    onTestConnectivity={toggleTestMode}
                />
            </div>

            {/* CANVAS WORKSPACE */}
            <div style={{
                gridArea: 'canvas',
                position: 'relative',
                overflow: 'hidden',
                cursor: isPanMode ? 'grab' : (isTestMode ? 'crosshair' : 'default'),
                background: '#f0f2f5' // Light gray background for canvas area
            }}>
                {/* Auto-Save Indicator */}
                <AutoSaveIndicator lastSaved={lastAutoSaved} />

                <div
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        cursor: isPanMode ? 'grab' : (isTestMode ? 'crosshair' : 'default')
                    }}
                    ref={(el) => {
                        viewportRef.current = el;
                        setCanvasContentRef(el); // Keep existing logic just in case, though it conflicts with Canvas
                    }}
                    onWheel={(e) => {
                        // Zoom on Ctrl+Scroll
                        if (e.ctrlKey) {
                            e.preventDefault();
                            const delta = e.deltaY > 0 ? -0.1 : 0.1;
                            setViewState(p => ({
                                ...p,
                                zoom: Math.min(Math.max(p.zoom + delta, 0.5), 2.0)
                            }));
                        }
                    }}
                    onMouseDown={(e) => {
                        // Middle click or Space+Click or PanMode
                        if (e.button === 1 || (e.button === 0 && ((e as any).getModifierState('Space') || isPanMode))) {
                            e.preventDefault();
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const startOffsetX = viewState.offset.x;
                            const startOffsetY = viewState.offset.y;

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                                const dx = moveEvent.clientX - startX;
                                const dy = moveEvent.clientY - startY;
                                setViewState(prev => ({
                                    ...prev,
                                    offset: { x: startOffsetX + dx, y: startOffsetY + dy }
                                }));
                            };

                            const handleMouseUp = () => {
                                window.removeEventListener('mousemove', handleMouseMove);
                                window.removeEventListener('mouseup', handleMouseUp);
                            };

                            window.addEventListener('mousemove', handleMouseMove);
                            window.addEventListener('mouseup', handleMouseUp);
                        }

                        if (e.button === 0 && isAreaMode) {
                            if (isDrawingArea) return; // Let it bubble to global click handler

                            e.preventDefault();
                            e.stopPropagation();

                            if (!canvasContentRef) return;
                            const canvasRect = canvasContentRef.getBoundingClientRect();
                            const { x: worldX, y: worldY } = getTransformedCoordinates(
                                e, viewState.zoom, viewState.offset.x, viewState.offset.y, canvasRect
                            );

                            // SNAP TO GRID (Optional but recommended)
                            const snappedX = Math.round(worldX / 20) * 20;
                            const snappedY = Math.round(worldY / 20) * 20;

                            if (!isDrawingArea) {
                                // Step 1: Start drawing
                                setIsDrawingArea(true);
                                setPreviewArea({ x: snappedX, y: snappedY, width: 0, height: 0 });

                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                    const { x: currWorldX, y: currWorldY } = getTransformedCoordinates(
                                        moveEvent, viewState.zoom, viewState.offset.x, viewState.offset.y, canvasRect
                                    );

                                    const currSnappedX = Math.round(currWorldX / 20) * 20;
                                    const currSnappedY = Math.round(currWorldY / 20) * 20;

                                    const width = currSnappedX - snappedX;
                                    const height = currSnappedY - snappedY;

                                    setPreviewArea({
                                        x: width > 0 ? snappedX : currSnappedX,
                                        y: height > 0 ? snappedY : currSnappedY,
                                        width: Math.abs(width),
                                        height: Math.abs(height)
                                    });
                                };

                                const handleGlobalClick = (upEvent: MouseEvent) => {
                                    if (upEvent.button !== 0) return; // Only process left-click

                                    // Stop propagation manually for the second click if we want to be safe
                                    // upEvent.stopPropagation(); // MouseEvent doesn't have stopPropagation on window easily

                                    window.removeEventListener('mousemove', handleMouseMove);
                                    window.removeEventListener('mousedown', handleGlobalClick);
                                    window.removeEventListener('mouseup', handleGlobalClick); // Just in case

                                    const { x: finalWorldX, y: finalWorldY } = getTransformedCoordinates(
                                        upEvent, viewState.zoom, viewState.offset.x, viewState.offset.y, canvasRect
                                    );

                                    const finalSnappedX = Math.round(finalWorldX / 20) * 20;
                                    const finalSnappedY = Math.round(finalWorldY / 20) * 20;

                                    const finalW = Math.abs(finalSnappedX - snappedX);
                                    const finalH = Math.abs(finalSnappedY - snappedY);
                                    const finalX = finalSnappedX < snappedX ? finalSnappedX : snappedX;
                                    const finalY = finalSnappedY < snappedY ? finalSnappedY : snappedY;

                                    setPreviewArea(null);
                                    setIsDrawingArea(false);

                                    if (finalW > 20 && finalH > 20) {
                                        const name = window.prompt("Enter Area Name:", "New Area");
                                        if (name) {
                                            const newArea: NetworkArea = {
                                                id: Date.now(),
                                                name: name,
                                                x: finalX,
                                                y: finalY,
                                                width: finalW,
                                                height: finalH,
                                                type: 'custom',
                                                scope: networkScope || 'WAN'
                                            };
                                            const updatedAreas = [...areas, newArea];
                                            setAreas(updatedAreas);

                                            setItems(prevItems => prevItems.map(item => ({
                                                ...item,
                                                areaId: getAreaForPoint(item.x, item.y, updatedAreas)
                                            })));

                                            setIsDirty(true);
                                        }
                                    }
                                };

                                window.addEventListener('mousemove', handleMouseMove);
                                // We use a short timeout to prevent the current click from triggering the finish immediately
                                setTimeout(() => window.addEventListener('mousedown', handleGlobalClick), 50);
                            }
                        }
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                    }}
                >
                    <Canvas
                        items={items}
                        connections={connections}
                        onDropItem={handleDropItem}
                        onMoveItem={handleMoveItem}
                        selectedId={selectedId}
                        onSelect={handleSelect}
                        isCableMode={isCableMode}
                        cableSourceId={cableSourceId}
                        cableSourcePortId={cableSourcePortId}
                        onConnect={handleConnect}
                        highlightedConnectionIds={highlightedPath}
                        onInspect={setInspectDeviceId}
                        areas={areas}
                        onMoveArea={handleMoveArea}
                        isDeleteMode={isDeleteMode}
                        onDeleteConnection={handleCableDelete}
                        onDeleteDevice={handleDeleteDevice}
                        onDeleteArea={handleDeleteArea}
                        backgroundImage={networkScope && arenas[networkScope] ? arenas[networkScope].backgroundImage : undefined}
                        networkState={networkState}
                        packets={packets}
                        viewState={viewState}
                        isPanMode={isPanMode}
                        previewArea={previewArea}
                        isAreaMode={isAreaMode}
                        onCanvasContentRef={setCanvasContentRef}
                        draggedDeviceType={draggedDeviceType}
                        guideStep={guideStep}
                        networkScope={networkScope}
                    >
                        <AnnotationLayer
                            annotations={isAnnotationMode ? [] : annotations} // Hide when foreground is active to avoid double render
                            onUpdateAnnotations={(newAnnotations) => {
                                setAnnotations(newAnnotations);
                                setIsDirty(true);
                            }}
                            currentTool={annotationTool}
                            currentStyle={annotationStyle}
                            isActive={false} // Background Layer
                            zIndex={0}
                            viewState={viewState}
                            canvasContentRef={canvasContentRef}
                            viewportElement={viewportRef.current}
                            applyTransform={false} // Background is already transformed by Canvas
                            layerId="background"
                        />
                    </Canvas>

                    {/* Foreground Layer - UNTRANSFORMED Container to capture events everywhere */}
                    {isAnnotationMode && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 100,
                            // NO transform here! We want full hit area.
                        }}>
                            <AnnotationLayer
                                annotations={annotations} // Pass all annotations so we can ERASE them
                                onUpdateAnnotations={(newAnnotations) => {
                                    setAnnotations(newAnnotations);
                                    setIsDirty(true);
                                }}
                                currentTool={annotationTool}
                                currentStyle={annotationStyle}
                                isActive={true}
                                zIndex={100}
                                viewState={viewState}
                                canvasContentRef={canvasContentRef}
                                viewportElement={viewportRef.current}
                                applyTransform={true} // Foreground needs explicit transform
                                onDeleteAnnotation={handleDeleteAnnotation}
                                layerId="foreground"
                            />
                        </div>
                    )}


                    {/* Network Status Card (Draggable Overlay) */}
                    <NetworkStatusCard
                        status={networkState}
                        info={networkStatusInfo}
                    />

                    {/* Requirements Panel */}
                    <RequirementsPanel
                        title={networkScope && arenas[networkScope] ? arenas[networkScope].title : "Requirements"}
                        requirements={networkScope && arenas[networkScope] ? arenas[networkScope].requirements : []}
                        devices={items || []}
                        connections={connections || []}
                        areas={areas || []}
                    />

                    {/* Annotation Toolbar */}
                    {isAnnotationMode && (
                        <div style={{ position: 'absolute', left: '20px', top: '20px', zIndex: 100 }}>
                            <AnnotationToolbar
                                currentTool={annotationTool}
                                setTool={setAnnotationTool}
                                currentStyle={annotationStyle}
                                setStyle={setAnnotationStyle}
                                onClear={() => {
                                    setAnnotations([]);
                                    setIsDirty(true);
                                }}
                                onClose={() => setIsAnnotationMode(false)}
                            />
                        </div>
                    )}

                    {/* BOTTOM DOCK (Overlay) */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        zIndex: 25,
                        pointerEvents: 'none' // Allow clicks to pass through empty areas
                    }}>
                        <div style={{ pointerEvents: 'auto' }}>
                            <BottomDock
                                onDragDeviceStart={setDraggedDeviceType}
                                onDragDeviceEnd={() => setDraggedDeviceType(null)}
                            />
                        </div>
                    </div>

                    {/* GUIDE PANEL (Overlay) */}
                    {networkScope && guideStep > 0 && arenas[networkScope] && (
                        <GuidePanel
                            arena={arenas[networkScope]}
                            currentStep={guideStep}
                            onNext={nextGuideStep}
                            validation={(() => {
                                // Dynamic Check
                                const arena = arenas[networkScope];
                                if (!arena || !arena.guideSteps) return { isValid: true };
                                const step = arena.guideSteps.find(s => s.id === guideStep);
                                if (!step) return { isValid: true };

                                // Run Analyzer (Lightweight)
                                const analyzer = new TopologyAnalyzer(items, connections);
                                const result = step.checkComplete(analyzer, areas);

                                if (typeof result === 'boolean') {
                                    return { isValid: result };
                                }
                                return result;
                            })()}
                        />
                    )}
                </div>
            </div>

            {/* RIGHT PANEL - Fixed Actions */}
            <div style={{ gridArea: 'right', overflow: 'hidden', zIndex: 20 }}>
                <RightPanel
                    onBuildNetwork={() => setShowScopeModal(true)}
                    networkState={networkState}
                    onStartSimulation={toggleNetworkStart}
                    onStopSimulation={toggleNetworkStart}
                    onAnalyzeNetwork={handleAnalyze}
                    onShowReferenceSetups={() => setShowReferenceModal(true)}
                    isCableMode={isCableMode}
                    onToggleCable={toggleCableMode}
                    selectedCableType={selectedCableType}
                    onSelectCableType={setSelectedCableType}
                    isDeleteMode={isDeleteMode}
                    onToggleDelete={toggleDeleteMode}
                    isAreaMode={isAreaMode}
                    onToggleAreaMode={toggleAreaMode}
                    currentAnalysis={analysisResults?.report}
                    arena={networkScope ? arenas[networkScope] : null}
                />
            </div>

            {/* MODALS */}

            {/* Restore Session Modal */}
            <RestoreSessionModal
                isOpen={showRestoreModal}
                timestamp={restoreTimestamp}
                onRestore={handleRestoreSession}
                onDiscard={handleDiscardSession}
            />

            {/* Guide Modal / Scope Selection */}
            {showScopeModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '600px', width: '90%' }}>
                        <h2>Select Network Scope</h2>
                        <p>Choose the scale of the network you want to build.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginTop: '25px' }}>
                            <button onClick={() => handleScopeSelect('LAN_HOME')} style={scopeButtonStyle}>
                                <strong style={{ fontSize: '1.3rem' }}>🏠 Home LAN</strong>
                                <span style={{ fontSize: '1rem', color: '#555' }}>Small, simple (1-5 devices)</span>
                            </button>
                            <button onClick={() => handleScopeSelect('LAN_OFFICE')} style={scopeButtonStyle}>
                                <strong style={{ fontSize: '1.3rem' }}>🏢 Office LAN</strong>
                                <span style={{ fontSize: '1rem', color: '#555' }}>Medium, structured (Switch + Router)</span>
                            </button>
                            <button onClick={() => handleScopeSelect('MAN')} style={scopeButtonStyle}>
                                <strong style={{ fontSize: '1.3rem' }}>🏙️ Campus / MAN</strong>
                                <span style={{ fontSize: '1rem', color: '#555' }}>Large, multiple areas</span>
                            </button>
                            <button onClick={() => handleScopeSelect('WAN')} style={scopeButtonStyle}>
                                <strong style={{ fontSize: '1.3rem' }}>🌐 WAN (ISP)</strong>
                                <span style={{ fontSize: '1rem', color: '#555' }}>Global connectivity</span>
                            </button>

                            {/* Custom Network Lab Option - Full Width */}
                            <button onClick={() => handleScopeSelect(null)} style={{
                                ...scopeButtonStyle,
                                gridColumn: '1 / -1',
                                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                borderColor: '#90caf9',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    background: '#1976d2',
                                    color: 'white',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                    ADVANCED
                                </div>
                                <strong style={{ fontSize: '1.4rem', color: '#0d47a1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    🧠 Custom Network Lab
                                </strong>
                                <span style={{ fontSize: '1rem', color: '#1565c0' }}>Advanced build mode with no predefined rules.</span>
                            </button>

                            {/* Reference Setups — opens reference modal */}
                            <button onClick={() => setShowReferenceModal(true)} style={{
                                ...scopeButtonStyle,
                                gridColumn: '1 / -1',
                                background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                                borderColor: '#ce93d8',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    background: '#7b1fa2',
                                    color: 'white',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                    EXAMPLES
                                </div>
                                <strong style={{ fontSize: '1.4rem', color: '#4a148c', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    📚 Reference Setups
                                </strong>
                                <span style={{ fontSize: '1rem', color: '#6a1b9a' }}>Load a pre-built standard network to learn from.</span>
                            </button>
                        </div>
                        <button onClick={() => setShowScopeModal(false)} style={{ marginTop: '20px', padding: '8px 16px' }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Analysis Modal */}
            {showAnalysisModal && analysisResults && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '8px', maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
                        <h2>Network Analysis</h2>
                        <div style={{ marginBottom: '20px' }}>
                            <strong>Status: </strong>
                            <span style={{
                                color: analysisResults.report.status === 'valid' ? 'green' : (analysisResults.report.status === 'mismatch' ? 'red' : 'orange'),
                                fontWeight: 'bold'
                            }}>
                                {analysisResults.report.status === 'valid' ? 'VALID' : 'INVALID'}
                            </span>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <h4>Report:</h4>
                            <ul style={{ paddingLeft: '20px' }}>
                                <li><strong>{analysisResults.report.message}</strong></li>
                                <li style={{ color: '#555', whiteSpace: 'pre-wrap', lineHeight: '1.5', marginTop: '8px' }}>{analysisResults.report.details}</li>
                                {analysisResults.report.educationalTip && (
                                    <li style={{ color: '#0288d1', marginTop: '10px' }}><em>Tip: {analysisResults.report.educationalTip}</em></li>
                                )}
                            </ul>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <h4>Segments: {analysisResults.report.segmentsOverride ?? analysisResults.segments.length}</h4>
                        </div>
                        {analysisResults.warnings.length > 0 && (
                            <div>
                                <h4>Warnings/Errors:</h4>
                                <ul style={{ paddingLeft: '20px', color: '#d32f2f' }}>
                                    {analysisResults.warnings.map((w, i) => (
                                        <li key={i}>{w.message}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <button onClick={() => setShowAnalysisModal(false)} style={{ marginTop: '20px', padding: '8px 16px' }}>Close</button>
                    </div>
                </div>
            )
            }

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showUnsavedModal}
                title="Unsaved Changes"
                message="You have unsaved changes. Do you want to save before creating a new project?"
                onConfirm={async () => {
                    const saved = await handleSave();
                    if (saved) {
                        setShowUnsavedModal(false);
                        resetWorkspace();
                    }
                }}
                onDontSave={() => {
                    setShowUnsavedModal(false);
                    resetWorkspace();
                }}
                onCancel={() => setShowUnsavedModal(false)}
                confirmText="Save & New"
                dontSaveText="Don't Save"
                cancelText="Cancel"
            />

            {/* Reference Setups Modal */}
            {
                showReferenceModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)', zIndex: 2000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                <h2 style={{ margin: 0 }}>📚 Reference Setups (Golden Scenarios)</h2>
                                <button onClick={() => setShowReferenceModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>
                            </div>
                            <p style={{ color: '#666', marginBottom: '20px' }}>Load a pre-built standard network to learn from.</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                {goldenScenarios.map(scenario => (
                                    <div key={scenario.id} style={{
                                        border: '1px solid #eee', padding: '15px', borderRadius: '8px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        background: '#f9f9f9'
                                    }}>
                                        <div>
                                            <strong>{scenario.name}</strong>
                                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{scenario.description}</div>
                                        </div>
                                        <button
                                            onClick={() => handleLoadGoldenScenario(scenario)}
                                            style={{
                                                padding: '8px 16px', background: '#007bff', color: 'white',
                                                border: 'none', borderRadius: '4px', cursor: 'pointer'
                                            }}
                                        >
                                            Load
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }


            {/* INSPECT MODAL */}
            {
                inspectDeviceId && (
                    <DeviceDetailModal
                        device={items.find(d => d.id === inspectDeviceId)}
                        items={items}
                        connections={connections}
                        onClose={() => setInspectDeviceId(null)}
                        onRename={(id, newName) => {
                            setItems(prev => prev.map(d => d.id === id ? { ...d, name: newName } : d));
                        }}
                        onConnect={(srcId, srcPort, tgtId, tgtPort) => handleConnect(srcId, srcPort, tgtId, tgtPort, 'wireless')}
                    />
                )
            }
        </div >
    );
}

export default App;
