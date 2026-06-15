import type { CatalogSourceManifestSection } from "./catalogSourceManifest";

export type CatalogCoverageExpansionStage =
  | "source-manifest-expansion"
  | "live-fetch-prototype-scaling"
  | "generated-catalog-validation"
  | "cache-bundle-readiness"
  | "pokemon-editor-picker-readiness";

export type CatalogCoverageExpansionSourceRole = "enrichment";

export type CatalogCoverageExpansionAuthority = "pokemon-showdown";

export type CatalogCoverageExpansionSpritePolicy = "candidate-review-gated";

export type CatalogCoverageExpansionExecutionBoundary =
  | "data-only"
  | "no-ui-wiring"
  | "no-persistence"
  | "no-file-io"
  | "no-bl-writing"
  | "no-showdown-runtime"
  | "no-simulation";

export interface CatalogCoverageExpansionSectionTarget {
  section: CatalogSourceManifestSection;
  currentCoverage: string;
  targetCoverage: string;
  sourceManifestWork: string[];
  liveFetchWork: string[];
  generatorValidationWork: string[];
  cacheBundleReadinessWork: string[];
  laterPickerIntegrationWork: string[];
  mismatchRisks: string[];
}

export interface CatalogCoverageExpansionStageGate {
  stage: CatalogCoverageExpansionStage;
  description: string;
  requiredBeforeNextStage: string[];
  validationHelpers: string[];
  blockedUntilLeadApproval?: string[];
}

export interface CatalogCoverageExpansionPlan {
  id: string;
  sourceName: "PokeAPI";
  sourceRole: CatalogCoverageExpansionSourceRole;
  legalityAuthority: CatalogCoverageExpansionAuthority;
  simulationAuthority: CatalogCoverageExpansionAuthority;
  spriteMetadataPolicy: CatalogCoverageExpansionSpritePolicy;
  executionBoundaries: CatalogCoverageExpansionExecutionBoundary[];
  sections: Record<CatalogSourceManifestSection, CatalogCoverageExpansionSectionTarget>;
  stageGates: CatalogCoverageExpansionStageGate[];
  notes: string[];
}

const commonSourceManifestWork = [
  "Add explicit resource-set tiers before broad fetch execution.",
  "Keep expected counts and required resource IDs centralized in the manifest.",
  "Record whether a section uses curated IDs, paginated discovery, or all-known source resources.",
];

const commonLiveFetchWork = [
  "Scale request planning by section with rate-limit and retry metadata visible.",
  "Keep execution isolated from React and app runtime surfaces.",
  "Preserve source snapshot validation before normalization.",
];

const commonGeneratorValidationWork = [
  "Validate source DTO shape before generated catalog validation.",
  "Validate generated record counts, duplicate keys, source references, and search index references.",
  "Keep warnings visible without promoting candidate sprite metadata to approved production assets.",
];

const commonCacheBundleWork = [
  "Project section counts and validation status into cache and .bl readiness metadata.",
  "Keep .bl bundles read-only and catalog-enrichment-only.",
  "Require deterministic bundle hashes before any loader execution is approved.",
];

const commonPickerWork = [
  "Use catalogKey/showdownId as identity and labels as display only.",
  "Keep picker integration local/catalog-backed and separate from live fetch execution.",
  "Use search, result limits, empty/loading/error states, and unavailable states for large lists.",
];

