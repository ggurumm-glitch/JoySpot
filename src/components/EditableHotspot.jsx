import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { percentToPixel, pixelToPercent } from '../lib/coords.js'
import { useStore } from '../store/useStore.js'

const round1 = (n) => Math.round((n || 0) * 10) / 10

// 편집 모드 핫스팟: 드래그는 로컬(부드럽게), 놓을 때 Convex에 저장.
// 낙관적 업데이트로 저장 즉시 캐시를 갱신해 "되튐"을 없앤다.
export function EditableHotspot({ hotspot, videoEl }) {
  const selectedHotspotId = useStore((s) => s.selectedHotspotId)
  const selectHotspot = useStore((s) => s.selectHotspot)

  const updateHotspot = useMutation(api.hotspots.update).withOptimisticUpdate((store, { id, patch }) => {
    const key = hotspot.videoKey
    const cur = store.getQuery(api.hotspots.listByVideo, { videoKey: key })
    if (cur) {
      store.setQuery(
        api.hotspots.listByVideo,
        { videoKey: key },
        cur.map((h) => (h._id === id ? { ...h, ...patch } : h)),
      )
    }
  })

  const [drag, setDrag] = useState(null) // {x,y} 드래그 중 로컬 위치(정밀)

  if (!videoEl) return null

  const pos = drag || { x: hotspot.x, y: hotspot.y }
  const { left, top } = percentToPixel(pos.x, pos.y, videoEl)
  const size = hotspot.style?.size ?? 30
  const color = hotspot.style?.color ?? 'rgba(255,80,80,0.78)'
  const touch = Math.max(size, 44)
  const selected = hotspot._id === selectedHotspotId

  const onPointerDown = (e) => {
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ x: hotspot.x, y: hotspot.y })
    selectHotspot(hotspot._id)
  }
  const onPointerMove = (e) => {
    if (!drag) return
    const rect = videoEl.getBoundingClientRect()
    const p = pixelToPercent(e.clientX - rect.left, e.clientY - rect.top, videoEl)
    setDrag({ x: p.x, y: p.y }) // 반올림 없이 부드럽게
  }
  const onPointerUp = (e) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    if (!drag) return
    const x = round1(drag.x)
    const y = round1(drag.y)
    // 낙관적 업데이트가 캐시를 즉시 갱신하므로, 먼저 저장 → 그 다음 로컬 드래그 해제(되튐 없음)
    if (x !== hotspot.x || y !== hotspot.y) updateHotspot({ id: hotspot._id, patch: { x, y } })
    setDrag(null)
  }

  return (
    <button
      type="button"
      className={'hotspot editable' + (selected ? ' selected' : '') + (drag ? ' dragging' : '')}
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
