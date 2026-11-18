/**
 * Review type definition.
 * Reviews will now be loaded from the backend API via /api/review endpoints.
 */
export type Review = {
  id: string
  name: string
  city: string
  rating: number
  text: string
  wallPhoto?: string
  posters: string[]
  date: string
}

/**
 * Hardcoded reviews have been removed.
 * Reviews are now loaded dynamically from the backend API.
 * 
 * The application will fetch reviews via:
 * - GET /api/review?productId={id} for product-specific reviews
 * - GET /api/review?featured=true for featured reviews on homepage
 * 
 * To add reviews, users must submit them through the product detail page
 * or you can add them directly to the database.
 */
export const REVIEWS: Review[] = []

