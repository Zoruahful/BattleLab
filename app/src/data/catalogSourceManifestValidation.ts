import {
  approvedCatalogLiveFetchSampleManifest,
  type CatalogSourceCoverageTier,
  type CatalogSourceExpansionApprovalStatus,
  type CatalogSourceManifest,
  type CatalogSourceManifestSection,
  type CatalogSourceResourceSetMode,
} from "./catalogSourceManifest";

export type CatalogSourceManifestValidationSeverity = "error" | "warning";

export type CatalogSourceManifestValidationCode =
  | "authority-mismatch"
  | "coverage-tier-missing"
  | "coverage-tier-unexpected"
  | "duplicate-resource-id"
  | "expansion-approval-unexpected"
  | "expansion-policy-missing"
  | "expansion-resource-missing"
  | "expansion-resource-set-mode-unexpected"
  | "expansion-target-unexpected"
  | "expected-count-mismatch"
  | "manifest-note-missing"
  | "required-section-missing"
  | "resource-set-mode-unexpected"
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

const expectedExpansionTargetBySection = {
  pokemon: "broad-catalog-foundation",
  moves: "broad-catalog-foundation",
  abilities: "broad-catalog-foundation",
  items: "broad-catalog-foundation",
  types: "complete-type-picker",
  natures: "complete-nature-picker",
} satisfies Record<CatalogSourceManifestSection, CatalogSourceCoverageTier>;

const expectedExpansionModeBySection = {
  pokemon: "curated-resource-ids",
  moves: "curated-resource-ids",
  abilities: "curated-resource-ids",
  items: "curated-resource-ids",
  types: "complete-static-list",
  natures: "complete-static-list",
} satisfies Record<CatalogSourceManifestSection, CatalogSourceResourceSetMode>;

const expectedExpansionApprovalStatus: CatalogSourceExpansionApprovalStatus = "planned-lead-review";

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

    if (sectionManifest.resourceSetMode !== "curated-resource-ids") {
      issues.push(
        createManifestIssue(
          "resource-set-mode-unexpected",
          "error",
          `sections.${section}.resourceSetMode`,
          `Catalog source manifest active ${section} resource set must remain curated resource IDs.`,
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

    if (!sectionManifest.expansionPolicy) {
      issues.push(
        createManifestIssue(
          "expansion-policy-missing",
          "error",
          `sections.${section}.expansionPolicy`,
          `Catalog source manifest ${section} section must declare a planned expansion policy.`,
        ),
      );
    } else {
      if (sectionManifest.expansionPolicy.targetCoverageTier !== expectedExpansionTargetBySection[section]) {
        issues.push(
          createManifestIssue(
            "expansion-target-unexpected",
            "error",
            `sections.${section}.expansionPolicy.targetCoverageTier`,
            `Catalog source manifest ${section} expansion target must be '${expectedExpansionTargetBySection[section]}'.`,
          ),
        );
      }

      if (sectionManifest.expansionPolicy.resourceSetMode !== expectedExpansionModeBySection[section]) {
        issues.push(
          createManifestIssue(
            "expansion-resource-set-mode-unexpected",
            "error",
            `sections.${section}.expansionPolicy.resourceSetMode`,
            `Catalog source manifest ${section} expansion mode must be '${expectedExpansionModeBySection[section]}'.`,
          ),
        );
      }

      if (sectionManifest.expansionPolicy.approvalStatus !== expectedExpansionApprovalStatus) {
        issues.push(
          createManifestIssue(
            "expansion-approval-unexpected",
            "error",
            `sections.${section}.expansionPolicy.approvalStatus`,
            "Catalog source manifest expansion policy must remain planned for Lead review.",
          ),
        );
      }

      if (sectionManifest.expansionPolicy.plannedResourceIds.length < sectionManifest.resourceIds.length) {
        issues.push(
          createManifestIssue(
            "expansion-resource-missing",
            "error",
            `sections.${section}.expansionPolicy.plannedResourceIds`,
            `Catalog source manifest ${section} planned expansion must not be smaller than the active sample set.`,
          ),
        );
      }

      if (
        sectionManifest.expansionPolicy.expectedMinimumCount !== undefined &&
        sectionManifest.expansionPolicy.plannedResourceIds.length < sectionManifest.expansionPolicy.expectedMinimumCount
      ) {
        issues.push(
          createManifestIssue(
            "expansion-resource-missing",
            "error",
            `sections.${section}.expansionPolicy.expectedMinimumCount`,
            `Catalog source manifest ${section} planned expansion must meet expectedMinimumCount.`,
          ),
        );
      }

      sectionManifest.resourceIds.forEach((id) => {
        if (!sectionManifest.expansionPolicy.plannedResourceIds.includes(id)) {
          issues.push(
            createManifestIssue(
              "expansion-resource-missing",
              "error",
              `sections.${section}.expansionPolicy.plannedResourceIds.${id}`,
              `Catalog source manifest ${section} planned expansion must include active sample id '${id}'.`,
            ),
          );
        }
      });

      sectionManifest.expansionPolicy.plannedResourceIds
        .filter((id, index) => sectionManifest.expansionPolicy.plannedResourceIds.indexOf(id) !== index)
        .forEach((id) => {
          issues.push(
            createManifestIssue(
              "duplicate-resource-id",
              "error",
              `sections.${section}.expansionPolicy.plannedResourceIds.${id}`,
              `Catalog source manifest ${section} expansion policy contains duplicate resource id '${id}'.`,
            ),
          );
        });
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
