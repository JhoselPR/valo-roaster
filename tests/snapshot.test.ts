import { describe, expect, it } from 'vitest'
import { createPlayerSnapshot, verifyPlayerSnapshot } from '../src/server/snapshot'
import { playerStatsFixture } from './fixtures'

describe('signed player snapshot', () => {
  it('round trips trusted stats', () => expect(verifyPlayerSnapshot(createPlayerSnapshot(playerStatsFixture, 'secret', 100), 'secret', 200)).toEqual(playerStatsFixture))
  it('rejects tampering', () => { const snapshot = createPlayerSnapshot(playerStatsFixture, 'secret'); expect(() => verifyPlayerSnapshot(`${snapshot}x`, 'secret')).toThrow() })
  it('rejects expiration', () => expect(() => verifyPlayerSnapshot(createPlayerSnapshot(playerStatsFixture, 'secret', 0), 'secret', 700_000)).toThrow())
})
