import type { IncomingMessage, ServerResponse } from 'node:http'
import { getRedis, resultKey, leaderboardKey } from '../_redis.js'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.method !== 'GET') {
      return json(res, 405, { error: 'method not allowed' })
    }

    const url = new URL(req.url ?? '', 'http://localhost')
    const match = url.pathname.match(/^\/api\/leaderboard\/(\d+)$/)
    const pid = match ? Number(match[1]) : NaN
    if (!Number.isInteger(pid) || pid < 1 || pid > 300) {
      return json(res, 400, { error: 'invalid puzzleId' })
    }

    const redis = getRedis()
    const key = leaderboardKey(pid)

    const p = redis.pipeline()
    p.zrange(key, 0, 49, { rev: true, withScores: true })
    const [z] = await p.exec()
    const members = toPairs(z).map(([member]) => member)

    const playerId = url.searchParams.get('playerId')
    const needYou = !!playerId && !members.includes(playerId)

    const p2 = redis.pipeline()
    const resultKeys = members.map(id => resultKey(pid, id))
    resultKeys.forEach(k => p2.hgetall(k))
    const youRankIndex = resultKeys.length
    const youResultIndex = resultKeys.length + 1
    if (needYou) {
      p2.zrevrank(key, playerId!)
      p2.hgetall(resultKey(pid, playerId!))
    }
    const rows = p2.length() > 0 ? (await p2.exec()) as unknown[] : []

    const top: Array<{ playerId: string, rank: number, score: number, timeSeconds: number }> = []
    for (let i = 0; i < members.length; i++) {
      const rec = (rows[i] ?? {}) as Record<string, unknown>
      top.push({
        playerId: members[i],
        rank: i + 1,
        score: toNumber(rec.score),
        timeSeconds: toNumber(rec.timeSeconds),
      })
    }

    let you: { playerId: string, rank: number, score: number, timeSeconds: number } | null = null
    if (needYou) {
      const rank = rows[youRankIndex] as number | null
      if (rank !== null && rank !== undefined) {
        const rec = (rows[youResultIndex] ?? {}) as Record<string, unknown>
        you = {
          playerId: playerId!,
          rank: rank + 1,
          score: toNumber(rec.score),
          timeSeconds: toNumber(rec.timeSeconds),
        }
      }
    }

    return json(res, 200, { puzzleId: pid, top, you })
  } catch (err) {
    return json(res, 500, { error: err instanceof Error ? err.message : 'internal error' })
  }
}

// zrange withScores returns [member, score, member, score, ...] (flat).
function toPairs(z: unknown): Array<[string, number]> {
  if (!Array.isArray(z)) return []
  if (z.length > 0 && Array.isArray(z[0])) return z as Array<[string, number]>
  const pairs: Array<[string, number]> = []
  for (let i = 0; i < z.length; i += 2) pairs.push([String(z[i]), Number(z[i + 1])])
  return pairs
}

function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function json(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}
