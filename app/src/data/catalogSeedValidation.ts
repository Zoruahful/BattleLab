import type {
  CatalogAssetReference,
  CatalogKey,
  CatalogRecordBase,
  CatalogSearchIndexEntry,
  ShowdownId,
} from '../types/catalog'
import {
  localCatalogSeed,
  localCatalogSeedAbilities,
  localCatalogSeedAssets,
  localCatalogSeedItems,
  localCatalogSeedMoves,
  localCatalogSeedNatures,
  localCatalogSeedPokemon,
  localCatalogSeedSearchIndex,
  localCatalogSeedTypes,
} from './catalogSeed'

export type CatalogSeedValidationSeverity = 'error' | 'warning'

export type CatalogSeedValidationCode =
  | 'duplicate-asset-key'
  | 'duplicate-catalog-key'
  | 'duplicate-showdown-id'
  | 'invalid-asset-reference'
  | 'invalid-search-reference'
  | 'invalid-source-reference'
  | 'license-review-required'
  | 'minimum-coverage-missing'
  | 'record-count-mismatch'

export interface CatalogSeedValidationIssue {
  code: CatalogSeedValidationCode
  severity: CatalogSeedValidationSeverity
  message: string
  path: string
}

export interface CatalogSeedValidationResult {
  isValid: boolean
  issues: CatalogSeedValidationIssue[]
}

type CatalogRecordWithSources = CatalogRecordBase & {
  kind: string
}

const minimumCoverage = {
  pokemon: 1,
  moves: 1,
  abilities: 1,
  items: 1,
  types: 18,
  natures: 1,
  assets: 1,
  searchIndexEntries: 1,
} as const

const catalogRecords: CatalogRecordWithSources[] = [
  ...localCatalogSeedPokemon,
  ...localCatalogSeedMoves,
  ...localCatalogSeedAbilities,
  ...localCatalogSeedItems,
  ...localCatalogSeedTypes,
  ...localCatalogSeedNatures,
]

const addIssue = (
  issues: CatalogSeedValidationIssue[],
  issue: CatalogSeedValidationIssue,
) => {
  issues.push(issue)
}

const collectDuplicates = <TValue extends string>(
  values: Array<{ value?: TValue; path: string }>,
) => {
  const seen = new Map<TValue, string[]>()

  values.forEach(({ value, path }) => {
    if (!value) return
    seen.set(value, [...(seen.get(value) ?? []), path])
  })

  return [...seen.entries()].filter(([, paths]) => paths.length > 1)
}

const validateRecordCount = (
  issues: CatalogSeedValidationIssue[],
  name: keyof typeof minimumCoverage,
  expected: number | undefined,
  actual: number,
) => {
  if (expected !== actual) {
    addIssue(issues, {
      code: 'record-count-mismatch',
      severity: 'error',
      path: `manifest.recordCounts.${name}`,
      message: `Expected ${expected ?? 'missing'} ${name} records, found ${actual}.`,
    })
  }
}

const validateMinimumCoverage = (
  issues: CatalogSeedValidationIssue[],
  name: keyof typeof minimumCoverage,
  actual: number,
) => {
  const minimum = minimumCoverage[name]

  if (actual < minimum) {
    addIssue(issues, {
      code: 'minimum-coverage-missing',
      severity: 'error',
      path: name,
      message: `Expected at least ${minimum} ${name} records, found ${actual}.`,
    })
  }
}

const validateSourceIds = (
  issues: CatalogSeedValidationIssue[],
  sourceIds: string[],
  path: string,
  knownSourceIds: Set<string>,
) => {
  sourceIds.forEach((sourceId) => {
    if (!knownSourceIds.has(sourceId)) {
      addIssue(issues, {
        code: 'invalid-source-reference',
        severity: 'error',
        path,
        message: `Unknown catalog source id "${sourceId}".`,
      })
    }
  })
}

const validateAssetReference = (
  issues: CatalogSeedValidationIssue[],
  asset: CatalogAssetReference | undefined,
  path: string,
  knownAssetKeys: Set<CatalogKey>,
) => {
  if (!asset) return

  const refs = [
    { key: asset.iconKey, label: 'iconKey' },
    { key: asset.spriteKey, label: 'spriteKey' },
    { key: asset.animatedSpriteKey, label: 'animatedSpriteKey' },
    { key: asset.artworkKey, label: 'artworkKey' },
  ]

  refs.forEach(({ key, label }) => {
    if (key && !knownAssetKeys.has(key)) {
      addIssue(issues, {
        code: 'invalid-asset-reference',
        severity: 'error',
        path: `${path}.${label}`,
        message: `Unknown asset key "${key}".`,
      })
    }
  })
}

const getRecordKeyByKind = (entry: CatalogSearchIndexEntry) => `${entry.kind}:${entry.catalogKey}`

