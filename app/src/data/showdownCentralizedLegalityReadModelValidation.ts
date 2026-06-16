import type { BuildCatalogReference } from '../types'
import type { ShowdownCentralizedLegalityReadModel } from './showdownCentralizedLegalityReadModel'
import { createShowdownCentralizedLegalityReadModel } from './showdownCentralizedLegalityReadModel'

export type ShowdownCentralizedLegalityReadModelValidationSeverity = 'error' | 'warning'

export type ShowdownCentralizedLegalityReadModelValidationCode =
  | 'settings-format-not-used'
  | 'showdown-legal-move-missing'
  | 'showdown-illegal-move-missing'
  | 'showdown-legal-ability-missing'
  | 'showdown-illegal-ability-missing'
  | 'unsupported-format-fallback-invalid'
  | 'runtime-unavailable-fallback-invalid'
  | 'catalog-preview-invalid'
  | 'authority-boundary-invalid'
  | 'safety-boundary-invalid'

export interface ShowdownCentralizedLegalityReadModelValidationIssue {
  code: ShowdownCentralizedLegalityReadModelValidationCode
  severity: ShowdownCentralizedLegalityReadModelValidationSeverity
  path: string
  message: string
}

export interface ShowdownCentralizedLegalityReadModelValidationResult {
  isValid: boolean
  issues: ShowdownCentralizedLegalityReadModelValidationIssue[]
  checkedCases: string[]
  selectedFormat: ShowdownCentralizedLegalityReadModel['selectedFormat']
  targetShowdownFormatId: string
  formatHandoffStatus: ShowdownCentralizedLegalityReadModel['formatHandoffStatus']
  legalCount: number
  illegalCount: number
  unknownCount: number
  catalogOnlyPreviewCount: number
}

const checkedAt = '2026-06-16T02:00:00.000Z'

const tyranitar: BuildCatalogReference = {
  catalogKey: 'pokemon-tyranitar',
  showdownId: 'tyranitar',
  displayName: 'Tyranitar',
}

const rockSlide: BuildCatalogReference = {
  catalogKey: 'move-rock-slide',
  showdownId: 'rockslide',
  displayName: 'Rock Slide',
}

const spore: BuildCatalogReference = {
  catalogKey: 'move-spore',
  showdownId: 'spore',
  displayName: 'Spore',
}

const knockOff: BuildCatalogReference = {
  catalogKey: 'move-knock-off',
  showdownId: 'knockoff',
  displayName: 'Knock Off',
}

const sandStream: BuildCatalogReference = {
  catalogKey: 'ability-sand-stream',
  showdownId: 'sandstream',
  displayName: 'Sand Stream',
}

const stench: BuildCatalogReference = {
  catalogKey: 'ability-stench',
  showdownId: 'stench',
  displayName: 'Stench',
}

