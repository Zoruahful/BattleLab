import type { ShowdownEngineRequiredFileCheck } from './showdownEngineUpdateArchitecture'
import {
  showdownEngineCustomFormatOverlayPolicy,
  showdownEngineRequiredFileChecks,
} from './showdownEngineUpdateArchitecture'
import type { ShowdownEngineImmutableSourceRevision } from './showdownEngineImmutableSourceRevision'

export type ShowdownEngineArchiveContentsManifestStatus =
  | 'manifest-valid'
  | 'manifest-blocked-by-source-policy'
  | 'manifest-missing-required-file'
  | 'manifest-not-inspected'

export interface ShowdownEngineArchiveContentsManifestFile {
  relativePath: string
  purpose: ShowdownEngineRequiredFileCheck['purpose']
  required: true
  expectedAfterExtraction: true
  status: 'planned' | 'present' | 'missing'
  message: string
}

export interface ShowdownEngineArchiveContentsOverlayHandoff {
  supported: true
  modifyUpstreamSourceInPlace: false
  overlayFolderKey: 'battlelab-custom-overlays'
  mergeStrategy: 'read-overlay-after-official-registry'
  status: 'planned'
  message: string
}

export interface ShowdownEngineArchiveContentsManifestPromotionGate {
  promotionBlocked: boolean
  reason: string
  previousActivePreserved: true
  previousActiveRevisionId: string
}

