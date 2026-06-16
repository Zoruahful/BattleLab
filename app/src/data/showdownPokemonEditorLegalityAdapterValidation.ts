import type { PokemonEditorLegalityReadModel } from '../types'
import type { ShowdownRuntimeAdapterResponse } from '../types/showdownRuntime'
import {
  sampleShowdownAbilityIllegalResponse,
  sampleShowdownAbilityLegalResponse,
  sampleShowdownCatalogHintDisagreementResponse,
  sampleShowdownMoveIllegalResponse,
  sampleShowdownMoveLegalResponse,
  sampleShowdownRuntimeUnavailableResponse,
} from './showdownLegalityRuntimeAdapterFixtures'
import {
  createShowdownPokemonEditorLegalityReadModel,
  type ShowdownPokemonEditorLegalityAdapterResult,
  type ShowdownPokemonEditorLegalityAdapterSummary,
} from './showdownPokemonEditorLegalityAdapter'

export type ShowdownPokemonEditorLegalityAdapterValidationSeverity = 'error' | 'warning'

export type ShowdownPokemonEditorLegalityAdapterValidationCode =
  | 'move-legal-invalid'
  | 'move-illegal-invalid'
  | 'ability-legal-invalid'
  | 'ability-illegal-invalid'
  | 'mixed-result-invalid'
  | 'runtime-unavailable-invalid'
  | 'catalog-hint-authority-invalid'
  | 'identity-display-invalid'
  | 'authority-boundary-invalid'
  | 'boundary-note-invalid'

export interface ShowdownPokemonEditorLegalityAdapterValidationIssue {
  code: ShowdownPokemonEditorLegalityAdapterValidationCode
  severity: ShowdownPokemonEditorLegalityAdapterValidationSeverity
  path: string
  message: string
}

export interface ShowdownPokemonEditorLegalityAdapterValidationResult {
  isValid: boolean
  issues: ShowdownPokemonEditorLegalityAdapterValidationIssue[]
  casesCovered: string[]
  summaries: Record<string, ShowdownPokemonEditorLegalityAdapterSummary>
}

const createIssue = (
  code: ShowdownPokemonEditorLegalityAdapterValidationCode,
  severity: ShowdownPokemonEditorLegalityAdapterValidationSeverity,
  path: string,
  message: string,
): ShowdownPokemonEditorLegalityAdapterValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const createMixedResponse = (): ShowdownRuntimeAdapterResponse => {
  const moveResult = sampleShowdownMoveLegalResponse.legalityResult
  const moveField = moveResult?.fields[0]
  const abilityField = sampleShowdownAbilityIllegalResponse.legalityResult?.fields[0]

  if (!moveResult || !moveField || !abilityField) {
    throw new Error('Mixed Showdown legality adapter validation fixture is missing source fields.')
  }

  return {
    ...sampleShowdownMoveLegalResponse,
    requestId: 'showdown-pokemon-editor-legality-adapter-mixed',
    fieldEvidence: [
      ...sampleShowdownMoveLegalResponse.fieldEvidence,
      ...sampleShowdownAbilityIllegalResponse.fieldEvidence,
    ],
    legalityResult: {
      ...moveResult,
      requestId: 'showdown-pokemon-editor-legality-adapter-mixed',
      status: 'illegal',
      fields: [moveField, abilityField],
      messages: [
        ...moveResult.messages,
        ...(sampleShowdownAbilityIllegalResponse.legalityResult?.messages ?? []),
      ],
    },
    messages: [
      ...sampleShowdownMoveLegalResponse.messages,
      ...sampleShowdownAbilityIllegalResponse.messages,
    ],
  }
}

const findField = (
  readModel: PokemonEditorLegalityReadModel,
  field: PokemonEditorLegalityReadModel['fieldResults'][number]['field'],
  status: PokemonEditorLegalityReadModel['fieldResults'][number]['status'],
) => readModel.fieldResults.find((result) => result.field === field && result.status === status)

