import type { BuildCatalogReference } from '../types'
import type { ShowdownPokemonEditorCentralizedLegalityProps } from './showdownPokemonEditorCentralizedLegalityProps'
import { createShowdownPokemonEditorCentralizedLegalityProps } from './showdownPokemonEditorCentralizedLegalityProps'

export type ShowdownPokemonEditorCentralizedLegalityPropsValidationSeverity = 'error' | 'warning'

export type ShowdownPokemonEditorCentralizedLegalityPropsValidationCode =
  | 'format-source-invalid'
  | 'row-section-missing'
  | 'showdown-status-missing'
  | 'runtime-fallback-invalid'
  | 'catalog-preview-invalid'
  | 'authority-boundary-invalid'
  | 'safety-boundary-invalid'

export interface ShowdownPokemonEditorCentralizedLegalityPropsValidationIssue {
  code: ShowdownPokemonEditorCentralizedLegalityPropsValidationCode
  severity: ShowdownPokemonEditorCentralizedLegalityPropsValidationSeverity
  path: string
  message: string
}

export interface ShowdownPokemonEditorCentralizedLegalityPropsValidationResult {
  isValid: boolean
  issues: ShowdownPokemonEditorCentralizedLegalityPropsValidationIssue[]
  checkedCases: string[]
  availableStatus: ShowdownPokemonEditorCentralizedLegalityProps['status']
  fallbackStatus: ShowdownPokemonEditorCentralizedLegalityProps['status']
  targetShowdownFormatId: string
  legalCount: number
  illegalCount: number
  unknownCount: number
  catalogOnlyPreviewCount: number
  moveRows: number
  abilityRows: number
}

