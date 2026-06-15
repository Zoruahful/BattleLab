import type {
  ShowdownEngineFormatRegistryLoaderProof,
} from './showdownEngineFormatRegistryLoaderProof'
import {
  sampleShowdownEngineFormatRegistryLoaderProofs,
} from './showdownEngineFormatRegistryLoaderProof'

export type ShowdownEngineFormatRegistryLoaderProofValidationSeverity = 'error' | 'warning'

export type ShowdownEngineFormatRegistryLoaderProofValidationCode =
  | 'fixture-missing'
  | 'source-file-invalid'
  | 'registry-readiness-invalid'
  | 'blocked-staged-revision-invalid'
  | 'overlay-policy-invalid'
  | 'safety-boundary-invalid'
  | 'authority-boundary-invalid'
  | 'boundary-note-invalid'

export interface ShowdownEngineFormatRegistryLoaderProofValidationIssue {
  code: ShowdownEngineFormatRegistryLoaderProofValidationCode
  severity: ShowdownEngineFormatRegistryLoaderProofValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineFormatRegistryLoaderProofValidationResult {
  isValid: boolean
  issues: ShowdownEngineFormatRegistryLoaderProofValidationIssue[]
  checkedProofCount: number
  availableRegistryCount: number
  blockedRegistryCount: number
  unavailableRegistryCount: number
}

const createIssue = (
  code: ShowdownEngineFormatRegistryLoaderProofValidationCode,
  severity: ShowdownEngineFormatRegistryLoaderProofValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineFormatRegistryLoaderProofValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateRequiredFixtures = (
  proofs: Record<string, ShowdownEngineFormatRegistryLoaderProof>,
  issues: ShowdownEngineFormatRegistryLoaderProofValidationIssue[],
) => {
  const requiredKeys = ['activeAvailable', 'stagedAvailable', 'failedStagedBlocked', 'unavailableFallback']

  requiredKeys.forEach((key) => {
    if (!proofs[key]) {
      issues.push(
        createIssue(
          'fixture-missing',
          'error',
          key,
          `Format registry loader proof must include ${key}.`,
        ),
      )
    }
  })
}

const validateProof = (
  proof: ShowdownEngineFormatRegistryLoaderProof,
  issues: ShowdownEngineFormatRegistryLoaderProofValidationIssue[],
  path: string,
) => {
  if (
    proof.requiredSourceFile.purpose !== 'formats-registry' ||
    !proof.requiredSourceFile.required ||
    !proof.requiredSourceFile.metadataOnly ||
    !proof.requiredSourceFile.relativePath
  ) {
    issues.push(
      createIssue(
        'source-file-invalid',
        'error',
        `${path}.requiredSourceFile`,
        'Loader proof must model a metadata-only required formats-registry source file.',
      ),
    )
  }

  if (
    proof.status === 'available' &&
    (proof.registry.status !== 'available' || proof.registry.officialFormatCount < 1)
  ) {
    issues.push(
      createIssue(
        'registry-readiness-invalid',
        'error',
        `${path}.registry`,
        'Available loader proof must expose official Pokemon Showdown format registry readiness.',
      ),
    )
  }

  if (
    proof.status === 'blocked' &&
    (proof.stagedRevisionBecomesActive || !proof.previousActivePreserved || proof.sourceRevisionStatus !== 'rejected')
  ) {
    issues.push(
      createIssue(
        'blocked-staged-revision-invalid',
        'error',
        `${path}.sourceRevisionStatus`,
        'Blocked staged revision proof must not become active and must preserve previous active registry metadata.',
      ),
    )
  }

  if (
    proof.status === 'unavailable' &&
    (proof.registry.status !== 'unavailable' || proof.registry.officialFormatCount !== 0 || !proof.previousActivePreserved)
  ) {
    issues.push(
      createIssue(
        'registry-readiness-invalid',
        'error',
        `${path}.registry`,
        'Unavailable fallback proof must clearly report unavailable registry data and preserve previous active metadata.',
      ),
    )
  }

  if (
    proof.customOverlay.overlayFolderKey !== 'battlelab-custom-overlays' ||
    proof.customOverlay.mergeStrategy !== 'read-overlay-after-official-registry' ||
    proof.customOverlay.modifiesUpstreamSourceInPlace ||
    proof.customOverlay.status !== 'supported'
  ) {
    issues.push(
      createIssue(
        'overlay-policy-invalid',
        'error',
        `${path}.customOverlay`,
        'BattleLab custom format overlays must not modify upstream Pokemon Showdown source in place.',
      ),
    )
  }

  if (
    !proof.safety.explicitUserActionRequired ||
    !proof.safety.noImportTimeExecution ||
    !proof.safety.noAppLoadExecution ||
    !proof.safety.noPanelOpenExecution ||
    !proof.safety.noFileReads ||
    !proof.safety.noDynamicImports ||
    !proof.safety.noArchiveExtraction ||
    !proof.safety.noLoaderExecution ||
    !proof.safety.noSimulationExecution ||
    proof.storageContract.safety.realFileIoImplemented ||
    proof.storageContract.safety.simulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-boundary-invalid',
        'error',
        `${path}.safety`,
        'Format registry loader proof must remain metadata-only and no-IO.',
      ),
    )
  }

  if (
    proof.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    proof.safety.catalogRole !== 'enrichment-only'
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.safety`,
        'Pokemon Showdown must remain legality/simulation source of truth and PokeAPI/catalog data must remain enrichment-only.',
      ),
    )
  }

  if (
    !proof.boundaryNotes.some((note) => note.includes('metadata-only')) ||
    !proof.boundaryNotes.some((note) => note.includes('file reads') || note.includes('no-IO'))
  ) {
    issues.push(
      createIssue(
        'boundary-note-invalid',
        'error',
        `${path}.boundaryNotes`,
        'Loader proof boundary notes must preserve metadata-only and no-file-read semantics.',
      ),
    )
  }
}

export function validateShowdownEngineFormatRegistryLoaderProof(
  proofs: Record<string, ShowdownEngineFormatRegistryLoaderProof> = sampleShowdownEngineFormatRegistryLoaderProofs,
): ShowdownEngineFormatRegistryLoaderProofValidationResult {
  const issues: ShowdownEngineFormatRegistryLoaderProofValidationIssue[] = []
  const proofEntries = Object.entries(proofs)

  validateRequiredFixtures(proofs, issues)
  proofEntries.forEach(([key, proof]) => validateProof(proof, issues, key))

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    checkedProofCount: proofEntries.length,
    availableRegistryCount: proofEntries.filter(([, proof]) => proof.status === 'available').length,
    blockedRegistryCount: proofEntries.filter(([, proof]) => proof.status === 'blocked').length,
    unavailableRegistryCount: proofEntries.filter(([, proof]) => proof.status === 'unavailable').length,
  }
}

export const sampleShowdownEngineFormatRegistryLoaderProofValidation = validateShowdownEngineFormatRegistryLoaderProof()
