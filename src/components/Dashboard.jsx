import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

const ROLE_LABEL = { operator: '운영자', uploader: '업로더', mall: '쇼핑몰 관계자' }
const won = (n) => (n || 0).toLocaleString('ko-KR') + '원'
const fmt = (ts) => {
  try {
    return new Date(ts).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

// 제휴 리포트 텍스트 → rows 파싱 (subId,orderAmount[,commissionAmount] 한 줄에 하나)
function parseRows(text) {
  const rows = []
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t) continue
    const p = t.split(',').map((s) => s.trim())
    const head = p[0].toLowerCase()
    if (head === 'subid' || head === 'clickid') continue // 헤더 skip
    const subId = p[0]
    const orderAmount = Number(p[1] || 0)
    if (!subId || Number.isNaN(orderAmount)) continue
    const row = { subId, orderAmount }
    if (p[2] !== undefined && p[2] !== '') row.commissionAmount = Number(p[2])
    rows.push(row)
  }
  return rows
}

export function Dashboard({ onClose }) {
  const data = useQuery(api.stats.dashboard)
  const importReport = useMutation(api.conversions.importReport)
  const [report, setReport] = useState('')
  const [busy, setBusy] = useState(false)

  const doImport = async () => {
    const rows = parseRows(report)
    if (rows.length === 0) return alert('형식: 각 줄에 "clickId,주문금액[,수수료]" (subId=구매 링크의 subId)')
    setBusy(true)
    try {
      const r = await importReport({ rows })
      alert(`대사 완료: 매칭 ${r.matched} · 미매칭 ${r.unmatched} · 중복 ${r.duplicate}`)
      setReport('')
    } catch (e) {
      alert('실패: ' + (e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dashboard">
      <div className="dash-head">
        <h2>
          📊 실적 · 정산
          {data && <span className="user-role">{ROLE_LABEL[data.role] || data.role}</span>}
        </h2>
        <button className="btn" onClick={onClose}>
          ← 돌아가기
        </button>
      </div>

      {data === undefined ? (
        <p className="hs-empty">불러오는 중…</p>
      ) : !data ? (
        <p className="hs-empty">데이터가 없습니다.</p>
      ) : (
        <>
          {/* 요약 KPI */}
          <div className="kpi-row">
            <div className="kpi">
              <span className="kpi-label">총 클릭</span>
              <b>{data.total.toLocaleString()}</b>
            </div>
            <div className="kpi">
              <span className="kpi-label">구매 전환</span>
              <b>{data.conv.count.toLocaleString()}</b>
              <span className="kpi-sub">전환율 {data.conv.convRate}%</span>
            </div>
            <div className="kpi">
              <span className="kpi-label">총 매출</span>
              <b>{won(data.conv.totalSales)}</b>
            </div>
            <div className="kpi">
              <span className="kpi-label">총 수수료</span>
              <b className="accent">{won(data.conv.totalCommission)}</b>
            </div>
          </div>

          <div className="dash-cols">
            <section className="dash-card">
              <h3>제품별 클릭</h3>
              {data.byProduct.length === 0 ? (
                <p className="hs-empty">아직 클릭이 없습니다.</p>
              ) : (
                data.byProduct.map((r) => (
                  <div className="dash-row" key={r.name}>
                    <span className="dash-name">{r.name}</span>
                    <b>{r.count}</b>
                  </div>
                ))
              )}
            </section>

            <section className="dash-card">
              <h3>{data.role === 'mall' ? '내 수수료' : '쇼핑몰 관계자별 수수료'}</h3>
              {data.conv.byMall.length === 0 ? (
                <p className="hs-empty">아직 전환(수수료)이 없습니다.</p>
              ) : (
                data.conv.byMall.map((r) => (
                  <div className="dash-row" key={r.name}>
                    <span className="dash-name">{r.name}</span>
                    <b className="accent">{won(r.commission)}</b>
                  </div>
                ))
              )}
            </section>
          </div>

          <section className="dash-card">
            <h3>최근 클릭</h3>
            {data.recent.length === 0 ? (
              <p className="hs-empty">아직 클릭이 없습니다.</p>
            ) : (
              data.recent.map((r, i) => (
                <div className="dash-row" key={i}>
                  <span className="dash-name">
                    {r.productName || '(제품)'} · <span className="dash-mall">{r.memberName || '-'}</span>
                  </span>
                  <span className="dash-time">{fmt(r.ts)}</span>
                </div>
              ))
            )}
          </section>

          {/* 운영자: 제휴 리포트 대사 */}
          {data.role === 'operator' && (
            <section className="dash-card">
              <h3>제휴 리포트 대사 (전환 반영)</h3>
              <p className="dash-note" style={{ marginTop: 0 }}>
                제휴 네트워크 리포트를 붙여넣으세요. 한 줄에 <code>clickId,주문금액,수수료</code> (수수료 생략 가능).
                링크의 <code>subId</code>가 곧 clickId입니다.
              </p>
              <textarea
                className="report-box"
                rows={5}
                placeholder={'clickId,orderAmount,commissionAmount\nabc-123-uuid,39900,3990\nxyz-456-uuid,120000,12000'}
                value={report}
                onChange={(e) => setReport(e.target.value)}
              />
              <button className="btn primary" onClick={doImport} disabled={busy}>
                {busy ? '대사 중…' : '대사 실행 (전환 반영)'}
              </button>
            </section>
          )}

          <p className="dash-note">
            💡 클릭은 실시간 집계. 구매(전환)는 위 제휴 리포트를 subId로 대사해 반영됩니다.
          </p>
        </>
      )}
    </div>
  )
}
