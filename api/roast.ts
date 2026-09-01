import type { VercelRequest, VercelResponse } from '@vercel/node'
import { analyzePlayer } from '../src/domain/analyzePlayer.js'
import { generateFallbackRoast } from '../src/domain/fallbackRoast.js'
import { roastRequestSchema } from '../src/shared/schemas.js'
import { GroqClient } from '../src/server/ai/groqClient.js'
import { AppError } from '../src/server/errors.js'
import { requireMethod, sendError } from '../src/server/http.js'
import { verifyPlayerSnapshot } from '../src/server/snapshot.js'

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  try {
    requireMethod(request, 'POST')
    const input = roastRequestSchema.safeParse(request.body)
    if (!input.success) throw new AppError('AI_PROVIDER_ERROR', 400, 'Invalid roast request.')
    const secret = process.env.PLAYER_STATS_SIGNING_SECRET
    if (!secret) throw new AppError('AI_PROVIDER_ERROR', 503, 'Server integration is not configured.')
    const stats = verifyPlayerSnapshot(input.data.snapshot, secret)
    const analysis = analyzePlayer(stats)
    let result = generateFallbackRoast(analysis, input.data.intensity, input.data.locale)
    const apiKey = process.env.GROQ_API_KEY
    const model = process.env.GROQ_MODEL
    if (apiKey && model) {
      try {
        result = await new GroqClient({ apiKey, model }).generate(stats, analysis, input.data.intensity, input.data.locale)
      } catch {
        // A deterministic result keeps the product available without exposing provider details.
      }
    }
    response.setHeader('Cache-Control', 'private, no-store')
    response.status(200).json(result)
  } catch (error) {
    sendError(response, error)
  }
}
