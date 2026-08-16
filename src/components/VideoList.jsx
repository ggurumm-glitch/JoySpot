import { useStore } from '../store/useStore.js'

// 폴더에서 자동 수집된 영상 목록. 클릭하면 해당 영상으로 전환.
export function VideoList() {
  const videos = useStore((s) => s.videos)
  const selectedVideoUrl = useStore((s) => s.selectedVideoUrl)
  const setSelectedVideoUrl = useStore((s) => s.setSelectedVideoUrl)

  return (
    <aside className="video-list">
      <div className="video-list-title">영상 목록 ({videos.length})</div>
      <ul>
        {videos.map((v) => (
          <li key={v.path}>
            <button
              type="button"
              className={'vitem' + (v.url === selectedVideoUrl ? ' active' : '')}
              onClick={() => setSelectedVideoUrl(v.url)}
              title={v.name}
            >
              <span className="vitem-icon">🎬</span>
              <span className="vitem-name">{v.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
