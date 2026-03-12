
import { arenas } from '../src/data/arenas'; // Adjust path if needed
import { TopologyAnalyzer } from '../src/utils/TopologyAnalyzer';
import type { Device, Connection } from '../src/types/models';

console.log("Starting Debug Script...");

try {
    const scopes = ['LAN_HOME', 'LAN_OFFICE', 'MAN', 'WAN'] as const;

    for (const scope of scopes) {
        console.log(`Checking scope: ${scope}`);
        const arena = arenas[scope];

        if (!arena) {
            console.error(`ERROR: Arena for ${scope} is undefined!`);
            continue;
        }

        console.log(`  - Title: ${arena.title}`);
        console.log(`  - Guide Steps: ${arena.guideSteps?.length}`);

        // Mock State
        const items: Device[] = [];
        const connections: Connection[] = [];
        const analyzer = new TopologyAnalyzer(items, connections);

        // Check Guide Steps Logic
        if (arena.guideSteps) {
            arena.guideSteps.forEach((step, index) => {
                console.log(`    Step ${index + 1}: ${step.label}`);
                try {
                    // This mirrors App.tsx usage
                    const isComplete = step.checkComplete(analyzer, []);
                    console.log(`      -> checkComplete result: ${isComplete}`);
                } catch (err) {
                    console.error(`      -> CRASH in step ${index + 1}:`, err);
                }
            });
        }
    }

    console.log("Debug Script Finished Successfully.");

} catch (e) {
    console.error("Global Crash:", e);
}
