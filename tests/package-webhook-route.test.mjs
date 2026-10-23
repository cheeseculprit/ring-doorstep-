import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { test } from 'node:test'
import { POST } from '../app/api/packages/webhook/route.ts'

const body = JSON.stringify({
  meta: { version: '1.1', request_id: 'route-request', account_id: 'route-account', time: '2026-10-23T17:00:00Z' },
  data: { id: 'route-event', type: 'motion_detected', attributes: {
    source: 'route-device', source_type: 'devices', timestamp: 1792774800000, sub_type: 'package_delivery',
  } },
})
const request = (text, signature) => new Request('http://localhost/api/packages/webhook', {
  method: 'POST', body: text, headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
})

test('the webhook rejects unsigned data and accepts an authenticated package once', async () => {
  const previous = process.env.RING_WEBHOOK_HMAC_KEY
  process.env.RING_WEBHOOK_HMAC_KEY = 'route-test-key'
  try {
    assert.equal((await POST(request(body, 'sha256=' + '0'.repeat(64)))).status, 401)
    const signature = 'sha256=' + createHmac('sha256', 'route-test-key').update(body).digest('hex')
    const first = await POST(request(body, signature))
    assert.equal(first.status, 200)
    assert.equal((await first.json()).status, 'recorded')
    const second = await POST(request(body, signature))
    assert.equal((await second.json()).status, 'already_processed')
  } finally {
    if (previous === undefined) delete process.env.RING_WEBHOOK_HMAC_KEY
    else process.env.RING_WEBHOOK_HMAC_KEY = previous
  }
})

test('the webhook signs exact raw bytes, not decoded and re-encoded text', async () => {
  const previous = process.env.RING_WEBHOOK_HMAC_KEY
  process.env.RING_WEBHOOK_HMAC_KEY = 'route-test-key'
  try {
    const uniqueBody = body.replaceAll('route-request', 'route-bytes').replaceAll('route-event', 'route-event-bytes')
    const raw = Buffer.concat([Buffer.from(uniqueBody.slice(0, -1) + ',"note":"'), Buffer.from([0xff]), Buffer.from('"}')])
    const signature = 'sha256=' + createHmac('sha256', 'route-test-key').update(raw).digest('hex')
    const response = await POST(request(raw, signature))
    assert.equal(response.status, 200)
    assert.equal((await response.json()).status, 'recorded')
  } finally {
    if (previous === undefined) delete process.env.RING_WEBHOOK_HMAC_KEY
    else process.env.RING_WEBHOOK_HMAC_KEY = previous
  }
})
