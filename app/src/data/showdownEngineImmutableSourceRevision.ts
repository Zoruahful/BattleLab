import {
  createShowdownEngineArchiveSourcePolicy,
  type ShowdownEngineArchiveSourcePolicy,
} from './showdownEngineArchiveSourcePolicy'
import type { ShowdownEngineArchiveBodyDownloadReadModel } from './showdownEngineArchiveBodyDownloadReadModel'

export type ShowdownEngineImmutableSourceRevisionStatus =
  | 'branch-preview-only'
  | 'immutable-policy-needed'
  | 'immutable-pinned-approved'
  | 'immutable-mismatch-blocked'

export type ShowdownEngineImmutableSourceRevisionApprovalStatus =
  | 'not-approved'
  | 'approved'
  | 'mismatch'

export interface ShowdownEngineImmutableSourceRevisionCandidate {
  repositoryOwner: 'smogon'
  repositoryName: 'pokemon-showdown'
  branchArchiveUrl: string
  branchRevisionLabel: string
  immutableArchiveUrl: string | null
  immutableRevision: string | null
  revisionIsImmutable: boolean
  branchPreviewAllowed: true
  activationRequiresImmutableRevision: true
}

export interface ShowdownEngineImmutableSourceRevisionChecksum {
  observedBranchArchiveSha256: string | null
  observedHashIsActivationAuthority: false
  approvedImmutableSha256: string | null
  approvedAt: string | null
  approvalStatus: ShowdownEngineImmutableSourceRevisionApprovalStatus
}

export interface ShowdownEngineImmutableSourceRevisionPromotionGate {
  activationBlocked: boolean
  reason: string
  previousActivePreserved: true
  previousActiveRevisionId: string
}

