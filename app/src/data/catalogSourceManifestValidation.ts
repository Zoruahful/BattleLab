import {
  approvedCatalogLiveFetchSampleManifest,
  type CatalogSourceCoverageTier,
  type CatalogSourceManifest,
  type CatalogSourceManifestSection,
} from "./catalogSourceManifest";

export type CatalogSourceManifestValidationSeverity = "error" | "warning";

export type CatalogSourceManifestValidationCode =
  | "authority-mismatch"
  | "coverage-tier-missing"
  | "coverage-tier-unexpected"
  | "duplicate-resource-id"
  | "expected-count-mismatch"
  | "manifest-note-missing"
  | "required-section-missing"
  | "section-name-mismatch"
  | "source-role-mismatch"
  | "sprite-policy-mismatch";

export interface CatalogSourceManifestValidationIssue {
  code: CatalogSourceManifestValidationCode;
  severity: CatalogSourceManifestValidationSeverity;
  path: string;
  message: string;
}

export interface CatalogSourceManifestValidationResult {
  isValid: boolean;
  issues: CatalogSourceManifestValidationIssue[];
  sectionCount: number;
  resourceCount: number;
}

const requiredManifestSections: CatalogSourceManifestSection[] = [
  "pokemon",
  "moves",
  "abilities",
  "items",
  "types",
  "natures",
];

const expectedCoverageTierBySection = {
  pokemon: "current-team-builder-editor",
  moves: "current-team-builder-editor",
  abilities: "current-team-builder-editor",
  items: "current-team-builder-editor",
  types: "complete-type-picker",
  natures: "current-team-builder-editor",
} satisfies Record<CatalogSourceManifestSection, CatalogSourceCoverageTier>;

const requiredManifestNoteFragments = [
  "UI wiring",
  "cache file IO",
  ".bl writing",
  "durable persistence",
];

const createManifestIssue = (
  code: CatalogSourceManifestValidationCode,
  severity: CatalogSourceManifestValidationSeverity,
  path: string,
  message: string,
): CatalogSourceManifestValidationIssue => ({
  code,
  severity,
  path,
  message,
});

const hasManifestNoteFragment = (manifest: CatalogSourceManifest, fragment: string) =>
  manifest.notes.some((note) => note.toLowerCase().includes(fragment.toLowerCase()));

export function validateCatalogSourceManifest(
  manifest: CatalogSourceManifest = approvedCatalogLiveFetchSampleManifest,
): CatalogSourceManifestValidationResult {
  const issues: CatalogSourceManifestValidationIssue[] = [];

  if (manifest.sourceRole !== "enrichment") {
    issues.push(
      createManifestIssue(
        "source-role-mismatch",
        "error",
        "sourceRole",
        "Catalog source manifest must remain enrichment-only.",
      ),
    );
  }

  if (manifest.legalityAuthority !== "pokemon-showdown") {
    issues.push(
      createManifestIssue(
        "authority-mismatch",
        "error",
        "legalityAuthority",
        "Catalog source manifest legality authority must remain Pokemon Showdown.",
      ),
    );
  }

  if (manifest.simulationAuthority !== "pokemon-showdown") {
    issues.push(
      createManifestIssue(
        "authority-mismatch",
        "error",
        "simulationAuthority",
        "Catalog source manifest simulation authority must remain Pokemon Showdown.",
      ),
    );
  }

  if (manifest.spriteMetadataPolicy !== "candidate-review-gated") {
    issues.push(
      createManifestIssue(
        "sprite-policy-mismatch",
        "error",
        "spriteMetadataPolicy",
        "Catalog source manifest sprite metadata must remain candidate/review-gated.",
      ),
    );
  }

  requiredManifestNoteFragments.forEach((fragment) => {
    if (!hasManifestNoteFragment(manifest, fragment)) {
      issues.push(
        createManifestIssue(
          "manifest-note-missing",
          "error",
          "notes",
          `Catalog source manifest notes must preserve '${fragment}' boundary semantics.`,
        ),
      );
    }
  });

  requiredManifestSections.forEach((section) => {
    const sectionManifest = manifest.sections[section];

    if (!sectionManifest) {
      issues.push(
        createManifestIssue(
          "required-section-missing",
          "error",
          `sections.${section}`,
          `Catalog source manifest is missing required ${section} section.`,
        ),
      );
      return;
    }

    if (sectionManifest.section !== section) {
      issues.push(
        createManifestIssue(
          "section-name-mismatch",
          "error",
          `sections.${section}.section`,
          `Catalog source manifest section key '${section}' does not match entry section '${sectionManifest.section}'.`,
        ),
      );
    }

    if (sectionManifest.sourceRole !== "enrichment") {
      issues.push(
        createManifestIssue(
          "source-role-mismatch",
          "error",
          `sections.${section}.sourceRole`,
          `Catalog source manifest ${section} section must remain enrichment-only.`,
        ),
      );
    }

    if (!sectionManifest.coverageTier) {
      issues.push(
        createManifestIssue(
          "coverage-tier-missing",
          "error",
          `sections.${section}.coverageTier`,
          `Catalog source manifest ${section} section must declare a coverage tier.`,
        ),
      );
    } else if (sectionManifest.coverageTier !== expectedCoverageTierBySection[section]) {
      issues.push(
        createManifestIssue(
          "coverage-tier-unexpected",
          "error",
          `sections.${section}.coverageTier`,
          `Catalog source manifest ${section} coverage tier must be '${expectedCoverageTierBySection[section]}'.`,
        ),
      );
    }

    if (sectionManifest.expectedCount !== sectionManifest.resourceIds.length) {
      issues.push(
        createManifestIssue(
          "expected-count-mismatch",
          "error",
          `sections.${section}.expectedCount`,
          `Catalog source manifest ${section} expectedCount must match resourceIds length.`,
        ),
      );
    }

    sectionManifest.resourceIds
      .filter((id, index) => sectionManifest.resourceIds.indexOf(id) !== index)
      .forEach((id) => {
        issues.push(
          createManifestIssue(
            "duplicate-resource-id",
            "error",
            `sections.${section}.resourceIds.${id}`,
            `Catalog source manifest ${section} section contains duplicate resource id '${id}'.`,
          ),
        );
      });
  });

  const resourceCount = requiredManifestSections.reduce(
    (total, section) => total + (manifest.sections[section]?.resourceIds.length ?? 0),
    0,
  );

  return {
    isValid: issues.every((issue) => issue.severity !== "error"),
    issues,
    sectionCount: Object.keys(manifest.sections).length,
    resourceCount,
  };
}

export const approvedCatalogLiveFetchSampleManifestValidation = validateCatalogSourceManifest();