const validateCommonBoundary = (
  result: ShowdownPokemonEditorLegalityAdapterResult,
  issues: ShowdownPokemonEditorLegalityAdapterValidationIssue[],
  path: string,
) => {
  if (
    result.summary.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    result.summary.catalogRole !== 'enrichment-only' ||
    !result.readModel.notes.some((note) => note.includes('Pokemon Showdown remains')) ||
    !result.readModel.notes.some((note) => note.includes('enrichment-only'))
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.summary`,
        'Pokemon Editor legality adapter bridge must preserve Pokemon Showdown authority and PokeAPI/catalog enrichment-only boundaries.',
      ),
    )
  }

  if (
    !result.boundaryNotes.some((note) => note.includes('data-only')) ||
    !result.boundaryNotes.some((note) => note.includes('Only Pokemon Showdown-sourced'))
  ) {
    issues.push(
      createIssue(
        'boundary-note-invalid',
        'error',
        `${path}.boundaryNotes`,
        'Pokemon Editor legality adapter bridge must document data-only behavior and Showdown-sourced final legality.',
      ),
    )
  }
}

const validateIdentityDisplaySeparation = (
  result: ShowdownPokemonEditorLegalityAdapterResult,
  issues: ShowdownPokemonEditorLegalityAdapterValidationIssue[],
  path: string,
) => {
  const option = result.readModel.fieldResults.find((field) => field.option?.displayName)?.option

  if (!option || option.catalogKey === option.displayName || option.showdownId === option.displayName) {
    issues.push(
      createIssue(
        'identity-display-invalid',
        'error',
        `${path}.fieldResults.option`,
        'Bridge must preserve catalog identity separately from display labels.',
      ),
    )
  }
}

export function validateShowdownPokemonEditorLegalityAdapter(): ShowdownPokemonEditorLegalityAdapterValidationResult {
  const issues: ShowdownPokemonEditorLegalityAdapterValidationIssue[] = []
  const results = {
    moveLegal: createShowdownPokemonEditorLegalityReadModel({ response: sampleShowdownMoveLegalResponse }),
    moveIllegal: createShowdownPokemonEditorLegalityReadModel({ response: sampleShowdownMoveIllegalResponse }),
    abilityLegal: createShowdownPokemonEditorLegalityReadModel({ response: sampleShowdownAbilityLegalResponse }),
    abilityIllegal: createShowdownPokemonEditorLegalityReadModel({ response: sampleShowdownAbilityIllegalResponse }),
    mixed: createShowdownPokemonEditorLegalityReadModel({ response: createMixedResponse() }),
    runtimeUnavailable: createShowdownPokemonEditorLegalityReadModel({ response: sampleShowdownRuntimeUnavailableResponse }),
    catalogHintDisagreement: createShowdownPokemonEditorLegalityReadModel({
      response: sampleShowdownCatalogHintDisagreementResponse,
    }),
  }

  Object.entries(results).forEach(([key, result]) => {
    validateCommonBoundary(result, issues, key)
  })

  validateIdentityDisplaySeparation(results.moveLegal, issues, 'moveLegal')

  if (!findField(results.moveLegal.readModel, 'move', 'legal') || results.moveLegal.readModel.status !== 'legal') {
    issues.push(
      createIssue('move-legal-invalid', 'error', 'moveLegal', 'Move legal fixture must map to a legal read-model field.'),
    )
  }

  if (!findField(results.moveIllegal.readModel, 'move', 'illegal') || results.moveIllegal.readModel.status !== 'illegal') {
    issues.push(
      createIssue(
        'move-illegal-invalid',
        'error',
        'moveIllegal',
        'Move illegal fixture must map to an illegal read-model field.',
      ),
    )
  }

  if (!findField(results.abilityLegal.readModel, 'ability', 'legal') || results.abilityLegal.readModel.status !== 'legal') {
    issues.push(
      createIssue(
        'ability-legal-invalid',
        'error',
        'abilityLegal',
        'Ability legal fixture must map to a legal read-model field.',
      ),
    )
  }

  if (
    !findField(results.abilityIllegal.readModel, 'ability', 'illegal') ||
    results.abilityIllegal.readModel.status !== 'illegal'
  ) {
    issues.push(
      createIssue(
        'ability-illegal-invalid',
        'error',
        'abilityIllegal',
        'Ability illegal fixture must map to an illegal read-model field.',
      ),
    )
  }

  if (
    results.mixed.readModel.status !== 'illegal' ||
    results.mixed.summary.legalCount !== 1 ||
    results.mixed.summary.illegalCount !== 1
  ) {
    issues.push(
      createIssue(
        'mixed-result-invalid',
        'error',
        'mixed',
        'Mixed fixture must preserve legal and illegal fields while setting overall status to illegal.',
      ),
    )
  }

  if (
    results.runtimeUnavailable.readModel.status !== 'runtime-unavailable' ||
    !results.runtimeUnavailable.readModel.runtimeUnavailableFallback?.preserveCurrentUiBehavior ||
    !results.runtimeUnavailable.summary.runtimeUnavailable
  ) {
    issues.push(
      createIssue(
        'runtime-unavailable-invalid',
        'error',
        'runtimeUnavailable',
        'Runtime-unavailable fixture must preserve fallback behavior in the read-model.',
      ),
    )
  }

  if (
    results.catalogHintDisagreement.summary.catalogHintDisagreementCount !== 1 ||
    findField(results.catalogHintDisagreement.readModel, 'ability', 'legal') ||
    findField(results.catalogHintDisagreement.readModel, 'ability', 'illegal') ||
    !findField(results.catalogHintDisagreement.readModel, 'ability', 'unknown')
  ) {
    issues.push(
      createIssue(
        'catalog-hint-authority-invalid',
        'error',
        'catalogHintDisagreement',
        'Catalog hint disagreement must remain non-authoritative and map to unknown, not legal or illegal.',
      ),
    )
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    casesCovered: Object.keys(results),
    summaries: Object.fromEntries(Object.entries(results).map(([key, result]) => [key, result.summary])),
  }
}
