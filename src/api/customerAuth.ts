import { getSupabase, supabase } from "./client"
import { API_CONFIG } from "./config"
export const accountsAvailable = API_CONFIG.configured
export type Member = {
  id: string
  email: string
  name: string
}
export async function currentMember(): Promise<Member | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user || data.user.is_anonymous) return null
  const u = data.user
  return {
    id: u.id,
    email: u.email || "",
    name: String(
      u.user_metadata?.display_name || u.email?.split("@")[0] || "Art lover",
    ).slice(0, 100),
  }
}
function accountClient() {
  if (!accountsAvailable)
    throw new Error("Sign-in is currently unavailable. Please try again later.")
  return getSupabase()
}
export async function signInCustomer(email: string, password: string) {
  const { error } = await accountClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error)
    throw new Error("Could not sign in. Check your email and password.")
}
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
  const { data, error } = await accountClient().auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { display_name: name.trim() },
      emailRedirectTo: window.location.origin + "/account",
    },
  })
  if (error)
    throw new Error("Could not create your account. Please try again later.")
  return !!data.session
}
export async function sendPasswordReset(email: string) {
  const { error } = await accountClient().auth.resetPasswordForEmail(
    email.trim(),
    { redirectTo: window.location.origin + "/account" },
  )
  if (error)
    throw new Error("Could not send a reset link. Please try again later.")
}
export async function changeCustomerPassword(password: string) {
  if (password.length < 12 || password.length > 128)
    throw new Error("Use a password of 12–128 characters.")
  const { error } = await accountClient().auth.updateUser({ password })
  if (error)
    throw new Error(
      "Could not update your password. Request a fresh reset link.",
    )
}
export async function signOutCustomer() {
  const { error } = await accountClient().auth.signOut()
  if (error) throw new Error("Could not sign out. Please try again.")
}
let redirect: Promise<boolean> | null = null
/** Consume provider-issued implicit-flow tokens only on the account route; never persist or log them. */
export function completeAccountRedirect(): Promise<boolean> {
  if (redirect) return redirect
  const params = new URLSearchParams(window.location.hash.slice(1))
  const access = params.get("access_token"),
    refresh = params.get("refresh_token"),
    type = params.get("type")
  if (
    !access ||
    !refresh ||
    !["recovery", "signup", "email"].includes(type || "")
  )
    return Promise.resolve(false)
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  )
  redirect = (async () => {
    const { error } = await accountClient().auth.setSession({
      access_token: access,
      refresh_token: refresh,
    })
    if (error || !(await currentMember()))
      throw new Error("This sign-in link has expired. Request a new link.")
    return type === "recovery"
  })().finally(() => {
    setTimeout(() => {
      redirect = null
    }, 0)
  })
  return redirect
}
