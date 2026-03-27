import { create } from 'zustand'
import type { Track } from '@/types/api'

interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  url: string | null

  setCurrentTrack: (track: Track, url: string) => void
  play: () => void
  pause: () => void
  stop: () => void
  togglePlay: () => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  url: null,

  setCurrentTrack: (track, url) =>
    set({
      currentTrack: track,
      url,
      isPlaying: true,
    }),

  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  stop: () =>
    set({
      currentTrack: null,
      isPlaying: false,
      url: null,
    }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
}))
