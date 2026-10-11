import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import Logo from "../components/Logo"
import { useCustomerAuth } from "../context/CustomerAuthContext"
import {
  accountsAvailable,
  signInCustomer,
  signUpCustomer,
  sendPasswordReset,
  changeCustomerPassword,
  completeAccountRedirect,
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
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")
    setMessage("")
    try {
      if (mode === "login") {
        await signInCustomer(email, password)
        await refresh()
        const destination = params.get("returnTo")
        if (destination?.startsWith("/#")) navigate(destination)
        else setMessage("You're signed in. Welcome back!")
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
        await changeCustomerPassword(password)
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
                ? "Make an account to share your photo reviews."
                : "Sign in to share the story on your wall."}
            </p>
            {(mode === "login" || mode === "signup") && (
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
