import type { BuildCatalogReference } from '../types'
import type { ShowdownRuntimeAdapterResponse } from '../types/showdownRuntime'
import {
  sampleShowdownRuntimeAdapterEnvironment,
  sampleShowdownRuntimeAdapterSafetyPolicy,
} from './showdownLegalityRuntimeAdapterFixtures'
import { createPokemonEditorShowdownLegalityRequest } from './showdownLegalityRuntimeProof'
import { createShowdownRuntimeUnavailableResponse, runShowdownRuntimeAdapter } from './showdownRuntimeAdapter'

export type ShowdownRuntimeAdapterSmokeValidationSeverity = 'error' | 'warning'

export type ShowdownRuntimeAdapterSmokeValidationCode =
  | 'showdown-check-not-complete'
  | 'expected-evidence-missing'
  | 'runtime-unavailable-fallback-invalid'
  | 'format-handoff-fallback-invalid'
  | 'authority-boundary-invalid'
  | 'unsafe-policy-enabled'

export interface ShowdownRuntimeAdapterSmokeValidationIssue {
  code: ShowdownRuntimeAdapterSmokeValidationCode
  severity: ShowdownRuntimeAdapterSmokeValidationSeverity
  path: string
  message: string
}

export interface ShowdownRuntimeAdapterSmokeValidationResult {
  isValid: boolean
  issues: ShowdownRuntimeAdapterSmokeValidationIssue[]
  checkedAt: string
  checkedCases: string[]
  responseStatus: ShowdownRuntimeAdapterResponse['status']
  runtimeUnavailableFallbackStatus: ShowdownRuntimeAdapterResponse['status']
}

const checkedAt = '2026-06-15T23:30:00.000Z'

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

const createIssue = (
  code: ShowdownRuntimeAdapterSmokeValidationCode,
  severity: ShowdownRuntimeAdapterSmokeValidationSeverity,
  path: string,
  message: string,
): ShowdownRuntimeAdapterSmokeValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const createSmokeRequest = () => {
  const legalityRequest = createPokemonEditorShowdownLegalityRequest({
    requestedAt: checkedAt,
    format: 'vgc-regulation-g',
    species: tyranitar,
    ability: sandStream,
    item: null,
    teraType: null,
    moves: [rockSlide, spore, null, null],
  })

  return {
    requestId: 'showdown-runtime-smoke-proof',
    requestedAt: checkedAt,
    checkKind: 'pokemon-editor-move-ability' as const,
    format: 'vgc-regulation-g' as const,
    legalityRequest,
    moveCheck: {
      species: tyranitar,
      candidateMoves: [rockSlide, spore],
      format: 'vgc-regulation-g' as const,
    },
    abilityCheck: {
      species: tyranitar,
      candidateAbilities: [sandStream, stench],
      format: 'vgc-regulation-g' as const,
    },
    environment: sampleShowdownRuntimeAdapterEnvironment,
    safetyPolicy: sampleShowdownRuntimeAdapterSafetyPolicy,
  }
}

const createCustomFormatSmokeRequest = () => {
  const request = createSmokeRequest()

  return {
    ...request,
    requestId: 'showdown-runtime-smoke-proof-custom-format',
    format: 'custom' as const,
    legalityRequest: {
      ...request.legalityRequest,
      requestId: 'showdown-runtime-smoke-proof-custom-format',
      format: 'custom' as const,
      build: {
        ...request.legalityRequest.build,
        format: 'custom' as const,
      },
    },
    moveCheck: request.moveCheck ? { ...request.moveCheck, format: 'custom' as const } : undefined,
    abilityCheck: request.abilityCheck ? { ...request.abilityCheck, format: 'custom' as const } : undefined,
  }
}

const hasEvidence = (
  response: ShowdownRuntimeAdapterResponse,
  field: 'move' | 'ability',
  showdownId: string,
  status: 'legal' | 'illegal',
) =>
  response.fieldEvidence.some(
    (evidence) =>
      evidence.field === field &&
      evidence.value.showdownId === showdownId &&
      evidence.status === status &&
      evidence.source === 'pokemon-showdown',
  )

