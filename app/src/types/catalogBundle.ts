import type {
  CatalogAbility,
  CatalogAssetMetadata,
  CatalogItem,
  CatalogMove,
  CatalogNature,
  CatalogPokemon,
  CatalogSearchIndexEntry,
  CatalogSourceKind,
  CatalogType,
} from "./catalog";

export type BattleLabCatalogBundleSectionName =
  | "pokemon"
  | "moves"
  | "abilities"
  | "items"
  | "types"
  | "natures"
  | "assets"
  | "searchIndex";

export type BattleLabCatalogBundleSignatureStatus =
  | "unsigned"
  | "present"
  | "verified"
  | "failed"
  | "unsupported";

export type BattleLabCatalogBundleLoadStatus =
  | "idle"
  | "loading"
  | "loaded"
  | "invalid"
  | "unsupported"
  | "failed";

export interface BattleLabCatalogBundleHash {
  algorithm: "sha256" | "unknown";
  value: string;
  canonicalization?: string;
}

export type BattleLabCatalogBundleSectionHashes = Record<
  BattleLabCatalogBundleSectionName,
  BattleLabCatalogBundleHash
>;

export interface BattleLabCatalogBundleCompatibility {
  minAppVersion: string;
  maxAppVersion?: string;
  compatibleAppMajor?: number;
  notes?: string[];
}

export interface BattleLabCatalogBundleSourceVersion {
  sourceId: string;
  kind: CatalogSourceKind;
  name: string;
  version?: string;
  dataVersion?: string;
  generatedAt?: string;
  fetchedAt?: string;
  documentationUrl?: string;
  requiresAttribution: boolean;
}

export interface BattleLabCatalogBundleRecordCounts {
  pokemon: number;
  moves: number;
  abilities: number;
  items: number;
  types: number;
  natures: number;
  assets: number;
  searchIndexEntries: number;
}

export interface BattleLabCatalogBundleAssetPolicy {
  allowRemoteUrls: boolean;
  bundledAssetsPreferred: boolean;
  licenseReviewRequired: boolean;
  allowUnreviewedCandidateSources: boolean;
  fallbackRequired: boolean;
}

export interface BattleLabCatalogBundleSignature {
  status: BattleLabCatalogBundleSignatureStatus;
  algorithm?: string;
  keyId?: string;
  signatureValue?: string;
  signedAt?: string;
  certificateUrl?: string;
  publicKeyHint?: string;
}

export interface BattleLabCatalogBundleManifest {
  bundleFormat: "battlelab-catalog";
  fileExtension: ".bl";
  schemaVersion: string;
  catalogVersion: string;
  generatedAt: string;
  appCompatibility: BattleLabCatalogBundleCompatibility;
  sourceVersions: BattleLabCatalogBundleSourceVersion[];
  recordCounts: BattleLabCatalogBundleRecordCounts;
  sectionHashes: BattleLabCatalogBundleSectionHashes;
  bundleHash: BattleLabCatalogBundleHash;
  signature: BattleLabCatalogBundleSignature;
  assetPolicy: BattleLabCatalogBundleAssetPolicy;
  warnings: string[];
}

export interface BattleLabCatalogBundleSections {
  pokemon: CatalogPokemon[];
  moves: CatalogMove[];
  abilities: CatalogAbility[];
  items: CatalogItem[];
  types: CatalogType[];
  natures: CatalogNature[];
  assets: CatalogAssetMetadata[];
  searchIndex: CatalogSearchIndexEntry[];
}

export interface BattleLabCatalogBundle {
  readonly fileExtension: ".bl";
  readonly readOnly: true;
  manifest: BattleLabCatalogBundleManifest;
  sections: BattleLabCatalogBundleSections;
}

export interface BattleLabCatalogBundleValidationIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  path: string;
  section?: BattleLabCatalogBundleSectionName;
}

export interface BattleLabCatalogBundleValidationResult {
  status: BattleLabCatalogBundleLoadStatus;
  isValid: boolean;
  issues: BattleLabCatalogBundleValidationIssue[];
}