export interface ShowdownEngineImmutableSourceRevisionSafety {
  noImportTimeDownload: true
  noAppLoadDownload: true
  noPanelOpenDownload: true
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

export interface ShowdownEngineImmutableSourceRevision {
  revisionPolicyId: string
  status: ShowdownEngineImmutableSourceRevisionStatus
  message: string
  candidate: ShowdownEngineImmutableSourceRevisionCandidate
  checksum: ShowdownEngineImmutableSourceRevisionChecksum
  sourcePolicyHandoff: ShowdownEngineArchiveSourcePolicy
  promotionGate: ShowdownEngineImmutableSourceRevisionPromotionGate
  safety: ShowdownEngineImmutableSourceRevisionSafety
  boundaryNotes: string[]
}

export interface ShowdownEngineImmutableSourceRevisionInput {
  bodyReadModel: ShowdownEngineArchiveBodyDownloadReadModel
  immutableRevision?: string
  approvedImmutableSha256?: string
  approvedAt?: string
  revisionPolicyId?: string
}

const commitShaPattern = /^[a-f0-9]{40}$/i

const createImmutableArchiveUrl = (
  bodyReadModel: ShowdownEngineArchiveBodyDownloadReadModel,
  immutableRevision?: string,
): string | null => {
  if (!immutableRevision || !commitShaPattern.test(immutableRevision)) {
    return null
  }

  return `https://github.com/${bodyReadModel.source.repositoryOwner}/${bodyReadModel.source.repositoryName}/archive/${immutableRevision}.zip`
}

const determineStatus = (
  immutableRevision: string | undefined,
  observedSha256: string | null,
  approvedImmutableSha256: string | undefined,
): ShowdownEngineImmutableSourceRevisionStatus => {
  if (!immutableRevision) {
    return 'branch-preview-only'
  }

  if (!commitShaPattern.test(immutableRevision) || !approvedImmutableSha256 || !observedSha256) {
    return 'immutable-policy-needed'
  }

  return approvedImmutableSha256 === observedSha256 ? 'immutable-pinned-approved' : 'immutable-mismatch-blocked'
}

const createMessage = (status: ShowdownEngineImmutableSourceRevisionStatus): string => {
  if (status === 'immutable-pinned-approved') {
    return 'Immutable Pokemon Showdown source revision and approved checksum are ready for future staged validation.'
  }

  if (status === 'immutable-mismatch-blocked') {
    return 'Immutable revision checksum does not match the observed archive hash; activation remains blocked.'
  }

  if (status === 'immutable-policy-needed') {
    return 'Immutable revision metadata is present but still needs an approved checksum policy before activation.'
  }

  return 'Branch archive is allowed only for preview/download proof; activation requires an immutable revision.'
}

const createPromotionReason = (status: ShowdownEngineImmutableSourceRevisionStatus): string => {
  if (status === 'immutable-pinned-approved') {
    return 'Source revision gate is open for later extraction, required-file, and format-registry validation.'
  }

  if (status === 'immutable-mismatch-blocked') {
    return 'Promotion blocked by immutable revision checksum mismatch.'
  }

  return 'Promotion blocked until immutable revision and approved checksum metadata are available.'
}

export function createShowdownEngineImmutableSourceRevision(
  input: ShowdownEngineImmutableSourceRevisionInput,
): ShowdownEngineImmutableSourceRevision {
  const { bodyReadModel, immutableRevision, approvedImmutableSha256, approvedAt, revisionPolicyId } = input
  const status = determineStatus(immutableRevision, bodyReadModel.hash.sha256, approvedImmutableSha256)
  const immutableArchiveUrl = createImmutableArchiveUrl(bodyReadModel, immutableRevision)
  const sourcePolicyHandoff = createShowdownEngineArchiveSourcePolicy({
    bodyReadModel: immutableArchiveUrl
      ? {
          ...bodyReadModel,
          source: {
            ...bodyReadModel.source,
            archiveUrl: immutableArchiveUrl,
            revision: immutableRevision!,
          },
        }
      : bodyReadModel,
    approvedRevision: immutableRevision,
    approvedSha256: approvedImmutableSha256,
    approvedAt,
    policyId: `${revisionPolicyId ?? bodyReadModel.readModelId}-source-policy-handoff`,
  })

  return {
    revisionPolicyId: revisionPolicyId ?? `${bodyReadModel.readModelId}-immutable-source-revision`,
    status,
    message: createMessage(status),
    candidate: {
      repositoryOwner: 'smogon',
      repositoryName: 'pokemon-showdown',
      branchArchiveUrl: bodyReadModel.source.archiveUrl,
      branchRevisionLabel: bodyReadModel.source.revision,
      immutableArchiveUrl,
      immutableRevision: immutableRevision ?? null,
      revisionIsImmutable: Boolean(immutableRevision && commitShaPattern.test(immutableRevision)),
      branchPreviewAllowed: true,
      activationRequiresImmutableRevision: true,
    },
    checksum: {
      observedBranchArchiveSha256: bodyReadModel.hash.sha256,
      observedHashIsActivationAuthority: false,
      approvedImmutableSha256: approvedImmutableSha256 ?? null,
      approvedAt: approvedAt ?? null,
      approvalStatus:
        approvedImmutableSha256 && bodyReadModel.hash.sha256
          ? approvedImmutableSha256 === bodyReadModel.hash.sha256
            ? 'approved'
            : 'mismatch'
          : 'not-approved',
    },
    sourcePolicyHandoff,
    promotionGate: {
      activationBlocked: status !== 'immutable-pinned-approved',
      reason: createPromotionReason(status),
      previousActivePreserved: bodyReadModel.preservation.previousActivePreserved,
      previousActiveRevisionId: bodyReadModel.preservation.previousActiveRevisionId,
    },
    safety: {
      noImportTimeDownload: bodyReadModel.safety.noImportTimeDownload,
      noAppLoadDownload: bodyReadModel.safety.noAppLoadDownload,
      noPanelOpenDownload: bodyReadModel.safety.noPanelOpenDownload,
      noArchiveExtraction: bodyReadModel.safety.noArchiveExtraction,
      noFileIo: bodyReadModel.safety.noFileIo,
      noDynamicImports: bodyReadModel.safety.noDynamicImports,
      noLoaderExecution: bodyReadModel.safety.noLoaderExecution,
      noCatalogUpdatePanelWiring: bodyReadModel.safety.noCatalogUpdatePanelWiring,
      noSimulationExecution: bodyReadModel.safety.noSimulationExecution,
      customFormatsOverlayOnly: bodyReadModel.safety.customFormatsOverlayOnly,
      pokemonShowdownAuthority: bodyReadModel.safety.pokemonShowdownAuthority,
      catalogRole: bodyReadModel.safety.catalogRole,
    },
    boundaryNotes: [
      ...bodyReadModel.boundaryNotes,
      'Branch-style Pokemon Showdown archives are preview/download proof inputs only.',
      'Future activation requires an immutable commit archive URL and approved checksum policy before extraction or storage activation.',
    ],
  }
}
