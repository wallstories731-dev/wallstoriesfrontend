/**
 * Files picked in the admin editor are held here until the poster is saved,
 * because the backend can only attach an image to an existing product.
 * The poster carries a placeholder URL that passes `isSafeImageUrl`
 * and is swapped for the real image URL when the catalog is synced.
 */
const PREFIX = "/staged-upload/"
const staged = new Map<string, { file: File; preview: string }>()

export function stageImage(file: File): string {
  const url = PREFIX + crypto.randomUUID()
  staged.set(url, { file, preview: URL.createObjectURL(file) })
  return url
}

export const isStagedImage = (url: string) => staged.has(url)
export const takeStagedImage = (url: string) => staged.get(url)?.file
export const stagedImagePreview = (url: string) => staged.get(url)?.preview ?? url
export function releaseStagedImage(url: string) {
  const image = staged.get(url)
  if (image) URL.revokeObjectURL(image.preview)
  staged.delete(url)
}
