/** PUBLIC configuration only. VITE_* values are visible in the built browser JS. */
const env = import.meta.env as Record<string, string | undefined>

// Backend API configuration
const backendUrl = env.VITE_BACKEND_URL?.trim() || ""
const configured = /^https?:\/\/[^/]+/.test(backendUrl)
const requested = env.VITE_PAYMENT_MODE || "off"

export const API_CONFIG = {
  // New backend configuration
  backendUrl,
  configured,
  
  // Legacy Supabase config (deprecated - will be removed)
  supabaseUrl: env.VITE_SUPABASE_URL?.trim() || "",
  supabaseAnonKey: env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || env.VITE_SUPABASE_ANON_KEY?.trim() || "",
  imageBucket: env.VITE_SUPABASE_BUCKET || "poster-images",
  catalogTable: "ws_posters",
  
  // Mock checkout is explicitly development-only. Production fails closed.
  paymentMode: (requested === "razorpay" && configured ? "razorpay" :
    requested === "mock" && import.meta.env.DEV ? "mock" : "off") as "off" | "mock" | "razorpay",
  razorpayScriptUrl: "https://checkout.razorpay.com/v1/checkout.js",
  brandName: "Wall Stories",
  brandColor: "#ce0076",
}