const validateResponseSafety = (
  response: ShowdownRuntimeAdapterResponse,
  issues: ShowdownRuntimeAdapterSmokeValidationIssue[],
) => {
  if (response.safetyPolicy.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth') {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        'response.safetyPolicy.pokemonShowdownAuthority',
        'Pokemon Showdown must remain the legality source of truth.',
      ),
    )
  }

  if (response.safetyPolicy.catalogRole !== 'enrichment-only') {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        'response.safetyPolicy.catalogRole',
        'PokeAPI/catalog data must remain enrichment-only.',
      ),
    )
  }

  if (
    response.safetyPolicy.allowCatalogOnlyFinalLegality ||
    response.safetyPolicy.allowSimulationExecution ||
    response.safetyPolicy.allowPersistentStorage ||
    response.safetyPolicy.allowNetworkFetch ||
    !response.safetyPolicy.preserveRuntimeUnavailableFallback
  ) {
    issues.push(
      createIssue(
        'unsafe-policy-enabled',
        'error',
        'response.safetyPolicy',
        'The smoke proof must keep simulation, storage, network, and catalog-only final legality flags closed.',
      ),
    )
  }
}

export async function validateShowdownRuntimeAdapterSmokeProof(): Promise<ShowdownRuntimeAdapterSmokeValidationResult> {
  const issues: ShowdownRuntimeAdapterSmokeValidationIssue[] = []
  const request = createSmokeRequest()
  const response = await runShowdownRuntimeAdapter(request, { checkedAt, runtimeLoader: 'browser-data' })
  const customFormatFallback = await runShowdownRuntimeAdapter(createCustomFormatSmokeRequest(), { checkedAt })
  const fallback = createShowdownRuntimeUnavailableResponse(
    request,
    'runtime-start-failed',
    'Forced fallback proof for unavailable Pokemon Showdown runtime.',
    checkedAt,
  )

  validateResponseSafety(response, issues)
  validateResponseSafety(customFormatFallback, issues)
  validateResponseSafety(fallback, issues)

  if (response.status !== 'complete') {
    issues.push(
      createIssue(
        'showdown-check-not-complete',
        'error',
        'response.status',
        `Expected complete Showdown smoke response, received ${response.status}.`,
      ),
    )
  }

  const expectedEvidence = [
    ['move', 'rockslide', 'legal', 'Tyranitar + Rock Slide'] as const,
    ['move', 'spore', 'illegal', 'Tyranitar + Spore'] as const,
    ['ability', 'sandstream', 'legal', 'Tyranitar + Sand Stream'] as const,
    ['ability', 'stench', 'illegal', 'Tyranitar + Stench'] as const,
  ]

  expectedEvidence.forEach(([field, showdownId, status, label]) => {
    if (!hasEvidence(response, field, showdownId, status)) {
      issues.push(
        createIssue(
          'expected-evidence-missing',
          'error',
          `response.fieldEvidence.${showdownId}`,
          `Missing Pokemon Showdown-sourced ${status} evidence for ${label}.`,
        ),
      )
    }
  })

  if (fallback.status !== 'runtime-unavailable' || !fallback.unavailableResult) {
    issues.push(
      createIssue(
        'runtime-unavailable-fallback-invalid',
        'error',
        'fallback',
        'Runtime unavailable fallback must remain available for import/runtime/check failures.',
      ),
    )
  }

  if (
    customFormatFallback.status !== 'runtime-unavailable' ||
    customFormatFallback.unavailableResult?.reason !== 'runtime-start-failed'
  ) {
    issues.push(
      createIssue(
        'format-handoff-fallback-invalid',
        'error',
        'customFormatFallback',
        'Custom overlay format must preserve runtime-unavailable fallback until it becomes executable.',
      ),
    )
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    checkedAt,
    checkedCases: [
      'Tyranitar + Rock Slide',
      'Tyranitar + Spore',
      'Tyranitar + Sand Stream',
      'Tyranitar + Stench',
      'custom format runtime-unavailable fallback',
      'runtime unavailable fallback',
    ],
    responseStatus: response.status,
    runtimeUnavailableFallbackStatus: fallback.status,
  }
}
