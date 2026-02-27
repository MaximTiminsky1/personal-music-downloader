import { motion } from 'framer-motion'
import type { Playlist } from '@/types/api'
import { Button } from '../ui/Button'

interface PlaylistItemProps {
  playlist: Playlist
  onSelect: (kind: string, uid: string, title: string) => void
  isLoading?: boolean
}

export function PlaylistItem({ playlist, onSelect, isLoading }: PlaylistItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02, x: 5 }}
      className="glass glass-hover p-4 rounded-xl cursor-pointer"
      onClick={() => !isLoading && onSelect(playlist.kind, playlist.uid, playlist.title)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{playlist.title}</h3>
          <div className="flex items-center gap-3 text-sm opacity-75">
            <span>🎵 {playlist.track_count} tracks</span>
            <span>•</span>
            <span>👤 {playlist.owner_name}</span>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation()
            onSelect(playlist.kind, playlist.uid, playlist.title)
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Open'}
        </Button>
      </div>
    </motion.div>
  )
}
