import {
  createShowdownEngineArchiveExtractionPlan,
  type ShowdownEngineArchiveExtractionPlan,
} from './showdownEngineArchiveExtractionPlan'
import { createShowdownEngineArchiveContentsManifest } from './showdownEngineArchiveContentsManifest'
import { createShowdownEngineImmutableSourceRevision } from './showdownEngineImmutableSourceRevision'
import { fetchShowdownEngineArchiveBodyDownloadReadModel } from './showdownEngineArchiveBodyDownloadReadModel'

export type ShowdownEngineArchiveExtractionPlanValidationSeverity = 'error' | 'warning'

export type ShowdownEngineArchiveExtractionPlanValidationCode =
  | 'target-invalid'
  | 'validation-handoff-invalid'
  | 'decision-invalid'
  | 'preservation-invalid'
  | 'safety-invalid'
  | 'authority-boundary-invalid'

export interface ShowdownEngineArchiveExtractionPlanValidationIssue {
  code: ShowdownEngineArchiveExtractionPlanValidationCode
  severity: ShowdownEngineArchiveExtractionPlanValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineArchiveExtractionPlanValidationResult {
  isValid: boolean
  issues: ShowdownEngineArchiveExtractionPlanValidationIssue[]
  coveredStatuses: ShowdownEngineArchiveExtractionPlan['status'][]
  checkedPlanCount: number
}

const immutableRevision = '0123456789abcdef0123456789abcdef01234567'
const requiredFiles = ['package.json', 'sim/dex.ts', 'sim/team-validator.ts', 'config/formats.ts']

const createIssue = (
  code: ShowdownEngineArchiveExtractionPlanValidationCode,
  severity: ShowdownEngineArchiveExtractionPlanValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineArchiveExtractionPlanValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const createPlanFixtures = async (): Promise<ShowdownEngineArchiveExtractionPlan[]> => {
  const bodyReadModel = await fetchShowdownEngineArchiveBodyDownloadReadModel()
  const approvedSha = bodyReadModel.hash.sha256 ?? 'missing-observed-hash'
  const branchPolicy = createShowdownEngineImmutableSourceRevision({
    bodyReadModel,
    revisionPolicyId: 'extraction-branch-preview',
  })
  const pinnedPolicy = createShowdownEngineImmutableSourceRevision({
    bodyReadModel,
    immutableRevision,
    approvedImmutableSha256: approvedSha,
    approvedAt: '2026-06-15T00:00:00.000Z',
    revisionPolicyId: 'extraction-pinned-approved',
  })
  const validManifest = createShowdownEngineArchiveContentsManifest({
    immutableSourcePolicy: pinnedPolicy,
    fileStatuses: Object.fromEntries(requiredFiles.map((file) => [file, 'present'])),
    manifestId: 'extraction-valid-manifest',
  })

  return [
    createShowdownEngineArchiveExtractionPlan({
      contentsManifest: createShowdownEngineArchiveContentsManifest({
        immutableSourcePolicy: branchPolicy,
        manifestId: 'extraction-blocked-source-manifest',
      }),
      planId: 'extraction-blocked-by-source-policy',
    }),
    createShowdownEngineArchiveExtractionPlan({
      contentsManifest: createShowdownEngineArchiveContentsManifest({
        immutableSourcePolicy: pinnedPolicy,
        manifestId: 'extraction-not-inspected-manifest',
      }),
      planId: 'extraction-blocked-by-manifest',
    }),
    createShowdownEngineArchiveExtractionPlan({
      contentsManifest: validManifest,
      planId: 'extraction-ready-for-future-staging',
    }),
    createShowdownEngineArchiveExtractionPlan({
      contentsManifest: validManifest,
      scenario: 'failed',
      planId: 'extraction-failed-preserves-active',
    }),
    createShowdownEngineArchiveExtractionPlan({
      contentsManifest: validManifest,
      scenario: 'cancelled',
      planId: 'extraction-cancelled-preserves-active',
    }),
  ]
}

const validatePlan = (
  plan: ShowdownEngineArchiveExtractionPlan,
  issues: ShowdownEngineArchiveExtractionPlanValidationIssue[],
  path: string,
) => {
  if (
    plan.extractionTarget.rootFolderKey !== 'battlelab-showdown-engine' ||
    plan.extractionTarget.stagingRevisionFolderKey !== 'staging' ||
    !plan.extractionTarget.targetFolderMetadataOnly ||
    !plan.extractionTarget.concretePathResolvedByFutureAdapter
  ) {
    issues.push(createIssue('target-invalid', 'error', `${path}.extractionTarget`, 'Extraction target must stay app-managed metadata-only staging information.'))
  }

  if (
    plan.status === 'ready-for-future-staging' &&
    (plan.validationHandoff.immutableSourcePolicyStatus !== 'immutable-pinned-approved' ||
      plan.validationHandoff.contentsManifestStatus !== 'manifest-valid' ||
      plan.validationHandoff.requiredFileStatus !== 'valid')
  ) {
    issues.push(
      createIssue(
        'validation-handoff-invalid',
        'error',
        `${path}.validationHandoff`,
        'Ready extraction plan requires pinned immutable source, valid manifest, and valid required-file handoff.',
      ),
    )
  }

  if (plan.status === 'ready-for-future-staging' && plan.decision.decision !== 'promote-ready') {
    issues.push(createIssue('decision-invalid', 'error', `${path}.decision`, 'Ready extraction plan must expose promote-ready decision metadata.'))
  }

  if (plan.status !== 'ready-for-future-staging' && plan.decision.decision === 'promote-ready') {
    issues.push(createIssue('decision-invalid', 'error', `${path}.decision`, 'Blocked/failed/cancelled extraction plans must not expose promote-ready decisions.'))
  }

  if (!plan.decision.previousActivePreserved) {
    issues.push(createIssue('preservation-invalid', 'error', `${path}.decision.previousActivePreserved`, 'Extraction plan must preserve previous active Engine metadata.'))
  }

  if (
    !plan.safety.noImportTimeDownload ||
    !plan.safety.noAppLoadDownload ||
    !plan.safety.noPanelOpenDownload ||
    !plan.safety.noArchiveInspection ||
    !plan.safety.noArchiveExtraction ||
    !plan.safety.noFileIo ||
    !plan.safety.noDynamicImports ||
    !plan.safety.noLoaderExecution ||
    !plan.safety.noCatalogUpdatePanelWiring ||
    !plan.safety.noSimulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-invalid',
        'error',
        `${path}.safety`,
        'Extraction plan safety flags must keep import/app/panel download, archive inspection/extraction, file IO, loader execution, UI wiring, and simulation closed.',
      ),
    )
  }

  if (
    plan.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    plan.safety.catalogRole !== 'enrichment-only' ||
    !plan.safety.customFormatsOverlayOnly
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.safety`,
        'Authority boundaries must preserve Pokemon Showdown source-of-truth, PokeAPI enrichment-only, and custom format overlays.',
      ),
    )
  }
}

export async function validateShowdownEngineArchiveExtractionPlan(): Promise<ShowdownEngineArchiveExtractionPlanValidationResult> {
  const issues: ShowdownEngineArchiveExtractionPlanValidationIssue[] = []
  const plans = await createPlanFixtures()

  plans.forEach((plan, index) => validatePlan(plan, issues, `plans.${index}`))

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    coveredStatuses: Array.from(new Set(plans.map((plan) => plan.status))),
    checkedPlanCount: plans.length,
  }
}

