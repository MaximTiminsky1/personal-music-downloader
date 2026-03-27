import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import { tracksApi } from '@/services/api'
import { useUIStore } from '@/store/uiStore'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { TrackItem } from './TrackItem'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'

export function AllTracksList() {
  const observerTarget = useRef<HTMLDivElement>(null)
  const [downloadingTracks, setDownloadingTracks] = useState<Set<string>>(new Set())
  const {
    selectedTracks,
    selectAllTracks,
    deselectAllTracks,
    setDownloadProgress,
    removeDownloadProgress,
    markTrackCompleted,
    unmarkTrackCompleted,
  } = useUIStore()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['liked-tracks'],
    queryFn: ({ pageParam = 0 }) => tracksApi.getLikedTracks(pageParam, 20),
    getNextPageParam: (lastPage) => {
      if (lastPage.has_more) {
        return lastPage.page + 1
      }
      return undefined
    },
    initialPageParam: 0,
  })

  const allTracks = data?.pages.flatMap(page => page.tracks) ?? []
  const totalCount = data?.pages[0]?.total ?? 0

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const downloadMutation = useMutation({
    mutationFn: (trackId: string) => {
      setDownloadProgress(trackId, 0)
      setDownloadingTracks(prev => new Set(prev).add(trackId))

      const interval = setInterval(() => {
        const current = useUIStore.getState().downloadingTracks.get(trackId) || 0
        if (current < 90) {
          setDownloadProgress(trackId, current + 10)
        }
      }, 200)

      return tracksApi.downloadTrack(trackId, 'Liked Tracks').finally(() => {
        clearInterval(interval)
        setDownloadProgress(trackId, 100)
        setTimeout(() => {
          removeDownloadProgress(trackId)
          markTrackCompleted(trackId)
          setDownloadingTracks(prev => {
            const newSet = new Set(prev)
            newSet.delete(trackId)
            return newSet
          })
          setTimeout(() => unmarkTrackCompleted(trackId), 3000)
        }, 1000)
      })
    },
  })

  const handleDownloadSelected = async () => {
    for (const trackId of selectedTracks) {
      await downloadMutation.mutateAsync(trackId)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent>
          <div className="glass p-4 rounded-lg bg-red-500/20 border-red-400/30">
            <p className="text-red-100">Failed to load tracks: {error?.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            All Tracks ({totalCount.toLocaleString()})
          </CardTitle>
          <div className="flex gap-2">
            {selectedTracks.size > 0 && (
              <Button
                variant="secondary"
                onClick={handleDownloadSelected}
                disabled={downloadingTracks.size > 0}
              >
                Download selected ({selectedTracks.size})
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() =>
                selectedTracks.size === allTracks.length
                  ? deselectAllTracks()
                  : selectAllTracks(allTracks)
              }
            >
              {selectedTracks.size === allTracks.length ? 'Deselect all' : 'Select all'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
          <AnimatePresence>
            {allTracks.map((track) => (
              <TrackItem
                key={track.id}
                track={track}
                onDownload={(id) => downloadMutation.mutate(id)}
                isDownloading={downloadingTracks.has(track.id)}
              />
            ))}
          </AnimatePresence>

          {hasNextPage && (
            <div ref={observerTarget} className="py-4 text-center">
              {isFetchingNextPage ? (
                <div className="inline-block w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Button onClick={() => fetchNextPage()} variant="ghost">
                  Load more
                </Button>
              )}
            </div>
          )}

          {!hasNextPage && allTracks.length > 0 && (
            <div className="py-4 text-center opacity-50 text-sm">
              All tracks loaded
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
