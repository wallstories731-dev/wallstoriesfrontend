import { useEffect, useRef } from "react"

type GoogleId = {
  initialize: (config: {
    client_id: string
    callback: (response: { credential?: string }) => void
  }) => void
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

const SCRIPT_URL = "https://accounts.google.com/gsi/client"
let scriptLoading: Promise<void> | null = null

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  scriptLoading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptLoading = null
      script.remove()
      reject(new Error("Google sign-in could not be loaded."))
    }
    document.head.appendChild(script)
  })
  return scriptLoading
}

export default function GoogleSignInButton({
  clientId,
  onCredential,
  onError,
}: {
  clientId: string
  onCredential: (credential: string) => void
  onError: (message: string) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const handlers = useRef({ onCredential, onError })
  handlers.current = { onCredential, onError }

  useEffect(() => {
    let active = true
    loadGoogleScript()
      .then(() => {
        if (!active || !host.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) handlers.current.onCredential(response.credential)
            else handlers.current.onError("Google sign-in was cancelled.")
          },
        })
        window.google.accounts.id.renderButton(host.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: Math.min(400, Math.max(200, host.current.clientWidth || 320)),
        })
      })
      .catch((e) => {
        if (active) handlers.current.onError(e instanceof Error ? e.message : "Google sign-in is unavailable.")
      })
    return () => {
      active = false
    }
  }, [clientId])

  return <div ref={host} className="flex justify-center" aria-label="Continue with Google" />
}
