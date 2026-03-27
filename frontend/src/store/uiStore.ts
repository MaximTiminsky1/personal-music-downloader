import { create } from 'zustand'
import type { Track } from '@/types/api'

interface UIState {
  tracks: Track[]
  selectedTracks: Set<string>
  downloadingTracks: Map<string, number>
  completedTracks: Set<string>
  currentPlaylistName: string | null

  setTracks: (tracks: Track[], playlistName?: string) => void
  clearTracks: () => void
  toggleTrack: (trackId: string) => void
  selectAllTracks: (tracks?: Track[]) => void
  deselectAllTracks: () => void
  setDownloadProgress: (trackId: string, progress: number) => void
  removeDownloadProgress: (trackId: string) => void
  markTrackCompleted: (trackId: string) => void
  unmarkTrackCompleted: (trackId: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  tracks: [],
  selectedTracks: new Set(),
  downloadingTracks: new Map(),
  completedTracks: new Set(),
  currentPlaylistName: null,

  setTracks: (tracks, playlistName) =>
    set({
      tracks,
      selectedTracks: new Set(),
      downloadingTracks: new Map(),
      completedTracks: new Set(),
      currentPlaylistName: playlistName || null,
    }),

  clearTracks: () =>
    set({
      tracks: [],
      selectedTracks: new Set(),
      downloadingTracks: new Map(),
      completedTracks: new Set(),
      currentPlaylistName: null,
    }),

  toggleTrack: (trackId) =>
    set((state) => {
      const newSelected = new Set(state.selectedTracks)
      if (newSelected.has(trackId)) {
        newSelected.delete(trackId)
      } else {
        newSelected.add(trackId)
      }
      return { selectedTracks: newSelected }
    }),

  selectAllTracks: (tracks) =>
    set((state) => ({
      selectedTracks: new Set((tracks || state.tracks).map((t) => t.id)),
    })),

  deselectAllTracks: () => set({ selectedTracks: new Set() }),

  setDownloadProgress: (trackId, progress) =>
    set((state) => {
      const newMap = new Map(state.downloadingTracks)
      newMap.set(trackId, progress)
      return { downloadingTracks: newMap }
    }),

  removeDownloadProgress: (trackId) =>
    set((state) => {
      const newMap = new Map(state.downloadingTracks)
      newMap.delete(trackId)
      return { downloadingTracks: newMap }
    }),

  markTrackCompleted: (trackId) =>
    set((state) => {
      const newSet = new Set(state.completedTracks)
      newSet.add(trackId)
      return { completedTracks: newSet }
    }),

  unmarkTrackCompleted: (trackId) =>
    set((state) => {
      const newSet = new Set(state.completedTracks)
      newSet.delete(trackId)
      return { completedTracks: newSet }
    }),
}))
