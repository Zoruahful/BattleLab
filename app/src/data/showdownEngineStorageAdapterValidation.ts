import type {
  ShowdownEngineStorageAdapterContract,
  ShowdownEngineStorageAdapterScenario,
  ShowdownEngineStorageOperationKind,
} from './showdownEngineStorageAdapter'
import {
  sampleShowdownEngineStorageAdapterContract,
  sampleShowdownEngineStorageScenarios,
} from './showdownEngineStorageAdapter'

export type ShowdownEngineStorageAdapterValidationSeverity = 'error' | 'warning'

export type ShowdownEngineStorageAdapterValidationCode =
  | 'operation-missing'
  | 'explicit-trigger-invalid'
  | 'unsafe-boundary-open'
  | 'storage-root-invalid'
  | 'required-file-manifest-invalid'
  | 'format-registry-invalid'
  | 'failed-cancelled-preservation-invalid'
  | 'authority-boundary-invalid'

export interface ShowdownEngineStorageAdapterValidationIssue {
  code: ShowdownEngineStorageAdapterValidationCode
  severity: ShowdownEngineStorageAdapterValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineStorageAdapterValidationResult {
  isValid: boolean
  issues: ShowdownEngineStorageAdapterValidationIssue[]
  checkedOperationCount: number
  checkedScenarioCount: number
}

const requiredOperations: ShowdownEngineStorageOperationKind[] = [
  'resolve-engine-root',
  'create-staging-revision',
  'write-staged-archive-metadata',
  'read-staged-archive-metadata',
  'validate-required-file-manifest',
  'promote-staged-revision',
  'reject-staged-revision',
  'read-active-revision-metadata',
]

const createIssue = (
  code: ShowdownEngineStorageAdapterValidationCode,
  severity: ShowdownEngineStorageAdapterValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineStorageAdapterValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateOperations = (
  contract: ShowdownEngineStorageAdapterContract,
  issues: ShowdownEngineStorageAdapterValidationIssue[],
) => {
  requiredOperations.forEach((operation) => {
    if (!contract.operations.some((entry) => entry.kind === operation)) {
      issues.push(
        createIssue(
          'operation-missing',
          'error',
          `operations.${operation}`,
          `Storage adapter contract must model ${operation}.`,
        ),
      )
    }
  })

  contract.operations.forEach((operation, index) => {
    if (!operation.explicitUserActionRequired || operation.writesFiles || operation.runsDownloadedScripts) {
      issues.push(
        createIssue(
          'unsafe-boundary-open',
          'error',
          `operations.${index}`,
          'Storage adapter operation fixtures must be explicit-user-action-only, metadata-only, and must not run downloaded scripts.',
        ),
      )
    }
  })
}

const validateSafety = (
  contract: ShowdownEngineStorageAdapterContract,
  issues: ShowdownEngineStorageAdapterValidationIssue[],
) => {
  if (
    contract.trigger !== 'catalog-update-user-click-update' ||
    contract.safety.trigger !== 'catalog-update-user-click-update' ||
    contract.safety.importTimeExecution ||
    contract.safety.appLoadExecution ||
    contract.safety.panelOpenExecution
  ) {
    issues.push(
      createIssue(
        'explicit-trigger-invalid',
        'error',
        'safety.trigger',
        'Engine storage adapter boundary must remain explicit user-triggered only from Catalog Update -> Update.',
      ),
    )
  }

  if (
    contract.safety.hiddenExecutableInstall ||
    contract.safety.downloadedScriptAutoRun ||
    contract.safety.obfuscation ||
    contract.safety.writesOutsideApprovedRoot ||
    contract.safety.realFileIoImplemented ||
    contract.safety.simulationExecution ||
    !contract.safety.preservePreviousValidEngineOnFailure ||
    contract.safety.status !== 'closed'
  ) {
    issues.push(
      createIssue(
        'unsafe-boundary-open',
        'error',
        'safety',
        'Storage adapter safety flags must remain closed and file IO must stay unimplemented in this checkpoint.',
      ),
    )
  }

  if (
    contract.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    contract.safety.catalogRole !== 'enrichment-only'
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        'safety',
        'Pokemon Showdown must remain legality/simulation source of truth and PokeAPI/catalog data must remain enrichment-only.',
      ),
    )
  }
}

