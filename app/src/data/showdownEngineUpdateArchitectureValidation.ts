import type { ShowdownEngineUpdateArchitectureReadModel } from './showdownEngineUpdateArchitecture'
import {
  createCancelledShowdownEngineUpdateArchitectureReadModel,
  createFailedShowdownEngineUpdateArchitectureReadModel,
  createShowdownEngineUpdateArchitectureReadModel,
} from './showdownEngineUpdateArchitecture'

export type ShowdownEngineUpdateArchitectureValidationSeverity = 'error' | 'warning'

export type ShowdownEngineUpdateArchitectureValidationCode =
  | 'source-archive-invalid'
  | 'explicit-trigger-invalid'
  | 'storage-boundary-invalid'
  | 'staging-activation-invalid'
  | 'previous-engine-preservation-invalid'
  | 'integrity-validation-invalid'
  | 'required-file-validation-invalid'
  | 'format-registry-invalid'
  | 'custom-overlay-policy-invalid'
  | 'safety-boundary-invalid'

export interface ShowdownEngineUpdateArchitectureValidationIssue {
  code: ShowdownEngineUpdateArchitectureValidationCode
  severity: ShowdownEngineUpdateArchitectureValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineUpdateArchitectureValidationResult {
  isValid: boolean
  issues: ShowdownEngineUpdateArchitectureValidationIssue[]
  checkedModels: Array<'complete' | 'failed' | 'cancelled'>
  officialFormatCount: number
  requiredFileCount: number
}

const createIssue = (
  code: ShowdownEngineUpdateArchitectureValidationCode,
  severity: ShowdownEngineUpdateArchitectureValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineUpdateArchitectureValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateSourceArchive = (
  model: ShowdownEngineUpdateArchitectureReadModel,
  issues: ShowdownEngineUpdateArchitectureValidationIssue[],
  path: string,
) => {
  if (
    model.sourceArchive.sourceKind !== 'github-source-archive' ||
    model.sourceArchive.repositoryOwner !== 'smogon' ||
    model.sourceArchive.repositoryName !== 'pokemon-showdown' ||
    !model.sourceArchive.archiveUrl.startsWith('https://github.com/smogon/pokemon-showdown/archive/') ||
    model.sourceArchive.downloadStrategy !== 'https-archive-download' ||
    !model.sourceArchive.disallowGitClone ||
    !model.sourceArchive.disallowDynamicNpmInstall
  ) {
    issues.push(
      createIssue(
        'source-archive-invalid',
        'error',
        `${path}.sourceArchive`,
        'Engine update architecture must use the Pokemon Showdown GitHub source archive, not git clone or dynamic npm install.',
      ),
    )
  }
}

const validateTriggerAndSafety = (
  model: ShowdownEngineUpdateArchitectureReadModel,
  issues: ShowdownEngineUpdateArchitectureValidationIssue[],
  path: string,
) => {
  if (
    model.trigger !== 'catalog-update-user-click-update' ||
    !model.safetyPolicy.explicitUserActionRequired ||
    model.safetyPolicy.allowImportTimeExecution ||
    model.safetyPolicy.allowAppLoadExecution ||
    model.safetyPolicy.allowPanelOpenExecution
  ) {
    issues.push(
      createIssue(
        'explicit-trigger-invalid',
        'error',
        `${path}.trigger`,
        'Engine update must be explicit user action only and never run on import, app load, or panel open.',
      ),
    )
  }

  if (
    model.safetyPolicy.allowHiddenExecutableInstall ||
    model.safetyPolicy.allowDownloadedScriptExecution ||
    model.safetyPolicy.allowObfuscation ||
    model.safetyPolicy.allowWritesOutsideApprovedEngineStorage ||
    model.safetyPolicy.allowSimulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-boundary-invalid',
        'error',
        `${path}.safetyPolicy`,
        'Engine update safety boundaries must remain closed.',
      ),
    )
  }

  if (
    model.safetyPolicy.catalogRole !== 'enrichment-only' ||
    model.safetyPolicy.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth'
  ) {
    issues.push(
      createIssue(
        'safety-boundary-invalid',
        'error',
        `${path}.safetyPolicy`,
        'PokeAPI/catalog data must remain enrichment-only and Pokemon Showdown must remain legality/simulation source of truth.',
      ),
    )
  }
}

const validateStorage = (
  model: ShowdownEngineUpdateArchitectureReadModel,
  issues: ShowdownEngineUpdateArchitectureValidationIssue[],
  path: string,
) => {
  if (
    model.storagePlan.rootFolderKey !== 'battlelab-showdown-engine' ||
    model.storagePlan.allowWritesOutsideRoot ||
    model.storagePlan.activationStrategy !== 'validate-staging-before-swap' ||
    !model.storagePlan.preservePreviousValidOnFailure
  ) {
    issues.push(
      createIssue(
        'storage-boundary-invalid',
        'error',
        `${path}.storagePlan`,
        'Engine files must be scoped to app-managed Engine storage and activated only after staging validation.',
      ),
    )
  }
}

