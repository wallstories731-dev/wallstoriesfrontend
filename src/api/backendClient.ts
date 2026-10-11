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

class BackendClient {
  private baseUrl: string
  private accessToken: string | null = null
  private refreshToken: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.loadTokensFromStorage()
  }

  private loadTokensFromStorage() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token')
      this.refreshToken = localStorage.getItem('refresh_token')
    }
  }

  private saveTokensToStorage(accessToken: string, refreshToken: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      this.accessToken = accessToken
      this.refreshToken = refreshToken
    }
  }

  private clearTokensFromStorage() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      this.accessToken = null
      this.refreshToken = null
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false
    
    try {
      const response = await fetch(`${this.baseUrl}/auth?isRefresh=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.refreshToken })
      })
      
      const result: ApiResponse = await response.json()
      
      if (result.success && result.data?.accessToken && result.data?.refreshToken) {
        this.saveTokensToStorage(result.data.accessToken, result.data.refreshToken)
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: HeadersInit = {
      ...options.headers,
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

      const result: ApiResponse<T> = await response.json()
      return result
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
        data: null,
        status: 500
      }
    }
  }

  // Auth methods
  async signUp(email: string, password: string) {
    const response = await this.request('/auth?isLogin=false', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    
    if (response.success && response.data?.accessToken && response.data?.refreshToken) {
      this.saveTokensToStorage(response.data.accessToken, response.data.refreshToken)
    }
    
    return response
  }

  async signIn(email: string, password: string) {
    const response = await this.request('/auth?isLogin=true', {
      method: 'POST',
      body: JSON.stringify({ email, password })
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