const checkedAt = '2026-06-16T02:30:00.000Z'

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
  code: ShowdownPokemonEditorCentralizedLegalityPropsValidationCode,
  severity: ShowdownPokemonEditorCentralizedLegalityPropsValidationSeverity,
  path: string,
  message: string,
): ShowdownPokemonEditorCentralizedLegalityPropsValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateSafety = (
  props: ShowdownPokemonEditorCentralizedLegalityProps,
  issues: ShowdownPokemonEditorCentralizedLegalityPropsValidationIssue[],
  path: string,
) => {
  if (
    !props.safety.explicitAsyncOnly ||
    !props.safety.noImportTimeExecution ||
    !props.safety.noAppLoadExecution ||
    !props.safety.noPanelOpenExecution ||
    !props.safety.noPokemonEditorFormatOverride ||
    !props.safety.noPokemonEditorCheckButton ||
    !props.safety.noCatalogOnlyFinalLegality ||
    !props.safety.noSimulationExecution ||
    !props.safety.noFileIo
  ) {
    issues.push(
      createIssue(
        'safety-boundary-invalid',
        'error',
        `${path}.safety`,
        'Pokemon Editor centralized legality props must stay explicit-call only, no editor controls, no file IO, and no simulation.',
      ),
    )
  }

  if (
    props.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    props.safety.catalogRole !== 'enrichment-only' ||
    !props.boundaryNotes.some((note) => note.includes('do not choose or override format')) ||
    !props.boundaryNotes.some((note) => note.includes('Pokemon Showdown-sourced evidence'))
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.boundaryNotes`,
        'Props must preserve Showdown authority, PokeAPI enrichment-only boundaries, and no Pokemon Editor format override.',
      ),
    )
  }
}

const findRow = (
  props: ShowdownPokemonEditorCentralizedLegalityProps,
  showdownId: string,
  status: ShowdownPokemonEditorCentralizedLegalityProps['rows'][number]['status'],
) => props.rows.find((row) => row.showdownId === showdownId && row.status === status)

export async function validateShowdownPokemonEditorCentralizedLegalityProps(): Promise<ShowdownPokemonEditorCentralizedLegalityPropsValidationResult> {
  const issues: ShowdownPokemonEditorCentralizedLegalityPropsValidationIssue[] = []
  const available = await createShowdownPokemonEditorCentralizedLegalityProps(
    {
      requestId: 'showdown-pokemon-editor-centralized-legality-props-validation',
      requestedAt: checkedAt,
      selectedFormat: 'vgc-regulation-g',
      formatSource: 'team-builder',
      species: tyranitar,
      candidateMoves: [{ option: rockSlide }, { option: spore }, { option: knockOff, previewOnly: true }],
      candidateAbilities: [{ option: sandStream }, { option: stench }],
    },
    { checkedAt, runtimeLoader: 'browser-data' },
  )
  const fallback = await createShowdownPokemonEditorCentralizedLegalityProps(
    {
      requestId: 'showdown-pokemon-editor-centralized-legality-props-validation-custom',
      requestedAt: checkedAt,
      selectedFormat: 'custom',
      formatSource: 'settings',
      species: tyranitar,
      candidateMoves: [{ option: rockSlide }],
      candidateAbilities: [{ option: sandStream }],
    },
    { checkedAt },
  )

  validateSafety(available, issues, 'available')
  validateSafety(fallback, issues, 'fallback')

  if (
    available.format.selectedFormat !== 'vgc-regulation-g' ||
    available.format.formatSource !== 'team-builder' ||
    available.format.targetShowdownFormatId !== 'gen9vgc2025regg'
  ) {
    issues.push(
      createIssue(
        'format-source-invalid',
        'error',
        'available.format',
        'Props must preserve selected app/team format source and mapped Pokemon Showdown format ID.',
      ),
    )
  }

  if (!available.moveRows.length || !available.abilityRows.length) {
    issues.push(
      createIssue(
        'row-section-missing',
        'error',
        'available.rows',
        'Props must expose separate move and ability legality rows for future Pokemon Editor consumption.',
      ),
    )
  }

  ;[
    ['rockslide', 'legal-in-selected-format', 'Tyranitar + Rock Slide legal'] as const,
    ['spore', 'illegal-in-selected-format', 'Tyranitar + Spore illegal'] as const,
    ['sandstream', 'legal-in-selected-format', 'Tyranitar + Sand Stream legal'] as const,
    ['stench', 'illegal-in-selected-format', 'Tyranitar + Stench illegal'] as const,
  ].forEach(([showdownId, status, label]) => {
    const row = findRow(available, showdownId, status)
    if (!row || row.source !== 'pokemon-showdown') {
      issues.push(
        createIssue(
          'showdown-status-missing',
          'error',
          `available.rows.${showdownId}`,
          `${label} must be present and sourced from Pokemon Showdown evidence.`,
        ),
      )
    }
  })

  if (!findRow(available, 'knockoff', 'catalog-only-preview')) {
    issues.push(
      createIssue(
        'catalog-preview-invalid',
        'error',
        'available.rows.knockoff',
        'Catalog preview rows must remain available without legal or illegal status.',
      ),
    )
  }

  if (
    fallback.status !== 'runtime-unavailable' ||
    !fallback.fallback.runtimeUnavailable ||
    !fallback.fallback.customOverlayRequired ||
    fallback.rows.some((row) => row.status === 'legal-in-selected-format' || row.status === 'illegal-in-selected-format')
  ) {
    issues.push(
      createIssue(
        'runtime-fallback-invalid',
        'error',
        'fallback',
        'Custom format props must preserve runtime-unavailable/custom-overlay fallback and avoid legal/illegal labels.',
      ),
    )
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    checkedCases: [
      'team-builder selected format flows through props',
      'target Pokemon Showdown format ID is visible',
      'move rows are exposed',
      'ability rows are exposed',
      'legal/illegal statuses are Pokemon Showdown-sourced',
      'catalog-only preview remains non-authoritative',
      'custom format fallback remains runtime-unavailable',
    ],
    availableStatus: available.status,
    fallbackStatus: fallback.status,
    targetShowdownFormatId: available.format.targetShowdownFormatId,
    legalCount: available.counts.legal,
    illegalCount: available.counts.illegal,
    unknownCount: fallback.counts.unknown,
    catalogOnlyPreviewCount: available.counts.catalogOnlyPreview,
    moveRows: available.counts.moves,
    abilityRows: available.counts.abilities,
  }
}