export interface ShowdownEngineArchiveContentsManifestSafety {
  noImportTimeDownload: true
  noAppLoadDownload: true
  noPanelOpenDownload: true
  noArchiveInspection: true
  noArchiveExtraction: true
  noFileIo: true
  noDynamicImports: true
  noLoaderExecution: true
  noCatalogUpdatePanelWiring: true
  noSimulationExecution: true
  customFormatsOverlayOnly: true
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownEngineArchiveContentsManifest {
  manifestId: string
  status: ShowdownEngineArchiveContentsManifestStatus
  message: string
  immutableSourcePolicy: ShowdownEngineImmutableSourceRevision
  requiredFiles: ShowdownEngineArchiveContentsManifestFile[]
  overlayHandoff: ShowdownEngineArchiveContentsOverlayHandoff
  promotionGate: ShowdownEngineArchiveContentsManifestPromotionGate
  safety: ShowdownEngineArchiveContentsManifestSafety
  boundaryNotes: string[]
}

export interface ShowdownEngineArchiveContentsManifestInput {
  immutableSourcePolicy: ShowdownEngineImmutableSourceRevision
  fileStatuses?: Partial<Record<ShowdownEngineRequiredFileCheck['relativePath'], ShowdownEngineArchiveContentsManifestFile['status']>>
  manifestId?: string
}

const createRequiredFiles = (
  fileStatuses: ShowdownEngineArchiveContentsManifestInput['fileStatuses'] = {},
): ShowdownEngineArchiveContentsManifestFile[] =>
  showdownEngineRequiredFileChecks.map((file) => {
    const status = fileStatuses[file.relativePath] ?? 'planned'

    return {
      relativePath: file.relativePath,
      purpose: file.purpose,
      required: true,
      expectedAfterExtraction: true,
      status,
      message:
        status === 'missing'
          ? `${file.relativePath} is missing in the planned contents manifest.`
          : status === 'present'
            ? `${file.relativePath} is represented as present in a static manifest fixture.`
            : `${file.relativePath} is expected after future archive extraction.`,
    }
  })

const determineStatus = (
  immutableSourcePolicy: ShowdownEngineImmutableSourceRevision,
  files: ShowdownEngineArchiveContentsManifestFile[],
): ShowdownEngineArchiveContentsManifestStatus => {
  if (files.some((file) => file.status === 'missing')) {
    return 'manifest-missing-required-file'
  }

  if (immutableSourcePolicy.status !== 'immutable-pinned-approved') {
    return 'manifest-blocked-by-source-policy'
  }

  if (files.every((file) => file.status === 'present')) {
    return 'manifest-valid'
  }

  return 'manifest-not-inspected'
}

const createMessage = (status: ShowdownEngineArchiveContentsManifestStatus): string => {
  if (status === 'manifest-valid') {
    return 'Required Pokemon Showdown Engine source files are represented for a future staged validation handoff.'
  }

  if (status === 'manifest-missing-required-file') {
    return 'Required Pokemon Showdown Engine source file metadata is missing; activation remains blocked.'
  }

  if (status === 'manifest-blocked-by-source-policy') {
    return 'Archive contents manifest remains blocked until immutable source revision policy is pinned-approved.'
  }

  return 'Archive contents manifest is planned only; actual archive contents have not been inspected or extracted.'
}

const createPromotionReason = (status: ShowdownEngineArchiveContentsManifestStatus): string => {
  if (status === 'manifest-valid') {
    return 'Manifest gate can proceed to later no-IO extraction planning, then real staged validation only after approval.'
  }

  if (status === 'manifest-missing-required-file') {
    return 'Promotion blocked because required source file metadata is missing.'
  }

  if (status === 'manifest-blocked-by-source-policy') {
    return 'Promotion blocked because immutable source revision policy is not pinned-approved.'
  }

  return 'Promotion blocked because archive contents have not been inspected after extraction.'
}

export function createShowdownEngineArchiveContentsManifest(
  input: ShowdownEngineArchiveContentsManifestInput,
): ShowdownEngineArchiveContentsManifest {
  const requiredFiles = createRequiredFiles(input.fileStatuses)
  const status = determineStatus(input.immutableSourcePolicy, requiredFiles)

  return {
    manifestId: input.manifestId ?? `${input.immutableSourcePolicy.revisionPolicyId}-contents-manifest`,
    status,
    message: createMessage(status),
    immutableSourcePolicy: input.immutableSourcePolicy,
    requiredFiles,
    overlayHandoff: {
      supported: showdownEngineCustomFormatOverlayPolicy.supported,
      modifyUpstreamSourceInPlace: showdownEngineCustomFormatOverlayPolicy.modifyUpstreamSourceInPlace,
      overlayFolderKey: showdownEngineCustomFormatOverlayPolicy.overlayFolderKey,
      mergeStrategy: showdownEngineCustomFormatOverlayPolicy.mergeStrategy,
      status: 'planned',
      message: 'BattleLab custom format overlays remain separate from upstream Pokemon Showdown source files.',
    },
    promotionGate: {
      promotionBlocked: status !== 'manifest-valid',
      reason: createPromotionReason(status),
      previousActivePreserved: input.immutableSourcePolicy.promotionGate.previousActivePreserved,
      previousActiveRevisionId: input.immutableSourcePolicy.promotionGate.previousActiveRevisionId,
    },
    safety: {
      noImportTimeDownload: input.immutableSourcePolicy.safety.noImportTimeDownload,
      noAppLoadDownload: input.immutableSourcePolicy.safety.noAppLoadDownload,
      noPanelOpenDownload: input.immutableSourcePolicy.safety.noPanelOpenDownload,
      noArchiveInspection: true,
      noArchiveExtraction: input.immutableSourcePolicy.safety.noArchiveExtraction,
      noFileIo: input.immutableSourcePolicy.safety.noFileIo,
      noDynamicImports: input.immutableSourcePolicy.safety.noDynamicImports,
      noLoaderExecution: input.immutableSourcePolicy.safety.noLoaderExecution,
      noCatalogUpdatePanelWiring: input.immutableSourcePolicy.safety.noCatalogUpdatePanelWiring,
      noSimulationExecution: input.immutableSourcePolicy.safety.noSimulationExecution,
      customFormatsOverlayOnly: input.immutableSourcePolicy.safety.customFormatsOverlayOnly,
      pokemonShowdownAuthority: input.immutableSourcePolicy.safety.pokemonShowdownAuthority,
      catalogRole: input.immutableSourcePolicy.safety.catalogRole,
    },
    boundaryNotes: [
      ...input.immutableSourcePolicy.boundaryNotes,
      'Archive contents manifest is expected-file metadata only and does not inspect, extract, read, write, import, load, or execute archive contents.',
      'Required file validation can only become authoritative after a future approved extraction/staging lane.',
    ],
  }
}

