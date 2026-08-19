import { useEffect, useRef } from 'react'
import QRCodeStyling from 'qr-code-styling'

// 가운데 JoySpot 로고 (SVG data URL)
const LOGO =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="14" fill="#0b0d12"/><text x="32" y="45" font-family="system-ui,sans-serif" font-size="40" font-weight="800" fill="#5ad27a" text-anchor="middle">J</text></svg>',
  )

// 브랜드형 QR (qr-code-styling, 클라이언트 생성) + PNG/SVG 저장 + 링크 복사
export function QRModal({ title, data, filename = 'joyspot-qr', note, onClose }) {
  const holderRef = useRef(null)
  const qrRef = useRef(null)

  useEffect(() => {
    qrRef.current = new QRCodeStyling({
      width: 240,
      height: 240,
      data,
      image: LOGO,
      margin: 8,
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: { color: '#111827', type: 'rounded' },
      cornersSquareOptions: { color: '#03c75a', type: 'extra-rounded' },
      cornersDotOptions: { color: '#0b0d12' },
      backgroundOptions: { color: '#ffffff' },
      imageOptions: { crossOrigin: 'anonymous', imageSize: 0.26, margin: 4 },
    })
    if (holderRef.current) {
      holderRef.current.innerHTML = ''
      qrRef.current.append(holderRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    qrRef.current?.update({ data })
  }, [data])

  return (
    <div className="qr-backdrop" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qr-head">
          <span>{title}</span>
          <button className="mini" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="qr-holder" ref={holderRef} />
        {note && <p className="qr-note">{note}</p>}
        <div className="qr-link" title={data}>
          {data}
        </div>
        <div className="qr-actions">
          <button className="btn" onClick={() => qrRef.current?.download({ name: filename, extension: 'png' })}>
            PNG 저장
          </button>
          <button className="btn" onClick={() => qrRef.current?.download({ name: filename, extension: 'svg' })}>
            SVG 저장
          </button>
          <button className="btn" onClick={() => navigator.clipboard?.writeText(data)}>
            링크 복사
          </button>
        </div>
      </div>
    </div>
  )
}
