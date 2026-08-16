// Zustand v5 — UI 전용 상태만 (데이터는 Convex가 진실. localStorage persist 제거)
import { create } from 'zustand'

export const EMPTY_HOTSPOTS = []

let pSeq = 0
export function newProduct() {
  pSeq += 1
  return {
    pid: 'p_' + Date.now().toString(36) + '_' + pSeq,
    name: '',
    url: '',
    image: '',
    description: '',
    price: '',
    linkType: 'direct',
    commission: { type: 'percent', value: 0 },
    memberName: '',
  }
}

// Convex에 넣을 새 핫스팟 문서 (id/videoKey 없음 — 서버가 _id 부여, videoKey는 서버 인자)
export function newHotspotDoc(currentTime, duration) {
  const start = Math.max(0, Math.floor(currentTime || 0))
  const end = Math.min(duration || start + 5, start + 5)
  return {
    label: '새 핫스팟',
    x: 50,
    y: 50,
    start,
    end: end > start ? end : start + 5,
    pauseOnClick: true,
    style: { size: 34, color: 'rgba(255,80,80,0.78)' },
    products: [newProduct()],
  }
}

export const useStore = create((set) => ({
  // 영상 목록 (폴더 스캔)
  videos: [],
  videosLoaded: false,
  selectedVideoUrl: null,
  setVideos: (videos) =>
    set((s) => {
      const still = videos.some((v) => v.url === s.selectedVideoUrl)
      return {
        videos,
        videosLoaded: true,
        selectedVideoUrl: still ? s.selectedVideoUrl : videos[0]?.url ?? null,
      }
    }),
  setSelectedVideoUrl: (url) =>
    set({
      selectedVideoUrl: url,
      currentTime: 0,
      duration: 0,
      paused: true,
      selectedHotspotId: null,
      activePid: null,
    }),

  // 모드/선택 (UI)
  mode: 'view',
  setMode: (mode) => set({ mode }),
  selectedHotspotId: null, // Convex _id
  selectHotspot: (id) => set({ selectedHotspotId: id }),
  activePid: null, // 편집 중 제품 탭
  setActivePid: (pid) => set({ activePid: pid }),

  // 재생 상태
  currentTime: 0,
  duration: 0,
  paused: true,
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setPaused: (p) => set({ paused: p }),
}))

export function activeHotspotsAt(hotspots, t) {
  return hotspots.filter((h) => t >= h.start && t <= h.end)
}
