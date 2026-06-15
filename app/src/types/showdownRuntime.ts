import type {
  BattleFormat,
  BuildCatalogReference,
  ShowdownLegalityAuthority,
  ShowdownLegalityCatalogRole,
  ShowdownLegalityFieldKind,
  ShowdownLegalityMessage,
  ShowdownLegalityRequest,
  ShowdownLegalityResult,
  ShowdownLegalityRuntimeMetadata,
  ShowdownLegalityStatus,
  ShowdownLegalityUnavailableReason,
} from "./index";

export type ShowdownRuntimeAdapterBoundaryKind = "child-process-preview" | "packaged-local-adapter";

export type ShowdownRuntimeAdapterStatus =
  | "not-started"
  | "starting"
  | "available"
  | "checking"
  | "complete"
  | "runtime-unavailable"
  | "failed"
  | "cancelled";

export type ShowdownRuntimeAdapterEventKind =
  | "adapter-planned"
  | "adapter-started"
  | "runtime-available"
  | "check-started"
  | "check-complete"
  | "runtime-unavailable"
  | "check-failed"
  | "cancelled";

export type ShowdownRuntimeAdapterCheckKind = "pokemon-editor-move-ability";

export type ShowdownRuntimeAdapterSourceKind = "pokemon-showdown";

export interface ShowdownRuntimeAdapterEnvironment {
  boundaryKind: ShowdownRuntimeAdapterBoundaryKind;
  adapterName: string;
  adapterVersion: string;
  packageName?: string;
  packageVersion?: string;
  supportsChildProcess: boolean;
  supportsBrowserExecution: false;
  supportsSimulationExecution: false;
}

export interface ShowdownRuntimeAdapterSafetyPolicy {
  pokemonShowdownAuthority: ShowdownLegalityAuthority;
  catalogRole: ShowdownLegalityCatalogRole;
  allowCatalogOnlyFinalLegality: false;
  allowSimulationExecution: false;
  allowPersistentStorage: false;
  allowNetworkFetch: false;
  preserveRuntimeUnavailableFallback: true;
}

export interface ShowdownRuntimeMoveCheckPayload {
  species: BuildCatalogReference;
  candidateMoves: BuildCatalogReference[];
  format: BattleFormat;
}

export interface ShowdownRuntimeAbilityCheckPayload {
  species: BuildCatalogReference;
  candidateAbilities: BuildCatalogReference[];
  format: BattleFormat;
}

export interface ShowdownRuntimeAdapterRequest {
  requestId: string;
  requestedAt: string;
  checkKind: ShowdownRuntimeAdapterCheckKind;
  format: BattleFormat;
  legalityRequest: ShowdownLegalityRequest;
  moveCheck?: ShowdownRuntimeMoveCheckPayload;
  abilityCheck?: ShowdownRuntimeAbilityCheckPayload;
  environment: ShowdownRuntimeAdapterEnvironment;
  safetyPolicy: ShowdownRuntimeAdapterSafetyPolicy;
}

export interface ShowdownRuntimeAdapterEvent {
  eventId: string;
  requestId: string;
  kind: ShowdownRuntimeAdapterEventKind;
  status: ShowdownRuntimeAdapterStatus;
  emittedAt: string;
  message: string;
  field?: ShowdownLegalityFieldKind;
  slotIndex?: 0 | 1 | 2 | 3;
}

export interface ShowdownRuntimeAdapterFieldEvidence {
  field: ShowdownLegalityFieldKind;
  slotIndex?: 0 | 1 | 2 | 3;
  value: BuildCatalogReference;
  status: Extract<ShowdownLegalityStatus, "legal" | "illegal" | "runtime-unavailable" | "unknown">;
  source: ShowdownRuntimeAdapterSourceKind | "catalog-preview";
  showdownDetail?: string;
  catalogHintDisagrees?: boolean;
}

export interface ShowdownRuntimeUnavailableResult {
  status: Extract<ShowdownRuntimeAdapterStatus, "runtime-unavailable">;
  reason: ShowdownLegalityUnavailableReason;
  runtimeMetadata: ShowdownLegalityRuntimeMetadata;
  messages: ShowdownLegalityMessage[];
}

export interface ShowdownRuntimeAdapterResponse {
  requestId: string;
  status: ShowdownRuntimeAdapterStatus;
  checkedAt: string;
  runtimeMetadata: ShowdownLegalityRuntimeMetadata;
  legalityResult?: ShowdownLegalityResult;
  unavailableResult?: ShowdownRuntimeUnavailableResult;
  fieldEvidence: ShowdownRuntimeAdapterFieldEvidence[];
  events: ShowdownRuntimeAdapterEvent[];
  messages: ShowdownLegalityMessage[];
  safetyPolicy: ShowdownRuntimeAdapterSafetyPolicy;
}
