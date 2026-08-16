import { useRef, useState } from 'react'
import { useStore, EMPTY_HOTSPOTS, newProduct } from '../store/useStore.js'
import { ProductCard } from './ProductCard.jsx'
import { LibraryDrawer } from './LibraryDrawer.jsx'

const COLORS = [
  'rgba(255,80,80,0.78)',
  'rgba(80,150,255,0.78)',
  'rgba(90,210,120,0.80)',
  'rgba(255,190,60,0.82)',
  'rgba(200,120,255,0.80)',
]

export function Editor() {
  const fileRef = useRef(null)
  const [libOpen, setLibOpen] = useState(false)
  const [activePid, setActivePid] = useState(null)

  const videos = useStore((s) => s.videos)
  const selectedVideoUrl = useStore((s) => s.selectedVideoUrl)
  const hotspotsByVideo = useStore((s) => s.hotspotsByVideo)
  const selectedHotspotId = useStore((s) => s.selectedHotspotId)
  const currentTime = useStore((s) => s.currentTime)
  const catalog = useStore((s) => s.catalog)

  const addHotspot = useStore((s) => s.addHotspot)
  const updateHotspot = useStore((s) => s.updateHotspot)
  const removeHotspot = useStore((s) => s.removeHotspot)
  const selectHotspot = useStore((s) => s.selectHotspot)
  const importHotspots = useStore((s) => s.importHotspots)
  const addProduct = useStore((s) => s.addProduct)

  const hotspots = hotspotsByVideo[selectedVideoUrl] || EMPTY_HOTSPOTS
  const sel = hotspots.find((h) => h.id === selectedHotspotId) || null
  const videoName = videos.find((v) => v.url === selectedVideoUrl)?.name || ''
  const patch = (p) => updateHotspot(sel.id, p)

  const products = sel?.products || []
  const activeProduct = products.find((p) => p.pid === activePid) || products[0] || null

  const handleAddProduct = () => {
    const p = newProduct()
    addProduct(sel.id, p)
    setActivePid(p.pid)
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ videoName, hotspots }, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `joyspot-hotspots-${(videoName || 'video').slice(0, 20)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const importJson = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        const list = Array.isArray(parsed) ? parsed : parsed.hotspots
        if (Array.isArray(list)) importHotspots(list)
        else alert('유효한 핫스팟 JSON이 아닙니다.')
      } catch {
        alert('JSON 파싱 실패')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <button className="btn primary" onClick={addHotspot}>
          + 핫스팟 추가
        </button>
        <button className="btn" onClick={exportJson} disabled={hotspots.length === 0}>
          JSON 내보내기
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          JSON 불러오기
        </button>
        <input ref={fileRef} type="file" accept="application/json" onChange={importJson} style={{ display: 'none' }} />
        <button className="btn lib-btn" onClick={() => setLibOpen(true)}>
          📚 라이브러리 {catalog.length > 0 ? `(${catalog.length})` : ''}
        </button>
      </div>

      <LibraryDrawer open={libOpen} onClose={() => setLibOpen(false)} />

      <div className="editor-body">
        {/* 핫스팟 목록 */}
        <div className="hs-list">
          <div className="hs-list-title">핫스팟 ({hotspots.length})</div>
          {hotspots.length === 0 && (
            <p className="hs-empty">「+ 핫스팟 추가」를 누른 뒤 영상 위에서 드래그해 제품 위로 옮기세요.</p>
          )}
          {hotspots.map((h) => (
            <div
              key={h.id}
              className={'hs-row' + (h.id === selectedHotspotId ? ' active' : '')}
              onClick={() => selectHotspot(h.id)}
            >
              <span className="hs-swatch" style={{ background: h.style?.color }} />
              <span className="hs-row-label">{h.label || '(제목 없음)'}</span>
              <span className="hs-row-time">
                {h.start}s–{h.end}s · {(h.products || []).length}개
              </span>
              <button
                className="hs-del"
                onClick={(e) => {
                  e.stopPropagation()
                  removeHotspot(h.id)
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* 핫스팟 속성 + 제품들 */}
        {sel ? (
          <div className="hs-form">
            <label className="fld">
              <span>핫스팟 제목(점 위 표시)</span>
              <input value={sel.label} onChange={(e) => patch({ label: e.target.value })} />
            </label>

            <div className="fld-row">
              <label className="fld">
                <span>시작(초)</span>
                <div className="inline">
                  <input type="number" step="0.1" value={sel.start} onChange={(e) => patch({ start: Number(e.target.value) })} />
                  <button className="mini" onClick={() => patch({ start: round1(currentTime) })}>현재</button>
                </div>
              </label>
              <label className="fld">
                <span>끝(초)</span>
                <div className="inline">
                  <input type="number" step="0.1" value={sel.end} onChange={(e) => patch({ end: Number(e.target.value) })} />
                  <button className="mini" onClick={() => patch({ end: round1(currentTime) })}>현재</button>
                </div>
              </label>
            </div>

            <div className="fld-row">
              <label className="fld">
                <span>X (%)</span>
                <input type="number" step="0.1" value={sel.x} onChange={(e) => patch({ x: clampNum(e.target.value) })} />
              </label>
              <label className="fld">
                <span>Y (%)</span>
                <input type="number" step="0.1" value={sel.y} onChange={(e) => patch({ y: clampNum(e.target.value) })} />
              </label>
            </div>

            <div className="fld-row">
              <label className="fld">
                <span>크기(px): {sel.style?.size ?? 34}</span>
                <input
                  type="range"
                  min="20"
                  max="60"
                  value={sel.style?.size ?? 34}
                  onChange={(e) => patch({ style: { ...sel.style, size: Number(e.target.value) } })}
                />
              </label>
              <label className="fld chk">
                <input type="checkbox" checked={sel.pauseOnClick} onChange={(e) => patch({ pauseOnClick: e.target.checked })} />
                <span>클릭 시 일시정지</span>
              </label>
            </div>

            <div className="fld">
              <span>색상</span>
              <div className="swatches">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={'swatch' + (sel.style?.color === c ? ' on' : '')}
                    style={{ background: c }}
                    onClick={() => patch({ style: { ...sel.style, color: c } })}
                  />
                ))}
              </div>
            </div>

            {/* 제품들 (다중 링크) */}
            <div className="products-head">
              <span>제품 ({products.length})</span>
              <button className="btn" onClick={() => setLibOpen(true)}>📚 불러오기</button>
            </div>

            {/* 제품 탭 */}
            <div className="ptabs">
              {products.map((p, i) => (
                <button
                  key={p.pid}
                  className={'ptab' + (activeProduct?.pid === p.pid ? ' on' : '')}
                  onClick={() => setActivePid(p.pid)}
                  title={p.name || `제품 ${i + 1}`}
                >
                  {p.name ? p.name.slice(0, 12) : `제품 ${i + 1}`}
                </button>
              ))}
              <button className="ptab add" onClick={handleAddProduct}>
                + 제품
              </button>
            </div>

            {activeProduct ? (
              <ProductCard key={activeProduct.pid} hotspotId={sel.id} product={activeProduct} />
            ) : (
              <p className="hs-empty">제품이 없습니다. 「+ 제품」으로 추가하세요.</p>
            )}

            <button className="btn danger" onClick={() => removeHotspot(sel.id)}>이 핫스팟 삭제</button>
          </div>
        ) : (
          <div className="hs-form empty">
            <p>왼쪽 목록에서 핫스팟을 고르거나, 「+ 핫스팟 추가」로 새로 만드세요.</p>
          </div>
        )}
      </div>
    </div>
  )
}

const round1 = (n) => Math.round((n || 0) * 10) / 10
const clampNum = (v) => Math.min(100, Math.max(0, Number(v) || 0))
