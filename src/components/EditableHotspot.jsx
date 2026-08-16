import { useState } from 'react'
import { percentToPixel, pixelToPercent } from '../lib/coords.js'
import { useStore } from '../store/useStore.js'

// 편집 모드용 핫스팟: 드래그로 위치 이동, 클릭으로 선택. (URL 이동 없음)
export function EditableHotspot({ hotspot, videoEl }) {
  const selectedHotspotId = useStore((s) => s.selectedHotspotId)
  const selectHotspot = useStore((s) => s.selectHotspot)
  const updateHotspot = useStore((s) => s.updateHotspot)
  const [dragging, setDragging] = useState(false)

  if (!videoEl) return null

  const { left, top } = percentToPixel(hotspot.x, hotspot.y, videoEl)
  const size = hotspot.style?.size ?? 30
  const color = hotspot.style?.color ?? 'rgba(255,80,80,0.78)'
  const touch = Math.max(size, 44)
  const selected = hotspot.id === selectedHotspotId

  const onPointerDown = (e) => {
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDragging(true)
    selectHotspot(hotspot.id)
  }
  const onPointerMove = (e) => {
    if (!dragging) return
    const rect = videoEl.getBoundingClientRect()
    const p = pixelToPercent(e.clientX - rect.left, e.clientY - rect.top, videoEl)
    updateHotspot(hotspot.id, { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })
  }
  const onPointerUp = (e) => {
    setDragging(false)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  return (
    <button
      type="button"
      className={
        'hotspot editable' + (selected ? ' selected' : '') + (dragging ? ' dragging' : '')
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ left: `${left}px`, top: `${top}px`, width: `${touch}px`, height: `${touch}px` }}
      title={`${hotspot.label} (드래그로 이동)`}
    >
      <span
        className="hotspot-dot"
        style={{ width: `${size}px`, height: `${size}px`, background: color }}
      />
      <span className="hotspot-label">{hotspot.label}</span>
    </button>
  )
}
