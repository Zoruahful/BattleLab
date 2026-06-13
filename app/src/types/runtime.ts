import type {
  ReportTier,
  SimulationReportArtifact,
  SimulationReportFixtureTarget,
  SimulationOpponentPoolSelection,
  SimulationRunSettingsPayload,
  SimulationTeamPayload,
} from "./index";

export type SimulationRuntimeContractVersion = "phase3-runtime-contract-v1";

export type SimulationRuntimeBoundaryKind = "child-process";

export type SimulationRunStatus =
  | "queued"
  | "validating"
  | "preparing"
  | "running"
  | "aggregating"
  | "writing-report"
  | "complete"
  | "failed"
  | "cancelled";

export type SimulationRunPhase =
  | "request"
  | "team-validation"
  | "opponent-pool"
  | "battle-execution"
  | "report-aggregation"
  | "artifact-write";

export type SimulationRunTerminalStatus = "complete" | "failed" | "cancelled";

export interface SimulationRunSourceMetadata {
  uiVersion?: string;
  contractVersion: SimulationRuntimeContractVersion;
}

export interface SimulationRunRequest {
  requestId: string;
  createdAt: string;
  boundaryKind: SimulationRuntimeBoundaryKind;
  team: SimulationTeamPayload;
  opponentPool: SimulationOpponentPoolSelection;
  settings: SimulationRunSettingsPayload;
  reportFixture: SimulationReportFixtureTarget;
  source: SimulationRunSourceMetadata;
}

export interface SimulationRunProgressEvent {
  requestId: string;
  status: SimulationRunStatus;
  phase: SimulationRunPhase;
  progressPercent: number;
  completedBattles: number;
  totalBattles: number;
  message: string;
  updatedAt: string;
  currentWorkerCount?: number;
  warningCount?: number;
}

export interface SimulationRunWarning {
  code: string;
  message: string;
  phase: SimulationRunPhase;
  recoverable: boolean;
}

export interface SimulationRunResultSummary {
  requestId: string;
  status: SimulationRunTerminalStatus;
  startedAt: string;
  completedAt: string;
  totalBattles: number;
  wins: number;
  losses: number;
  winRate: number;
  avgTurns: number;
  tier: ReportTier;
  warnings: SimulationRunWarning[];
}

export interface SimulationRunResultSourceMetadata {
  showdownVersion?: string;
  catalogManifestId?: string;
  opponentSetVersion?: string;
  contractVersion: SimulationRuntimeContractVersion;
}

export interface SimulationRunResult {
  requestId: string;
  summary: SimulationRunResultSummary;
  report: SimulationReportArtifact;
  source: SimulationRunResultSourceMetadata;
}

export interface SimulationRunProgressMessage {
  type: "progress";
  event: SimulationRunProgressEvent;
}

export interface SimulationRunResultMessage {
  type: "result";
  result: SimulationRunResult;
}

export type SimulationRunWorkerMessage =
  | SimulationRunProgressMessage
  | SimulationRunResultMessage;
