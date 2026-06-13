import type {
  BattleLabCatalogBundle,
  BattleLabCatalogBundleHash,
  BattleLabCatalogBundleSectionHashes,
  BattleLabCatalogBundleSectionName,
  BattleLabCatalogBundleValidationIssue,
  BattleLabCatalogBundleValidationResult,
} from '../types/catalogBundle'
import { sampleBattleLabCatalogBundle } from './catalogBundleFixture'
import { validateBattleLabCatalogBundleFixture } from './catalogBundleValidation'

export const battleLabCatalogBundleCanonicalization = 'battlelab-json-stable-v1'

const bundleSectionNames: BattleLabCatalogBundleSectionName[] = [
  'pokemon',
  'moves',
  'abilities',
  'items',
  'types',
  'natures',
  'assets',
  'searchIndex',
]

const assertSupportedCanonicalValue = (value: unknown, path: string) => {
  if (value === undefined) {
    throw new Error(`Cannot canonicalize undefined at ${path}.`)
  }

  if (typeof value === 'function') {
    throw new Error(`Cannot canonicalize function at ${path}.`)
  }

  if (typeof value === 'symbol') {
    throw new Error(`Cannot canonicalize symbol at ${path}.`)
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`Cannot canonicalize non-finite number at ${path}.`)
  }

  if (value instanceof Date) {
    throw new Error(`Cannot canonicalize Date object at ${path}; use an ISO string.`)
  }
}

const canonicalizeValue = (value: unknown, path: string): string => {
  assertSupportedCanonicalValue(value, path)

  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item, index) => canonicalizeValue(item, `${path}[${index}]`)).join(',')}]`
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort((left, right) => left.localeCompare(right))

  return `{${keys
    .map((key) => {
      const item = record[key]
      assertSupportedCanonicalValue(item, `${path}.${key}`)

      return `${JSON.stringify(key)}:${canonicalizeValue(item, `${path}.${key}`)}`
    })
    .join(',')}}`
}

const bytesToHex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

const getCryptoSubtle = () => {
  const subtle = globalThis.crypto?.subtle

  if (!subtle) {
    throw new Error('SHA-256 hashing requires globalThis.crypto.subtle.')
  }

  return subtle
}

export function canonicalizeBattleLabCatalogBundleSection(payload: unknown) {
  return canonicalizeValue(payload, '$')
}

export async function hashBattleLabCatalogBundlePayload(
  payload: unknown,
): Promise<BattleLabCatalogBundleHash> {
  const canonicalPayload = canonicalizeBattleLabCatalogBundleSection(payload)
  const encodedPayload = new TextEncoder().encode(canonicalPayload)
  const digest = await getCryptoSubtle().digest('SHA-256', encodedPayload)

  return {
    algorithm: 'sha256',
    value: bytesToHex(digest),
    canonicalization: battleLabCatalogBundleCanonicalization,
  }
}

export async function createBattleLabCatalogBundleSectionHashes(
  bundle: BattleLabCatalogBundle,
): Promise<BattleLabCatalogBundleSectionHashes> {
  const entries = await Promise.all(
    bundleSectionNames.map(async (sectionName) => [
      sectionName,
      await hashBattleLabCatalogBundlePayload(bundle.sections[sectionName]),
    ] as const),
  )

  return Object.fromEntries(entries) as BattleLabCatalogBundleSectionHashes
}

export async function createBattleLabCatalogBundleHash(
  bundle: BattleLabCatalogBundle,
): Promise<BattleLabCatalogBundleHash> {
  const bundleHashPayload = {
    fileExtension: bundle.fileExtension,
    readOnly: bundle.readOnly,
    manifest: {
      ...bundle.manifest,
      bundleHash: null,
      signature: null,
    },
    sections: bundle.sections,
  }

  return hashBattleLabCatalogBundlePayload(bundleHashPayload)
}

export async function createSampleBattleLabCatalogBundleWithHashes(): Promise<BattleLabCatalogBundle> {
  const sectionHashes = await createBattleLabCatalogBundleSectionHashes(sampleBattleLabCatalogBundle)
  const bundleWithSectionHashes: BattleLabCatalogBundle = {
    ...sampleBattleLabCatalogBundle,
    manifest: {
      ...sampleBattleLabCatalogBundle.manifest,
      sectionHashes,
      bundleHash: {
        algorithm: 'unknown',
        value: 'pending-bundle-hash',
        canonicalization: battleLabCatalogBundleCanonicalization,
      },
      warnings: sampleBattleLabCatalogBundle.manifest.warnings.filter(
        (warning) => !warning.includes('placeholder'),
      ),
    },
  }
  const bundleHash = await createBattleLabCatalogBundleHash(bundleWithSectionHashes)

  return {
    ...bundleWithSectionHashes,
    manifest: {
      ...bundleWithSectionHashes.manifest,
      bundleHash,
    },
  }
}

const addIssue = (
  issues: BattleLabCatalogBundleValidationIssue[],
  issue: BattleLabCatalogBundleValidationIssue,
) => {
  issues.push(issue)
}

const validateHashMatch = (
  issues: BattleLabCatalogBundleValidationIssue[],
  path: string,
  actual: BattleLabCatalogBundleHash,
  expected: BattleLabCatalogBundleHash,
  section?: BattleLabCatalogBundleSectionName,
) => {
  if (
    actual.algorithm !== expected.algorithm ||
    actual.value !== expected.value ||
    actual.canonicalization !== expected.canonicalization
  ) {
    addIssue(issues, {
      code: 'hash-mismatch',
      severity: 'error',
      path,
      section,
      message: 'Bundle hash does not match the deterministic canonical payload hash.',
    })
  }
}

export async function validateBattleLabCatalogBundleHashes(
  bundle: BattleLabCatalogBundle,
): Promise<BattleLabCatalogBundleValidationResult> {
  const structureResult = validateBattleLabCatalogBundleFixture(bundle)
  const issues: BattleLabCatalogBundleValidationIssue[] = [...structureResult.issues]

  try {
    const expectedSectionHashes = await createBattleLabCatalogBundleSectionHashes(bundle)
    bundleSectionNames.forEach((sectionName) => {
      validateHashMatch(
        issues,
        `manifest.sectionHashes.${sectionName}`,
        bundle.manifest.sectionHashes[sectionName],
        expectedSectionHashes[sectionName],
        sectionName,
      )
    })

    validateHashMatch(
      issues,
      'manifest.bundleHash',
      bundle.manifest.bundleHash,
      await createBattleLabCatalogBundleHash(bundle),
    )
  } catch (error) {
    addIssue(issues, {
      code: 'hash-validation-failed',
      severity: 'error',
      path: 'manifest',
      message: error instanceof Error ? error.message : 'Bundle hash validation failed.',
    })
  }

  const isValid = issues.every((issue) => issue.severity !== 'error')

  return {
    status: isValid ? 'loaded' : 'invalid',
    isValid,
    issues,
  }
}
