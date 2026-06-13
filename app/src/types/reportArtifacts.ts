import type { SimulationReport } from "./index";

export type SimulationReportFixtureMode =
  | "mock-deterministic"
  | "minimal-runtime-proof"
  | "showdown-aggregated";

export type SimulationReportArtifactKind = "inline-json" | "local-file";

export interface SimulationReportFixtureTarget {
  mode: SimulationReportFixtureMode;
  outputName?: string;
  includeDebugInputs: boolean;
}

export interface SimulationReportArtifact {
  reportId: string;
  artifactKind: SimulationReportArtifactKind;
  artifactPath?: string;
  inlineReport?: SimulationReport;
}
