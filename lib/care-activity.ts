export type CareEvent = {
  id: string
  kind: 'motion' | 'ding' | 'on_demand'
  start: number
}

/** Event history is metadata, not evidence that a person is safe or at home. */
export function normalizeCareEvents(payload: unknown): CareEvent[] {
  if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) {
    throw new Error('Unexpected Ring event history response')
  }

  const events: CareEvent[] = []
  for (const entry of payload.data) {
    if (!entry || typeof entry !== 'object') continue
    const { id, type, attributes } = entry
    if (type !== 'history-events' || typeof id !== 'string' || !attributes || typeof attributes !== 'object') continue
    const kind = attributes.event_type
    const start = attributes.start
    if ((kind !== 'motion' && kind !== 'ding' && kind !== 'on_demand') ||
      (typeof start !== 'number' && typeof start !== 'string') ||
      !Number.isFinite(Number(start)) || Number(start) <= 0) continue
    events.push({ id, kind, start: Number(start) })
  }
  return events.sort((a, b) => b.start - a.start)
}
