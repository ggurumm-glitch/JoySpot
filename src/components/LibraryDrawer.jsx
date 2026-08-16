import { useStore, newProduct } from '../store/useStore.js'

// 카탈로그 항목 → 새 pid를 가진 제품 객체
function catalogToProduct(c) {
  return {
    ...newProduct(),
    name: c.name || '',
    url: c.url || '',
    image: c.image || '',
    description: c.description || '',
    price: c.price || '',
    linkType: c.linkType || 'direct',
    commission: c.commission || { type: 'percent', value: 0 },
    memberName: c.memberName || '',
  }
}

// 전역 제품 라이브러리 드로어 (우측 슬라이드). 선택된 핫스팟에 재사용 제품을 추가.
export function LibraryDrawer({ open, onClose }) {
  const catalog = useStore((s) => s.catalog)
  const selectedHotspotId = useStore((s) => s.selectedHotspotId)
  const addProduct = useStore((s) => s.addProduct)
  const removeFromCatalog = useStore((s) => s.removeFromCatalog)

  return (
    <>
      {open && <div className="drawer-backdrop" onClick={onClose} />}
      <aside className={'drawer' + (open ? ' open' : '')} aria-hidden={!open}>
        <div className="drawer-head">
          <span>📚 제품 라이브러리 ({catalog.length})</span>
          <button className="mini" onClick={onClose}>
            ✕ 닫기
          </button>
        </div>

        {!selectedHotspotId && (
          <p className="hs-empty drawer-hint">핫스팟을 먼저 선택하면 「추가」로 붙일 수 있어요.</p>
        )}

        <div className="drawer-body">
          {catalog.length === 0 && (
            <p className="hs-empty">
              저장된 제품이 없습니다. 제품 카드의 「⭐ 저장」을 누르면 여기에 쌓여 재사용할 수 있어요.
            </p>
          )}
          {catalog.map((c) => (
            <div key={c.cid} className="cat-row">
              {c.image ? (
                <img className="cat-thumb" src={c.image} alt="" />
              ) : (
                <span className="cat-thumb empty" />
              )}
              <span className="cat-info">
                <span className="cat-name">{c.name || c.url || '(제품)'}</span>
                {c.price && <span className="cat-price">{c.price}</span>}
              </span>
              <button
                className="mini"
                disabled={!selectedHotspotId}
                onClick={() => addProduct(selectedHotspotId, catalogToProduct(c))}
                title={selectedHotspotId ? '선택된 핫스팟에 추가' : '핫스팟을 먼저 선택하세요'}
              >
                추가
              </button>
              <button className="mini danger" onClick={() => removeFromCatalog(c.cid)} title="라이브러리에서 삭제">
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
