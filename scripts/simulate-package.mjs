#!/usr/bin/env node
// Signed local fixture for testing the package webhook. Not a Ring simulator event.
import { readFileSync } from 'node:fs'
import { createHmac, randomUUID } from 'node:crypto'

const variables = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line))
  .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]))
const key = variables.RING_WEBHOOK_HMAC_KEY
if (!key) throw new Error('Set RING_WEBHOOK_HMAC_KEY in .env.local before simulating a package')

const origin = 'http://localhost:3000'
const activityResponse = await fetch(`${origin}/api/care/activity`)
if (!activityResponse.ok) throw new Error(`Ring device lookup failed (HTTP ${activityResponse.status})`)
const { deviceId } = await activityResponse.json()
if (!deviceId) throw new Error('No Ring device is accessible with the current token')

const now = Date.now()
const body = JSON.stringify({
  meta: {
    version: '1.1', time: new Date(now).toISOString(), request_id: randomUUID(),
    account_id: 'local-demo', simulated: true,
  },
  data: {
    id: randomUUID(), type: 'motion_detected',
    attributes: { source: deviceId, source_type: 'devices', timestamp: now, sub_type: 'package_delivery' },
  },
})
const signature = createHmac('sha256', key).update(body).digest('hex')
const response = await fetch(`${origin}/api/packages/webhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Signature': `sha256=${signature}` },
  body,
})
const result = await response.json()
if (!response.ok || result.status !== 'recorded') throw new Error(`Package fixture failed (HTTP ${response.status})`)
console.log('Signed LOCAL SIMULATION recorded. Refresh /care; this is not a real Ring package event.')
