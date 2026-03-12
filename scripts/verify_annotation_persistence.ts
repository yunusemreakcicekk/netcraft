import { TopologyIO } from '../src/utils/TopologyIO';
import { Annotation } from '../src/types/annotation';
import { NetworkScope, Device, Connection, NetworkArea } from '../src/types/models';

// Mock Data
const mockAnnotations: Annotation[] = [
    {
        id: '1',
        type: 'free',
        x: 10,
        y: 10,
        points: [10, 10, 20, 20],
        style: { strokeColor: 'red', strokeWidth: 2, fillColor: 'transparent' }
    },
    {
        id: '2',
        type: 'text',
        x: 50,
        y: 50,
        text: 'Test Annotation',
        style: { strokeColor: 'blue', strokeWidth: 1, fillColor: 'black', fontSize: 16 }
    }
];

const mockScope = null;
const mockDevices: Device[] = [];
const mockConnections: Connection[] = [];
const mockAreas: NetworkArea[] = [];

console.log("Testing TopologyIO with Annotations...");

// 1. Serialize
const json = TopologyIO.serialize(mockScope, mockDevices, mockConnections, mockAreas, mockAnnotations);
console.log("Serialized JSON length:", json.length);

// 2. Deserialize
const data = TopologyIO.deserialize(json);
console.log("Deserialized Annotations count:", data.annotations?.length);

// 3. Validate
if (data.annotations && data.annotations.length === 2) {
    const ann1 = data.annotations.find(a => a.id === '1');
    const ann2 = data.annotations.find(a => a.id === '2');

    if (ann1 && ann1.type === 'free' && ann1.points?.length === 4) {
        console.log("✅ Annotation 1 validated.");
    } else {
        console.error("❌ Annotation 1 validation failed:", ann1);
    }

    if (ann2 && ann2.type === 'text' && ann2.text === 'Test Annotation') {
        console.log("✅ Annotation 2 validated.");
    } else {
        console.error("❌ Annotation 2 validation failed:", ann2);
    }

} else {
    console.error("❌ Annotation count mismatch or missing.");
}
