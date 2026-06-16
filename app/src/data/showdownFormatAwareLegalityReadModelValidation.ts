import type { BuildCatalogReference } from '../types'
import type { ShowdownFormatAwareLegalityReadModel } from './showdownFormatAwareLegalityReadModel'
import {
  createShowdownFormatAwareLegalityReadModel,
  type ShowdownFormatAwarePickerLegalityStatus,
} from './showdownFormatAwareLegalityReadModel'

export type ShowdownFormatAwareLegalityReadModelValidationSeverity = 'error' | 'warning'

export type ShowdownFormatAwareLegalityReadModelValidationCode =
  | 'showdown-legal-move-missing'
  | 'showdown-illegal-move-missing'
  | 'showdown-legal-ability-missing'
  | 'showdown-illegal-ability-missing'
  | 'runtime-unavailable-fallback-invalid'
  | 'catalog-preview-invalid'
  | 'authority-boundary-invalid'
  | 'safety-boundary-invalid'

export interface ShowdownFormatAwareLegalityReadModelValidationIssue {
  code: ShowdownFormatAwareLegalityReadModelValidationCode
  severity: ShowdownFormatAwareLegalityReadModelValidationSeverity
  path: string
  message: string
}

export interface ShowdownFormatAwareLegalityReadModelValidationResult {
  isValid: boolean
  issues: ShowdownFormatAwareLegalityReadModelValidationIssue[]
  checkedCases: string[]
  availableRuntimeStatus: ShowdownFormatAwareLegalityReadModel['runtimeResponseStatus']
  fallbackRuntimeStatus: ShowdownFormatAwareLegalityReadModel['runtimeResponseStatus']
  legalCount: number
  illegalCount: number
  unknownCount: number
  catalogOnlyPreviewCount: number
}

const checkedAt = '2026-06-16T01:00:00.000Z'

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

const knockOff: BuildCatalogReference = {
  catalogKey: 'move-knock-off',
  showdownId: 'knockoff',
  displayName: 'Knock Off',
}

const createIssue = (
  code: ShowdownFormatAwareLegalityReadModelValidationCode,
  severity: ShowdownFormatAwareLegalityReadModelValidationSeverity,
  path: string,
  message: string,
): ShowdownFormatAwareLegalityReadModelValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const findRow = (
  readModel: ShowdownFormatAwareLegalityReadModel,
  showdownId: string,
  status: ShowdownFormatAwarePickerLegalityStatus,
) => readModel.rows.find((row) => row.option.showdownId === showdownId && row.status === status)

