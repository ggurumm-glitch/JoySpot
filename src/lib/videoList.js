// videoList.js — public/videos 폴더의 영상 목록을 개발 서버 API(/api/videos)에서 가져온다.
// 서버(vite.config.js)가 폴더를 fs로 읽어 반환하므로, 파일을 추가/삭제 후
// 새로고침하면 항상 최신 목록이 반영된다. 파일명 특수문자(#·공백·이모지)에도 안전.

// 사용자에게 안내할 실제 폴더 경로(표시용)
export const VIDEO_FOLDER = 'C:\\www\\joyspot\\public\\videos'

export async function fetchVideoList() {
  try {
    const res = await fetch('/api/videos')
    if (!res.ok) return []
    const list = await res.json()
    // [{ name, url }] — url은 서버에서 이미 인코딩됨(/videos/<encoded>)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}
