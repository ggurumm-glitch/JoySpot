// coords.js — 레터박스 보정 좌표 엔진 (JoySpot 핵심 공용 로직)
//
// 문제: <video>를 object-fit: contain 으로 넣으면, 요소 박스와 실제 영상 프레임
//       사이에 검은 여백(레터박스/필러박스)이 생긴다. 핫스팟 좌표를 "요소 박스" 기준
//       %로 잡으면 화면 비율이 바뀔 때 제품에서 어긋난다.
// 해결: 항상 "실제 렌더된 영상 프레임 영역" 기준으로 % <-> px 를 변환한다.

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

// 요소 박스 안에서 실제 영상 프레임이 그려지는 사각형(px, 요소 좌상단 기준)을 계산.
// object-fit: contain 기준.
export function getVideoContentRect(videoEl) {
  const cw = videoEl.clientWidth
  const ch = videoEl.clientHeight
  const vw = videoEl.videoWidth
  const vh = videoEl.videoHeight

  // 메타데이터 로드 전(vw/vh=0)에는 요소 박스 전체를 반환
  if (!vw || !vh) return { left: 0, top: 0, width: cw, height: ch }

  const containerRatio = cw / ch
  const videoRatio = vw / vh

  if (videoRatio > containerRatio) {
    // 영상이 더 넓음 → 위/아래 레터박스
    const width = cw
    const height = cw / videoRatio
    return { left: 0, top: (ch - height) / 2, width, height }
  } else {
    // 영상이 더 높음(또는 동일) → 좌/우 필러박스
    const height = ch
    const width = ch * videoRatio
    return { left: (cw - width) / 2, top: 0, width, height }
  }
}

// 핫스팟 %(0~100, 영상 프레임 기준) → 요소 좌상단 기준 px 위치(중심점)
export function percentToPixel(xPercent, yPercent, videoEl) {
  const r = getVideoContentRect(videoEl)
  return {
    left: r.left + (xPercent / 100) * r.width,
    top: r.top + (yPercent / 100) * r.height,
  }
}

// 요소 좌상단 기준 px(포인터 위치) → 핫스팟 %(영상 프레임 기준). 편집기 드래그용.
export function pixelToPercent(offsetX, offsetY, videoEl) {
  const r = getVideoContentRect(videoEl)
  if (r.width === 0 || r.height === 0) return { x: 0, y: 0 }
  return {
    x: clamp(((offsetX - r.left) / r.width) * 100, 0, 100),
    y: clamp(((offsetY - r.top) / r.height) * 100, 0, 100),
  }
}

// 포인터가 실제 영상 프레임 영역(레터박스 제외) 안에 있는지
export function isInsideVideoContent(offsetX, offsetY, videoEl) {
  const r = getVideoContentRect(videoEl)
  return (
    offsetX >= r.left &&
    offsetX <= r.left + r.width &&
    offsetY >= r.top &&
    offsetY <= r.top + r.height
  )
}
