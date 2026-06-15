import type { ShowdownRuntimeAdapterResponse } from '../types/showdownRuntime'
import {
  sampleShowdownAbilityIllegalResponse,
  sampleShowdownAbilityLegalResponse,
  sampleShowdownCatalogHintDisagreementResponse,
  sampleShowdownMoveIllegalResponse,
  sampleShowdownMoveLegalResponse,
  sampleShowdownRuntimeAdapterResponses,
  sampleShowdownRuntimeAvailableResponse,
  sampleShowdownRuntimeUnavailableResponse,
} from './showdownLegalityRuntimeAdapterFixtures'

export type ShowdownRuntimeAdapterValidationSeverity = 'error' | 'warning'

export type ShowdownRuntimeAdapterValidationCode =
  | 'missing-required-fixture'
  | 'authority-boundary-invalid'
  | 'catalog-role-invalid'
  | 'unsafe-policy-enabled'
  | 'runtime-unavailable-invalid'
  | 'authoritative-result-invalid'
  | 'catalog-final-legality-invalid'
  | 'fixture-shape-invalid'

export interface ShowdownRuntimeAdapterValidationIssue {
  code: ShowdownRuntimeAdapterValidationCode
  severity: ShowdownRuntimeAdapterValidationSeverity
  path: string
  message: string
}

export interface ShowdownRuntimeAdapterValidationResult {
  isValid: boolean
  issues: ShowdownRuntimeAdapterValidationIssue[]
  checkedFixtureCount: number
}

const createIssue = (
  code: ShowdownRuntimeAdapterValidationCode,
  severity: ShowdownRuntimeAdapterValidationSeverity,
  path: string,
  message: string,
): ShowdownRuntimeAdapterValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const isFinalStatus = (status: string) => status === 'legal' || status === 'illegal'

const validateResponse = (
  issues: ShowdownRuntimeAdapterValidationIssue[],
  response: ShowdownRuntimeAdapterResponse,
  path: string,
) => {
  if (response.safetyPolicy.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth') {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.safetyPolicy.pokemonShowdownAuthority`,
        'Pokemon Showdown must remain the legality source of truth.',
      ),
    )
  }

  if (response.safetyPolicy.catalogRole !== 'enrichment-only') {
    issues.push(
      createIssue(
        'catalog-role-invalid',
        'error',
        `${path}.safetyPolicy.catalogRole`,
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
        `${path}.safetyPolicy`,
        'Runtime adapter fixtures must keep unsafe execution/storage/network policies closed.',
      ),
    )
  }

  if (response.status === 'runtime-unavailable' && !response.unavailableResult) {
    issues.push(
      createIssue(
        'runtime-unavailable-invalid',
        'error',
        `${path}.unavailableResult`,
        'Runtime-unavailable responses must include an unavailable result.',
      ),
    )
  }

  if (response.status === 'complete' && !response.legalityResult) {
    issues.push(
      createIssue(
        'authoritative-result-invalid',
        'error',
        `${path}.legalityResult`,
        'Complete runtime adapter fixtures must include a Showdown legality result.',
      ),
    )
  }

  response.fieldEvidence.forEach((evidence, index) => {
    if (isFinalStatus(evidence.status) && evidence.source !== 'pokemon-showdown') {
      issues.push(
        createIssue(
          'catalog-final-legality-invalid',
          'error',
          `${path}.fieldEvidence.${index}`,
          'Only Pokemon Showdown evidence can produce final legal or illegal statuses.',
        ),
      )
    }
  })

  response.legalityResult?.fields.forEach((field, index) => {
    if (isFinalStatus(field.status) && response.runtimeMetadata.boundaryKind !== 'future-child-process') {
      issues.push(
        createIssue(
          'authoritative-result-invalid',
          'error',
          `${path}.legalityResult.fields.${index}`,
          'Final legality fixtures must use the future child-process runtime boundary metadata.',
        ),
      )
    }
  })
}

export function validateShowdownRuntimeAdapterFixtures(
  responses: ShowdownRuntimeAdapterResponse[] = sampleShowdownRuntimeAdapterResponses,
): ShowdownRuntimeAdapterValidationResult {
  const issues: ShowdownRuntimeAdapterValidationIssue[] = []

  const requiredFixtures = [
    sampleShowdownRuntimeUnavailableResponse,
    sampleShowdownRuntimeAvailableResponse,
    sampleShowdownMoveLegalResponse,
    sampleShowdownMoveIllegalResponse,
    sampleShowdownAbilityLegalResponse,
    sampleShowdownAbilityIllegalResponse,
    sampleShowdownCatalogHintDisagreementResponse,
  ]

  requiredFixtures.forEach((fixture, index) => {
    if (!responses.includes(fixture)) {
      issues.push(
        createIssue(
          'missing-required-fixture',
          'error',
          `responses.${index}`,
          'Required Showdown runtime adapter fixture is missing from the validation set.',
        ),
      )
    }
  })

  responses.forEach((response, index) => {
    if (!response.requestId || !response.checkedAt || !response.runtimeMetadata || !response.safetyPolicy) {
      issues.push(
        createIssue(
          'fixture-shape-invalid',
          'error',
          `responses.${index}`,
          'Runtime adapter fixture is missing required response metadata.',
        ),
      )
    }

    validateResponse(issues, response, `responses.${index}`)
  })

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    checkedFixtureCount: responses.length,
  }
}

export const sampleShowdownRuntimeAdapterValidation = validateShowdownRuntimeAdapterFixtures()
