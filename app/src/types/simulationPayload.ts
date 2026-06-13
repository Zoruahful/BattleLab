import type { BattleFormat, BuildCatalogReference, StatSpread } from "./index";

export type SimulationPayloadContractVersion = "phase3-runtime-contract-v1";

export type SimulationPokemonSlot = 1 | 2 | 3 | 4 | 5 | 6;

export type SimulationBringCount = 4;

export type SimulationTeamSize = 6;

export type SimulationMovePayloadSlots = [
  BuildCatalogReference | null,
  BuildCatalogReference | null,
  BuildCatalogReference | null,
  BuildCatalogReference | null,
];

export type SimulationTeamPayloadSlots = [
  SimulationPokemonPayload,
  SimulationPokemonPayload,
  SimulationPokemonPayload,
  SimulationPokemonPayload,
  SimulationPokemonPayload,
  SimulationPokemonPayload,
];

export type SimulationOpponentPoolSource =
  | "local-fixture"
  | "catalog-cache"
  | "user-import";

export interface SimulationPokemonVisualPayload {
  iconKey?: string;
  spriteKey?: string;
}

export interface SimulationPokemonPayload {
  slot: SimulationPokemonSlot;
  species: BuildCatalogReference;
  nickname?: string;
  level: number;
  gender?: "M" | "F" | "N";
  item: BuildCatalogReference | null;
  ability: BuildCatalogReference | null;
  nature: BuildCatalogReference | null;
  teraType: BuildCatalogReference | null;
  moves: SimulationMovePayloadSlots;
  evs: StatSpread;
  ivs: StatSpread;
  visual?: SimulationPokemonVisualPayload;
}

export interface SimulationTeamPayload {
  teamId: string;
  teamName: string;
  format: BattleFormat;
  pokemon: SimulationTeamPayloadSlots;
}

export interface SimulationOpponentPoolSelection {
  poolId: string;
  poolName: string;
  format: BattleFormat;
  archetypeIds: string[];
  source: SimulationOpponentPoolSource;
  opponentSetVersion?: string;
}

export interface SimulationRunSettingsPayload {
  format: BattleFormat;
  battleCount: number;
  bringCount: SimulationBringCount;
  teamSize: SimulationTeamSize;
  openTeamSheets: boolean;
  randomSeed?: string;
  performanceProfileId: string;
  requestedWorkerCount: number;
}
