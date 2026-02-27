import { useQuery, useMutation } from '@tanstack/react-query'
import { playlistsApi } from '@/services/api'
import { useUIStore } from '@/store/uiStore'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { PlaylistItem } from './PlaylistItem'
import { motion } from 'framer-motion'

export function PlaylistsList() {
  const { setTracks } = useUIStore()

  const {
    data: playlistsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['playlists'],
    queryFn: playlistsApi.getMyPlaylists,
  })

  const tracksMutation = useMutation({
    mutationFn: ({ kind, uid }: { kind: string; uid: string; title: string }) =>
      playlistsApi.getPlaylistTracks(kind, uid),
    onSuccess: (data, variables) => {
      if (data.success && data.tracks) {
        setTracks(data.tracks, variables.title)
      }
    },
  })

  const handleSelectPlaylist = (kind: string, uid: string, title: string) => {
    tracksMutation.mutate({ kind, uid, title })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>📂 My playlists</CardTitle>
          <Button variant="secondary" onClick={() => refetch()} disabled={isLoading}>
            🔄 Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="mt-4 opacity-75">Loading playlists...</p>
          </div>
        )}

        {playlistsData?.playlists && playlistsData.playlists.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
            {playlistsData.playlists.map((playlist, index) => (
              <motion.div
                key={`${playlist.kind}-${playlist.uid}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <PlaylistItem
                  playlist={playlist}
                  onSelect={handleSelectPlaylist}
                  isLoading={tracksMutation.isPending}
                />
              </motion.div>
            ))}
          </div>
        )}

        {playlistsData?.playlists && playlistsData.playlists.length === 0 && (
          <div className="text-center py-8 opacity-75">
            <p>You don't have any playlists yet</p>
          </div>
        )}

        {tracksMutation.error && (
          <div className="glass p-4 rounded-xl bg-red-500/20 border-red-400/30 mt-4">
            <p className="text-red-100">Error loading tracks</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
