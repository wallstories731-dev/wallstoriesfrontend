import { getBackendClient } from "./backendClient"

export async function hasAdminSession(): Promise<boolean> {
  try {
    const client = getBackendClient()
    await client.ready
    const user = client.getUser()
    // Check if user has admin role
    const names = (Array.isArray(user?.roles) ? user.roles : []).map((r: unknown) =>
      String(typeof r === "string" ? r : (r as { name?: string })?.name ?? "").toLowerCase())
    return names.includes("admin") || String(user?.role ?? "").toLowerCase() === "admin"
  } catch {
    return false
  }
}

export async function requireAdmin() {
  if (!await hasAdminSession()) throw new Error("Administrator access required.")
}

export async function verifyAdminLogin(email: string, password: string): Promise<boolean> {
  try {
    const client = getBackendClient()
    const response = await client.signIn(email.trim(), password)
    if (!response.success) return false
    
    // Check if the logged-in user has admin role
    if (await hasAdminSession()) return true
    
    // Not an admin, sign out
    await client.signOut()
    return false
  } catch (error) {
    console.error("Admin login error:", error)
    return false
  }
}

export async function endAdminSession() {
  try {
    const client = getBackendClient()
    await client.signOut()
  } catch (error) {
    console.error("Sign out error:", error)
  }
}

export function subscribeAuth(callback: () => void) {
  // For now, we'll use storage events to detect auth changes
  const listener = (e: StorageEvent) => {
    if (e.key === 'refresh_token') {
      setTimeout(callback, 0)
    }
  }
  window.addEventListener('storage', listener)
  return { unsubscribe: () => window.removeEventListener('storage', listener) }
}

export async function ensureCheckoutSession() {
  const client = getBackendClient()
  await client.ready
  // For checkout, we need the user to be authenticated
  // The backend doesn't support anonymous sessions, so we'll skip this for now
  // or require users to sign in before checkout
  if (!client.isAuthenticated()) {
    throw new Error("Please sign in to continue with checkout.")
  }
}
