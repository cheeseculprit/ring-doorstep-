'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CareEvent } from '@/lib/care-activity'

type Device = { id: string; name: string }
type PackageNotice = { id: string; detectedAt: number; simulated: boolean }
type Activity = { devices: Device[]; deviceId: string | null; events: CareEvent[]; packages: PackageNotice[]; fetchedAt: number; hasMore?: boolean }

const sample: Activity = {
  devices: [{ id: 'sample-doorbell', name: 'Sample front door' }],
  deviceId: 'sample-doorbell',
  events: [
    { id: 'sample-1', kind: 'ding', start: Date.now() - 12 * 60_000 },
    { id: 'sample-2', kind: 'motion', start: Date.now() - 75 * 60_000 },
    { id: 'sample-3', kind: 'motion', start: Date.now() - 4 * 60 * 60_000 },
  ],
  packages: [{ id: 'sample-package', detectedAt: Date.now() - 15 * 60_000, simulated: true }],
  fetchedAt: Date.now(),
}

const eventLabels: Record<CareEvent['kind'], string> = {
  ding: 'Doorbell pressed',
  motion: 'Motion detected',
  on_demand: 'Live view started',
}

export default function CarePage() {
  const [mode, setMode] = useState<'ring' | 'sample'>('ring')
  const [activity, setActivity] = useState<Activity | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async (deviceId?: string, signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const query = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : ''
      const response = await fetch(`/api/care/activity${query}`, { cache: 'no-store', signal })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to load activity')
      setActivity(result)
      setSelectedId(result.deviceId || '')
    } catch (caught) {
      if (signal?.aborted) return
      setError(caught instanceof Error ? caught.message : 'Unable to load activity')
      setActivity(null)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mode !== 'ring') return
    const controller = new AbortController()
    refresh(undefined, controller.signal)
    return () => controller.abort()
  }, [mode, refresh])

  const display = mode === 'sample' ? sample : activity
  const latest = display?.events[0]
  const latestPackage = display?.packages?.[0]

  return (
    <main className="min-h-screen bg-white text-black" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <nav aria-label="Main navigation" className="flex min-h-20 items-center justify-between gap-4 border-b border-black/15">
          <a href="/care" className="text-lg font-bold tracking-[-0.06em] text-black no-underline">doorstep<span className="ml-1 inline-block h-2 w-2 bg-black" aria-hidden="true" /></a>
          <div className="flex items-center gap-4 sm:gap-8 text-sm">
            <a href="#activity" className="text-black underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-black">Live activity</a>
            <a href="/camera" className="text-black underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-black">Ring camera ↗</a>
          </div>
        </nav>

        <section className="grid gap-10 border-b border-black/15 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-16 md:py-24">
          <div>
            <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em]">Package watch / Powered by Ring</p>
            <h1 className="max-w-2xl text-[clamp(2.75rem,6vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.07em]">See when a delivery lands.</h1>
            <p className="mt-8 max-w-lg text-lg leading-relaxed text-black/70">Your front door has a story. Doorstep brings Ring package alerts and recent activity into one clear view—without making you watch a camera all day.</p>
            <a href="#activity" className="mt-8 inline-flex min-h-12 items-center bg-black px-6 font-medium text-white no-underline hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">View package activity <span className="ml-5" aria-hidden="true">↗</span></a>
            <p className="mt-5 text-sm text-black/60">No footage stored. No claim that a package was collected.</p>
          </div>
          <div className="border border-black bg-white" aria-label="Live package status preview">
            <div className="flex items-center justify-between border-b border-black/15 px-6 py-5">
              <span className="text-xs font-bold uppercase tracking-[0.16em]">Front door / Status</span>
              <span className="text-xs font-medium uppercase tracking-widest">{mode === 'sample' ? 'Sample data' : 'Ring API'}</span>
            </div>
            <div className="px-6 py-10 sm:px-8 sm:py-14">
              <p className="text-sm uppercase tracking-[0.16em] text-black/60">Latest package signal</p>
              <p className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.05em] sm:text-4xl">{latestPackage ? 'Delivery detected.' : 'Nothing reported yet.'}</p>
              <p className="mt-4 text-sm leading-relaxed text-black/70">{latestPackage ? `${new Date(latestPackage.detectedAt).toLocaleString()} · ${latestPackage.simulated || mode === 'sample' ? 'LOCAL SIMULATION, NOT A REAL DELIVERY' : 'Ring package Smart Alert'}` : 'Only a signed package alert counts. Ordinary motion does not.'}</p>
              <div className="mt-10 border-t border-black/15 pt-5 text-xs uppercase tracking-widest text-black/60">{display ? `Checked ${new Date(display.fetchedAt).toLocaleTimeString()}` : loading ? 'Checking Ring…' : 'Connect to view activity'}</div>
            </div>
          </div>
        </section>

        <section id="activity" className="scroll-mt-8 py-16 md:py-20">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em]">Your dashboard</p>
              <h2 className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">The latest at your door.</h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-black/60">Real Ring activity is separate from the local demo. Switch sources below to see exactly what you’re viewing.</p>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-3 border-y border-black/15 py-5" aria-label="Activity controls">
            <button type="button" aria-pressed={mode === 'ring'} onClick={() => setMode('ring')}
              className={`min-h-11 px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${mode === 'ring' ? 'bg-black text-white' : 'border border-black/30 bg-white text-black hover:border-black'}`}>Ring activity</button>
            <button type="button" aria-pressed={mode === 'sample'} onClick={() => { setMode('sample'); setError('') }}
              className={`min-h-11 px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${mode === 'sample' ? 'bg-black text-white' : 'border border-black/30 bg-white text-black hover:border-black'}`}>Offline sample</button>
            {mode === 'ring' && activity && activity.devices.length > 0 && <label className="flex flex-wrap items-center gap-2 text-sm md:ml-auto" htmlFor="care-device">
              Camera
              <select id="care-device" value={selectedId} onChange={event => refresh(event.target.value)}
                className="min-h-11 max-w-[220px] border border-black/30 bg-white px-3 text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-black">
                {activity.devices.map(device => <option key={device.id} value={device.id}>{device.name}</option>)}
              </select>
            </label>}
            {mode === 'ring' && <button type="button" onClick={() => refresh(selectedId || undefined)} disabled={loading}
              className="min-h-11 border border-black px-4 text-sm font-medium text-black hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50">Refresh ↗</button>}
          </div>

          {loading && mode === 'ring' && <p role="status" className="mt-5 text-sm">Checking Ring activity…</p>}
          {error && mode === 'ring' && <p role="alert" className="mt-5 border border-black p-5 text-sm">{error}</p>}

          {display && <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
            <section aria-label="Package delivery status" aria-live="polite">
              <p className="text-xs font-bold uppercase tracking-[0.2em]">01 / Package watch</p>
              <h3 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.05em]">{latestPackage ? 'A delivery was detected.' : 'No package alert received.'}</h3>
              {latestPackage && <p className="mt-3 text-sm text-black/70">{new Date(latestPackage.detectedAt).toLocaleString()} · {latestPackage.simulated || mode === 'sample' ? 'SIMULATED, NOT A REAL DELIVERY' : 'Ring Smart Alert'}</p>}
              <p className="mt-5 max-w-md text-sm leading-relaxed text-black/70">Only Ring’s signed package_delivery signal qualifies. Motion and live view alone never mean a package arrived. Alerts are checked when you refresh this page.</p>
              {display.packages.length > 1 && <p className="mt-3 text-sm">{display.packages.length} package alerts received for this camera.</p>}
            </section>
            <section aria-label="Recent Ring events" className="border-t border-black/15 pt-5 lg:border-t-0 lg:pt-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em]">02 / Activity log</p>
              <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">{latest ? eventLabels[latest.kind] : 'No events returned'}</h3>
              {latest && <p className="mt-2 text-sm text-black/60">Last recorded · {new Date(latest.start).toLocaleString()}</p>}
              {display.events.length === 0 ? <p className="mt-7 text-sm leading-relaxed text-black/70">Ring shares history after app consent. An empty log does not mean no one visited.</p> :
                <ol className="mt-7 border-t border-black/15">{display.events.slice(0, 5).map(event => <li key={event.id} className="flex flex-wrap justify-between gap-2 border-b border-black/15 py-4 text-sm">
                  <span>{eventLabels[event.kind]}</span><time dateTime={new Date(event.start).toISOString()} className="text-black/60">{new Date(event.start).toLocaleString()}</time>
                </li>)}</ol>}
              {display.hasMore && <p className="mt-3 text-xs text-black/60">More history exists. This view shows the first page.</p>}
            </section>
          </div>}
        </section>

        <section aria-label="How it works" className="border-t border-black/15 py-14 md:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em]">How it works</p>
          <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-12">
            <div><span className="text-xs font-bold">01</span><h3 className="mt-3 text-xl font-semibold tracking-[-0.04em]">Ring detects</h3><p className="mt-2 text-sm leading-relaxed text-black/70">A package Smart Alert can identify a delivery at the door.</p></div>
            <div><span className="text-xs font-bold">02</span><h3 className="mt-3 text-xl font-semibold tracking-[-0.04em]">We verify</h3><p className="mt-2 text-sm leading-relaxed text-black/70">The server checks Ring’s signed webhook before recording the signal.</p></div>
            <div><span className="text-xs font-bold">03</span><h3 className="mt-3 text-xl font-semibold tracking-[-0.04em]">You review</h3><p className="mt-2 text-sm leading-relaxed text-black/70">Refresh to see the latest alert, with simulated data clearly marked.</p></div>
          </div>
        </section>

        <footer className="flex flex-col justify-between gap-4 border-t border-black/15 py-8 text-xs leading-relaxed text-black/60 md:flex-row">
          <p>Doorstep is a local demo, not a security or emergency service. A delivery alert cannot confirm a package is still present or collected.</p>
          <p className="shrink-0">Built with the Ring Partner API.</p>
        </footer>
      </div>
    </main>
  )
}
