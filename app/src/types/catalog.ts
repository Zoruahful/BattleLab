import type { BattleFormat, PokemonType, StatSpread } from "./index";

export type CatalogKey = string;

export type ShowdownId = string;

export type CatalogSourceKind =
  | "pokeapi"
  | "pokemon-showdown"
  | "bundled"
  | "manual"
  | "unknown";

export type CatalogRecordStatus =
  | "available"
  | "deprecated"
  | "hidden"
  | "unknown"
  | "showdownOnly";

export type CatalogValidationStatus =
  | "valid"
  | "unknown"
  | "notInFormat"
  | "catalogOnly"
  | "showdownOnly"
  | "sourceMismatch";

export type CatalogAssetKind =
  | "pokemon-icon"
  | "pokemon-sprite"
  | "pokemon-animated-sprite"
  | "pokemon-artwork"
  | "item-icon"
  | "type-icon";

export type CatalogAssetFormat = "png" | "svg" | "gif" | "webp" | "unknown";

export type CatalogPokemonVisualMode = "static" | "animated";

export type CatalogAssetLicenseReviewStatus =
  | "unknown"
  | "approved"
  | "rejected"
  | "needsReview";

export type CatalogMoveCategory = "physical" | "special" | "status" | "unknown";

export type CatalogMoveTarget =
  | "self"
  | "single"
  | "adjacent"
  | "all-adjacent"
  | "all-opponents"
  | "field"
  | "side"
  | "unknown";

export type CatalogPickerKind =
  | "pokemon"
  | "move"
  | "ability"
  | "item"
  | "type"
  | "nature";

export type CatalogPickerAvailability =
  | "selectable"
  | "disabled"
  | "warning"
  | "hidden";

export interface CatalogNamedReference {
  catalogKey: CatalogKey;
  showdownId?: ShowdownId;
  displayName: string;
}

export interface CatalogAssetReference {
  iconKey?: CatalogKey;
  spriteKey?: CatalogKey;
  animatedSpriteKey?: CatalogKey;
  artworkKey?: CatalogKey;
  fallbackText?: string;
}

export interface CatalogSourceMetadata {
  sourceId: string;
  kind: CatalogSourceKind;
  name: string;
  baseUrl?: string;
  documentationUrl?: string;
  version?: string;
  fetchedAt?: string;
  licenseName?: string;
  licenseUrl?: string;
  requiresAttribution: boolean;
}

export interface CatalogAssetMetadata {
  assetKey: CatalogKey;
  kind: CatalogAssetKind;
  format: CatalogAssetFormat;
  sourceId: string;
  sourceName?: string;
  candidateSourceUrl?: string;
  sourceUrl?: string;
  localCacheKey?: string;
  localPath?: string;
  width?: number;
  height?: number;
  licenseReviewStatus: CatalogAssetLicenseReviewStatus;
  fallbackBehavior?: "use-static" | "use-icon" | "use-text" | "hide";
  fallbackText?: string;
}

export interface CatalogRecordBase {
  catalogKey: CatalogKey;
  showdownId?: ShowdownId;
  pokeApiId?: number;
  displayName: string;
  aliases: string[];
  status: CatalogRecordStatus;
  sourceIds: string[];
  lastUpdatedAt?: string;
}

export interface CatalogPokemonForm {
  catalogKey: CatalogKey;
  showdownId?: ShowdownId;
  displayName: string;
  aliases: string[];
  isDefault: boolean;
  isBattleOnly?: boolean;
  types: PokemonType[];
  baseStats?: StatSpread;
  iconKey?: CatalogKey;
  spriteKey?: CatalogKey;
  animatedSpriteKey?: CatalogKey;
  artworkKey?: CatalogKey;
}

export interface CatalogPokemonAbilityReference {
  catalogKey?: CatalogKey;
  showdownId: ShowdownId;
  displayName: string;
  slot: number;
  hidden: boolean;
}

export interface CatalogPokemon extends CatalogRecordBase {
  kind: "pokemon";
  nationalDexNumber?: number;
  defaultFormKey: CatalogKey;
  forms: CatalogPokemonForm[];
  types: PokemonType[];
  baseStats?: StatSpread;
  iconKey?: CatalogKey;
  spriteKey?: CatalogKey;
  animatedSpriteKey?: CatalogKey;
  artworkKey?: CatalogKey;
  abilities?: CatalogPokemonAbilityReference[];
  preferredVisualModes?: CatalogPokemonVisualMode[];
  generationIntroduced?: string;
  formatAvailability?: CatalogFormatAvailability[];
}

