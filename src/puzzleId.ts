export const PUZZLE_BASE = Date.UTC(2026, 6, 16)
export const PUZZLE_DAY = 86_400_000
export const PUZZLE_COUNT = 300

export function getPuzzleId(): number {
  return Math.floor((new Date().setHours(0, 0, 0, 0) - PUZZLE_BASE) / PUZZLE_DAY) % PUZZLE_COUNT + 1
}

export function puzzleIdToDate(puzzleId: number): Date {
  return new Date(PUZZLE_BASE + (puzzleId - 1) * PUZZLE_DAY)
}
