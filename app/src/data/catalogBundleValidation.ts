import type {
  BattleLabCatalogBundle,
  BattleLabCatalogBundleSectionName,
  BattleLabCatalogBundleValidationIssue,
  BattleLabCatalogBundleValidationResult,
} from '../types/catalogBundle'
import { sampleBattleLabCatalogBundle } from './catalogBundleFixture'
import { validateLocalCatalogSeedIntegrity } from './catalogSeedValidation'

export type CatalogBundleFixtureValidationCode =
  | 'bundle-not-read-only'
  | 'invalid-bundle-hash'
  | 'invalid-bundle-extension'
  | 'invalid-bundle-format'
  | 'invalid-section-hash'
  | 'invalid-signature-placeholder'
  | 'record-count-mismatch'
  | 'seed-integrity-invalid'
  | 'user-data-boundary-violation'

const requiredSectionNames: BattleLabCatalogBundleSectionName[] = [
  'pokemon',
  'moves',
  'abilities',
  'items',
  'types',
  'natures',
  'assets',
  'searchIndex',
]

const expectedCatalogOnlyTopLevelKeys = new Set(['fileExtension', 'readOnly', 'manifest', 'sections'])
const expectedSectionKeys = new Set(requiredSectionNames)
const canonicalization = 'battlelab-json-stable-v1'

const addIssue = (
  issues: BattleLabCatalogBundleValidationIssue[],
  issue: BattleLabCatalogBundleValidationIssue,
) => {
  issues.push(issue)
}

const validateCount = (
  issues: BattleLabCatalogBundleValidationIssue[],
  field: keyof BattleLabCatalogBundle['manifest']['recordCounts'],
  expected: number,
  actual: number,
  section?: BattleLabCatalogBundleSectionName,
) => {
  if (expected !== actual) {
    addIssue(issues, {
      code: 'record-count-mismatch' satisfies CatalogBundleFixtureValidationCode,
      severity: 'error',
      path: `manifest.recordCounts.${field}`,
      section,
      message: `Expected ${expected} ${field} records, found ${actual}.`,
    })
  }
}

const validateSha256HashMetadata = (
  issues: BattleLabCatalogBundleValidationIssue[],
  hash: BattleLabCatalogBundle['manifest']['bundleHash'] | undefined,
  path: string,
  code: CatalogBundleFixtureValidationCode,
  section?: BattleLabCatalogBundleSectionName,
) => {
  if (
    !hash ||
    hash.algorithm !== 'sha256' ||
    hash.canonicalization !== canonicalization ||
    !/^[a-f0-9]{64}$/.test(hash.value)
  ) {
    addIssue(issues, {
      code,
      severity: 'error',
      path,
      section,
      message: 'Sample .bl bundle fixture must use deterministic sha256 hashes with battlelab-json-stable-v1 canonicalization.',
    })
  }
}

const validateCatalogOnlyBoundary = (
  issues: BattleLabCatalogBundleValidationIssue[],
  bundle: BattleLabCatalogBundle,
) => {
  Object.keys(bundle).forEach((key) => {
    if (!expectedCatalogOnlyTopLevelKeys.has(key)) {
      addIssue(issues, {
        code: 'user-data-boundary-violation' satisfies CatalogBundleFixtureValidationCode,
        severity: 'error',
        path: key,
        message: 'Sample .bl bundle must remain catalog-only and cannot include user data or runtime output.',
      })
    }
  })

  Object.keys(bundle.sections).forEach((key) => {
    if (!expectedSectionKeys.has(key as BattleLabCatalogBundleSectionName)) {
      addIssue(issues, {
        code: 'user-data-boundary-violation' satisfies CatalogBundleFixtureValidationCode,
        severity: 'error',
        path: `sections.${key}`,
        message: 'Sample .bl bundle sections must contain catalog data only.',
      })
    }
  })
}

export function validateBattleLabCatalogBundleFixture(
  bundle: BattleLabCatalogBundle = sampleBattleLabCatalogBundle,
): BattleLabCatalogBundleValidationResult {
  const issues: BattleLabCatalogBundleValidationIssue[] = []
  const { manifest, sections } = bundle

  if (bundle.fileExtension !== '.bl' || manifest.fileExtension !== '.bl') {
    addIssue(issues, {
      code: 'invalid-bundle-extension' satisfies CatalogBundleFixtureValidationCode,
      severity: 'error',
      path: 'fileExtension',
      message: 'Sample catalog bundle must use the .bl extension.',
    })
  }

  if (bundle.readOnly !== true) {
    addIssue(issues, {
      code: 'bundle-not-read-only' satisfies CatalogBundleFixtureValidationCode,
      severity: 'error',
      path: 'readOnly',
      message: 'Sample catalog bundle must be read-only.',
    })
  }

  if (manifest.bundleFormat !== 'battlelab-catalog') {
    addIssue(issues, {
      code: 'invalid-bundle-format' satisfies CatalogBundleFixtureValidationCode,
      severity: 'error',
      path: 'manifest.bundleFormat',
      message: 'Sample catalog bundle must use the battlelab-catalog bundle format.',
    })
  }

  validateCount(issues, 'pokemon', manifest.recordCounts.pokemon, sections.pokemon.length, 'pokemon')
  validateCount(issues, 'moves', manifest.recordCounts.moves, sections.moves.length, 'moves')
  validateCount(issues, 'abilities', manifest.recordCounts.abilities, sections.abilities.length, 'abilities')
  validateCount(issues, 'items', manifest.recordCounts.items, sections.items.length, 'items')
  validateCount(issues, 'types', manifest.recordCounts.types, sections.types.length, 'types')
  validateCount(issues, 'natures', manifest.recordCounts.natures, sections.natures.length, 'natures')
  validateCount(issues, 'assets', manifest.recordCounts.assets, sections.assets.length, 'assets')
  validateCount(
    issues,
    'searchIndexEntries',
    manifest.recordCounts.searchIndexEntries,
    sections.searchIndex.length,
    'searchIndex',
  )

  requiredSectionNames.forEach((sectionName) => {
    validateSha256HashMetadata(
      issues,
      manifest.sectionHashes[sectionName],
      `manifest.sectionHashes.${sectionName}`,
      'invalid-section-hash',
      sectionName,
    )
  })

  validateSha256HashMetadata(
    issues,
    manifest.bundleHash,
    'manifest.bundleHash',
    'invalid-bundle-hash',
  )

  if (manifest.signature.status !== 'unsigned') {
    addIssue(issues, {
      code: 'invalid-signature-placeholder' satisfies CatalogBundleFixtureValidationCode,
      severity: 'error',
      path: 'manifest.signature.status',
      message: 'Sample .bl bundle fixture must remain unsigned until signature policy is approved.',
    })
  }

  validateCatalogOnlyBoundary(issues, bundle)

  const seedResult = validateLocalCatalogSeedIntegrity()
  if (!seedResult.isValid) {
    seedResult.issues.forEach((issue) => {
      addIssue(issues, {
        code: 'seed-integrity-invalid' satisfies CatalogBundleFixtureValidationCode,
        severity: issue.severity,
        path: `seed.${issue.path}`,
        message: issue.message,
      })
    })
  }

  const isValid = issues.every((issue) => issue.severity !== 'error')

  return {
    status: isValid ? 'loaded' : 'invalid',
    isValid,
    issues,
  }
}
