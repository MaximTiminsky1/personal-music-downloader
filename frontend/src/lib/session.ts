import { v4 as uuidv4 } from 'uuid'

const SESSION_ID_KEY = 'yandex_music_session_id'

export function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY)

  if (!sessionId) {
    sessionId = uuidv4()
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }

  return sessionId
}

export function clearSessionId(): void {
  localStorage.removeItem(SESSION_ID_KEY)
}

export function setSessionId(sessionId: string): void {
  localStorage.setItem(SESSION_ID_KEY, sessionId)
}