const validateStorageRoot = (
  contract: ShowdownEngineStorageAdapterContract,
  issues: ShowdownEngineStorageAdapterValidationIssue[],
) => {
  if (
    contract.root.rootFolderKey !== 'battlelab-showdown-engine' ||
    contract.root.activeRevisionFolderKey !== 'active' ||
    contract.root.stagingRevisionFolderKey !== 'staging' ||
    contract.root.customOverlayFolderKey !== 'battlelab-custom-overlays' ||
    !contract.root.pathResolvedByFutureAdapter ||
    contract.root.allowWritesOutsideRoot
  ) {
    issues.push(
      createIssue(
        'storage-root-invalid',
        'error',
        'root',
        'Storage root must be app-managed, logical, and must forbid writes outside the approved Engine root.',
      ),
    )
  }
}

const validateRequiredFiles = (
  contract: ShowdownEngineStorageAdapterContract,
  issues: ShowdownEngineStorageAdapterValidationIssue[],
) => {
  const requiredPurposes = new Set(['package-metadata', 'dex-data', 'team-validator', 'formats-registry'])

  if (contract.requiredFileManifest.status !== 'valid') {
    issues.push(
      createIssue(
        'required-file-manifest-invalid',
        'error',
        'requiredFileManifest.status',
        'Required-file manifest must represent a valid staged revision gate.',
      ),
    )
  }

  requiredPurposes.forEach((purpose) => {
    if (!contract.requiredFileManifest.requiredFiles.some((file) => file.required && file.purpose === purpose)) {
      issues.push(
        createIssue(
          'required-file-manifest-invalid',
          'error',
          `requiredFileManifest.${purpose}`,
          `Required-file manifest must include ${purpose}.`,
        ),
      )
    }
  })
}

const validateFormatRegistry = (
  contract: ShowdownEngineStorageAdapterContract,
  issues: ShowdownEngineStorageAdapterValidationIssue[],
) => {
  if (contract.formatRegistry.status !== 'available' || contract.formatRegistry.officialFormatCount < 1) {
    issues.push(
      createIssue(
        'format-registry-invalid',
        'error',
        'formatRegistry',
        'Storage adapter contract must preserve official Pokemon Showdown format registry readiness metadata.',
      ),
    )
  }
}

const validateScenarios = (
  scenarios: ShowdownEngineStorageAdapterScenario[],
  issues: ShowdownEngineStorageAdapterValidationIssue[],
) => {
  scenarios.forEach((scenario, index) => {
    if (
      (scenario.status === 'failed' || scenario.status === 'cancelled') &&
      scenario.resultingActiveRevision.revisionId !== scenario.previousActiveRevision.revisionId
    ) {
      issues.push(
        createIssue(
          'failed-cancelled-preservation-invalid',
          'error',
          `scenarios.${index}.resultingActiveRevision`,
          'Failed and cancelled Engine storage scenarios must preserve the previous active revision.',
        ),
      )
    }

    if (scenario.status === 'success' && !scenario.replacementValidated) {
      issues.push(
        createIssue(
          'failed-cancelled-preservation-invalid',
          'error',
          `scenarios.${index}.replacementValidated`,
          'Successful promotion scenario must require validated replacement data.',
        ),
      )
    }
  })
}

export function validateShowdownEngineStorageAdapter(
  contract: ShowdownEngineStorageAdapterContract = sampleShowdownEngineStorageAdapterContract,
  scenarios: ShowdownEngineStorageAdapterScenario[] = sampleShowdownEngineStorageScenarios,
): ShowdownEngineStorageAdapterValidationResult {
  const issues: ShowdownEngineStorageAdapterValidationIssue[] = []

  validateOperations(contract, issues)
  validateSafety(contract, issues)
  validateStorageRoot(contract, issues)
  validateRequiredFiles(contract, issues)
  validateFormatRegistry(contract, issues)
  validateScenarios(scenarios, issues)

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    checkedOperationCount: contract.operations.length,
    checkedScenarioCount: scenarios.length,
  }
}

export const sampleShowdownEngineStorageAdapterValidation = validateShowdownEngineStorageAdapter()
