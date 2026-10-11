import { useState } from "react";
import { Link, Navigate } from "react-router";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { API_CONFIG } from "../../api/config";
import Logo from "../../components/Logo";
export default function AdminLoginPage() {
  const { login, error, authed, loading } = useAdminAuth();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [submitting, setSubmitting] = useState(false);
  if (loading)
    return (
      <main className="admin-auth">
        <p role="status">Checking administrator access…</p>
      </main>
    );
  if (authed) return <Navigate to="/admin/dashboard" replace />;
  return (
    <main className="admin-auth">
      <div className="admin-login-decoration" aria-hidden="true">
        ✳
      </div>
      <section className="admin-login-card">
        <Link to="/" aria-label="Back to shop">
          <Logo className="h-16 w-20" />
        </Link>
        <p className="game-kicker">The shop studio</p>
        <h1>
          Admin login<span aria-hidden="true">✳</span>
        </h1>
        <p>
          Good walls start behind the scenes. Sign in to manage your posters,
          orders and customer photos.
        </p>
        {!API_CONFIG.configured && (
          <p role="status" className="admin-banner">
            <b>Live admin access is not configured yet.</b> You can explore the
            read-only preview below.
          </p>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (submitting || !API_CONFIG.configured) return;
            setSubmitting(true);
            try {
              await login(email, password);
            } finally {
              setSubmitting(false);
              setPassword("");
            }
          }}
        >
          <label>
            Admin email
            <input
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting || !API_CONFIG.configured}
            />
          </label>
          <label>
            Password
            <div className="admin-password">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                maxLength={256}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting || !API_CONFIG.configured}
              />
              <button
                type="button"
                aria-pressed={show}
                onClick={() => setShow((v) => !v)}
              >
                {show ? "Hide" : "Show"} password
              </button>
            </div>
          </label>
          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}
          <button
            className="funk-button"
            disabled={submitting || !API_CONFIG.configured}
          >
            {submitting ? "Signing in…" : "Sign in as admin"}
            <span aria-hidden="true">↗</span>
          </button>
        </form>
        <p className="admin-caption">
          Access is granted to shop administrators. Customer accounts cannot
          enter this workspace.
        </p>
        <Link className="admin-preview-link" to="/admin/preview/dashboard">
          Explore admin preview <span aria-hidden="true">↗</span>
        </Link>
        <div className="admin-login-links">
          <Link to="/account">Customer login</Link>
          <Link to="/">← Back to shop</Link>
        </div>
      </section>
    </main>
  );
}
