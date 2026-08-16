import { useEffect, useRef, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Hotspot } from './Hotspot.jsx'
import { fetchVideoList } from '../lib/videoList.js'

// 익명 공개 뷰어: 로그인 없이 영상 시청 + 핫스팟 클릭.
// videoKey(공유 링크 ?watch=)가 있으면 그 영상만, 없으면 폴더 목록에서 선택.
export function PublicViewer({ videoKey }) {
  const [videos, setVideos] = useState([])
  const [selected, setSelected] = useState(videoKey || null)
  const videoRef = useRef(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [, tick] = useState(0)

  useEffect(() => {
    if (videoKey) {
      setSelected(videoKey)
      return
    }
    fetchVideoList().then((list) => {
      setVideos(list)
      setSelected((s) => s ?? list[0]?.url ?? null)
    })
  }, [videoKey])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const ro = new ResizeObserver(() => tick((x) => x + 1))
    ro.observe(el)
    return () => ro.disconnect()
  }, [selected])

  const hotspots =
    useQuery(api.hotspots.listByVideo, selected ? { videoKey: selected } : 'skip') ?? []
  const active = hotspots.filter((h) => currentTime >= h.start && currentTime <= h.end)

  return (
    <div className="app">
      <header className="app-header">
        <div className="head-row">
          <h1>
            JoySpot <span className="badge">시청</span>
          </h1>
          <a className="btn" href="?login=1">
            제작자 로그인
          </a>
        </div>
        <p className="sub">영상 속 제품 위 점을 클릭하면 판매 페이지로 이동합니다.</p>
      </header>

      <div className="layout">
        {!videoKey && videos.length > 0 && (
          <aside className="video-list">
            <div className="video-list-title">영상 목록 ({videos.length})</div>
            <ul>
              {videos.map((v) => (
                <li key={v.url}>
                  <button
                    className={'vitem' + (v.url === selected ? ' active' : '')}
                    onClick={() => setSelected(v.url)}
                    title={v.name}
                  >
                    <span className="vitem-icon">🎬</span>
                    <span className="vitem-name">{v.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div className="main">
          {selected ? (
            <div className="video-wrap">
              <video
                ref={videoRef}
                key={selected}
                src={selected}
                controls
                playsInline
                preload="metadata"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={() => tick((x) => x + 1)}
              />
              <div className="overlay">
                {active.map((h) => (
                  <Hotspot key={h._id} hotspot={h} videoEl={videoRef.current} />
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🎬</div>
              <p>재생할 영상이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
