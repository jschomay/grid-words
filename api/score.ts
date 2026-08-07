import type { IncomingMessage, ServerResponse } from 'node:http'
import { getRedis, resultKey, leaderboardKey, combinedValue } from './_redis.ts'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.method !== 'POST') {
      return json(res, 405, { error: 'method not allowed' })
    }

    let data: unknown
    try {
      data = JSON.parse(await readBody(req))
    } catch {
      return json(res, 400, { error: 'invalid body' })
    }

    const { playerId, puzzleId, score, timeSeconds } = data as Record<string, unknown>
    if (typeof playerId !== 'string' || !playerId) {
      return json(res, 400, { error: 'missing playerId' })
    }
    const pid = Number(puzzleId)
    if (!Number.isInteger(pid)) {
      return json(res, 400, { error: 'invalid puzzleId' })
    }
    const scoreNum = Number(score)
    const timeNum = Number(timeSeconds)
    if (!Number.isFinite(scoreNum) || !Number.isFinite(timeNum)) {
      return json(res, 400, { error: 'invalid score or timeSeconds' })
    }
    const moves = Math.floor(scoreNum)
    const time = Math.floor(timeNum)

    const redis = getRedis()
    const key = resultKey(pid, playerId)

    const created = await redis.hsetnx(key, 'score', moves)
    if (created === 0) {
      return json(res, 200, { status: 'already_submitted' })
    }

    const p = redis.pipeline()
    p.hset(key, { timeSeconds: time })
    p.zadd(leaderboardKey(pid), { score: combinedValue(moves, time), member: playerId })
    await p.exec()

    return json(res, 200, { status: 'ok' })
  } catch (err) {
    return json(res, 500, { error: err instanceof Error ? err.message : 'internal error' })
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function json(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}
