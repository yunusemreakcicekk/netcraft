import { arenas } from './src/data/arenas';
import { TopologyAnalyzer } from './src/utils/TopologyAnalyzer';

const man = arenas['MAN'];
const step1 = man.guideSteps.find(s => s.id === 1);

const dummyAreas = [
    { id: 1, name: 'Area 1', x: 0, y: 0, width: 100, height: 100, type: 'custom', scope: 'MAN' as any },
    { id: 2, name: 'Area 2', x: 200, y: 0, width: 100, height: 100, type: 'custom', scope: 'MAN' as any }
];

const analyzer = new (TopologyAnalyzer as any)([], []);
const res = step1.checkComplete(analyzer, dummyAreas);
console.log("Step 1 validation:", res);
