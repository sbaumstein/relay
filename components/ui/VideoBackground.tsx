'use client'

import { useEffect, useRef, useState } from 'react'

const VIDEOS = [
  '/videos/video1.mp4',
  '/videos/video2.mp4',
  '/videos/video3.mp4',
  '/videos/video4.mp4',
]

const CLIP_DURATION = 6000 // 6 seconds per clip

export function VideoBackground() {
  const [current, setCurrent] = useState(0)
  const [next, setNext] = useState(1)
  const [transitioning, setTransitioning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setTransitioning(true)
      setTimeout(() => {
        setCurrent(next)
        setNext((next + 1) % VIDEOS.length)
        setTransitioning(false)
      }, 1000)
    }, CLIP_DURATION)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [current, next])

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Current video */}
      <video
        key={current}
        autoPlay
        muted
        loop={false}
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${transitioning ? 'opacity-0' : 'opacity-40'}`}
        src={VIDEOS[current]}
      />
      {/* Next video (preloaded behind) */}
      <video
        key={`next-${next}`}
        autoPlay
        muted
        loop={false}
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${transitioning ? 'opacity-40' : 'opacity-0'}`}
        src={VIDEOS[next]}
      />
    </div>
  )
}
