import { useCallback, useRef, useState } from 'react'

const MIN_SCALE = 1
const MAX_SCALE = 4

export default function GalleryZoomImage({ src, alt, className, onTap }) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const pinchRef = useRef(null)
  const lastTapRef = useRef(0)

  const reset = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const handleDoubleTap = () => {
    const now = Date.now()
    if (now - lastTapRef.current < 320) {
      if (scale > 1) reset()
      else setScale(2)
      lastTapRef.current = 0
      return true
    }
    lastTapRef.current = now
    return false
  }

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const [a, b] = e.touches
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
      pinchRef.current = { dist, scale }
    }
  }

  const onTouchMove = (e) => {
    if (e.touches.length !== 2 || !pinchRef.current) return
    e.preventDefault()
    const [a, b] = e.touches
    const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, (pinchRef.current.scale * dist) / pinchRef.current.dist))
    setScale(next)
    if (next <= 1) setOffset({ x: 0, y: 0 })
  }

  const onTouchEnd = () => {
    pinchRef.current = null
    if (scale < 1.05) reset()
  }

  const handleClick = (e) => {
    if (handleDoubleTap()) return
    onTap?.(e)
  }

  return (
    <div
      className="glry-zoom-wrap"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={handleClick}
      role="presentation"
    >
      <img
        src={src}
        alt={alt}
        className={className}
        draggable={false}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        }}
      />
    </div>
  )
}