const createIssue = (
  code: ShowdownCentralizedLegalityReadModelValidationCode,
  severity: ShowdownCentralizedLegalityReadModelValidationSeverity,
  path: string,
  message: string,
): ShowdownCentralizedLegalityReadModelValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateBoundary = (
  readModel: ShowdownCentralizedLegalityReadModel,
  issues: ShowdownCentralizedLegalityReadModelValidationIssue[],
  path: string,
) => {
  if (
    !readModel.safety.explicitAsyncOnly ||
    !readModel.safety.noImportTimeExecution ||
    !readModel.safety.noAppLoadExecution ||
    !readModel.safety.noPanelOpenExecution ||
    !readModel.safety.noPokemonEditorFormatOverride ||
    !readModel.safety.noPokemonEditorCheckButtonRequired ||
    !readModel.safety.noCatalogOnlyFinalLegality ||
    !readModel.safety.noSimulationExecution ||
    !readModel.safety.noFileIo
  ) {
    issues.push(
      createIssue(
        'safety-boundary-invalid',
        'error',
        `${path}.safety`,
        'Centralized legality must remain explicit-call only, no editor-owned controls, no catalog-only final legality, no file IO, and no simulation.',
      ),
    )
  }

  if (
    readModel.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    readModel.safety.catalogRole !== 'enrichment-only'
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.safety`,
        'Pokemon Showdown must remain authoritative and PokeAPI/catalog data must remain enrichment-only.',
      ),
    )
  }

  readModel.formatAwareReadModel.rows.forEach((row, index) => {
    if (
      (row.status === 'legal-in-selected-format' || row.status === 'illegal-in-selected-format') &&
      row.source !== 'pokemon-showdown'
    ) {
      issues.push(
        createIssue(
          'authority-boundary-invalid',
          'error',
          `${path}.rows.${index}`,
          'Legal and illegal statuses must only come from Pokemon Showdown-sourced evidence.',
        ),
      )
    }
  })
}

const hasRow = (
  readModel: ShowdownCentralizedLegalityReadModel,
  showdownId: string,
  status: ShowdownCentralizedLegalityReadModel['formatAwareReadModel']['rows'][number]['status'],
) => readModel.formatAwareReadModel.rows.some((row) => row.option.showdownId === showdownId && row.status === status)

export async function validateShowdownCentralizedLegalityReadModel(): Promise<ShowdownCentralizedLegalityReadModelValidationResult> {
  const issues: ShowdownCentralizedLegalityReadModelValidationIssue[] = []
  const available = await createShowdownCentralizedLegalityReadModel(
    {
      requestId: 'showdown-centralized-legality-validation',
      requestedAt: checkedAt,
      selectedFormat: 'vgc-regulation-g',
      formatSource: 'settings',
      species: tyranitar,
      candidateMoves: [{ option: rockSlide }, { option: spore }, { option: knockOff, previewOnly: true }],
      candidateAbilities: [{ option: sandStream }, { option: stench }],
    },
    { checkedAt, runtimeLoader: 'browser-data' },
  )
  const unsupported = await createShowdownCentralizedLegalityReadModel(
    {
      requestId: 'showdown-centralized-legality-validation-custom',
      requestedAt: checkedAt,
      selectedFormat: 'custom',
      formatSource: 'team-builder',
      species: tyranitar,
      candidateMoves: [{ option: rockSlide }],
      candidateAbilities: [{ option: sandStream }],
    },
    { checkedAt },
  )

  validateBoundary(available, issues, 'available')
  validateBoundary(unsupported, issues, 'unsupported')

  if (
    available.selectedFormat !== 'vgc-regulation-g' ||
    available.formatSource !== 'settings' ||
    available.targetShowdownFormatId !== 'gen9vgc2025regg'
  ) {
    issues.push(
      createIssue(
        'settings-format-not-used',
        'error',
        'available.format',
        'Centralized legality must use the selected app/team format and mapped Pokemon Showdown format ID.',
      ),
    )
  }

  if (!hasRow(available, 'rockslide', 'legal-in-selected-format')) {
    issues.push(
      createIssue(
        'showdown-legal-move-missing',
        'error',
        'available.rows.rockslide',
        'Tyranitar + Rock Slide must return Showdown-sourced legal status.',
      ),
    )
  }

  if (!hasRow(available, 'spore', 'illegal-in-selected-format')) {
    issues.push(
      createIssue(
        'showdown-illegal-move-missing',
        'error',
        'available.rows.spore',
        'Tyranitar + Spore must return Showdown-sourced illegal status.',
      ),
    )
  }

  if (!hasRow(available, 'sandstream', 'legal-in-selected-format')) {
    issues.push(
      createIssue(
        'showdown-legal-ability-missing',
        'error',
        'available.rows.sandstream',
        'Tyranitar + Sand Stream must return Showdown-sourced legal status.',
      ),
    )
  }

  if (!hasRow(available, 'stench', 'illegal-in-selected-format')) {
    issues.push(
      createIssue(
        'showdown-illegal-ability-missing',
        'error',
        'available.rows.stench',
        'Tyranitar + Stench must return Showdown-sourced illegal status.',
      ),
    )
  }

  if (!hasRow(available, 'knockoff', 'catalog-only-preview')) {
    issues.push(
      createIssue(
        'catalog-preview-invalid',
        'error',
        'available.rows.knockoff',
        'Catalog-only preview candidates must remain visible without legal or illegal status.',
      ),
    )
  }

  if (
    unsupported.selectedFormat !== 'custom' ||
    unsupported.status !== 'runtime-unavailable' ||
    unsupported.formatHandoffStatus !== 'custom-overlay-required' ||
    unsupported.formatAwareReadModel.rows.some(
      (row) => row.status === 'legal-in-selected-format' || row.status === 'illegal-in-selected-format',
    )
  ) {
    issues.push(
      createIssue(
        'unsupported-format-fallback-invalid',
        'error',
        'unsupported',
        'Custom/unsupported formats must preserve runtime-unavailable fallback and avoid Showdown legal/illegal labels until executable.',
      ),
    )
  }

  if (!unsupported.formatAwareReadModel.runtimeUnavailable) {
    issues.push(
      createIssue(
        'runtime-unavailable-fallback-invalid',
        'error',
        'unsupported.formatAwareReadModel.runtimeUnavailable',
        'Custom overlay formats must expose runtime-unavailable status until the overlay is executable.',
      ),
    )
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    checkedCases: [
      'Settings-selected VGC Regulation G maps to Pokemon Showdown format',
      'Tyranitar + Rock Slide legal from Pokemon Showdown',
      'Tyranitar + Spore illegal from Pokemon Showdown',
      'Tyranitar + Sand Stream legal from Pokemon Showdown',
      'Tyranitar + Stench illegal from Pokemon Showdown',
      'catalog-only preview remains non-authoritative',
      'custom format fallback remains unavailable/unsupported',
    ],
    selectedFormat: available.selectedFormat,
    targetShowdownFormatId: available.targetShowdownFormatId,
    formatHandoffStatus: available.formatHandoffStatus,
    legalCount: available.legalCount,
    illegalCount: available.illegalCount,
    unknownCount: unsupported.unknownCount,
    catalogOnlyPreviewCount: available.catalogOnlyPreviewCount,
  }
}
