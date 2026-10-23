import { createHmac, timingSafeEqual } from 'node:crypto'

export type PackageDelivery = {
  id: string
  requestId: string
  accountId: string
  deviceId: string
  detectedAt: number
  simulated: boolean
}

/** Ring signs the exact raw UTF-8 body, not re-serialized JSON. */
export function verifyRingSignature(key: string, rawBody: Buffer | string, signature: string | null): boolean {
  if (!key || !signature || !/^sha256=[0-9a-f]{64}$/i.test(signature)) return false
  const expected = createHmac('sha256', key).update(rawBody).digest()
  const received = Buffer.from(signature.slice(7), 'hex')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export function parsePackageDelivery(body: unknown): PackageDelivery | null {
  if (!body || typeof body !== 'object') return null
  const { meta, data } = body as Record<string, any>
  if (data?.type !== 'motion_detected' || data?.attributes?.sub_type !== 'package_delivery' ||
    data?.attributes?.source_type !== 'devices') return null
  const { source, timestamp } = data.attributes
  if (typeof data.id !== 'string' || !data.id || typeof source !== 'string' || !source ||
    typeof meta?.request_id !== 'string' || !meta.request_id ||
    typeof meta?.account_id !== 'string' || !meta.account_id ||
    typeof timestamp !== 'number' || !Number.isFinite(timestamp) ||
    timestamp <= 0 || timestamp > 8640000000000000) return null
  return {
    id: data.id,
    requestId: meta.request_id,
    accountId: meta.account_id,
    deviceId: source,
    detectedAt: timestamp,
    simulated: meta.simulated === true,
  }
}

export class PackageDeliveryStore {
  private events: PackageDelivery[] = []

  constructor(private readonly limit = 100) {}

  add(event: PackageDelivery): boolean {
    if (this.events.some(item => item.requestId === event.requestId || item.id === event.id)) return false
    this.events.unshift(event)
    if (this.events.length > this.limit) this.events.pop()
    return true
  }

  forDevice(deviceId: string): PackageDelivery[] {
    return this.events.filter(event => event.deviceId === deviceId)
      .sort((a, b) => b.detectedAt - a.detectedAt)
  }
}

export const packageDeliveryStore = new PackageDeliveryStore()
