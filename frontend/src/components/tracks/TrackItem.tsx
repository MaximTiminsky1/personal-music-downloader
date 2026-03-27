import { motion } from 'framer-motion'
import { useState } from 'react'
import type { Track } from '@/types/api'
import { useUIStore } from '@/store/uiStore'
import { usePlayerStore } from '@/store/playerStore'
import { tracksApi } from '@/services/api'
import { Button } from '../ui/Button'

interface TrackItemProps {
  track: Track
  onDownload: (trackId: string) => void
  isDownloading?: boolean
}

export function TrackItem({ track, onDownload, isDownloading }: TrackItemProps) {
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const { selectedTracks, toggleTrack, downloadingTracks, completedTracks } = useUIStore()
  const { currentTrack, isPlaying, setCurrentTrack, togglePlay } = usePlayerStore()
  const isSelected = selectedTracks.has(track.id)
  const downloadProgress = downloadingTracks.get(track.id)
  const isCompleted = completedTracks.has(track.id)
  const isCurrentTrack = currentTrack?.id === track.id

  const handlePlay = async () => {
    if (isCurrentTrack) {
      togglePlay()
      return
    }

    setIsLoadingUrl(true)
    try {
      const response = await tracksApi.getTrackUrl(track.id)
      if (response.success && response.url) {
        setCurrentTrack(track, response.url)
      }
    } catch (error) {
      console.error('Failed to get track URL:', error)
    } finally {
      setIsLoadingUrl(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass glass-hover p-4 rounded-xl ${
        isSelected ? 'ring-2 ring-white/40' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleTrack(track.id)}
          className="w-5 h-5 cursor-pointer glass glass-hover p-4 rounded-xl "
        />

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate">{track.title}</h4>
          <div className="flex items-center gap-2 text-sm opacity-75 mt-1">
            <span className="truncate">{track.artists}</span>
            {track.album && (
              <>
                <span>•</span>
                <span className="truncate">{track.album}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs opacity-60 mt-1">
            <span>⏱ {track.duration}</span>
            {track.bitrate && (
              <>
                <span>•</span>
                <span>🎵 {track.bitrate}kbps {track.codec?.toUpperCase()}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={isCurrentTrack && isPlaying ? "secondary" : "ghost"}
            onClick={handlePlay}
            disabled={isLoadingUrl}
            className="w-10 h-10 p-0 text-xl flex items-center justify-center"
          >
            {isLoadingUrl ? (
              <div className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isCurrentTrack && isPlaying ? (
              '⏸'
            ) : (
              '▶'
            )}
          </Button>

          {downloadProgress !== undefined ? (
            <div className="w-32">
              <div className="glass rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${downloadProgress}%` }}
                  className="h-full bg-green-400"
                />
              </div>
              <p className="text-xs text-center mt-1 opacity-75">{downloadProgress}%</p>
            </div>
          ) : isCompleted ? (
            <Button
              variant="secondary"
              disabled
              className="opacity-60"
            >
              ✅ Downloaded
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => onDownload(track.id)}
              disabled={isDownloading}
            >
              ⬇️ Download
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
