import type { BattleFormat, BuildCatalogReference } from "./index";
import type { CatalogPickerKind, CatalogPickerOption } from "./catalog";

export type ShowdownLegalityContractVersion = "phase3-showdown-legality-v1";

export type ShowdownLegalityBoundaryKind = "runtime-contract-only" | "future-child-process";

export type ShowdownLegalityAuthority =
  | "pokemon-showdown-legality-source-of-truth";

export type ShowdownLegalityCatalogRole = "enrichment-only";

export type ShowdownLegalityRequestKind =
  | "pokemon-build"
  | "field"
  | "move-learnset"
  | "ability-list"
  | "format-preview";

export type ShowdownLegalityFieldKind =
  | "species"
  | "move"
  | "ability"
  | "item"
  | "nature"
  | "teraType";

export type ShowdownLegalityStatus =
  | "not-checked"
  | "checking"
  | "legal"
  | "illegal"
  | "warning"
  | "unknown"
  | "runtime-unavailable";

export type ShowdownLegalityMessageSeverity =
  | "info"
  | "warning"
  | "error";

export type ShowdownLegalityUnavailableReason =
  | "runtime-not-implemented"
  | "runtime-disabled"
  | "runtime-start-failed"
  | "timeout"
  | "cancelled"
  | "unsupported-format";

export type ShowdownLegalityFieldBehavior =
  | "legality-defining"
  | "catalog-selectable"
  | "not-legality-defining";

export interface ShowdownLegalityRuntimeMetadata {
  boundaryKind: ShowdownLegalityBoundaryKind;
  contractVersion: ShowdownLegalityContractVersion;
  showdownVersion?: string;
  showdownDexVersion?: string;
  runtimeUnavailableReason?: ShowdownLegalityUnavailableReason;
}

export interface ShowdownLegalityBuildContext {
  format: BattleFormat;
  species: BuildCatalogReference | null;
  form?: BuildCatalogReference | null;
  level?: number;
  ability?: BuildCatalogReference | null;
  item?: BuildCatalogReference | null;
  nature?: BuildCatalogReference | null;
  teraType?: BuildCatalogReference | null;
  moves: [
    BuildCatalogReference | null,
    BuildCatalogReference | null,
    BuildCatalogReference | null,
    BuildCatalogReference | null,
  ];
}

export interface ShowdownLegalityFieldRequest {
  id: string;
  field: ShowdownLegalityFieldKind;
  slotIndex?: 0 | 1 | 2 | 3;
  value: BuildCatalogReference | null;
  behavior: ShowdownLegalityFieldBehavior;
}

export interface ShowdownLegalityRequest {
  requestId: string;
  requestedAt: string;
  kind: ShowdownLegalityRequestKind;
  format: BattleFormat;
  build: ShowdownLegalityBuildContext;
  fields: ShowdownLegalityFieldRequest[];
  source: {
    catalogRole: ShowdownLegalityCatalogRole;
    showdownAuthority: ShowdownLegalityAuthority;
    catalogManifestId?: string;
  };
}

export interface ShowdownMoveLearnsetRequest {
  requestId: string;
  requestedAt: string;
  format: BattleFormat;
  species: BuildCatalogReference;
  form?: BuildCatalogReference | null;
  candidateMoves: BuildCatalogReference[];
  includeTransferOnly?: boolean;
  source: ShowdownLegalityRequest["source"];
}

export interface ShowdownAbilityLegalityRequest {
  requestId: string;
  requestedAt: string;
  format: BattleFormat;
  species: BuildCatalogReference;
  form?: BuildCatalogReference | null;
  candidateAbilities: BuildCatalogReference[];
  source: ShowdownLegalityRequest["source"];
}

export interface ShowdownLegalityMessage {
  code: string;
  severity: ShowdownLegalityMessageSeverity;
  field?: ShowdownLegalityFieldKind;
  slotIndex?: 0 | 1 | 2 | 3;
  message: string;
  showdownDetail?: string;
}

export interface ShowdownLegalityFieldResult {
  requestFieldId: string;
  field: ShowdownLegalityFieldKind;
  slotIndex?: 0 | 1 | 2 | 3;
  value: BuildCatalogReference | null;
  status: ShowdownLegalityStatus;
  behavior: ShowdownLegalityFieldBehavior;
  selectable: boolean;
  legalityDefining: boolean;
  messages: ShowdownLegalityMessage[];
}

export interface ShowdownMoveLearnsetResult {
  species: BuildCatalogReference;
  form?: BuildCatalogReference | null;
  format: BattleFormat;
  status: ShowdownLegalityStatus;
  learnableMoves: BuildCatalogReference[];
  rejectedMoves: BuildCatalogReference[];
  runtimeMetadata: ShowdownLegalityRuntimeMetadata;
  messages: ShowdownLegalityMessage[];
}

export interface ShowdownAbilityLegalityResult {
  species: BuildCatalogReference;
  form?: BuildCatalogReference | null;
  format: BattleFormat;
  status: ShowdownLegalityStatus;
  legalAbilities: BuildCatalogReference[];
  rejectedAbilities: BuildCatalogReference[];
  runtimeMetadata: ShowdownLegalityRuntimeMetadata;
  messages: ShowdownLegalityMessage[];
}

export interface ShowdownLegalityResult {
  requestId: string;
  status: ShowdownLegalityStatus;
  checkedAt: string;
  runtimeMetadata: ShowdownLegalityRuntimeMetadata;
  fields: ShowdownLegalityFieldResult[];
  messages: ShowdownLegalityMessage[];
}

export interface ShowdownRuntimeUnavailableFallback {
  status: Extract<ShowdownLegalityStatus, "runtime-unavailable">;
  reason: ShowdownLegalityUnavailableReason;
  preserveCurrentUiBehavior: true;
  allowCatalogSelection: true;
  markLegalityAsUnknown: true;
  blockSimulationStart: true;
  message: string;
}

export interface PokemonEditorLegalityFieldReadModel {
  field: ShowdownLegalityFieldKind;
  slotIndex?: 0 | 1 | 2 | 3;
  status: ShowdownLegalityStatus;
  label: string;
  message?: string;
  selectable: boolean;
  legalityDefining: boolean;
  optionKind?: CatalogPickerKind;
  option?: Pick<CatalogPickerOption, "catalogKey" | "showdownId" | "displayName">;
}

export interface PokemonEditorLegalityReadModel {
  status: ShowdownLegalityStatus;
  format: BattleFormat;
  species?: BuildCatalogReference | null;
  fieldResults: PokemonEditorLegalityFieldReadModel[];
  runtimeUnavailableFallback?: ShowdownRuntimeUnavailableFallback;
  notes: string[];
}

export interface ShowdownLegalityPlanningContract {
  id: string;
  contractVersion: ShowdownLegalityContractVersion;
  authorityBoundary: {
    pokemonShowdown: ShowdownLegalityAuthority;
    pokeApiCatalog: ShowdownLegalityCatalogRole;
    itemPolicy: "selectable-not-legality-defining";
    teraTypePolicy: "catalog-selectable-format-legality-showdown-owned";
  };
  editorHandoff: {
    canLearnMoveCheck: true;
    abilityValidForSpeciesFormCheck: true;
    itemSelectableWithoutLegalityAssertion: true;
    teraTypeCatalogSelectableWithShowdownFormatCheck: true;
    preserveCurrentUiUntilRuntimeApproved: true;
  };
  implementationFlags: {
    showdownRuntimeImplemented: false;
    uiWiringImplemented: false;
    backendImplemented: false;
    simulationExecutionImplemented: false;
  };
  notes: string[];
}
