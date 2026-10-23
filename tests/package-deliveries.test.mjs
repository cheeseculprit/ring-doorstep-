import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { test } from 'node:test'
import { verifyRingSignature, parsePackageDelivery, PackageDeliveryStore } from '../lib/package-deliveries.ts'

const signingKey = 'test-only-signing-key'
const payload = (subType = 'package_delivery') => ({
  meta: { version: '1.1', request_id: 'request-1', account_id: 'account-1', time: '2026-10-23T17:00:00Z', simulated: true },
  data: { id: 'event-1', type: 'motion_detected', attributes: {
    source: 'device-1', source_type: 'devices', timestamp: 1792774800000, sub_type: subType,
  } },
})

test('only a valid raw-body HMAC authenticates a Ring notification', () => {
  const raw = JSON.stringify(payload())
  const signature = createHmac('sha256', signingKey).update(raw).digest('hex')
  assert.equal(verifyRingSignature(signingKey, raw, `sha256=${signature}`), true)
  assert.equal(verifyRingSignature(signingKey, raw + ' ', `sha256=${signature}`), false)
  assert.equal(verifyRingSignature(signingKey, raw, 'sha256=invalid'), false)
  assert.equal(verifyRingSignature('', raw, `sha256=${signature}`), false)
})

test('only package_delivery subtype becomes an arrival; generic motion does not', () => {
  assert.deepEqual(parsePackageDelivery(payload()), {
    id: 'event-1', deviceId: 'device-1', accountId: 'account-1', requestId: 'request-1',
    detectedAt: 1792774800000, simulated: true,
  })
  assert.equal(parsePackageDelivery(payload('motion')), null)
  assert.equal(parsePackageDelivery(payload('human')), null)
  assert.equal(parsePackageDelivery({ ...payload(), data: { ...payload().data, type: 'button_press' } }), null)
  assert.equal(parsePackageDelivery({ ...payload(), meta: { ...payload().meta, account_id: '' } }), null)
})

test('stores verified deliveries by device, deduplicates retries and bounds memory', () => {
  const store = new PackageDeliveryStore(2)
  const first = parsePackageDelivery(payload())
  assert.equal(store.add(first), true)
  assert.equal(store.add(first), false)
  assert.deepEqual(store.forDevice('device-2'), [])
  assert.deepEqual(store.forDevice('device-1'), [first])
  assert.equal(store.add({ ...first, id: 'event-2', requestId: 'request-2', detectedAt: first.detectedAt + 1 }), true)
  assert.equal(store.add({ ...first, id: 'event-3', requestId: 'request-3', detectedAt: first.detectedAt + 2 }), true)
  assert.deepEqual(store.forDevice('device-1').map(event => event.id), ['event-3', 'event-2'])
})
