import { useState } from 'react'
import { useMutation, useQuery, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Field } from './Field.jsx'

// 핫스팟 안의 개별 제품 편집 카드 (Convex). enrich + 라이브러리 저장.
export function ProductCard({ hotspotId, product, clicks = 0 }) {
  const updateProduct = useMutation(api.hotspots.updateProduct)
  const removeProduct = useMutation(api.hotspots.removeProduct)
  const addCatalog = useMutation(api.catalog.add)
  const enrichLink = useAction(api.enrich.enrichLink)
  const serperSearch = useAction(api.enrich.serperSearch)
  const malls = useQuery(api.members.listMalls) ?? []
  const [busy, setBusy] = useState(null)
  const [serper, setSerper] = useState(null)

  const patch = (p) => updateProduct({ id: hotspotId, pid: product.pid, patch: p })

  const saveToCatalog = () => {
    const { pid, ...item } = product
    addCatalog({ item })
  }

  const enrichFromLink = async () => {
    if (!product.url) return alert('먼저 제품 링크 URL을 입력하세요.')
    setBusy('link')
    try {
      const d = await enrichLink({ url: product.url })
      if (!d.ok) return alert('가져오기 실패: ' + (d.error || '오류'))
      if (!d.image && !d.description) {
        return alert(
          '이 페이지에서 제품 정보를 찾지 못했습니다.\n네이버·쿠팡 등은 봇 차단으로 링크 추출이 막혀 있습니다.\n→ 「🔎 Serper로 검색」을 이용하세요.',
        )
      }
      const p = { image: d.image || product.image }
      if (d.description) p.description = d.description
      if (d.title && !product.name) p.name = d.title
      patch(p)
    } catch (e) {
      alert('오류: ' + (e?.message || e))
    } finally {
      setBusy(null)
    }
  }

  const searchSerper = async () => {
    const q = product.name || product.description
    if (!q) return alert('먼저 제품명(또는 설명)을 입력하세요. 검색어로 사용됩니다.')
    setBusy('serper')
    setSerper(null)
    try {
      const d = await serperSearch({ q })
      if (d.configured === false)
        return alert('Serper API 키가 설정되지 않았습니다. .env.local 에 SERPER_API_KEY 를 넣고 서버를 재시작하세요.')
      if (!d.ok) return alert('검색 실패: ' + (d.error || '오류'))
      setSerper(d)
    } catch (e) {
      alert('오류: ' + (e?.message || e))
    } finally {
      setBusy(null)
    }
  }

  const applyResult = (rslt) => {
    const p = { url: rslt.link }
    if (rslt.snippet) p.description = rslt.snippet
    if (rslt.title && !product.name) p.name = rslt.title
    patch(p)
  }

  return (
    <div className="pcard">
      <div className="pcard-head">
        <span className="pcard-title">{product.name || '제품 정보'}</span>
        <span className="pcard-clicks" title="이 제품 클릭 수">클릭 {clicks}</span>
        <div className="pcard-head-actions">
          <button className="mini" onClick={saveToCatalog} title="라이브러리에 저장">
            ⭐ 저장
          </button>
          <button className="mini danger" onClick={() => removeProduct({ id: hotspotId, pid: product.pid })}>
            삭제
          </button>
        </div>
      </div>

      <div className="pcard-body">
        <label className="fld">
          <span>제품명</span>
          <Field value={product.name} onCommit={(v) => patch({ name: v })} />
        </label>

        <label className="fld">
          <span>제품 링크 URL</span>
          <Field type="url" placeholder="https://..." value={product.url} onCommit={(v) => patch({ url: v })} />
        </label>

        <div className="enrich-bar">
          <button className="btn" onClick={enrichFromLink} disabled={busy === 'link'}>
            {busy === 'link' ? '가져오는 중…' : '🔗 링크에서 가져오기'}
          </button>
          <button className="btn" onClick={searchSerper} disabled={busy === 'serper'}>
            {busy === 'serper' ? '검색 중…' : '🔎 Serper로 검색'}
          </button>
        </div>

        {product.image && (
          <div className="hs-thumb-wrap">
            <img className="hs-thumb" src={product.image} alt="" />
            <button className="mini" onClick={() => patch({ image: '' })}>
              이미지 제거
            </button>
          </div>
        )}

        {serper && (
          <div className="serper">
            <div className="serper-head">
              <span>Serper 검색결과</span>
              <button className="mini" onClick={() => setSerper(null)}>
                닫기
              </button>
            </div>
            {serper.images?.length > 0 && (
              <div className="serper-imgs">
                {serper.images.map((src) => (
                  <img key={src} src={src} alt="" onClick={() => patch({ image: src })} title="이 이미지 사용" />
                ))}
              </div>
            )}
            {serper.results?.map((rslt) => (
              <button key={rslt.link} className="serper-row" onClick={() => applyResult(rslt)}>
                <span className="serper-title">{rslt.title}</span>
                <span className="serper-snip">{rslt.snippet}</span>
                <span className="serper-link">{rslt.link}</span>
              </button>
            ))}
          </div>
        )}

        <label className="fld">
          <span>자세한 설명</span>
          <Field textarea rows={2} value={product.description} onCommit={(v) => patch({ description: v })} />
        </label>

        <div className="fld-row">
          <label className="fld">
            <span>가격(선택)</span>
            <Field placeholder="예: 39,900원" value={product.price} onCommit={(v) => patch({ price: v })} />
          </label>
          <label className="fld">
            <span>링크 종류</span>
            <select value={product.linkType} onChange={(e) => patch({ linkType: e.target.value })}>
              <option value="direct">일반(direct)</option>
              <option value="affiliate">제휴(affiliate)</option>
            </select>
          </label>
        </div>

        <div className="fld-row">
          <label className="fld">
            <span>쇼핑몰 관계자 (제품별)</span>
            <select
              value={product.mallMemberId ?? ''}
              onChange={(e) => {
                const id = e.target.value
                if (!id) return patch({ mallMemberId: null, memberName: '' })
                const m = malls.find((x) => x.userId === id)
                patch({ mallMemberId: id, memberName: m?.displayName ?? '' })
              }}
            >
              <option value="">(없음)</option>
              {malls.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span>수수료 (내부용)</span>
            <div className="inline">
              <select
                value={product.commission?.type || 'percent'}
                onChange={(e) => patch({ commission: { ...product.commission, type: e.target.value } })}
              >
                <option value="percent">%</option>
                <option value="amount">원</option>
              </select>
              <Field
                number
                value={product.commission?.value ?? 0}
                onCommit={(v) => patch({ commission: { ...product.commission, value: v } })}
              />
            </div>
          </label>
        </div>
        {malls.length === 0 && (
          <p className="hs-empty">등록된 쇼핑몰 관계자가 없습니다 (mall 역할 계정 필요).</p>
        )}
      </div>
    </div>
  )
}
