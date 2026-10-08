'use client'

import { useEffect, useRef, useState } from 'react'

const VIDEOS = [
  '/videos/video1.mp4',
  '/videos/video2.mp4',
  '/videos/video3.mp4',
  '/videos/video4.mp4',
]

/** Time each clip holds before the crossfade starts. */
const CLIP_DURATION = 6000
/** Must match the duration-1000 class below. */
const FADE_MS = 1000

export function VideoBackground() {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLVideoElement | null)[]>([])
  const activeRef = useRef(0)
  activeRef.current = active

  // Advance on a fixed cadence. The elements themselves are never remounted,
  // which is what previously made a clip restart as it faded in.
  useEffect(() => {
    const id = setInterval(
      () => setActive((a) => (a + 1) % VIDEOS.length),
      CLIP_DURATION,
    )
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const incoming = refs.current[active]
    if (incoming) {
      incoming.currentTime = 0
      // Autoplay can be refused; the still frame is an acceptable fallback.
      void incoming.play().catch(() => {})
    }

    // Let the outgoing clip keep playing through the crossfade, then stop it
    // so we're not decoding four videos at once.
    const id = setTimeout(() => {
      refs.current.forEach((v, i) => {
        if (v && i !== active) v.pause()
      })
    }, FADE_MS)

    return () => clearTimeout(id)
  }, [active])

  // Autoplay gets refused often enough — Safari low-power mode, data saver, a
  // backgrounded tab — and a refusal would otherwise freeze the hero on one
  // frame for good. Retry whenever the page comes back or the viewer touches it.
  useEffect(() => {
    const resume = () => {
      const v = refs.current[activeRef.current]
      if (v?.paused) void v.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('pointerdown', resume)
    return () => {
      document.removeEventListener('visibilitychange', resume)
      window.removeEventListener('pointerdown', resume)
    }
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden">
      {VIDEOS.map((src, i) => (
        <video
          key={src}
          ref={(el) => { refs.current[i] = el }}
          muted
          loop
          playsInline
          preload="auto"
          // Only the first clip autoplays; the rest are started on their turn,
          // already buffered.
          autoPlay={i === 0}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            i === active ? 'opacity-40' : 'opacity-0'
          }`}
          src={src}
        />
      ))}
    </div>
  )
}