export const catalogCoverageExpansionPlan: CatalogCoverageExpansionPlan = {
  id: "catalog-coverage-expansion-plan-v1",
  sourceName: "PokeAPI",
  sourceRole: "enrichment",
  legalityAuthority: "pokemon-showdown",
  simulationAuthority: "pokemon-showdown",
  spriteMetadataPolicy: "candidate-review-gated",
  executionBoundaries: [
    "data-only",
    "no-ui-wiring",
    "no-persistence",
    "no-file-io",
    "no-bl-writing",
    "no-showdown-runtime",
    "no-simulation",
  ],
  sections: {
    pokemon: {
      section: "pokemon",
      currentCoverage: "approved v2 sample set for current Team Builder/editor plus adjacent VGC-style options",
      targetCoverage:
        "broad Pokemon species and default-form enrichment coverage, with non-default forms handled as a separate mismatch review pass",
      sourceManifestWork: [
        ...commonSourceManifestWork,
        "Add a broad Pokemon section mode for paginated PokeAPI pokemon resources.",
        "Track form and variety handling separately from the first broad species pass.",
      ],
      liveFetchWork: [
        ...commonLiveFetchWork,
        "Fetch Pokemon resources from manifest-approved IDs or paginated discovery snapshots only after approval.",
      ],
      generatorValidationWork: [
        ...commonGeneratorValidationWork,
        "Validate base stats, ordered types, default form keys, visual asset references, and search tokens.",
      ],
      cacheBundleReadinessWork: commonCacheBundleWork,
      laterPickerIntegrationWork: [
        ...commonPickerWork,
        "Group Pokemon picker results by primary type and preserve selected unavailable records.",
      ],
      mismatchRisks: [
        "PokeAPI forms and Pokemon Showdown playable forme IDs may not match one-to-one.",
        "PokeAPI species availability is enrichment metadata only and does not imply format legality.",
      ],
    },
    moves: {
      section: "moves",
      currentCoverage: "approved v2 sample move set for current Team Builder/editor needs",
      targetCoverage: "broad move enrichment coverage for catalog search and later learnset-aware picker data",
      sourceManifestWork: [
        ...commonSourceManifestWork,
        "Add broad move resource discovery while keeping Pokemon Editor move browsing learnset-gated later.",
      ],
      liveFetchWork: [
        ...commonLiveFetchWork,
        "Fetch move resources with damage class, target, type, power, accuracy, priority, PP, and English text.",
      ],
      generatorValidationWork: [
        ...commonGeneratorValidationWork,
        "Validate move category and target mappings, including unknown fallback coverage for unmapped PokeAPI targets.",
      ],
      cacheBundleReadinessWork: commonCacheBundleWork,
      laterPickerIntegrationWork: [
        ...commonPickerWork,
        "Keep Pokemon Editor move picker learnset-only unless Lead approves all-move browsing.",
      ],
      mismatchRisks: [
        "PokeAPI move target names may need additional mapping before broad move validation is clean.",
        "Move availability and legality must come from Pokemon Showdown, not PokeAPI.",
      ],
    },
    abilities: {
      section: "abilities",
      currentCoverage: "approved v2 sample ability set for current Team Builder/editor needs",
      targetCoverage: "broad ability enrichment coverage for picker/search metadata",
      sourceManifestWork: commonSourceManifestWork,
      liveFetchWork: [
        ...commonLiveFetchWork,
        "Fetch ability resources with English flavor text and stable source IDs.",
      ],
      generatorValidationWork: [
        ...commonGeneratorValidationWork,
        "Validate English text fallback and duplicate showdownId warnings.",
      ],
      cacheBundleReadinessWork: commonCacheBundleWork,
      laterPickerIntegrationWork: commonPickerWork,
      mismatchRisks: [
        "Ability availability by Pokemon and format is Showdown-owned and should not be inferred from broad PokeAPI coverage.",
      ],
    },
    items: {
      section: "items",
      currentCoverage: "approved v2 sample item set with English-name fallback for sparse item text",
      targetCoverage: "broad item enrichment coverage with icon metadata kept review-gated",
      sourceManifestWork: commonSourceManifestWork,
      liveFetchWork: [
        ...commonLiveFetchWork,
        "Fetch item resources with flavor/effect/name fallback and optional sprite metadata.",
      ],
      generatorValidationWork: [
        ...commonGeneratorValidationWork,
        "Validate item text fallback for records with English names but missing flavor/effect entries.",
      ],
      cacheBundleReadinessWork: commonCacheBundleWork,
      laterPickerIntegrationWork: [
        ...commonPickerWork,
        "Keep item icon display as placeholder or review-gated metadata until asset licensing is approved.",
      ],
      mismatchRisks: [
        "Some PokeAPI item records are not competitively usable held items.",
        "PokeAPI item sprite URLs remain candidate metadata only.",
      ],
    },
    types: {
      section: "types",
      currentCoverage: "all 18 Pokemon types for Tera and type picker coverage",
      targetCoverage: "complete 18-type coverage maintained as a stable baseline",
      sourceManifestWork: [
        "Keep all 18 Pokemon type IDs explicit and expected-count validated.",
        "Do not include non-battle pseudo-types in app picker coverage without Lead review.",
      ],
      liveFetchWork: [
        ...commonLiveFetchWork,
        "Fetch type resources only for the approved 18 Pokemon types.",
      ],
      generatorValidationWork: [
        ...commonGeneratorValidationWork,
        "Validate each generated type maps to a BattleLab PokemonType value.",
      ],
      cacheBundleReadinessWork: commonCacheBundleWork,
      laterPickerIntegrationWork: commonPickerWork,
      mismatchRisks: [
        "PokeAPI may expose additional type-like records that should stay out of BattleLab type pickers unless approved.",
      ],
    },
    natures: {
      section: "natures",
      currentCoverage: "approved v2 sample nature set for current Team Builder/editor needs",
      targetCoverage: "complete nature enrichment coverage, including neutral natures",
      sourceManifestWork: [
        ...commonSourceManifestWork,
        "Expand to all PokeAPI natures and validate neutral increased/decreased stat handling.",
      ],
      liveFetchWork: [
        ...commonLiveFetchWork,
        "Fetch nature resources with nullable increased/decreased stat references.",
      ],
      generatorValidationWork: [
        ...commonGeneratorValidationWork,
        "Validate stat mapping and neutral nature fallback descriptions.",
      ],
      cacheBundleReadinessWork: commonCacheBundleWork,
      laterPickerIntegrationWork: commonPickerWork,
      mismatchRisks: [
        "Nature metadata is safe enrichment, but battle legality and final stat effects remain Showdown-owned.",
      ],
    },
  },
  stageGates: [
    {
      stage: "source-manifest-expansion",
      description: "Expand manifest coverage policy and resource-set definitions before broad fetch execution.",
      requiredBeforeNextStage: [
        "Manifest validation passes.",
        "Each section declares target coverage and expected counts or discovery mode.",
        "Authority and no-wiring boundary notes remain explicit.",
      ],
      validationHelpers: [
        "validateCatalogSourceManifest",
        "validateCatalogSourceManifestLiveFetchBridge",
      ],
    },
    {
      stage: "live-fetch-prototype-scaling",
      description: "Scale live-fetch prototype only from approved manifest resource sets.",
      requiredBeforeNextStage: [
        "Fetch prototype coverage validation passes.",
        "Rate-limit and retry metadata remain visible.",
        "No UI-triggered execution is added.",
      ],
      validationHelpers: [
        "validateCatalogLiveFetchPrototypeCoverage",
        "validateCatalogLiveFetchPrototype",
      ],
      blockedUntilLeadApproval: [
        "Paginated all-resource fetch execution",
        "Large live request batches",
      ],
    },
    {
      stage: "generated-catalog-validation",
      description: "Normalize source DTO snapshots and validate generated BattleLab catalog output.",
      requiredBeforeNextStage: [
        "Source DTO validation passes before generated catalog validation.",
        "Generated catalog validation passes with zero error-severity issues.",
        "Candidate asset warnings remain non-failing but visible.",
      ],
      validationHelpers: [
        "validatePokeApiSourceSnapshot",
        "validateGeneratedPokeApiCatalogPipeline",
        "validateCatalogDataFoundationPipeline",
      ],
    },
    {
      stage: "cache-bundle-readiness",
      description: "Project broad generated catalog output into cache and read-only .bl readiness metadata.",
      requiredBeforeNextStage: [
        "Cache handoff and .bl fixture validations pass.",
        "Read-only/catalog-only assumptions remain explicit.",
        "No file IO or .bl writing is added.",
      ],
      validationHelpers: [
        "validateCatalogCacheContracts",
        "validateCatalogBundleLoaderFixtures",
        "validateCatalogBundleLoaderStatusBridge",
      ],
    },
    {
      stage: "pokemon-editor-picker-readiness",
      description: "Integrate broader local catalog data into pickers after data validation is approved.",
      requiredBeforeNextStage: [
        "Picker read-models stay local/catalog-backed.",
        "PokemonBuild string values and catalog refs remain compatible.",
        "Move picker remains learnset-only unless Lead approves all-move browsing.",
      ],
      validationHelpers: [
        "npm run lint",
        "npm run build",
      ],
      blockedUntilLeadApproval: [
        "Pokemon Editor wiring to generated broad catalog data",
        "Catalog Update UI wiring",
      ],
    },
  ],
  notes: [
    "PokeAPI data remains catalog enrichment only.",
    "Pokemon Showdown remains legality and simulation source of truth.",
    "Sprite metadata remains candidate-review-gated and is not approved production sprite sourcing.",
    "This plan does not wire CatalogUpdatePanel or Pokemon Editor.",
    "This plan does not add backend, persistence, SQLite, Electron, PDF, Theater decoding, report generation, production sprite rendering, finalized sprite licensing, or simulation work.",
  ],
};
