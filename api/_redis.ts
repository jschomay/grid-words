import { Redis } from '@upstash/redis'

let client: Redis | null = null

export function getRedis(): Redis {
  if (!client) {
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN
    if (!url || !token) throw new Error('KV_REST_API_URL and KV_REST_API_TOKEN must be set')
    client = new Redis({ url, token })
  }
  return client
}

export const resultKey = (puzzleId: number, playerId: string) => `result:${puzzleId}:${playerId}`
export const leaderboardKey = (puzzleId: number) => `leaderboard:${puzzleId}`

const MAX = 1_000_000

// Fewer moves and less time rank higher: score = moves, inverted in the sort value.
export const combinedValue = (score: number, timeSeconds: number) =>
  (MAX - Math.floor(score)) * MAX + (MAX - Math.floor(timeSeconds))
