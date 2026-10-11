import { getBackendClient } from "./backendClient"
import { requireAdmin } from "./auth"
import { MAX_IMAGE_BYTES } from "./safety"

/**
 * Upload image to the backend storage service (R2/MinIO).
 * The backend handles the actual storage using ProductImageController.
 */
export async function uploadImage(dataUrl: string, productId?: string): Promise<string> {
  await requireAdmin()
  
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!match || match[2].length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 4) {
    throw new Error("Invalid image or image exceeds 5 MB.")
  }
  
  const binary = atob(match[2])
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  const png = [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)
  const webp = String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP'
  
  if (!({jpeg,png,webp}[match[1]]) || bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("Image content does not match its type.")
  }
  
  const client = getBackendClient()
  
  // Create a blob from the bytes
  const blob = new Blob([bytes], { type: `image/${match[1]}` })
  const file = new File([blob], `image.${match[1] === 'jpeg' ? 'jpg' : match[1]}`, { 
    type: `image/${match[1]}` 
  })
  
  // Create multipart form data
  const formData = new FormData()
  formData.append('image', file)
  
  if (productId) {
    formData.append('productId', productId)
  }
  
  // Upload to backend product image endpoint
  const response = await client.request('/api/product/image', {
    method: 'POST',
    body: formData
  })
  
  if (!response.success || !response.data?.url) {
    throw new Error("Image upload failed.")
  }
  
  return response.data.url
}
