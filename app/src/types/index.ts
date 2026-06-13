export type BattleFormat = "vgc-regulation-h" | "vgc-regulation-g" | "custom";

export type PokemonType =
  | "Normal"
  | "Fire"
  | "Water"
  | "Electric"
  | "Grass"
  | "Ice"
  | "Fighting"
  | "Poison"
  | "Ground"
  | "Flying"
  | "Psychic"
  | "Bug"
  | "Rock"
  | "Ghost"
  | "Dragon"
  | "Dark"
  | "Steel"
  | "Fairy";

export type ReportTier = "S-Tier" | "A-Tier" | "B-Tier" | "C-Tier";

export type SimulationStatus = "queued" | "running" | "complete" | "failed";

export type PerformanceMode = "quiet" | "balanced" | "high";

export interface StatSpread {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface BuildCatalogReference {
  catalogKey: string;
  showdownId?: string;
  displayName: string;
}

/** Fixed Showdown-style move slots. Empty strings represent unfilled slots. */
export type PokemonMoveSlots = [string, string, string, string];

export type PokemonMoveCatalogRefs = [
  BuildCatalogReference | null,
  BuildCatalogReference | null,
  BuildCatalogReference | null,
  BuildCatalogReference | null,
];

export interface PokemonBuild {
  id: string;
  slot: 1 | 2 | 3 | 4 | 5 | 6;
  species: string;
  speciesRef?: BuildCatalogReference;
  nickname?: string;
  iconKey?: string;
  spriteKey?: string;
  level: number;
  gender?: "M" | "F" | "N";
  teraType: PokemonType;
  teraTypeRef?: BuildCatalogReference;
  item: string;
  itemRef?: BuildCatalogReference;
  ability: string;
  abilityRef?: BuildCatalogReference;
  nature: string;
  natureRef?: BuildCatalogReference;
  moves: PokemonMoveSlots;
  moveRefs?: PokemonMoveCatalogRefs;
  evs: StatSpread;
  ivs: StatSpread;
  notes?: string;
}

export interface TeamSlot {
  slot: 1 | 2 | 3 | 4 | 5 | 6;
  pokemon: PokemonBuild | null;
}

export interface SubmittedTeam {
  id: string;
  name: string;
  format: BattleFormat;
  description: string;
  createdAt: string;
  updatedAt: string;
  slots: [TeamSlot, TeamSlot, TeamSlot, TeamSlot, TeamSlot, TeamSlot];
}

export interface OpponentArchetype {
  id: string;
  name: string;
  description: string;
  sharePercent: number;
}

export interface OpponentPool {
  id: string;
  name: string;
  description: string;
  format: BattleFormat;
  tags: string[];
  archetypes: OpponentArchetype[];
}

export interface PerformanceProfile {
  id: string;
  name: string;
  mode: PerformanceMode;
  description: string;
  recommendedWorkerCount: number;
  maxWorkerCount: number;
  targetCpuPercent: number;
}

export interface SimulationSettings {
  id: string;
  format: BattleFormat;
  battleCount: number;
  bringCount: number;
  teamSize: number;
  opponentPoolId: string;
  performanceProfileId: string;
  workerCount: number;
  randomSeed?: string;
  openTeamSheets: boolean;
}

export interface SimulationReportSummary {
  winRate: number;
  tier: ReportTier;
  wins: number;
  losses: number;
  totalBattles: number;
  avgTurns: number;
}

export type ReportHistorySummary = Pick<
  SimulationReportSummary,
  "winRate" | "tier" | "totalBattles" | "avgTurns"
>;

/** Lightweight projection from SimulationReport.summary for list/history UI. */
export interface ReportHistoryEntry {
  id: string;
  reportId: string;
  title: string;
  description: string;
  teamName: string;
  opponentPoolName: string;
  status: SimulationStatus;
  generatedAt: string;
  summary: ReportHistorySummary;
  formatLabel: string;
  profileName: string;
}

export interface ReportMetric {
  label: string;
  value: string;
  detail?: string;
}

export interface ArchetypeWinRate {
  archetypeId: string;
  archetypeName: string;
  wins: number;
  losses: number;
  winRate: number;
  notes: string;
}

export interface ReportCallout {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
  detail: string;
}

export interface PokemonThreatResult {
  id: string;
  pokemon: string;
  pokemonRef?: BuildCatalogReference;
  lossRate: number;
  games: number;
  severity: "low" | "medium" | "high";
  detail: string;
}

export interface LeadPairResult {
  id: string;
  pokemon: [string, string];
  usagePercent: number;
  winRate: number;
  notes: string;
}

export interface CoreResult {
  id: string;
  pokemon: [string, string, string, string];
  pokemonRefs?: [
    BuildCatalogReference | null,
    BuildCatalogReference | null,
    BuildCatalogReference | null,
    BuildCatalogReference | null,
  ];
  winRate: number;
  notes: string;
}

export interface CoverageTeamMemberResult {
  pokemon: string;
  pokemonRef?: BuildCatalogReference;
  score: number;
  notes?: string;
}

export interface CoverageResult {
  type: PokemonType;
  score: number;
  notes: string;
  members: CoverageTeamMemberResult[];
}

export interface SimulationReport {
  id: string;
  teamId: string;
  teamName: string;
  opponentPool: OpponentPool;
  status: SimulationStatus;
  generatedAt: string;
  settings: SimulationSettings;
  performanceProfile: PerformanceProfile;
  summary: SimulationReportSummary;
  /** Deferred: current UI renders hero stats directly from summary. */
  heroMetrics?: ReportMetric[];
  overview: {
    headline: string;
    paragraphs: string[];
    keyTakeaways: string[];
  };
  archetypeWinRates: ArchetypeWinRate[];
  weaknesses: ReportCallout[];
  strategyTips: ReportCallout[];
  threats: PokemonThreatResult[];
  leads: LeadPairResult[];
  cores: CoreResult[];
  coverage: CoverageResult[];
}

export type * from "./catalog";
export type * from "./reportArtifacts";
export type * from "./runtime";
export type * from "./settingsCatalog";
export type * from "./simulationPayload";