const validateActivation = (
  model: ShowdownEngineUpdateArchitectureReadModel,
  issues: ShowdownEngineUpdateArchitectureValidationIssue[],
  path: string,
) => {
  if (model.status === 'complete') {
    if (!model.stagedRevision || model.stagedRevision.status !== 'staged' || model.activeRevision?.status !== 'active') {
      issues.push(
        createIssue(
          'staging-activation-invalid',
          'error',
          `${path}.stagedRevision`,
          'Complete Engine update must stage before activating a valid revision.',
        ),
      )
    }
  }

  if ((model.status === 'failed' || model.status === 'cancelled') && model.activeRevision) {
    issues.push(
      createIssue(
        'previous-engine-preservation-invalid',
        'error',
        `${path}.activeRevision`,
        'Failed or cancelled Engine update must not activate a candidate revision.',
      ),
    )
  }

  if ((model.status === 'failed' || model.status === 'cancelled') && !model.previousValidEngine) {
    issues.push(
      createIssue(
        'previous-engine-preservation-invalid',
        'error',
        `${path}.previousValidEngine`,
        'Failed or cancelled Engine update must preserve the previous valid Engine data.',
      ),
    )
  }
}

const validateRevisionGates = (
  model: ShowdownEngineUpdateArchitectureReadModel,
  issues: ShowdownEngineUpdateArchitectureValidationIssue[],
  path: string,
) => {
  const revision = model.stagedRevision ?? model.activeRevision

  if (!revision && model.status === 'complete') {
    issues.push(
      createIssue(
        'staging-activation-invalid',
        'error',
        `${path}.revision`,
        'Complete Engine update requires a staged or active revision.',
      ),
    )
    return
  }

  if (!revision) return

  if (model.status === 'failed') {
    if (revision.archiveIntegrity.status !== 'failed' && revision.status !== 'rejected') {
      issues.push(
        createIssue(
          'integrity-validation-invalid',
          'error',
          `${path}.archiveIntegrity`,
          'Failed Engine update fixtures must show validation blocked activation.',
        ),
      )
    }
    return
  }

  if (
    revision.archiveIntegrity.algorithm !== 'sha256' ||
    !revision.archiveIntegrity.expectedHash ||
    revision.archiveIntegrity.status !== 'valid'
  ) {
    issues.push(
      createIssue(
        'integrity-validation-invalid',
        'error',
        `${path}.archiveIntegrity`,
        'Engine archive checksum/hash validation must be represented and valid before activation.',
      ),
    )
  }

  const requiredPurposes = new Set(['package-metadata', 'dex-data', 'team-validator', 'formats-registry'])
  revision.requiredFiles.forEach((file, index) => {
    if (!file.required || file.status !== 'valid' || !requiredPurposes.has(file.purpose)) {
      issues.push(
        createIssue(
          'required-file-validation-invalid',
          'error',
          `${path}.requiredFiles.${index}`,
          'Required Engine files must be validated before activation.',
        ),
      )
    }
  })

  requiredPurposes.forEach((purpose) => {
    if (!revision.requiredFiles.some((file) => file.purpose === purpose)) {
      issues.push(
        createIssue(
          'required-file-validation-invalid',
          'error',
          `${path}.requiredFiles.${purpose}`,
          `Required Engine file purpose ${purpose} is missing.`,
        ),
      )
    }
  })
}

const validateFormatRegistryAndOverlays = (
  model: ShowdownEngineUpdateArchitectureReadModel,
  issues: ShowdownEngineUpdateArchitectureValidationIssue[],
  path: string,
) => {
  const registry = model.activeRevision?.formatRegistry ?? model.stagedRevision?.formatRegistry
    ?? model.previousValidEngine?.formatRegistry

  if (!registry || registry.status !== 'available' || registry.officialFormatCount < 1) {
    issues.push(
      createIssue(
        'format-registry-invalid',
        'error',
        `${path}.formatRegistry`,
        'Official Pokemon Showdown formats must be discoverable from the active Engine revision.',
      ),
    )
  }

  if (
    !model.customFormatOverlayPolicy.supported ||
    model.customFormatOverlayPolicy.modifyUpstreamSourceInPlace ||
    model.customFormatOverlayPolicy.mergeStrategy !== 'read-overlay-after-official-registry'
  ) {
    issues.push(
      createIssue(
        'custom-overlay-policy-invalid',
        'error',
        `${path}.customFormatOverlayPolicy`,
        'BattleLab custom format overlays must be supported without modifying upstream Pokemon Showdown source in place.',
      ),
    )
  }
}

const validateModel = (
  model: ShowdownEngineUpdateArchitectureReadModel,
  issues: ShowdownEngineUpdateArchitectureValidationIssue[],
  path: string,
) => {
  validateSourceArchive(model, issues, path)
  validateTriggerAndSafety(model, issues, path)
  validateStorage(model, issues, path)
  validateActivation(model, issues, path)
  validateRevisionGates(model, issues, path)
  validateFormatRegistryAndOverlays(model, issues, path)
}

export async function validateShowdownEngineUpdateArchitecture(): Promise<ShowdownEngineUpdateArchitectureValidationResult> {
  const issues: ShowdownEngineUpdateArchitectureValidationIssue[] = []
  const complete = await createShowdownEngineUpdateArchitectureReadModel()
  const failed = await createFailedShowdownEngineUpdateArchitectureReadModel()
  const cancelled = await createCancelledShowdownEngineUpdateArchitectureReadModel()

  validateModel(complete, issues, 'complete')
  validateModel(failed, issues, 'failed')
  validateModel(cancelled, issues, 'cancelled')

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    checkedModels: ['complete', 'failed', 'cancelled'],
    officialFormatCount:
      complete.activeRevision?.formatRegistry.officialFormatCount ??
      complete.stagedRevision?.formatRegistry.officialFormatCount ??
      0,
    requiredFileCount: complete.stagedRevision?.requiredFiles.length ?? 0,
  }
}