const validateCommonBoundary = (
  readModel: ShowdownFormatAwareLegalityReadModel,
  issues: ShowdownFormatAwareLegalityReadModelValidationIssue[],
  path: string,
) => {
  if (
    !readModel.safety.explicitAsyncOnly ||
    !readModel.safety.noImportTimeExecution ||
    !readModel.safety.noAppLoadExecution ||
    !readModel.safety.noPanelOpenExecution ||
    !readModel.safety.noCatalogOnlyFinalLegality ||
    !readModel.safety.noSimulationExecution ||
    !readModel.safety.noFileIo
  ) {
    issues.push(
      createIssue(
        'safety-boundary-invalid',
        'error',
        `${path}.safety`,
        'Format-aware legality read-model must remain explicit-call only, no import/app/panel execution, no catalog-only final legality, no file IO, and no simulation.',
      ),
    )
  }

  if (
    readModel.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    readModel.safety.catalogRole !== 'enrichment-only' ||
    !readModel.boundaryNotes.some((note) => note.includes('Pokemon Showdown adapter evidence')) ||
    !readModel.boundaryNotes.some((note) => note.includes('cannot decide legality'))
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.boundaryNotes`,
        'Read-model must preserve Pokemon Showdown authority and catalog/PokeAPI enrichment-only boundaries.',
      ),
    )
  }

  readModel.rows.forEach((row, index) => {
    if (
      (row.status === 'legal-in-selected-format' || row.status === 'illegal-in-selected-format') &&
      row.source !== 'pokemon-showdown'
    ) {
      issues.push(
        createIssue(
          'authority-boundary-invalid',
          'error',
          `${path}.rows.${index}`,
          'Legal and illegal picker statuses must only come from Pokemon Showdown-sourced evidence.',
        ),
      )
    }
  })
}

export async function validateShowdownFormatAwareLegalityReadModel(): Promise<ShowdownFormatAwareLegalityReadModelValidationResult> {
  const issues: ShowdownFormatAwareLegalityReadModelValidationIssue[] = []
  const available = await createShowdownFormatAwareLegalityReadModel({
    requestId: 'showdown-format-aware-legality-validation',
    requestedAt: checkedAt,
    format: 'vgc-regulation-g',
    species: tyranitar,
    candidateMoves: [{ option: rockSlide }, { option: spore }, { option: knockOff, previewOnly: true }],
    candidateAbilities: [{ option: sandStream }, { option: stench }],
  }, { runtimeLoader: 'browser-data' })
  const fallback = await createShowdownFormatAwareLegalityReadModel({
    requestId: 'showdown-format-aware-legality-validation-fallback',
    requestedAt: checkedAt,
    format: 'custom',
    species: tyranitar,
    candidateMoves: [{ option: rockSlide }],
    candidateAbilities: [{ option: sandStream }],
  })

  validateCommonBoundary(available, issues, 'available')
  validateCommonBoundary(fallback, issues, 'fallback')

  if (!findRow(available, 'rockslide', 'legal-in-selected-format')) {
    issues.push(
      createIssue(
        'showdown-legal-move-missing',
        'error',
        'available.rows.rockslide',
        'Tyranitar + Rock Slide must return Showdown-sourced legal status when runtime and format are available.',
      ),
    )
  }

  if (!findRow(available, 'spore', 'illegal-in-selected-format')) {
    issues.push(
      createIssue(
        'showdown-illegal-move-missing',
        'error',
        'available.rows.spore',
        'Tyranitar + Spore must return Showdown-sourced illegal status when runtime and format are available.',
      ),
    )
  }

  if (!findRow(available, 'sandstream', 'legal-in-selected-format')) {
    issues.push(
      createIssue(
        'showdown-legal-ability-missing',
        'error',
        'available.rows.sandstream',
        'Tyranitar + Sand Stream must return Showdown-sourced legal status when runtime and format are available.',
      ),
    )
  }

  if (!findRow(available, 'stench', 'illegal-in-selected-format')) {
    issues.push(
      createIssue(
        'showdown-illegal-ability-missing',
        'error',
        'available.rows.stench',
        'Tyranitar + Stench must return Showdown-sourced illegal status when runtime and format are available.',
      ),
    )
  }

  if (!findRow(available, 'knockoff', 'catalog-only-preview')) {
    issues.push(
      createIssue(
        'catalog-preview-invalid',
        'error',
        'available.rows.knockoff',
        'Catalog-only preview rows must stay visible without legal or illegal status.',
      ),
    )
  }

  if (
    fallback.runtimeResponseStatus !== 'runtime-unavailable' ||
    !fallback.runtimeUnavailable ||
    fallback.rows.some((row) => row.status === 'legal-in-selected-format' || row.status === 'illegal-in-selected-format')
  ) {
    issues.push(
      createIssue(
        'runtime-unavailable-fallback-invalid',
        'error',
        'fallback',
        'Unsupported/custom formats must preserve runtime-unavailable fallback and avoid legal/illegal labels.',
      ),
    )
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    checkedCases: [
      'Tyranitar + Rock Slide legal in selected format',
      'Tyranitar + Spore illegal in selected format',
      'Tyranitar + Sand Stream legal in selected format',
      'Tyranitar + Stench illegal in selected format',
      'runtime unavailable fallback',
      'catalog-only preview row',
    ],
    availableRuntimeStatus: available.runtimeResponseStatus,
    fallbackRuntimeStatus: fallback.runtimeResponseStatus,
    legalCount: available.legalCount,
    illegalCount: available.illegalCount,
    unknownCount: fallback.unknownCount,
    catalogOnlyPreviewCount: available.catalogOnlyPreviewCount,
  }
}
