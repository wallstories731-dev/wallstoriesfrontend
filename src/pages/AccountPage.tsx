import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import Logo from "../components/Logo"
import GoogleSignInButton from "../components/GoogleSignInButton"
import { loadMyOrders, type MyOrder } from "../api/account"
import { formatMoney } from "../data/shop"
import { useCustomerAuth } from "../context/CustomerAuthContext"
import {
  accountsAvailable,
  googleClientId,
  googleLoginOnly,
  signInCustomer,
  signInCustomerWithGoogle,
  signUpCustomer,
  sendPasswordReset,
  changeCustomerPassword,
  completeAccountRedirect,
  confirmPasswordReset,
  pendingResetToken,
} from "../api/customerAuth"
export default function AccountPage() {
  const { member, loading, refresh, logout } = useCustomerAuth(),
    navigate = useNavigate(),
    [params] = useSearchParams()
  const [mode, setMode] = useState<"login" | "signup" | "reset" | "password">(
    "login",
  )
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("")
  const [orders, setOrders] = useState<MyOrder[] | null>(null),
    [ordersError, setOrdersError] = useState(false)
  useEffect(() => {
    if (!member) {
      setOrders(null)
      return
    }
    let active = true
    setOrdersError(false)
    loadMyOrders()
      .then((rows) => active && setOrders(rows))
      .catch(() => active && setOrdersError(true))
    return () => {
      active = false
    }
  }, [member?.id])
  useEffect(() => {
    let active = true
    void completeAccountRedirect()
      .then(async (recovery) => {
        await refresh()
        if (active && recovery) setMode("password")
      })
      .catch(() => {
        if (active)
          setError("This link could not be verified. Request a fresh link.")
      })
    return () => {
      active = false
    }
  }, [])
  function switchMode(next: typeof mode) {
    setMode(next)
    setError("")
    setMessage("")
    setPassword("")
    setShow(false)
  }
  async function afterSignIn() {
    await refresh()
    const destination = params.get("returnTo")
    if (destination && /^\/(?!\/)/.test(destination) && !destination.startsWith("/account")) navigate(destination)
    else setMessage("You're signed in. Welcome back!")
  }
  async function handleGoogle(credential: string) {
    if (busy) return
    setBusy(true)
    setError("")
    setMessage("")
    try {
      await signInCustomerWithGoogle(credential)
      await afterSignIn()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in is unavailable.")
    } finally {
      setBusy(false)
    }
  }
  const googleOnly = googleLoginOnly && (mode === "login" || mode === "signup")
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")
    setMessage("")
    try {
      if (mode === "login") {
        await signInCustomer(email, password)
        await afterSignIn()
      } else if (mode === "signup") {
        const signed = await signUpCustomer(name, email, password)
        setPassword("")
        await refresh()
        setMessage(
          signed
            ? "Your account is ready."
            : "Check your email to confirm your account, then sign in.",
        )
      } else if (mode === "reset") {
        await sendPasswordReset(email)
        setMessage(
          "If that email has an account, a reset link will arrive shortly.",
        )
      } else {
        const token = pendingResetToken()
        if (token) await confirmPasswordReset(token, password)
        else await changeCustomerPassword(password)
        setPassword("")
        setMode("login")
        setMessage("Password updated.")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in is unavailable.")
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="account-page">
      <div className="account-art">
        <Link to="/" aria-label="Wall Stories home">
          <Logo className="h-20 w-28" />
        </Link>
        <p className="account-kicker">Your walls. Your world.</p>
        <h2>
          A little art.
          <br />A lot of <span>you.</span>
        </h2>
        <div className="account-stickers" aria-hidden="true">
          <span>✳</span>
          <span>
            300 GSM
            <br />
            great vibes
          </span>
          <span>♥</span>
        </div>
        <p>Share your wall, save your favorites, and make yourself at home.</p>
      </div>
      <div className="account-panel">
        <Link to="/" className="account-back">
          ← Back to shop
        </Link>
        {loading ? (
          <p role="status">Checking your account…</p>
        ) : member && mode !== "password" ? (
          <>
            <p className="account-kicker">Your account</p>
            <h1>Hello, {member.name} ✳</h1>
            <p className="account-subtitle">{member.email}</p>
            <div className="account-shortcuts">
              <Link to="/#photo-reviews">Share your wall ↗</Link>
              <Link to="/#catalogue">Discover a print ↗</Link>
              <Link to="/track">Order help ↗</Link>
            </div>
            <section aria-label="Your orders" className="mt-6">
              <h2 className="text-lg font-semibold">Your orders</h2>
              {ordersError ? (
                <p role="status">We couldn't load your orders right now.</p>
              ) : orders === null ? (
                <p role="status">Loading your orders…</p>
              ) : orders.length === 0 ? (
                <p>You haven't placed any orders yet.</p>
              ) : (
                <ul className="mt-2 grid gap-3">
                  {orders.map((o) => (
                    <li key={o.id} className="rounded-xl border p-3 text-sm">
                      <div className="flex justify-between gap-2">
                        <strong>#{o.ref}</strong>
                        <span>{o.status.replaceAll("_", " ")}</span>
                      </div>
                      <div>
                        {new Date(o.placedAt).toLocaleDateString("en-IN")} ·{" "}
                        {formatMoney(o.total)}
                      </div>
                      <ul className="mt-1 opacity-80">
                        {o.items.map((i, n) => (
                          <li key={n}>
                            {i.name}
                            {i.variant ? ` (${i.variant})` : ""} × {i.qty}
                          </li>
                        ))}
                      </ul>
                      {o.trackingNumber && (
                        <div className="mt-1">
                          Tracking: {o.shippingProvider} {o.trackingNumber}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <button
              className="account-primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await logout()
                  setMessage("Signed out.")
                } catch {
                  setError("Could not sign out. Please retry.")
                } finally {
                  setBusy(false)
                }
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <p className="account-kicker">Customer account</p>
            <h1>
              {mode === "login"
                ? "Welcome back."
                : mode === "signup"
                  ? "Join the wall club."
                  : mode === "reset"
                    ? "Forgot your password?"
                    : "Choose a new password."}
            </h1>
            <p className="account-subtitle">
              {mode === "signup"
                ? "Make an account to save favourites, build your cart and place orders."
                : params.get("returnTo")
                  ? "Please sign in to use your wishlist, cart and orders."
                  : "Sign in to use your wishlist, cart and orders."}
            </p>
            {(mode === "login" || mode === "signup") && !googleOnly && (
              <div className="account-tabs">
                <button
                  aria-pressed={mode === "login"}
                  disabled={busy}
                  onClick={() => switchMode("login")}
                >
                  Customer login
                </button>
                <button
                  aria-pressed={mode === "signup"}
                  disabled={busy}
                  onClick={() => switchMode("signup")}
                >
                  Create account
                </button>
              </div>
            )}
            {!accountsAvailable && (
              <p className="account-notice" role="status">
                Account sign-in is currently unavailable. You can still browse
                and order in chat.
              </p>
            )}
            {googleOnly ? (
              <div className="account-form">
                {accountsAvailable && googleClientId ? (
                  <GoogleSignInButton
                    clientId={googleClientId}
                    onCredential={(c) => void handleGoogle(c)}
                    onError={setError}
                  />
                ) : (
                  <p className="account-notice" role="status">
                    Google sign-in is not configured yet.
                  </p>
                )}
                <small>New here? Your account is created the first time you continue with Google.</small>
              </div>
            ) : (
            <form onSubmit={submit} className="account-form">
              <fieldset disabled={busy} className="contents">
              {mode === "signup" && (
                <label>
                  Your name
                  <input
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </label>
              )}
              {mode !== "password" && (
                <label>
                  Email
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>
              )}
              {mode !== "reset" && (
                <div>
                  <label htmlFor="customer-password">Password</label>
                  <div className="password-field">
                    <input
                      id="customer-password"
                      type={show ? "text" : "password"}
                      required
                      minLength={mode === "login" ? 1 : 12}
                      maxLength={128}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                    />
                    <button
                      type="button"
                      aria-label={show ? "Hide password" : "Show password"}
                      onClick={() => setShow(!show)}
                    >
                      {show ? "Hide" : "Show"}
                    </button>
                  </div>
                  {mode !== "login" && (
                    <small>Use at least 12 characters.</small>
                  )}
                </div>
              )}
              <button className="account-primary" disabled={busy} type="submit">
                {busy
                  ? "Please wait…"
                  : mode === "login"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create my account"
                      : mode === "reset"
                        ? "Send reset link"
                        : "Update password"}
              </button>
              {mode === "login" ? (
                <button
                  type="button"
                  className="account-text-link"
                  onClick={() => switchMode("reset")}
                >
                  Forgot password?
                </button>
              ) : mode === "reset" ? (
                <button
                  type="button"
                  className="account-text-link"
                  onClick={() => switchMode("login")}
                >
                  Back to sign in
                </button>
              ) : null}
              </fieldset>
            </form>
            )}
          </>
        )}
        {error && (
          <p className="account-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="account-notice" role="status">
            {message}
          </p>
        )}
      </div>
    </main>
  )
}
