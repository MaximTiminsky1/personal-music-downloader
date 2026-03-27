export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface Account {
  display_name: string
  login: string
}

export interface StatusResponse {
  authenticated: boolean
  account: Account | null
}

export interface Playlist {
  kind: string
  uid: string
  title: string
  track_count: number
  owner_name: string
}

export interface PlaylistsResponse {
  success: boolean
  playlists: Playlist[]
}

export interface Track {
  id: string
  title: string
  artists: string
  duration: string
  album: string
  bitrate?: number
  codec?: string
}

export interface TracksResponse {
  success: boolean
  tracks: Track[]
}

export interface PaginatedTracksResponse {
  success: boolean
  tracks: Track[]
  total: number
  page: number
  has_more: boolean
}

export interface DownloadResponse {
  success: boolean
  message: string
  filename?: string
}

export interface TrackUrlResponse {
  success: boolean
  url: string
  bitrate: number
  codec: string
}

export interface OAuthUrlResponse {
  success: boolean
  auth_url: string
  message: string
}
