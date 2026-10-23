'use client'

import { useEffect, useRef, useState } from 'react'
import { useWebRTCStream } from '../hooks/useWebRTCStream'

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [deviceId, setDeviceId] = useState<string>()
  const [error, setError] = useState('')
  const { streamActive, streamError, startStream, stopStream } = useWebRTCStream({ videoRef, deviceId })

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/ring/devices', { signal: controller.signal })
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Device discovery failed')
        if (!result.devices?.length) throw new Error('No Ring camera is available for this token')
        setDeviceId(result.devices[0].id)
      })
      .catch(caught => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Unable to find camera') })
    return () => controller.abort()
  }, [])

  return (
    <main className="min-h-screen bg-white text-black" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        <nav className="flex min-h-20 items-center justify-between border-b border-black/15">
          <a href="/care" className="text-lg font-bold tracking-[-0.06em] text-black">doorstep<span className="ml-1 inline-block h-2 w-2 bg-black" aria-hidden="true" /></a>
          <a href="/care" className="text-sm text-black hover:underline">← Package watch</a>
        </nav>
        <section className="py-14 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em]">Ring camera / Simulator view</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">The view from your door.</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-black/70">Start a live Ring stream to explore the Playground simulator. Opening the camera creates a live-view history event; it does not detect a package.</p>
          <div className="mt-10 overflow-hidden border border-black bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full object-contain" aria-label="Ring live video" />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button type="button" onClick={streamActive ? stopStream : startStream} disabled={!streamActive && !deviceId}
              className="min-h-12 bg-black px-6 text-sm font-medium text-white hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50">
              {streamActive ? 'Stop live view' : deviceId ? 'Start live view' : 'Finding Ring camera…'}
            </button>
            <span className="text-sm text-black/60">{streamActive ? 'Live stream active' : 'No recording is stored here'}</span>
          </div>
          {(error || streamError) && <p role="alert" className="mt-5 border border-black p-4 text-sm">{error || streamError}</p>}
        </section>
      </div>
    </main>
  )
}
