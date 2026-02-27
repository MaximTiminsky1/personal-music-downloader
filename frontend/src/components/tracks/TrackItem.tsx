import { motion } from 'framer-motion'
import type { Track } from '@/types/api'
import { useUIStore } from '@/store/uiStore'
import { Button } from '../ui/Button'

interface TrackItemProps {
  track: Track
  onDownload: (trackId: string) => void
  isDownloading?: boolean
}

export function TrackItem({ track, onDownload, isDownloading }: TrackItemProps) {
  const { selectedTracks, toggleTrack, downloadingTracks, completedTracks } = useUIStore()
  const isSelected = selectedTracks.has(track.id)
  const downloadProgress = downloadingTracks.get(track.id)
  const isCompleted = completedTracks.has(track.id)

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
    </motion.div>
  )
}
