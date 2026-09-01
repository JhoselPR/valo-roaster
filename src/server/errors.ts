import type { ErrorCode } from '../shared/schemas.js'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  constructor(code: ErrorCode, status: number, message: string) {
    super(message)
    this.code = code
    this.status = status
  }
}

export const errorBody = (error: AppError) => ({ error: { code: error.code, message: error.message } })

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  return new AppError('STATS_PROVIDER_ERROR', 502, 'The statistics provider is temporarily unavailable.')
}
