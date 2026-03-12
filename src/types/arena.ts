import type { AnalysisReport, TopologyAnalyzer } from "../utils/TopologyAnalyzer";
import type { NetworkScope, NetworkArea, Requirement } from "./models";

export interface GuideStep {
    id: number;
    label: string;
    description?: string;
    checkComplete: (analyzer: TopologyAnalyzer, areas: NetworkArea[]) => boolean | { isValid: boolean; message?: string };
}

export interface Arena {
    id: NetworkScope;
    title: string;
    description: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    requirements: Requirement[];
    guideSteps: GuideStep[];
    validator: (analyzer: TopologyAnalyzer, areas: NetworkArea[]) => AnalysisReport;
    backgroundImage?: string;
}
