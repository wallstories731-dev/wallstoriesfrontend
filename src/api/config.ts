/** PUBLIC configuration only. VITE_* values are visible in the built browser JS. */
const env = import.meta.env as Record<string, string | undefined>

// Backend API configuration
const backendUrl = (env.VITE_BACKEND_URL?.trim() || "").replace(/\/+$/, "")
const configured = /^https?:\/\/[^/]+/.test(backendUrl)
const requested = env.VITE_PAYMENT_MODE || "off"

export const API_CONFIG = {
  backendUrl,
  configured,

  /** true = customers sign in with Google only; false = email + password only. */
  googleLogin: env.VITE_GOOGLE_LOGIN === "true",
  googleClientId: env.VITE_GOOGLE_CLIENT_ID?.trim() || "",
  
  // Payments always go through the backend + Razorpay; there is no mock mode.
  paymentMode: (requested === "razorpay" && configured ? "razorpay" : "off") as "off" | "razorpay",
  razorpayScriptUrl: "https://checkout.razorpay.com/v1/checkout.js",
  brandName: "Wall Stories",
  brandColor: "#ce0076",
}
