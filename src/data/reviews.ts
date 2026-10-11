// Seed content for the preview. Replace with genuine, approved customer reviews before public use.
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

export const REVIEWS: Review[] = [
  {
    id: "r1",
    name: "Priya S.",
    city: "Mumbai",
    rating: 5,
    text: "The Neon Tokyo print is even better in person — the blacks are so deep on this matte paper. My whole living room has changed vibes. Will definitely be back for more.",
    wallPhoto: "https://images.unsplash.com/photo-1598928636135-d146006ff4be?w=600&h=700&fit=crop&auto=format&q=80",
    posters: ["Neon Tokyo"],
    date: "Dec 2024",
  },
  {
    id: "r2",
    name: "Arnav K.",
    city: "Bangalore",
    rating: 5,
    text: "Ordered three prints for my studio — Dune Shadow, Soft Machine, and Blue Torsion. They arrived well-packed, perfectly printed. The bundle discount was a nice touch.",
    wallPhoto: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=700&fit=crop&auto=format&q=80",
    posters: ["Dune Shadow", "Soft Machine", "Blue Torsion"],
    date: "Nov 2024",
  },
  {
    id: "r3",
    name: "Diya R.",
    city: "Delhi",
    rating: 5,
    text: "Fast, smooth process. Messaged on Instagram, got a reply in an hour, prints were at my door in 5 days. The quality is genuinely gallery-level for the price.",
    wallPhoto: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&h=700&fit=crop&auto=format&q=80",
    posters: ["Monstera Study", "First Press"],
    date: "Oct 2024",
  },
  {
    id: "r4",
    name: "Rahul M.",
    city: "Pune",
    rating: 5,
    text: "Got the Lubitel 2 in A2. The detail is extraordinary — every dial is sharp. Excellent packaging too; arrived without a single dent.",
    wallPhoto: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&h=700&fit=crop&auto=format&q=80",
    posters: ["Lubitel 2"],
    date: "Sep 2024",
  },
  {
    id: "r5",
    name: "Kavya N.",
    city: "Hyderabad",
    rating: 5,
    text: "The Fog & Pines print is exactly what my bedroom needed — calm and cinematic. The matte finish is so much better than the glossy prints I had before.",
    posters: ["Fog & Pines"],
    date: "Aug 2024",
  },
  {
    id: "r6",
    name: "Sid T.",
    city: "Chennai",
    rating: 5,
    text: "Placed an order at 10 PM, got a confirmation by morning and tracking in 2 days. Legitimately impressed with how smooth this was.",
    posters: ["Golden Fields"],
    date: "Jul 2024",
  },
]

