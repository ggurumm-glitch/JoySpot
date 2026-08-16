import { useRef, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useStore, EMPTY_HOTSPOTS, newProduct, newHotspotDoc } from '../store/useStore.js'
import { ProductCard } from './ProductCard.jsx'
import { LibraryDrawer } from './LibraryDrawer.jsx'
import { Field } from './Field.jsx'

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

  const videos = useStore((s) => s.videos)
  const selectedVideoUrl = useStore((s) => s.selectedVideoUrl)
  const selectedHotspotId = useStore((s) => s.selectedHotspotId)
  const currentTime = useStore((s) => s.currentTime)
  const duration = useStore((s) => s.duration)
  const selectHotspot = useStore((s) => s.selectHotspot)
  const activePid = useStore((s) => s.activePid)
  const setActivePid = useStore((s) => s.setActivePid)
  const setMode = useStore((s) => s.setMode)

  const hotspots =
    useQuery(api.hotspots.listByVideo, selectedVideoUrl ? { videoKey: selectedVideoUrl } : 'skip') ??
    EMPTY_HOTSPOTS

  const stats = useQuery(
    api.clicks.statsByVideo,
    selectedVideoUrl ? { videoKey: selectedVideoUrl } : 'skip',
  )
  const byPid = stats?.byPid || {}

  const createHotspot = useMutation(api.hotspots.create)
  const updateHotspot = useMutation(api.hotspots.update)
  const removeHotspot = useMutation(api.hotspots.remove)
  const addProduct = useMutation(api.hotspots.addProduct)

  const sel = hotspots.find((h) => h._id === selectedHotspotId) || null
  const videoName = videos.find((v) => v.url === selectedVideoUrl)?.name || ''
  const patch = (p) => updateHotspot({ id: sel._id, patch: p })

  const products = sel?.products || []
  const activeProduct = products.find((p) => p.pid === activePid) || products[0] || null

  const handleAddHotspot = async () => {
    if (!selectedVideoUrl) return
    const id = await createHotspot({
      videoKey: selectedVideoUrl,
      hotspot: newHotspotDoc(currentTime, duration),
    })
    selectHotspot(id)
    setActivePid(null)
    setMode('edit')
  }
  const handleAddProduct = () => {
    const p = newProduct()
    addProduct({ id: sel._id, product: p })
    setActivePid(p.pid)
  }

  const exportJson = () => {
    const clean = hotspots.map(({ _id, _creationTime, videoKey, ...h }) => h)
    const blob = new Blob([JSON.stringify({ videoName, hotspots: clean }, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `joyspot-hotspots-${(videoName || 'video').slice(0, 20)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const importJson = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    e.target.value = ''
    try {
      const parsed = JSON.parse(text)
      const list = Array.isArray(parsed) ? parsed : parsed.hotspots
      if (!Array.isArray(list)) return alert('유효한 핫스팟 JSON이 아닙니다.')
      for (const h of list) await createHotspot({ videoKey: selectedVideoUrl, hotspot: h })
    } catch {
      alert('JSON 파싱 실패')
    }
  }

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <button className="btn primary" onClick={handleAddHotspot}>
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
          📚 라이브러리
        </button>
      </div>

      <LibraryDrawer open={libOpen} onClose={() => setLibOpen(false)} />

      <div className="editor-body">
        <div className="hs-list">
          <div className="hs-list-title">핫스팟 ({hotspots.length})</div>
          {hotspots.length === 0 && (
            <p className="hs-empty">「+ 핫스팟 추가」를 누른 뒤 영상 위에서 드래그해 제품 위로 옮기세요.</p>
          )}
          {hotspots.map((h) => (
            <div
              key={h._id}
              className={'hs-row' + (h._id === selectedHotspotId ? ' active' : '')}
              onClick={() => selectHotspot(h._id)}
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
                  removeHotspot({ id: h._id })
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {sel ? (
          <div className="hs-form">
            <label className="fld">
              <span>핫스팟 제목(점 위 표시)</span>
              <Field value={sel.label} onCommit={(v) => patch({ label: v })} />
            </label>

            <div className="fld-row">
              <label className="fld">
                <span>시작(초)</span>
                <div className="inline">
                  <Field number step="0.1" value={sel.start} onCommit={(v) => patch({ start: v })} />
                  <button className="mini" onClick={() => patch({ start: round1(currentTime) })}>현재</button>
                </div>
              </label>
              <label className="fld">
                <span>끝(초)</span>
                <div className="inline">
                  <Field number step="0.1" value={sel.end} onCommit={(v) => patch({ end: v })} />
                  <button className="mini" onClick={() => patch({ end: round1(currentTime) })}>현재</button>
                </div>
              </label>
            </div>

            <div className="fld-row">
              <label className="fld">
                <span>X (%)</span>
                <Field number step="0.1" value={sel.x} onCommit={(v) => patch({ x: clampNum(v) })} />
              </label>
              <label className="fld">
                <span>Y (%)</span>
                <Field number step="0.1" value={sel.y} onCommit={(v) => patch({ y: clampNum(v) })} />
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

            <div className="products-head">
              <span>제품 ({products.length}) · 총 클릭 {stats?.total ?? 0}</span>
              <button className="btn" onClick={() => setLibOpen(true)}>📚 불러오기</button>
            </div>

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
              <ProductCard
                key={activeProduct.pid}
                hotspotId={sel._id}
                product={activeProduct}
                clicks={byPid[activeProduct.pid] || 0}
              />
            ) : (
              <p className="hs-empty">제품이 없습니다. 「+ 제품」으로 추가하세요.</p>
            )}

            <button className="btn danger" onClick={() => removeHotspot({ id: sel._id })}>
              이 핫스팟 삭제
            </button>
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
