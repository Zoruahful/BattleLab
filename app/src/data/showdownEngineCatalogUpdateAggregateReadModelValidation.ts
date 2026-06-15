import {
  createShowdownEngineCatalogUpdateAggregateReadModelSamples,
  type ShowdownEngineCatalogUpdateAggregateReadModel,
} from './showdownEngineCatalogUpdateAggregateReadModel'

export type ShowdownEngineCatalogUpdateAggregateReadModelValidationSeverity = 'error' | 'warning'

export type ShowdownEngineCatalogUpdateAggregateReadModelValidationCode =
  | 'fixture-coverage-invalid'
  | 'section-invalid'
  | 'execution-boundary-invalid'
  | 'revision-preservation-invalid'
  | 'status-invalid'
  | 'safety-boundary-invalid'
  | 'authority-boundary-invalid'
  | 'boundary-note-invalid'

export interface ShowdownEngineCatalogUpdateAggregateReadModelValidationIssue {
  code: ShowdownEngineCatalogUpdateAggregateReadModelValidationCode
  severity: ShowdownEngineCatalogUpdateAggregateReadModelValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineCatalogUpdateAggregateReadModelValidationResult {
  isValid: boolean
  issues: ShowdownEngineCatalogUpdateAggregateReadModelValidationIssue[]
  coveredStatuses: ShowdownEngineCatalogUpdateAggregateReadModel['status'][]
  checkedReadModelCount: number
  readyPreviewCount: number
  blockedOrTerminalCount: number
}

const createIssue = (
  code: ShowdownEngineCatalogUpdateAggregateReadModelValidationCode,
  severity: ShowdownEngineCatalogUpdateAggregateReadModelValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineCatalogUpdateAggregateReadModelValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateAggregate = (
  readModel: ShowdownEngineCatalogUpdateAggregateReadModel,
  issues: ShowdownEngineCatalogUpdateAggregateReadModelValidationIssue[],
  path: string,
) => {
  const requiredSections: ShowdownEngineCatalogUpdateAggregateReadModel['sections'][number]['key'][] = [
    'engine-update',
    'archive-metadata',
    'archive-download-dry-run',
    'archive-body-download-proof',
    'activation-gate',
    'storage-preservation',
  ]

  requiredSections.forEach((key) => {
    const section = readModel.sections.find((candidate) => candidate.key === key)

    if (!section || !section.label || !section.message || !section.metadataOnly) {
      issues.push(
        createIssue(
          'section-invalid',
          'error',
          `${path}.sections.${key}`,
          `Aggregate read-model must include metadata-only ${key} section with label and message.`,
        ),
      )
    }
  })

  if (readModel.archiveMetadataStatus !== 'not-run-preview' || readModel.archiveBodyDownloadStatus !== 'not-run-preview') {
    issues.push(
      createIssue(
        'execution-boundary-invalid',
        'error',
        `${path}.archiveStatus`,
        'Aggregate read-model must not trigger metadata fetch or archive body download.',
      ),
    )
  }

  if (!readModel.revision.previousActivePreserved || !readModel.revision.previousActiveRevisionId || !readModel.revision.resultingActiveRevisionId) {
    issues.push(
      createIssue(
        'revision-preservation-invalid',
        'error',
        `${path}.revision`,
        'Aggregate read-model must preserve previous active Engine revision metadata.',
      ),
    )
  }

  if (readModel.status === 'ready-preview' && readModel.activationGateStatus !== 'activation-ready') {
    issues.push(
      createIssue(
        'status-invalid',
        'error',
        `${path}.status`,
        'Ready aggregate requires activation-ready gate status.',
      ),
    )
  }

  if (readModel.status !== 'ready-preview' && !readModel.sections.some((section) => section.blocksActivation)) {
    issues.push(
      createIssue(
        'status-invalid',
        'error',
        `${path}.sections`,
        'Blocked, failed, and cancelled aggregate states must expose at least one blocking section.',
      ),
    )
  }

  if (
    !readModel.safety.noImportTimeDownload ||
    !readModel.safety.noAppLoadDownload ||
    !readModel.safety.noPanelOpenDownload ||
    !readModel.safety.noArchiveBodyDownloadTriggered ||
    !readModel.safety.noMetadataFetchTriggered ||
    !readModel.safety.noArchiveExtraction ||
    !readModel.safety.noFileIo ||
    !readModel.safety.noFileReads ||
    !readModel.safety.noDynamicImports ||
    !readModel.safety.noLoaderExecution ||
    !readModel.safety.noCatalogUpdatePanelWiring ||
    !readModel.safety.noSimulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-boundary-invalid',
        'error',
        `${path}.safety`,
        'Aggregate read-model safety flags must remain closed for fetch/download triggers, IO, loader execution, UI wiring, and simulation.',
      ),
    )
  }

  if (
    readModel.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    readModel.safety.catalogRole !== 'enrichment-only' ||
    !readModel.safety.customFormatsOverlayOnly
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.safety`,
        'Aggregate read-model must preserve Showdown authority, PokeAPI enrichment-only, and overlay-only custom formats.',
      ),
    )
  }

  if (
    !readModel.boundaryNotes.some((note) => note.includes('UI-safe metadata')) ||
    !readModel.boundaryNotes.some((note) => note.includes('does not trigger metadata fetch'))
  ) {
    issues.push(
      createIssue(
        'boundary-note-invalid',
        'error',
        `${path}.boundaryNotes`,
        'Aggregate boundary notes must state UI-safe metadata and no metadata fetch/download execution.',
      ),
    )
  }
}

export async function validateShowdownEngineCatalogUpdateAggregateReadModel(): Promise<ShowdownEngineCatalogUpdateAggregateReadModelValidationResult> {
  const issues: ShowdownEngineCatalogUpdateAggregateReadModelValidationIssue[] = []
  const samples = await createShowdownEngineCatalogUpdateAggregateReadModelSamples()
  const readModels = Object.values(samples)
  const coveredStatuses = Array.from(new Set(readModels.map((readModel) => readModel.status)))
  const requiredStatuses: ShowdownEngineCatalogUpdateAggregateReadModel['status'][] = [
    'blocked-preview',
    'ready-preview',
    'failed-preserves-active',
    'cancelled-preserves-active',
  ]

  readModels.forEach((readModel, index) => validateAggregate(readModel, issues, `readModels.${index}`))

  requiredStatuses.forEach((status) => {
    if (!coveredStatuses.includes(status)) {
      issues.push(
        createIssue(
          'fixture-coverage-invalid',
          'error',
          'coveredStatuses',
          `Aggregate read-model samples must cover ${status}.`,
        ),
      )
    }
  })

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    coveredStatuses,
    checkedReadModelCount: readModels.length,
    readyPreviewCount: readModels.filter((readModel) => readModel.status === 'ready-preview').length,
    blockedOrTerminalCount: readModels.filter((readModel) => readModel.status !== 'ready-preview').length,
  }
}