export interface CatalogMove extends CatalogRecordBase {
  kind: "move";
  type: PokemonType;
  category: CatalogMoveCategory;
  power?: number;
  accuracy?: number;
  priority?: number;
  pp?: number;
  target: CatalogMoveTarget;
  shortDescription?: string;
  generationIntroduced?: string;
  formatAvailability?: CatalogFormatAvailability[];
}

export interface CatalogAbility extends CatalogRecordBase {
  kind: "ability";
  shortDescription?: string;
  generationIntroduced?: string;
  formatAvailability?: CatalogFormatAvailability[];
}

export interface CatalogItem extends CatalogRecordBase {
  kind: "item";
  shortDescription?: string;
  iconKey?: CatalogKey;
  generationIntroduced?: string;
  formatAvailability?: CatalogFormatAvailability[];
}

export interface CatalogType extends CatalogRecordBase {
  kind: "type";
  type: PokemonType;
  colorToken?: string;
  iconKey?: CatalogKey;
  matchupNotes?: string;
}

export interface CatalogNature extends CatalogRecordBase {
  kind: "nature";
  increasedStat?: keyof StatSpread;
  decreasedStat?: keyof StatSpread;
  shortDescription?: string;
}

export interface CatalogFormatAvailability {
  format: BattleFormat;
  status: CatalogValidationStatus;
  reason?: string;
  checkedAgainstSourceId?: string;
}

export interface CatalogBuildValueValidation {
  field: "species" | "move" | "ability" | "item" | "nature" | "teraType";
  value: string;
  catalogKey?: CatalogKey;
  showdownId?: ShowdownId;
  status: CatalogValidationStatus;
  message?: string;
}

export interface CatalogSearchToken {
  value: string;
  weight: number;
  source: "displayName" | "alias" | "type" | "description" | "showdownId";
}

export interface CatalogSearchIndexEntry {
  catalogKey: CatalogKey;
  kind: CatalogPickerKind;
  displayName: string;
  aliases: string[];
  tokens: CatalogSearchToken[];
  asset?: CatalogAssetReference;
}

export interface CatalogPickerOption {
  catalogKey: CatalogKey;
  kind: CatalogPickerKind;
  displayName: string;
  showdownId?: ShowdownId;
  aliases: string[];
  description?: string;
  tags: string[];
  asset?: CatalogAssetReference;
  primaryType?: PokemonType;
  secondaryType?: PokemonType;
  abilityShowdownIds?: ShowdownId[];
  increasedStat?: keyof StatSpread;
  decreasedStat?: keyof StatSpread;
  availability: CatalogPickerAvailability;
  validationStatus?: CatalogValidationStatus;
  disabledReason?: string;
}

export interface CatalogPickerGroup {
  label: string;
  options: CatalogPickerOption[];
}

export interface CatalogPickerQuery {
  kind: CatalogPickerKind;
  searchText: string;
  format?: BattleFormat;
  selectedPokemonKey?: CatalogKey;
  includeUnavailable: boolean;
  limit: number;
}

export interface CatalogPickerResult {
  query: CatalogPickerQuery;
  options: CatalogPickerOption[];
  groups?: CatalogPickerGroup[];
  totalCount: number;
  truncated: boolean;
}

export interface CatalogManifestRecordCounts {
  pokemon: number;
  moves: number;
  abilities: number;
  items: number;
  types: number;
  natures: number;
  assets: number;
  searchIndexEntries?: number;
}

export interface CatalogManifest {
  schemaVersion: string;
  generatedAt: string;
  sources: CatalogSourceMetadata[];
  recordCounts: CatalogManifestRecordCounts;
  assetPolicy: {
    allowRemoteUrls: boolean;
    bundledAssetsPreferred: boolean;
    licenseReviewRequired: boolean;
  };
  showdownDataVersion?: string;
  warnings: string[];
}

export interface BattleLabCatalog {
  manifest: CatalogManifest;
  pokemon: CatalogPokemon[];
  moves: CatalogMove[];
  abilities: CatalogAbility[];
  items: CatalogItem[];
  types: CatalogType[];
  natures: CatalogNature[];
  assets: CatalogAssetMetadata[];
  searchIndex?: CatalogSearchIndexEntry[];
}
