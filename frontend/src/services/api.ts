import axios from 'axios'
import { getSessionId } from '@/lib/session'
import type {
  ApiResponse,
  StatusResponse,
  PlaylistsResponse,
  TracksResponse,
  PaginatedTracksResponse,
  DownloadResponse,
  TrackUrlResponse,
  OAuthUrlResponse,
} from '@/types/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const sessionId = getSessionId()

  if (config.method === 'post') {
    config.data = {
      ...(config.data || {}),
      session_id: sessionId,
    }
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const authApi = {
  async checkStatus(): Promise<StatusResponse> {
    const sessionId = getSessionId()
    const { data } = await api.post<StatusResponse>('/api/status', { session_id: sessionId })
    return data
  },

  async login(token: string): Promise<ApiResponse> {
    const { data } = await api.post<ApiResponse>('/api/auth', { token })
    return data
  },

  async logout(): Promise<ApiResponse> {
    const { data } = await api.post<ApiResponse>('/api/logout')
    return data
  },

  async getAuthUrl(): Promise<OAuthUrlResponse> {
    const { data } = await api.get<OAuthUrlResponse>('/api/get-auth-url')
    return data
  },

  async exchangeCode(code: string): Promise<ApiResponse> {
    const { data } = await api.post<ApiResponse>('/api/exchange-code', { code })
    return data
  },
}

export const playlistsApi = {
  async getMyPlaylists(): Promise<PlaylistsResponse> {
    const { data } = await api.post<PlaylistsResponse>('/api/my-playlists', {})
    return data
  },

  async getPlaylistTracks(kind: string, uid: string): Promise<TracksResponse> {
    const { data } = await api.post<TracksResponse>('/api/playlist-tracks', { kind, uid })
    return data
  },
}

export const tracksApi = {
  async parseLink(link: string): Promise<TracksResponse> {
    const { data} = await api.post<TracksResponse>('/api/parse', { link })
    return data
  },

  async getLikedTracks(page: number = 0, limit: number = 20): Promise<PaginatedTracksResponse> {
    const { data } = await api.post<PaginatedTracksResponse>('/api/liked-tracks', { page, limit })
    return data
  },

  async getTrackUrl(trackId: string): Promise<TrackUrlResponse> {
    const { data } = await api.post<TrackUrlResponse>('/api/track-url', { track_id: trackId })
    return data
  },

  async downloadTrack(trackId: string, folderName?: string): Promise<DownloadResponse> {
    const { data } = await api.post<DownloadResponse>('/api/download', {
      track_id: trackId,
      folder_name: folderName
    })
    return data
  },
}

export default api