export function validateLocalCatalogSeedIntegrity(): CatalogSeedValidationResult {
  const issues: CatalogSeedValidationIssue[] = []
  const recordCounts = localCatalogSeed.manifest.recordCounts
  const knownSourceIds = new Set(localCatalogSeed.manifest.sources.map((source) => source.sourceId))
  const knownAssetKeys = new Set(localCatalogSeedAssets.map((asset) => asset.assetKey))
  const knownRecordKeys = new Set(
    catalogRecords.map((record) => `${record.kind}:${record.catalogKey}`),
  )

  validateRecordCount(issues, 'pokemon', recordCounts.pokemon, localCatalogSeedPokemon.length)
  validateRecordCount(issues, 'moves', recordCounts.moves, localCatalogSeedMoves.length)
  validateRecordCount(issues, 'abilities', recordCounts.abilities, localCatalogSeedAbilities.length)
  validateRecordCount(issues, 'items', recordCounts.items, localCatalogSeedItems.length)
  validateRecordCount(issues, 'types', recordCounts.types, localCatalogSeedTypes.length)
  validateRecordCount(issues, 'natures', recordCounts.natures, localCatalogSeedNatures.length)
  validateRecordCount(issues, 'assets', recordCounts.assets, localCatalogSeedAssets.length)
  validateRecordCount(
    issues,
    'searchIndexEntries',
    recordCounts.searchIndexEntries,
    localCatalogSeedSearchIndex.length,
  )

  validateMinimumCoverage(issues, 'pokemon', localCatalogSeedPokemon.length)
  validateMinimumCoverage(issues, 'moves', localCatalogSeedMoves.length)
  validateMinimumCoverage(issues, 'abilities', localCatalogSeedAbilities.length)
  validateMinimumCoverage(issues, 'items', localCatalogSeedItems.length)
  validateMinimumCoverage(issues, 'types', localCatalogSeedTypes.length)
  validateMinimumCoverage(issues, 'natures', localCatalogSeedNatures.length)
  validateMinimumCoverage(issues, 'assets', localCatalogSeedAssets.length)
  validateMinimumCoverage(issues, 'searchIndexEntries', localCatalogSeedSearchIndex.length)

  collectDuplicates(
    catalogRecords.map((record) => ({
      value: record.catalogKey,
      path: `${record.kind}.${record.catalogKey}`,
    })),
  ).forEach(([catalogKey, paths]) => {
    addIssue(issues, {
      code: 'duplicate-catalog-key',
      severity: 'error',
      path: paths.join(', '),
      message: `Duplicate catalogKey "${catalogKey}".`,
    })
  })

  collectDuplicates(
    catalogRecords.map((record) => ({
      value: record.showdownId as ShowdownId | undefined,
      path: `${record.kind}.${record.catalogKey}`,
    })),
  ).forEach(([showdownId, paths]) => {
    addIssue(issues, {
      code: 'duplicate-showdown-id',
      severity: 'warning',
      path: paths.join(', '),
      message: `Duplicate showdownId "${showdownId}". Confirm this is intentional before full catalog sync.`,
    })
  })

  collectDuplicates(
    localCatalogSeedAssets.map((asset) => ({
      value: asset.assetKey,
      path: `assets.${asset.assetKey}`,
    })),
  ).forEach(([assetKey, paths]) => {
    addIssue(issues, {
      code: 'duplicate-asset-key',
      severity: 'error',
      path: paths.join(', '),
      message: `Duplicate assetKey "${assetKey}".`,
    })
  })

  catalogRecords.forEach((record) => {
    validateSourceIds(issues, record.sourceIds, `${record.kind}.${record.catalogKey}.sourceIds`, knownSourceIds)
  })

  localCatalogSeedAssets.forEach((asset) => {
    validateSourceIds(issues, [asset.sourceId], `assets.${asset.assetKey}.sourceId`, knownSourceIds)

    if (asset.candidateSourceUrl && asset.licenseReviewStatus !== 'needsReview') {
      addIssue(issues, {
        code: 'license-review-required',
        severity: 'warning',
        path: `assets.${asset.assetKey}.licenseReviewStatus`,
        message: `Candidate asset source "${asset.assetKey}" should remain license-review gated.`,
      })
    }
  })

  localCatalogSeedPokemon.forEach((pokemon) => {
    validateAssetReference(
      issues,
      {
        iconKey: pokemon.iconKey,
        spriteKey: pokemon.spriteKey,
        animatedSpriteKey: pokemon.animatedSpriteKey,
        artworkKey: pokemon.artworkKey,
      },
      `pokemon.${pokemon.catalogKey}`,
      knownAssetKeys,
    )

    pokemon.forms.forEach((form) => {
      validateAssetReference(
        issues,
        {
          iconKey: form.iconKey,
          spriteKey: form.spriteKey,
          animatedSpriteKey: form.animatedSpriteKey,
          artworkKey: form.artworkKey,
        },
        `pokemon.${pokemon.catalogKey}.forms.${form.catalogKey}`,
        knownAssetKeys,
      )
    })
  })

  localCatalogSeedSearchIndex.forEach((entry) => {
    const recordKey = getRecordKeyByKind(entry)

    if (!knownRecordKeys.has(recordKey)) {
      addIssue(issues, {
        code: 'invalid-search-reference',
        severity: 'error',
        path: `searchIndex.${entry.catalogKey}`,
        message: `Search index entry does not resolve to a ${entry.kind} catalog record.`,
      })
    }

    validateAssetReference(issues, entry.asset, `searchIndex.${entry.catalogKey}.asset`, knownAssetKeys)
  })

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
  }
}
