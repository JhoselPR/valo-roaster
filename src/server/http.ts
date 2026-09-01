import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AppError, errorBody, toAppError } from './errors.js'

export function sendError(response: VercelResponse, error: unknown): void {
  const appError = toAppError(error)
  response.status(appError.status).json(errorBody(appError))
}

export function requireMethod(request: VercelRequest, method: 'GET' | 'POST'): void {
  if (request.method !== method) throw new AppError('STATS_PROVIDER_ERROR', 405, 'Method not allowed.')
}
