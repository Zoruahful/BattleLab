import type { SubmittedTeam } from '../types'
import { submittedTeam } from './mockBattleLab'
import { createShowdownTeamLegalityReadModel } from './showdownTeamLegality'

export type ShowdownTeamLegalityValidationSeverity = 'error' | 'warning'

export type ShowdownTeamLegalityValidationCode =
  | 'supported-format-invalid'
  | 'fallback-format-invalid'
  | 'authority-boundary-invalid'
  | 'format-source-invalid'

export interface ShowdownTeamLegalityValidationIssue {
  code: ShowdownTeamLegalityValidationCode
  severity: ShowdownTeamLegalityValidationSeverity
  path: string
  message: string
}

export interface ShowdownTeamLegalityValidationResult {
  isValid: boolean
  issues: ShowdownTeamLegalityValidationIssue[]
  supportedFormatStatus: string
  fallbackFormatStatus: string
  supportedFormatLegalCount: number
  supportedFormatIllegalCount: number
  illegalCaseIllegalCount: number
  fallbackUnknownCount: number
  checkedCases: string[]
}

const checkedAt = '2026-06-16T12:00:00.000Z'

const createIssue = (
  code: ShowdownTeamLegalityValidationCode,
  severity: ShowdownTeamLegalityValidationSeverity,
  path: string,
  message: string,
): ShowdownTeamLegalityValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const withFormat = (team: SubmittedTeam, format: SubmittedTeam['format']): SubmittedTeam => ({
  ...team,
  format,
})

const withIllegalTyranitarSpore = (team: SubmittedTeam): SubmittedTeam => ({
  ...team,
  id: `${team.id}-illegal-spore-proof`,
  format: 'vgc-regulation-g',
  slots: team.slots.map((slot) => {
    if (slot.slot !== 1 || !slot.pokemon) return slot

    return {
      ...slot,
      pokemon: {
        ...slot.pokemon,
        moves: ['Rock Slide', 'Spore', 'Knock Off', 'Low Kick'],
        moveRefs: [
          slot.pokemon.moveRefs?.[0] ?? null,
          { catalogKey: 'move-spore', showdownId: 'spore', displayName: 'Spore' },
          slot.pokemon.moveRefs?.[2] ?? null,
          slot.pokemon.moveRefs?.[3] ?? null,
        ],
      },
    }
  }) as SubmittedTeam['slots'],
})

export async function validateShowdownTeamLegality(): Promise<ShowdownTeamLegalityValidationResult> {
  const issues: ShowdownTeamLegalityValidationIssue[] = []
  const supported = await createShowdownTeamLegalityReadModel(withFormat(submittedTeam, 'vgc-regulation-g'), {
    checkedAt,
    runtimeLoader: 'browser-data',
  })
  const illegalCase = await createShowdownTeamLegalityReadModel(withIllegalTyranitarSpore(submittedTeam), {
    checkedAt,
    runtimeLoader: 'browser-data',
  })
  const fallback = await createShowdownTeamLegalityReadModel(withFormat(submittedTeam, 'custom'), {
    checkedAt,
    runtimeLoader: 'browser-data',
  })

  if (
    supported.status !== 'complete' ||
    supported.slotResults.length === 0 ||
    supported.legalCount + supported.illegalCount === 0
  ) {
    issues.push(
      createIssue(
        'supported-format-invalid',
        'error',
        'supported',
        'Supported team format must produce Pokemon Showdown-sourced legal or illegal move/ability results.',
      ),
    )
  }

  if (
    illegalCase.status !== 'complete' ||
    illegalCase.illegalCount === 0 ||
    !illegalCase.slotResults.some((slot) =>
      slot.readModel.rows.some(
        (row) =>
          row.option.showdownId === 'spore' &&
          row.status === 'illegal-in-selected-format' &&
          row.source === 'pokemon-showdown',
      ),
    )
  ) {
    issues.push(
      createIssue(
        'supported-format-invalid',
        'error',
        'illegalCase',
        'Supported team format must surface Pokemon Showdown-sourced illegal move labels.',
      ),
    )
  }

  if (
    fallback.status !== 'runtime-unavailable' ||
    !fallback.runtimeUnavailable ||
    fallback.legalCount > 0 ||
    fallback.illegalCount > 0
  ) {
    issues.push(
      createIssue(
        'fallback-format-invalid',
        'error',
        'fallback',
        'Unsupported/custom team format must preserve runtime-unavailable fallback and avoid legal/illegal labels.',
      ),
    )
  }

  if (
    !supported.boundaryNotes.some((note) => note.includes('selected team format')) ||
    supported.format !== 'vgc-regulation-g' ||
    fallback.format !== 'custom'
  ) {
    issues.push(
      createIssue(
        'format-source-invalid',
        'error',
        'format',
        'Team legality must use the selected team format as the format source.',
      ),
    )
  }

  const rows = [...supported.slotResults, ...illegalCase.slotResults, ...fallback.slotResults].flatMap(
    (slot) => slot.readModel.rows,
  )
  if (
    rows.some((row) =>
      (row.status === 'legal-in-selected-format' || row.status === 'illegal-in-selected-format') &&
      row.source !== 'pokemon-showdown',
    )
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        'rows',
        'Legal and illegal move/ability labels must come only from Pokemon Showdown evidence.',
      ),
    )
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    supportedFormatStatus: supported.status,
    fallbackFormatStatus: fallback.status,
    supportedFormatLegalCount: supported.legalCount,
    supportedFormatIllegalCount: supported.illegalCount,
    illegalCaseIllegalCount: illegalCase.illegalCount,
    fallbackUnknownCount: fallback.unknownCount,
    checkedCases: [
      'team-level supported format check',
      'team-level supported format illegal label check',
      'team-level custom format fallback',
      'selected team format source',
      'Pokemon Showdown-only legal/illegal labels',
    ],
  }
}
