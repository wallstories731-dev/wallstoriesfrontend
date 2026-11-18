import { backendClient, getBackendClient } from "./backendClient"
import { API_CONFIG } from "./config"
export const accountsAvailable = API_CONFIG.configured
export const googleLoginOnly = API_CONFIG.googleLogin
export const googleClientId = API_CONFIG.googleClientId
export type Member = {
  id: string
  email: string
  name: string
}

export async function currentMember(): Promise<Member | null> {
  if (!accountsAvailable) return null
  await backendClient.ready
  const user = backendClient.getUser()
  if (!user) return null
  const email = String(user.email || "")
  return {
    id: String(user.sub || email),
    email,
    name: String(user.name || email.split("@")[0] || "Art lover").slice(0, 100),
  }
}

function accountClient() {
  if (!accountsAvailable)
    throw new Error("Sign-in is currently unavailable. Please try again later.")
  return getBackendClient()
}

export async function signInCustomer(email: string, password: string) {
  const res = await accountClient().signIn(email.trim(), password)
  if (!res.success)
    throw new Error("Could not sign in. Check your email and password.")
}

export async function signInCustomerWithGoogle(credential: string) {
  const res = await accountClient().signInWithGoogle(credential)
  if (!res.success)
    throw new Error("Could not sign in with Google. Please try again.")
}

/** Resolves true when the backend signed the new user in immediately. */
export async function signUpCustomer(
  name: string,
  email: string,
  password: string,
) {
  if (
    !name.trim() ||
    name.trim().length > 100 ||
    password.length < 12 ||
    password.length > 128
  )
    throw new Error("Enter your name and a password of 12–128 characters.")
  const res = await accountClient().signUp(email.trim(), password, name)
  if (!res.success)
    throw new Error("Could not create your account. Please try again later.")
  return backendClient.isAuthenticated()
}

export async function sendPasswordReset(email: string) {
  const res = await accountClient().request("/api/password-reset", {
    method: "POST",
    body: JSON.stringify({ email: email.trim() }),
  })
  if (!res.success)
    throw new Error("Could not send a reset link. Please try again later.")
}

/** Changes the signed-in user's password; the backend requires the current one. */
export async function changeCustomerPassword(password: string, oldPassword = "") {
  if (password.length < 12 || password.length > 128)
    throw new Error("Use a password of 12–128 characters.")
  const res = await accountClient().request("/api/me", {
    method: "PUT",
    body: JSON.stringify({ oldPassword, newPassword: password }),
  })
  if (!res.success)
    throw new Error("Could not update your password. Request a fresh reset link.")
}

/** Completes a reset using the token from the emailed link (?token=...). */
export async function confirmPasswordReset(token: string, newPassword: string) {
  if (newPassword.length < 12 || newPassword.length > 128)
    throw new Error("Use a password of 12–128 characters.")
  const res = await accountClient().request("/api/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  })
  if (!res.success)
    throw new Error("This reset link has expired. Request a new link.")
}

export async function signOutCustomer() {
  await accountClient().signOut()
}

/**
 * Account-route redirects carry a one-time `token` query parameter (password
 * reset). Returns true when the page should prompt for a new password.
 */
export function completeAccountRedirect(): Promise<boolean> {
  const token = new URLSearchParams(window.location.search).get("token")
  return Promise.resolve(!!token)
}

export function pendingResetToken(): string | null {
  return new URLSearchParams(window.location.search).get("token")
}
