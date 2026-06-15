import type {
  BuildCatalogReference,
  ShowdownLegalityFieldResult,
  ShowdownLegalityMessage,
  ShowdownLegalityRequest,
  ShowdownLegalityResult,
  ShowdownLegalityRuntimeMetadata,
} from '../types'
import type {
  ShowdownRuntimeAdapterEnvironment,
  ShowdownRuntimeAdapterEvent,
  ShowdownRuntimeAdapterFieldEvidence,
  ShowdownRuntimeAdapterRequest,
  ShowdownRuntimeAdapterResponse,
  ShowdownRuntimeAdapterSafetyPolicy,
  ShowdownRuntimeUnavailableResult,
} from '../types/showdownRuntime'
import { createPokemonEditorShowdownLegalityRequest } from './showdownLegalityRuntimeProof'

const fixtureTimestamp = '2026-06-15T23:00:00.000Z'

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

export const sampleShowdownRuntimeAdapterEnvironment: ShowdownRuntimeAdapterEnvironment = {
  boundaryKind: 'child-process-preview',
  adapterName: 'BattleLab Showdown legality adapter',
  adapterVersion: 'phase3-preview',
  packageName: 'pokemon-showdown',
  supportsChildProcess: true,
  supportsBrowserExecution: false,
  supportsSimulationExecution: false,
}

export const sampleShowdownRuntimeAdapterSafetyPolicy: ShowdownRuntimeAdapterSafetyPolicy = {
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth',
  catalogRole: 'enrichment-only',
  allowCatalogOnlyFinalLegality: false,
  allowSimulationExecution: false,
  allowPersistentStorage: false,
  allowNetworkFetch: false,
  preserveRuntimeUnavailableFallback: true,
}

export const sampleShowdownRuntimeMetadataUnavailable: ShowdownLegalityRuntimeMetadata = {
  boundaryKind: 'runtime-contract-only',
  contractVersion: 'phase3-showdown-legality-v1',
  runtimeUnavailableReason: 'runtime-not-implemented',
}

export const sampleShowdownRuntimeMetadataAvailable: ShowdownLegalityRuntimeMetadata = {
  boundaryKind: 'future-child-process',
  contractVersion: 'phase3-showdown-legality-v1',
  showdownVersion: 'fixture-showdown-runtime',
  showdownDexVersion: 'fixture-dex-v1',
}

const baseLegalityRequest = createPokemonEditorShowdownLegalityRequest({
  requestedAt: fixtureTimestamp,
  format: 'vgc-regulation-h',
  species: tyranitar,
  ability: sandStream,
  item: null,
  teraType: null,
  moves: [rockSlide, null, null, null],
})

const createMessage = (
  code: string,
  message: string,
  severity: ShowdownLegalityMessage['severity'] = 'info',
  field?: ShowdownLegalityMessage['field'],
  slotIndex?: ShowdownLegalityMessage['slotIndex'],
): ShowdownLegalityMessage => ({
  code,
  severity,
  ...(field ? { field } : {}),
  ...(slotIndex !== undefined ? { slotIndex } : {}),
  message,
})

const createEvent = (
  requestId: string,
  kind: ShowdownRuntimeAdapterEvent['kind'],
  status: ShowdownRuntimeAdapterEvent['status'],
  message: string,
): ShowdownRuntimeAdapterEvent => ({
  eventId: `${requestId}-${kind}`,
  requestId,
  kind,
  status,
  emittedAt: fixtureTimestamp,
  message,
})

const createFieldResult = (
  requestFieldId: string,
  value: BuildCatalogReference,
  status: ShowdownLegalityFieldResult['status'],
  message: ShowdownLegalityMessage,
  field: ShowdownLegalityFieldResult['field'],
  slotIndex?: ShowdownLegalityFieldResult['slotIndex'],
): ShowdownLegalityFieldResult => ({
  requestFieldId,
  field,
  ...(slotIndex !== undefined ? { slotIndex } : {}),
  value,
  status,
  behavior: 'legality-defining',
  selectable: true,
  legalityDefining: true,
  messages: [message],
})

const createLegalityResult = (
  requestId: string,
  fields: ShowdownLegalityFieldResult[],
): ShowdownLegalityResult => ({
  requestId,
  status: fields.some((field) => field.status === 'illegal') ? 'illegal' : 'legal',
  checkedAt: fixtureTimestamp,
  runtimeMetadata: sampleShowdownRuntimeMetadataAvailable,
  fields,
  messages: [createMessage('showdown-runtime-authoritative', 'Pokemon Showdown produced this fixture result.')],
})

const createAdapterRequest = (
  requestId: string,
  legalityRequest: ShowdownLegalityRequest,
): ShowdownRuntimeAdapterRequest => ({
  requestId,
  requestedAt: fixtureTimestamp,
  checkKind: 'pokemon-editor-move-ability',
  format: 'vgc-regulation-h',
  legalityRequest,
  moveCheck: {
    species: tyranitar,
    candidateMoves: [rockSlide, spore],
    format: 'vgc-regulation-h',
  },
  abilityCheck: {
    species: tyranitar,
    candidateAbilities: [sandStream, stench],
    format: 'vgc-regulation-h',
  },
  environment: sampleShowdownRuntimeAdapterEnvironment,
  safetyPolicy: sampleShowdownRuntimeAdapterSafetyPolicy,
})

