import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeCareEvents } from '../lib/care-activity.ts'

test('normalizes and sorts Ring JSON:API history without media', () => {
  const events = normalizeCareEvents({ data: [
    { type: 'history-events', id: 'older', attributes: { event_type: 'motion', start: 1699457200000 } },
    { type: 'history-events', id: 'newer', attributes: { event_type: 'ding', start: 1699457230000 } },
    { type: 'history-events', id: 'view', attributes: { event_type: 'on_demand', start: 1699457210000 } },
    { type: 'history-events', id: 'ignored', attributes: { event_type: 'unknown', start: 1699457240000 } },
  ] })
  assert.deepEqual(events, [
    { id: 'newer', kind: 'ding', start: 1699457230000 },
    { id: 'view', kind: 'on_demand', start: 1699457210000 },
    { id: 'older', kind: 'motion', start: 1699457200000 },
  ])
})

test('rejects malformed payloads and invalid timestamps', () => {
  assert.throws(() => normalizeCareEvents({ error: 'Unauthorized' }), /Unexpected Ring/)
  assert.deepEqual(normalizeCareEvents({ data: [
    { type: 'history-events', id: 'bad', attributes: { event_type: 'motion', start: 'not a date' } },
  ] }), [])
})
