import { normalizePosters } from "./models"
import { getBackendClient } from "./backendClient"
import { requireAdmin } from "./auth"
import { isSafeImageUrl } from "./safety"

/**
 * Save products/posters using the backend API.
 * This creates or updates products in the Java backend.
 */
export async function savePosters(posters: unknown[]) {
  await requireAdmin()
  const active = posters.filter(p => (p as {status?:string}).status !== "draft")
  if (active.some(p => !p || !isSafeImageUrl((p as {image?:string}).image))) {
    throw new Error("Upload valid images before publishing.")
  }
  
  const client = getBackendClient()
  
  // Save each poster as a product in the backend
  // Note: This is a simplified implementation. You may need to batch this or use a different approach
  for (const poster of active) {
    const response = await client.request('/api/product', {
      method: 'POST',
      body: JSON.stringify(poster)
    })
    
    if (!response.success) {
      throw new Error(`Failed to save poster: ${response.message}`)
    }
  }
}

/**
 * Load products/posters from the backend API.
 * Returns null if not set up yet or on error.
 */
export async function loadPosters(): Promise<unknown[] | null> {
  try {
    const client = getBackendClient()
    const response = await client.request('/api/product')
    
    if (!response.success || !response.data) return null
    
    // The backend returns products in response.data
    const products = Array.isArray(response.data) ? response.data : []
    return normalizePosters(products)
  } catch (error) {
    console.error("Failed to load posters:", error)
    return null
  }
}