const createResponse = (
  request: ShowdownRuntimeAdapterRequest,
  status: ShowdownRuntimeAdapterResponse['status'],
  fieldEvidence: ShowdownRuntimeAdapterFieldEvidence[],
  legalityResult?: ShowdownLegalityResult,
  unavailableResult?: ShowdownRuntimeUnavailableResult,
): ShowdownRuntimeAdapterResponse => ({
  requestId: request.requestId,
  status,
  checkedAt: fixtureTimestamp,
  runtimeMetadata: legalityResult?.runtimeMetadata ?? unavailableResult?.runtimeMetadata ?? sampleShowdownRuntimeMetadataAvailable,
  ...(legalityResult ? { legalityResult } : {}),
  ...(unavailableResult ? { unavailableResult } : {}),
  fieldEvidence,
  events: [
    createEvent(request.requestId, 'adapter-started', 'starting', 'Adapter boundary accepted the request.'),
    createEvent(request.requestId, status === 'runtime-unavailable' ? 'runtime-unavailable' : 'check-complete', status, 'Adapter fixture completed.'),
  ],
  messages: legalityResult?.messages ?? unavailableResult?.messages ?? [],
  safetyPolicy: request.safetyPolicy,
})

export const sampleShowdownRuntimeAdapterRequest =
  createAdapterRequest('showdown-runtime-fixture-request', baseLegalityRequest)

export const sampleShowdownRuntimeUnavailableResult: ShowdownRuntimeUnavailableResult = {
  status: 'runtime-unavailable',
  reason: 'runtime-not-implemented',
  runtimeMetadata: sampleShowdownRuntimeMetadataUnavailable,
  messages: [
    createMessage(
      'runtime-unavailable',
      'Pokemon Showdown runtime is not available; preserve runtime-unavailable fallback.',
      'warning',
    ),
  ],
}

export const sampleShowdownRuntimeUnavailableResponse = createResponse(
  sampleShowdownRuntimeAdapterRequest,
  'runtime-unavailable',
  [],
  undefined,
  sampleShowdownRuntimeUnavailableResult,
)

export const sampleShowdownRuntimeAvailableResponse = createResponse(
  sampleShowdownRuntimeAdapterRequest,
  'complete',
  [],
  createLegalityResult(sampleShowdownRuntimeAdapterRequest.requestId, []),
)

export const sampleShowdownMoveLegalResponse = createResponse(
  sampleShowdownRuntimeAdapterRequest,
  'complete',
  [
    {
      field: 'move',
      slotIndex: 0,
      value: rockSlide,
      status: 'legal',
      source: 'pokemon-showdown',
      showdownDetail: 'Fixture: Tyranitar can learn Rock Slide.',
    },
  ],
  createLegalityResult(sampleShowdownRuntimeAdapterRequest.requestId, [
    createFieldResult(
      'move-1',
      rockSlide,
      'legal',
      createMessage('move-legal', 'Pokemon Showdown fixture allows Rock Slide.', 'info', 'move', 0),
      'move',
      0,
    ),
  ]),
)

export const sampleShowdownMoveIllegalResponse = createResponse(
  sampleShowdownRuntimeAdapterRequest,
  'complete',
  [
    {
      field: 'move',
      slotIndex: 1,
      value: spore,
      status: 'illegal',
      source: 'pokemon-showdown',
      showdownDetail: 'Fixture: Tyranitar cannot learn Spore.',
    },
  ],
  createLegalityResult(sampleShowdownRuntimeAdapterRequest.requestId, [
    createFieldResult(
      'move-2',
      spore,
      'illegal',
      createMessage('move-illegal', 'Pokemon Showdown fixture rejects Spore.', 'error', 'move', 1),
      'move',
      1,
    ),
  ]),
)

export const sampleShowdownAbilityLegalResponse = createResponse(
  sampleShowdownRuntimeAdapterRequest,
  'complete',
  [
    {
      field: 'ability',
      value: sandStream,
      status: 'legal',
      source: 'pokemon-showdown',
      showdownDetail: 'Fixture: Sand Stream is valid for Tyranitar.',
    },
  ],
  createLegalityResult(sampleShowdownRuntimeAdapterRequest.requestId, [
    createFieldResult(
      'ability',
      sandStream,
      'legal',
      createMessage('ability-legal', 'Pokemon Showdown fixture allows Sand Stream.', 'info', 'ability'),
      'ability',
    ),
  ]),
)

export const sampleShowdownAbilityIllegalResponse = createResponse(
  sampleShowdownRuntimeAdapterRequest,
  'complete',
  [
    {
      field: 'ability',
      value: stench,
      status: 'illegal',
      source: 'pokemon-showdown',
      showdownDetail: 'Fixture: Stench is not valid for Tyranitar.',
    },
  ],
  createLegalityResult(sampleShowdownRuntimeAdapterRequest.requestId, [
    createFieldResult(
      'ability',
      stench,
      'illegal',
      createMessage('ability-illegal', 'Pokemon Showdown fixture rejects Stench.', 'error', 'ability'),
      'ability',
    ),
  ]),
)

export const sampleShowdownCatalogHintDisagreementResponse = createResponse(
  sampleShowdownRuntimeAdapterRequest,
  'runtime-unavailable',
  [
    {
      field: 'ability',
      value: stench,
      status: 'unknown',
      source: 'catalog-preview',
      catalogHintDisagrees: true,
      showdownDetail: 'Catalog disagreement cannot mark final legality without Pokemon Showdown.',
    },
  ],
  undefined,
  sampleShowdownRuntimeUnavailableResult,
)

export const sampleShowdownRuntimeAdapterResponses = [
  sampleShowdownRuntimeUnavailableResponse,
  sampleShowdownRuntimeAvailableResponse,
  sampleShowdownMoveLegalResponse,
  sampleShowdownMoveIllegalResponse,
  sampleShowdownAbilityLegalResponse,
  sampleShowdownAbilityIllegalResponse,
  sampleShowdownCatalogHintDisagreementResponse,
]
