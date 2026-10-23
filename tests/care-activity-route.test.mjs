import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NextRequest } from 'next/server'
import { GET } from '../app/api/care/activity/route.ts'
import { packageDeliveryStore } from '../lib/package-deliveries.ts'

test('activity response includes only signed deliveries for the selected discovered device', async () => {
  const oldFetch = globalThis.fetch
  const oldToken = process.env.RING_ACCESS_TOKEN
  const oldHardwareId = process.env.RING_HARDWARE_ID
  process.env.RING_ACCESS_TOKEN = 'test-token'
  process.env.RING_HARDWARE_ID = '81f4830b-5735-4852-988b-914b7af1c2e9'
  packageDeliveryStore.add({ id: 'route-delivery-1', requestId: 'route-delivery-1', accountId: 'account', deviceId: 'device-1', detectedAt: 1792774800000, simulated: true })
  packageDeliveryStore.add({ id: 'route-delivery-2', requestId: 'route-delivery-2', accountId: 'account', deviceId: 'device-2', detectedAt: 1792774800001, simulated: false })
  globalThis.fetch = async url => new Response(JSON.stringify(
    String(url).endsWith('/v1/devices')
      ? { data: [{ id: 'device-1', attributes: { name: 'Doorbell' } }] }
      : { data: [] },
  ), { status: 200, headers: { 'Content-Type': 'application/json' } })
  try {
    const response = await GET(new NextRequest('http://localhost/api/care/activity'))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.deepEqual(body.packages.map(event => event.id), ['route-delivery-1'])
    assert.equal(body.packages[0].simulated, true)
  } finally {
    globalThis.fetch = oldFetch
    if (oldToken === undefined) delete process.env.RING_ACCESS_TOKEN
    else process.env.RING_ACCESS_TOKEN = oldToken
    if (oldHardwareId === undefined) delete process.env.RING_HARDWARE_ID
    else process.env.RING_HARDWARE_ID = oldHardwareId
  }
})
