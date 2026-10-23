import { NextRequest, NextResponse } from 'next/server'
import { packageDeliveryStore, parsePackageDelivery, verifyRingSignature } from '@/lib/package-deliveries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Only Ring-signed package_delivery webhooks become package arrivals. */
export async function POST(request: NextRequest) {
  const key = process.env.RING_WEBHOOK_HMAC_KEY
  if (!key) return NextResponse.json({ error: 'Ring webhook signing key is not configured' }, { status: 503 })

  const rawBody = Buffer.from(await request.arrayBuffer())
  if (rawBody.length > 65536) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  if (!verifyRingSignature(key, rawBody, request.headers.get('X-Signature'))) {
    return NextResponse.json({ error: 'Invalid Ring signature' }, { status: 401 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const delivery = parsePackageDelivery(body)
  if (!delivery) return NextResponse.json({ status: 'ignored' })
  const recorded = packageDeliveryStore.add(delivery)
  return NextResponse.json({ status: recorded ? 'recorded' : 'already_processed' })
}
