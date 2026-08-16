import { useRef, useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useStore, EMPTY_HOTSPOTS } from '../store/useStore.js'
import { Hotspot } from './Hotspot.jsx'
import { EditableHotspot } from './EditableHotspot.jsx'

// 시청(뷰어) 화면: <video> + 오버레이 + 시간동기화된 핫스팟(Convex).
export function Viewer() {
  const videoRef = useRef(null)
  const wrapRef = useRef(null)

  const mode = useStore((s) => s.mode)
  const selectedVideoUrl = useStore((s) => s.selectedVideoUrl)
  const selectedHotspotId = useStore((s) => s.selectedHotspotId)
  const currentTime = useStore((s) => s.currentTime)
  const setCurrentTime = useStore((s) => s.setCurrentTime)
  const setDuration = useStore((s) => s.setDuration)
  const setPaused = useStore((s) => s.setPaused)

  const hotspots =
    useQuery(api.hotspots.listByVideo, selectedVideoUrl ? { videoKey: selectedVideoUrl } : 'skip') ??
    EMPTY_HOTSPOTS

  const [loadError, setLoadError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [, forceTick] = useState(0)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const ro = new ResizeObserver(() => forceTick((x) => x + 1))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const onFs = () => {
      setIsFullscreen(!!document.fullscreenElement)
      forceTick((x) => x + 1)
    }
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else wrapRef.current?.requestFullscreen?.()
  }

  const active = hotspots.filter((h) => {
    const inTime = currentTime >= h.start && currentTime <= h.end
    return inTime || (mode === 'edit' && h._id === selectedHotspotId)
  })

  return (
    <div className={'video-wrap' + (isFullscreen ? ' is-fullscreen' : '')} ref={wrapRef}>
      <video
        ref={videoRef}
        key={selectedVideoUrl}
        src={selectedVideoUrl}
        controls
        controlsList="nofullscreen"
        playsInline
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration)
          setLoadError(false)
          forceTick((x) => x + 1)
        }}
        onError={() => setLoadError(true)}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      />

      <button
        type="button"
        className="fs-btn"
        onClick={toggleFullscreen}
        title={isFullscreen ? '전체화면 종료' : '전체화면'}
      >
        {isFullscreen ? '⤢ 창모드' : '⛶ 전체화면'}
      </button>

      <div className="overlay">
        {active.map((h) =>
          mode === 'edit' ? (
            <EditableHotspot key={h._id} hotspot={h} videoEl={videoRef.current} />
          ) : (
            <Hotspot key={h._id} hotspot={h} videoEl={videoRef.current} />
          ),
        )}
      </div>

      {loadError && (
        <div className="video-error">
          ⚠️ 영상을 불러오지 못했습니다. URL이 차단되었거나 네트워크 문제일 수 있습니다.
        </div>
      )}
    </div>
  )
}
