/**
 * HTTP client for the Java backend API.
 * Replaces Supabase client with direct REST API calls.
 */

import { API_CONFIG } from "./config"

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T | null
  status: number
}

/** Maps server/network failures to text that is safe to show customers. */
export function friendlyMessage(status: number, serverMessage?: string): string {
  if (status === 0) return "We couldn't reach the server. Check your connection and try again."
  if (status === 401) return "Please sign in to continue."
  if (status === 403) return "You don't have permission to do that."
  if (status === 404) return "We couldn't find what you were looking for."
  if (status >= 500) return "Something went wrong on our side. Please try again in a moment."
  const message = (serverMessage || "").trim()
  if (!message || /exception|null|sql|stack|at \w+\.|missing userid/i.test(message)) {
    return "We couldn't complete that request. Please try again."
  }
  return message
}

class BackendClient {
  private baseUrl: string
  private accessToken: string | null = null
  private refreshToken: string | null = null
  // Resolves once a stored session (if any) has been exchanged for an in-memory access token.
  readonly ready: Promise<void>

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.loadTokensFromStorage()
    this.ready = this.refreshToken
      ? this.refreshAccessToken().then(() => undefined)
      : Promise.resolve()
  }

  private loadTokensFromStorage() {
    if (typeof window !== 'undefined') {
      // The short-lived access token is never persisted; only the refresh token is.
      localStorage.removeItem('access_token')
      this.refreshToken = localStorage.getItem('refresh_token')
    }
  }

  private saveTokensToStorage(accessToken: string, refreshToken: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', refreshToken)
      this.accessToken = accessToken
      this.refreshToken = refreshToken
    }
  }

  private clearTokensFromStorage() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refresh_token')
      this.accessToken = null
      this.refreshToken = null
    }
  }

  private refreshing: Promise<boolean> | null = null

  // Concurrent callers share one refresh round trip.
  refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return Promise.resolve(false)
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => { this.refreshing = null })
    }
    return this.refreshing
  }

  private async doRefresh(): Promise<boolean> {
    // Retry transient failures (server restarting, network blip) before giving up.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/auth?isRefresh=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: this.refreshToken })
        })
        if (response.status >= 500) throw new Error('server unavailable')
        const result: ApiResponse = await response.json()
        if (result.success && result.data?.accessToken && result.data?.refreshToken) {
          this.saveTokensToStorage(result.data.accessToken, result.data.refreshToken)
          return true
        }
        // The server rejected the token: the session is really over.
        if (response.status === 401 || response.status === 400) this.clearTokensFromStorage()
        return false
      } catch {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
      }
    }
    return false
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    await this.ready
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    }

    // Add authorization header if we have an access token
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    // Add content-type for non-multipart requests
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    try {
      let response = await fetch(url, { ...options, headers })

      // If unauthorized, try refreshing the token once
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken()
        if (refreshed) {
          // Retry the request with new token
          headers['Authorization'] = `Bearer ${this.accessToken}`
          response = await fetch(url, { ...options, headers })
        }
      }

      let result: ApiResponse<T> | null = null
      try {
        result = await response.json()
      } catch {
        result = null
      }
      if (!result || typeof result !== 'object') {
        return { success: false, message: friendlyMessage(response.status), data: null, status: response.status }
      }
      // The backend reports the code as "statusCode".
      result.status = result.status || (result as { statusCode?: number }).statusCode || response.status
      if (!result.success) {
        result.message = friendlyMessage(result.status, result.message)
      }
      return result
    } catch {
      // Never surface raw fetch errors such as "Failed to fetch" to customers.
      return {
        success: false,
        message: friendlyMessage(0),
        data: null,
        status: 0
      }
    }
  }

  // Auth methods
  // The backend's User model names the plain password field "passwordHash" (it hashes it server-side).
  async signUp(email: string, password: string, name = '') {
    const [firstName, ...rest] = name.trim().split(/\s+/).filter(Boolean)
    const response = await this.request('/auth?isLogin=false', {
      method: 'POST',
      body: JSON.stringify({ email, passwordHash: password, firstName, lastName: rest.join(' ') || undefined })
    })
    
    if (response.success && response.data?.accessToken && response.data?.refreshToken) {
      this.saveTokensToStorage(response.data.accessToken, response.data.refreshToken)
    }
    
    return response
  }

  async signIn(email: string, password: string) {
    const response = await this.request('/auth?isLogin=true', {
      method: 'POST',
      body: JSON.stringify({ email, passwordHash: password })
    })
    
    if (response.success && response.data?.accessToken && response.data?.refreshToken) {
      this.saveTokensToStorage(response.data.accessToken, response.data.refreshToken)
    }
    
    return response
  }

  async signInWithGoogle(credential: string) {
    const response = await this.request('/auth?isGoogle=true', {
      method: 'POST',
      body: JSON.stringify({ credential })
    })
    
    if (response.success && response.data?.accessToken && response.data?.refreshToken) {
      this.saveTokensToStorage(response.data.accessToken, response.data.refreshToken)
    }
    
    return response
  }

  async signOut() {
    if (!this.refreshToken) return
    
    await this.request('/auth', {
      method: 'DELETE',
      body: JSON.stringify({ token: this.refreshToken })
    })
    
    this.clearTokensFromStorage()
  }

  async signOutAll() {
    await this.request('/auth?all=true', {
      method: 'DELETE'
    })
    
    this.clearTokensFromStorage()
  }

  getAccessToken() {
    return this.accessToken
  }

  getUser() {
    if (!this.accessToken) return null
    
    // Decode JWT to get user info (simple base64 decode of payload)
    try {
      const payload = this.accessToken.split('.')[1]
      const decoded = JSON.parse(atob(payload))
      return decoded
    } catch {
      return null
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken
  }
}

// Create singleton instance
export const backendClient = new BackendClient(API_CONFIG.backendUrl)

// Export helper functions
export function getBackendClient() {
  if (!API_CONFIG.configured) {
    throw new Error("Backend is not configured. Set the public environment variables first.")
  }
  return backendClient
}
