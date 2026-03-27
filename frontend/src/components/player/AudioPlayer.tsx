import { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '@/store/playerStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui/Button'

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const { currentTrack, isPlaying, url, play, pause, stop } = usePlayerStore()

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.play().catch(error => {
        console.error('Error playing audio:', error)
        pause()
      })
    } else {
      audio.pause()
    }
  }, [isPlaying, pause])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !url) return

    audio.src = url
    audio.load()

    if (isPlaying) {
      audio.play().catch(error => {
        console.error('Error playing audio:', error)
        pause()
      })
    }
  }, [url, isPlaying, pause])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    stop()
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!currentTrack || !url) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 glass border-t border-white/10 backdrop-blur-lg z-50"
      >
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />

        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate text-sm">{currentTrack.title}</h4>
              <p className="text-xs opacity-75 truncate">{currentTrack.artists}</p>
            </div>

            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs opacity-75 min-w-[40px] text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:w-3
                  [&::-moz-range-thumb]:h-3
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-white
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:cursor-pointer"
              />
              <span className="text-xs opacity-75 min-w-[40px]">
                {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => (isPlaying ? pause() : play())}
                className="w-10 h-10 p-0 text-xl flex items-center justify-center"
              >
                {isPlaying ? '⏸' : '▶'}
              </Button>
              <Button
                variant="ghost"
                onClick={stop}
                className="w-10 h-10 p-0 text-xl flex items-center justify-center"
              >
                ⏹
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
