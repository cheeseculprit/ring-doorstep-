import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/auth'
import { normalizeCareEvents } from '@/lib/care-activity'
import { packageDeliveryStore } from '@/lib/package-deliveries'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BASE = 'https://api.amazonvision.com'

export async function GET(request: NextRequest) {
  const hardwareId = process.env.RING_HARDWARE_ID
  if (!hardwareId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hardwareId)) {
    return NextResponse.json({ error: 'Set RING_HARDWARE_ID to an installation-specific UUID in .env.local' }, { status: 400 })
  }

  try {
    const token = await getAccessToken()
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'DoorstepCare/1.0',
      Hardware_Id: hardwareId,
    }
    const deviceResponse = await fetch(`${BASE}/v1/devices`, { headers, cache: 'no-store' })
    if (!deviceResponse.ok) return ringError(deviceResponse.status, 'device discovery')
    const devicePayload = await deviceResponse.json()
    if (!Array.isArray(devicePayload?.data)) throw new Error('Unexpected Ring device response')
    const devices = devicePayload.data
      .filter((item: any) => typeof item?.id === 'string')
      .map((item: any) => ({ id: item.id as string, name: String(item.attributes?.name || 'Ring device') }))

    const requestedId = request.nextUrl.searchParams.get('deviceId')
    const selected = requestedId ? devices.find((device: { id: string }) => device.id === requestedId) : devices[0]
    if (requestedId && !selected) return NextResponse.json({ error: 'Device not found in this Ring account' }, { status: 404 })
    if (!selected) return NextResponse.json({ devices, deviceId: null, events: [], packages: [], fetchedAt: Date.now() })

    const historyResponse = await fetch(
      `${BASE}/v1/history/devices/${encodeURIComponent(selected.id)}/events?event_types=motion,ding,on_demand`,
      { headers, cache: 'no-store' },
    )
    if (!historyResponse.ok) return ringError(historyResponse.status, 'event history')
    const payload = await historyResponse.json()
    return NextResponse.json({
      devices,
      deviceId: selected.id,
      events: normalizeCareEvents(payload),
      packages: packageDeliveryStore.forDevice(selected.id),
      fetchedAt: Date.now(),
      hasMore: Boolean(payload?.links?.next),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Care activity request failed:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Unable to load Ring activity. Check server configuration and try again.' }, { status: 502 })
  }
}

function ringError(status: number, operation: string) {
  const message = status === 401 ? 'Ring token expired or invalid; generate a new token.'
    : status === 403 ? 'This token does not have permission to access the Ring device.'
    : status === 406 ? 'Ring rejected this request. Check Hardware_Id or contact Ring about your server IP.'
    : status === 429 ? 'Ring rate limit reached; wait before refreshing.'
    : `Ring ${operation} request failed (HTTP ${status}).`
  return NextResponse.json({ error: message }, { status: status >= 400 && status < 500 ? status : 502 })
}
