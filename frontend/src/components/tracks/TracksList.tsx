import { useMutation } from '@tanstack/react-query'
import { tracksApi } from '@/services/api'
import { useUIStore } from '@/store/uiStore'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { TrackItem } from './TrackItem'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function TracksList() {
  const [link, setLink] = useState('')
  const {
    tracks,
    clearTracks,
    selectedTracks,
    selectAllTracks,
    deselectAllTracks,
    setDownloadProgress,
    removeDownloadProgress,
    markTrackCompleted,
    unmarkTrackCompleted,
    currentPlaylistName,
  } = useUIStore()

  const parseLinkMutation = useMutation({
    mutationFn: (link: string) => tracksApi.parseLink(link),
    onSuccess: (data) => {
      if (data.success && data.tracks) {
        useUIStore.getState().setTracks(data.tracks)
        setLink('')
      }
    },
  })

  const downloadMutation = useMutation({
    mutationFn: (trackId: string) => {
      setDownloadProgress(trackId, 0)
      const interval = setInterval(() => {
        const current = useUIStore.getState().downloadingTracks.get(trackId) || 0
        if (current < 90) {
          setDownloadProgress(trackId, current + 10)
        }
      }, 200)

      const folderName = useUIStore.getState().currentPlaylistName
      return tracksApi.downloadTrack(trackId, folderName || undefined).finally(() => {
        clearInterval(interval)
        setDownloadProgress(trackId, 100)
        setTimeout(() => {
          removeDownloadProgress(trackId)
          markTrackCompleted(trackId)
          setTimeout(() => unmarkTrackCompleted(trackId), 3000)
        }, 1000)
      })
    },
  })

  const handleParseLink = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (link.trim()) {
      parseLinkMutation.mutate(link.trim())
    }
  }

  const handleDownloadSelected = async () => {
    for (const trackId of selectedTracks) {
      await downloadMutation.mutateAsync(trackId)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🔗 Add tracks by link</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleParseLink} className="flex gap-2">
            <Input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Link to track, album or playlist..."
              className="flex-1"
            />
            <Button type="submit" loading={parseLinkMutation.isPending}>
              Load
            </Button>
          </form>
          {parseLinkMutation.error && (
            <div className="glass p-3 rounded-lg bg-red-500/20 border-red-400/30 mt-3">
              <p className="text-red-100 text-sm">Failed to parse link</p>
            </div>
          )}
        </CardContent>
      </Card>

      {tracks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>🎵 Tracks ({tracks.length})</CardTitle>
              <div className="flex gap-2">
                {selectedTracks.size > 0 && (
                  <Button
                    variant="secondary"
                    onClick={handleDownloadSelected}
                    disabled={downloadMutation.isPending}
                  >
                    ⬇️ Download selected ({selectedTracks.size})
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() =>
                    selectedTracks.size === tracks.length
                      ? deselectAllTracks()
                      : selectAllTracks()
                  }
                >
                  {selectedTracks.size === tracks.length ? 'Deselect all' : 'Select all'}
                </Button>
                <Button variant="ghost" onClick={clearTracks}>
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              <AnimatePresence>
                {tracks.map((track) => (
                  <TrackItem
                    key={track.id}
                    track={track}
                    onDownload={(id) => downloadMutation.mutate(id)}
                    isDownloading={downloadMutation.isPending}
                  />
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
