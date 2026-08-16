import { useState } from 'react'
import { percentToPixel } from '../lib/coords.js'

// 시청 모드 핫스팟: 제품 1개면 바로 이동, 여러 개면 썸네일 목록 팝업에서 선택.
export function Hotspot({ hotspot, videoEl }) {
  const [open, setOpen] = useState(false)
  if (!videoEl) return null

  const { left, top } = percentToPixel(hotspot.x, hotspot.y, videoEl)
  const size = hotspot.style?.size ?? 30
  const color = hotspot.style?.color ?? 'rgba(255,80,80,0.78)'
  const touch = Math.max(size, 44)
  const products = hotspot.products || []
  const single = products.length === 1 ? products[0] : null
  // 하단 핫스팟이면 팝업을 위로 띄워 영상 밖으로 잘리지 않게
  const flipUp = top > (videoEl.clientHeight || 0) * 0.5

  const go = (url) => {
    if (!url) return
    if (hotspot.pauseOnClick) videoEl.pause()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const onClick = (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (products.length === 0) return
    if (products.length === 1) {
      go(products[0].url)
    } else {
      if (hotspot.pauseOnClick) videoEl.pause()
      setOpen((o) => !o)
    }
  }

  return (
    <>
      <button
        type="button"
        className="hotspot"
        onClick={onClick}
        style={{ left: `${left}px`, top: `${top}px`, width: `${touch}px`, height: `${touch}px` }}
        aria-label={`${hotspot.label} — 제품 보기`}
      >
        <span className="hotspot-dot" style={{ width: `${size}px`, height: `${size}px`, background: color }}>
          {products.length > 1 && <span className="hs-count">{products.length}</span>}
        </span>
        <span className={'hotspot-label' + (single?.image ? ' card' : '')}>
          {single?.image && <img className="hs-card-img" src={single.image} alt="" />}
          <span className="hs-card-title">
            {hotspot.label}
            {products.length > 1 ? ` · 제품 ${products.length}개` : ''}
          </span>
          {single?.description && <span className="hs-card-desc">{single.description}</span>}
          {single?.price && <span className="hs-card-price">{single.price}</span>}
        </span>
      </button>

      {open && products.length > 1 && (
        <div
          className={'chooser' + (flipUp ? ' up' : '')}
          style={{ left: `${left}px`, top: `${top}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="chooser-head">
            <span>제품 {products.length}개</span>
            <button className="mini" onClick={() => setOpen(false)}>✕</button>
          </div>
          {products.map((p) => (
            <button key={p.pid} className="chooser-row" onClick={() => go(p.url)}>
              {p.image ? <img src={p.image} alt="" /> : <span className="chooser-noimg" />}
              <span className="chooser-info">
                <span className="chooser-name">{p.name || '(제품)'}</span>
                {p.price && <span className="chooser-price">{p.price}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
