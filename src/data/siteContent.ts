// ─── Types ──────────────────────────────────────────────────────────────────

export type AnnouncementContent = {
  enabled: boolean;
  text: string;
};

export type HeroContent = {
  featuredPosterIds: string[]; // up to 3; first shown in large hero slot
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type CategoryMeta = {
  name: string; // matches the string in the categories array
  image?: string; // cover image URL
  order: number; // sort order (0 = first)
};

export type SiteContent = {
  announcement: AnnouncementContent;
  hero: HeroContent;
  faq: FaqItem[];
  categoryMeta: CategoryMeta[];
  copy?: Record<string, string>;
};

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_SITE_CONTENT: SiteContent = {
  announcement: {
    enabled: true,
    text: "Printed to order on 300 GSM matte · Ships across India in 4–6 days",
  },
  hero: { featuredPosterIds: [] },
  faq: [
    {
      id: "faq-1",
      question: "What paper do you print on?",
      answer:
        "All prints are produced on 300 GSM matte art paper using archival pigment inks. The finish is smooth with no glare — ideal for framing.",
    },
    {
      id: "faq-2",
      question: "How long does shipping take?",
      answer:
        "We dispatch within 1–2 working days of payment. Pan-India delivery takes 4–6 working days for most cities, 5–7 for remote pincodes.",
    },
    {
      id: "faq-3",
      question: "Can I order a custom size?",
      answer:
        "We currently offer A4, A3, A2, 12×18 and 18×24 inches. Custom sizes aren't available yet — DM us on Instagram to discuss.",
    },
    {
      id: "faq-4",
      question: "How do I pay?",
      answer:
        "We accept UPI (GPay, PhonePe, Paytm), bank transfer, and major cards. Payment details are shared after you confirm your order via DM.",
    },
    {
      id: "faq-5",
      question: "Do you offer returns?",
      answer:
        "Since every print is made to order we can't accept returns. However if your order arrives damaged or incorrect, DM us within 48 hours and we'll reprint and reship at no cost.",
    },
  ],
  categoryMeta: [],
};

export const DEFAULT_COPY: Record<string, string> = {
  heroKicker: "Art for your everyday",
  heroTitle: "Good walls.",
  heroHighlight: "Great vibes.",
  heroIntro:
    "Your room called. It wants a personality.\nPick your wall colour. See your print come to life.",
  heroCta: "Find your print",
  footerDescription:
    "Handpicked posters, printed to order on 300 GSM matte art paper. Ships across India.",
  aboutTitle: "Prints worth looking at — made with care.",
  aboutIntro:
    "WALLstories started in 2023 with a simple idea: most of the posters available online aren't worth putting on a wall you actually like. Too shiny, too thin, too generic.",
  aboutStory:
    "So we set out to curate and print a small, intentional catalogue — images that hold up under close inspection, printed on matte art paper that handles light properly. Every print is made to order; we don't have a warehouse of stock. That keeps quality high and waste low.",
  shippingIntro:
    "All orders are printed to order and shipped from our studio. Here's what to expect:",
  returnsIntro: "",
  privacyIntro: "",
  helpIntro: "",
  catalogTitle: "Pick your personality",
};
