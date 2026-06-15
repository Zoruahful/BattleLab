import {
  catalogBulkIngestionExpandedLimits,
  runCatalogBulkIngestion,
  type CatalogBulkIngestionLimits,
  type CatalogBulkIngestionOptions,
  type CatalogBulkIngestionResult,
  type CatalogBulkIngestionSection,
} from "./catalogBulkIngestion";
import { validateGeneratedPokeApiCatalogPrototype } from "./catalogGeneratorPrototypeValidation";
import { validatePokeApiSourceSnapshot } from "./pokeApiSourceValidation";

export type CatalogBulkIngestionValidationSeverity = "error" | "warning";

export type CatalogBulkIngestionValidationCode =
  | "bulk-ingestion-failed"
  | "catalog-missing"
  | "full-mode-unavailable"
  | "insufficient-broad-coverage"
  | "missing-boundary-note"
  | "search-index-under-covered"
  | "source-snapshot-missing"
  | "validation-issue";

export interface CatalogBulkIngestionCounts {
  pokemon: number;
  moves: number;
  abilities: number;
  items: number;
  types: number;
  natures: number;
  assets: number;
  searchIndex: number;
}

export interface CatalogBulkIngestionValidationIssue {
  code: CatalogBulkIngestionValidationCode;
  severity: CatalogBulkIngestionValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogBulkIngestionValidationResult {
  isValid: boolean;
  result: CatalogBulkIngestionResult;
  counts: CatalogBulkIngestionCounts;
  warningCount: number;
  errorCount: number;
  issues: CatalogBulkIngestionValidationIssue[];
}

const minimumBroadCoverage: Pick<CatalogBulkIngestionLimits, CatalogBulkIngestionSection> = {
  ...catalogBulkIngestionExpandedLimits,
  moves: 450,
};

const requiredBoundaryNoteFragments = [
  "enrichment-only",
  "Pokemon Showdown remains legality and simulation source of truth",
  "candidate-review-gated",
  "No UI wiring",
  ".bl writing",
];

const createIssue = (
  code: CatalogBulkIngestionValidationCode,
  severity: CatalogBulkIngestionValidationSeverity,
  path: string,
  message: string,
): CatalogBulkIngestionValidationIssue => ({
  code,
  severity,
  path,
  message,
});

const emptyCounts: CatalogBulkIngestionCounts = {
  pokemon: 0,
  moves: 0,
  abilities: 0,
  items: 0,
  types: 0,
  natures: 0,
  assets: 0,
  searchIndex: 0,
};

const getCounts = (result: CatalogBulkIngestionResult): CatalogBulkIngestionCounts => {
  if (!result.catalog) return emptyCounts;

  return {
    pokemon: result.catalog.pokemon.length,
    moves: result.catalog.moves.length,
    abilities: result.catalog.abilities.length,
    items: result.catalog.items.length,
    types: result.catalog.types.length,
    natures: result.catalog.natures.length,
    assets: result.catalog.assets.length,
    searchIndex: result.catalog.searchIndex?.length ?? 0,
  };
};

const hasBoundaryNote = (result: CatalogBulkIngestionResult, fragment: string) =>
  result.notes.some((note) => note.toLowerCase().includes(fragment.toLowerCase()));

const validateBroadCoverage = (
  issues: CatalogBulkIngestionValidationIssue[],
  counts: CatalogBulkIngestionCounts,
) => {
  (Object.keys(minimumBroadCoverage) as CatalogBulkIngestionSection[]).forEach((section) => {
    if (counts[section] < minimumBroadCoverage[section]) {
      issues.push(
        createIssue(
          "insufficient-broad-coverage",
          "error",
          `counts.${section}`,
          `Bulk ingestion must produce at least ${minimumBroadCoverage[section]} ${section} records; found ${counts[section]}.`,
        ),
      );
    }
  });
};

export async function validateCatalogBulkIngestion(
  options: CatalogBulkIngestionOptions = {},
): Promise<CatalogBulkIngestionValidationResult> {
  const result = await runCatalogBulkIngestion(options);
  const counts = getCounts(result);
  const issues: CatalogBulkIngestionValidationIssue[] = [];

  if (result.status !== "complete") {
    issues.push(
      createIssue(
        "bulk-ingestion-failed",
        "error",
        "status",
        `Bulk ingestion must complete successfully; received '${result.status}'.`,
      ),
    );
  }

  if (!result.fullModeAvailable) {
    issues.push(
      createIssue(
        "full-mode-unavailable",
        "error",
        "fullModeAvailable",
        "Bulk ingestion must expose a full endpoint-list mode for a later heavy verification checkpoint.",
      ),
    );
  }

  if (!result.snapshot) {
    issues.push(
      createIssue("source-snapshot-missing", "error", "snapshot", "Bulk ingestion did not produce a source snapshot."),
    );
  } else {
    validatePokeApiSourceSnapshot(result.snapshot).issues.forEach((issue) => {
      issues.push(
        createIssue(
          "validation-issue",
          issue.severity,
          `source.${issue.path}`,
          issue.message,
        ),
      );
    });
  }

  if (!result.catalog) {
    issues.push(createIssue("catalog-missing", "error", "catalog", "Bulk ingestion did not produce a catalog."));
  } else {
    validateGeneratedPokeApiCatalogPrototype(result.catalog).issues.forEach((issue) => {
      issues.push(
        createIssue(
          "validation-issue",
          issue.severity,
          `catalog.${issue.path}`,
          issue.message,
        ),
      );
    });
  }

  validateBroadCoverage(issues, counts);

  const catalogRecordCount =
    counts.pokemon + counts.moves + counts.abilities + counts.items + counts.types + counts.natures;
  if (counts.searchIndex < catalogRecordCount) {
    issues.push(
      createIssue(
        "search-index-under-covered",
        "error",
        "counts.searchIndex",
        "Bulk generated catalog search index must include at least one entry for each generated catalog record.",
      ),
    );
  }

  requiredBoundaryNoteFragments.forEach((fragment) => {
    if (!hasBoundaryNote(result, fragment)) {
      issues.push(
        createIssue(
          "missing-boundary-note",
          "error",
          "notes",
          `Bulk ingestion notes must preserve '${fragment}' boundary semantics.`,
        ),
      );
    }
  });

  result.issues.forEach((issue) => {
    issues.push(
      createIssue(
        "validation-issue",
        issue.severity === "info" ? "warning" : issue.severity,
        issue.path ?? issue.resourceId ?? issue.code,
        issue.message,
      ),
    );
  });

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  return {
    isValid: errorCount === 0,
    result,
    counts,
    warningCount,
    errorCount,
    issues,
  };
}
