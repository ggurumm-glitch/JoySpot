// Zustand v5 스토어 — 메모리 상태 + 영상별 핫스팟 + 제품 라이브러리 영속화(localStorage)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const EMPTY_HOTSPOTS = []

let hsSeq = 0
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

function newHotspot(currentTime, duration) {
  const start = Math.max(0, Math.floor(currentTime || 0))
  const end = Math.min(duration || start + 5, start + 5)
  hsSeq += 1
  return {
    id: 'hs_' + Date.now().toString(36) + '_' + hsSeq,
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

// 구버전(단일 링크) 핫스팟 → products 배열 구조로 정규화
export function normalizeHotspot(h) {
  if (Array.isArray(h.products)) return h
  const { productUrl, image, description, linkType, commission, memberName, price, ...rest } = h
  const hasLegacy = productUrl || image || description
  const legacy = {
    pid: 'p_legacy_' + (h.id || pSeq++),
    name: h.label || '',
    url: productUrl || '',
    image: image || '',
    description: description || '',
    price: price || '',
    linkType: linkType || 'direct',
    commission: commission || { type: 'percent', value: 0 },
    memberName: memberName || '',
  }
  return { ...rest, products: hasLegacy ? [legacy] : [newProduct()] }
}

export const useStore = create(
  persist(
    (set, get) => ({
      // ---- 영상 목록 ----
      videos: [],
      videosLoaded: false,
      selectedVideoUrl: null,
      setVideos: (videos) =>
        set((s) => {
          const stillThere = videos.some((v) => v.url === s.selectedVideoUrl)
          return {
            videos,
            videosLoaded: true,
            selectedVideoUrl: stillThere ? s.selectedVideoUrl : videos[0]?.url ?? null,
          }
        }),
      setSelectedVideoUrl: (url) =>
        set({
          selectedVideoUrl: url,
          currentTime: 0,
          duration: 0,
          paused: true,
          selectedHotspotId: null,
        }),

      // ---- 모드 ----
      mode: 'view',
      setMode: (mode) => set({ mode }),

      // ---- 영상별 핫스팟 ----
      hotspotsByVideo: {},
      selectedHotspotId: null,
      selectHotspot: (id) => set({ selectedHotspotId: id }),

      addHotspot: () =>
        set((s) => {
          const url = s.selectedVideoUrl
          if (!url) return {}
          const list = s.hotspotsByVideo[url] || []
          const hs = newHotspot(s.currentTime, s.duration)
          return {
            hotspotsByVideo: { ...s.hotspotsByVideo, [url]: [...list, hs] },
            selectedHotspotId: hs.id,
            mode: 'edit',
          }
        }),

      updateHotspot: (id, patch) =>
        set((s) => {
          const url = s.selectedVideoUrl
          const list = s.hotspotsByVideo[url] || []
          return {
            hotspotsByVideo: {
              ...s.hotspotsByVideo,
              [url]: list.map((h) => (h.id === id ? { ...h, ...patch } : h)),
            },
          }
        }),

      removeHotspot: (id) =>
        set((s) => {
          const url = s.selectedVideoUrl
          const list = s.hotspotsByVideo[url] || []
          return {
            hotspotsByVideo: { ...s.hotspotsByVideo, [url]: list.filter((h) => h.id !== id) },
            selectedHotspotId: s.selectedHotspotId === id ? null : s.selectedHotspotId,
          }
        }),

      importHotspots: (hotspots) =>
        set((s) => {
          const url = s.selectedVideoUrl
          if (!url || !Array.isArray(hotspots)) return {}
          return {
            hotspotsByVideo: { ...s.hotspotsByVideo, [url]: hotspots.map(normalizeHotspot) },
            selectedHotspotId: null,
          }
        }),

      // ---- 핫스팟 내 제품(다중 링크) ----
      // product를 전달하면 그대로 append(호출측이 pid 포함), 없으면 새 제품 생성
      addProduct: (hotspotId, product) =>
        set((s) => {
          const url = s.selectedVideoUrl
          const list = s.hotspotsByVideo[url] || []
          const p = product || newProduct()
          return {
            hotspotsByVideo: {
              ...s.hotspotsByVideo,
              [url]: list.map((h) =>
                h.id === hotspotId ? { ...h, products: [...(h.products || []), p] } : h,
              ),
            },
          }
        }),
      updateProduct: (hotspotId, pid, patch) =>
        set((s) => {
          const url = s.selectedVideoUrl
          const list = s.hotspotsByVideo[url] || []
          return {
            hotspotsByVideo: {
              ...s.hotspotsByVideo,
              [url]: list.map((h) =>
                h.id === hotspotId
                  ? {
                      ...h,
                      products: (h.products || []).map((p) =>
                        p.pid === pid ? { ...p, ...patch } : p,
                      ),
                    }
                  : h,
              ),
            },
          }
        }),
      removeProduct: (hotspotId, pid) =>
        set((s) => {
          const url = s.selectedVideoUrl
          const list = s.hotspotsByVideo[url] || []
          return {
            hotspotsByVideo: {
              ...s.hotspotsByVideo,
              [url]: list.map((h) =>
                h.id === hotspotId
                  ? { ...h, products: (h.products || []).filter((p) => p.pid !== pid) }
                  : h,
              ),
            },
          }
        }),

      // ---- 제품 라이브러리(재사용) ----
      catalog: [],
      saveToCatalog: (product) =>
        set((s) => {
          const { pid, ...rest } = product
          const item = { ...rest, cid: 'c_' + Date.now().toString(36) + '_' + s.catalog.length }
          // 같은 URL+이름이 이미 있으면 중복 저장 안 함
          if (s.catalog.some((c) => c.url === item.url && c.name === item.name)) return {}
          return { catalog: [item, ...s.catalog] }
        }),
      removeFromCatalog: (cid) =>
        set((s) => ({ catalog: s.catalog.filter((c) => c.cid !== cid) })),

      // ---- 재생 상태 ----
      currentTime: 0,
      duration: 0,
      paused: true,
      setCurrentTime: (t) => set({ currentTime: t }),
      setDuration: (d) => set({ duration: d }),
      setPaused: (p) => set({ paused: p }),
    }),
    {
      name: 'joyspot-hotspots',
      version: 2,
      partialize: (s) => ({ hotspotsByVideo: s.hotspotsByVideo, catalog: s.catalog }),
      migrate: (state) => {
        if (!state) return state
        const hbv = state.hotspotsByVideo || {}
        const out = {}
        for (const url of Object.keys(hbv)) {
          out[url] = (hbv[url] || []).map(normalizeHotspot)
        }
        return { hotspotsByVideo: out, catalog: state.catalog || [] }
      },
    },
  ),
)

export function activeHotspotsAt(hotspots, t) {
  return hotspots.filter((h) => t >= h.start && t <= h.end)
}
