import { loadPublishedSettings } from "../api/publication";
import {
  normalizePosters,
  normalizeShop,
  normalizeCategories,
  normalizeFeatured,
  stringList,
} from "../api/models";
/**
 * StoreContext — single source of truth for the entire app.
 *
 * Covers: poster catalog, categories, shop settings, featured poster,
 * selection, wishlist and transient enquiries. Non-sensitive preferences
 * may persist locally; customer information is memory-only. Server records
 * are the sole authority for payments.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  type Poster,
  type SizeKey,
  posters as seedPosters,
  categories as seedCategories,
  shop as seedShop,
  featuredConfig as seedFeaturedConfig,
  priceFor,
} from "../data/shop";
import { type CartLine } from "../hooks/useCart";
import {
  loadPosters,
  loadShopSettings,
  savePosters,
  saveShopSettings,
  readJson,
  writeJson,
  normalizeCart,
} from "../api";
import { makeOrderRef, type AdminOrder } from "../data/adminOrders";

// ─── Types ─────────────────────────────────────────────────────────────────

export type ShopSettings = {
  name: string;
  tagline: string;
  instagramUsername: string;
  currency: string;
};

export type FeaturedConfig = { posterId: string };

export type Enquiry = {
  id: string;
  posterId: string;
  size: SizeKey;
  qty: number;
  name: string;
  note: string;
  createdAt: number;
};

export type SentOrderLine = {
  title: string;
  code: string;
  size: SizeKey;
  qty: number;
  price: number;
};

export type SentOrder = {
  ref: string;
  lines: SentOrderLine[];
  name: string;
  phone: string;
  city: string;
  pincode: string;
  note: string;
  total: number;
  sentAt: number;
  via: "instagram" | "whatsapp" | "copy" | "online";
  status: "sent";
  address?: string;
  /** Present when the customer paid online. */
  payment?: { id: string; method: string; status: "paid"; test?: boolean };
};

// ─── Context shape ──────────────────────────────────────────────────────────

type StoreContextValue = {
  // Catalog
  posters: Poster[];
  setPosters: (next: Poster[]) => void;

  // Categories
  categories: string[];
  setCategories: (next: string[]) => void;

  // Shop settings
  shop: ShopSettings;
  setShop: (next: ShopSettings) => void;

  // Featured
  featuredConfig: FeaturedConfig;
  setFeaturedConfig: (next: FeaturedConfig) => void;

  // Selection (cart)
  cartLines: CartLine[];
  cartCount: number;
  cartTotal: number;
  cartDetailed: DetailedLine[];
  addToCart: (posterId: string, size: SizeKey, qty?: number) => void;
  setCartQty: (posterId: string, size: SizeKey, qty: number) => void;
  removeFromCart: (posterId: string, size: SizeKey) => void;
  clearCart: () => void;
  qtyOf: (posterId: string, size: SizeKey) => number;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (posterId: string) => void;
  isWishlisted: (posterId: string) => boolean;

  // Enquiries
  enquiries: Enquiry[];
  addEnquiry: (e: Omit<Enquiry, "id" | "createdAt">) => void;

  // Sent orders
  sentOrders: SentOrder[];
  addSentOrder: (order: SentOrder) => void;

  // Change a line's size in-place
  changeLineSize: (
    posterId: string,
    oldSize: SizeKey,
    newSize: SizeKey,
  ) => void;

  // Cloud sync
  publishAll: () => Promise<void>;
  syncing: boolean;
};

export type DetailedLine = CartLine & {
  key: string;
  poster: Poster;
  unit: number;
  subtotal: number;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: ReactNode }) {
  // Catalog
  const [posters, setPostersState] = useState<Poster[]>(() =>
    normalizePosters(
      readJson<unknown>("ws_posters_v1", seedPosters),
      seedPosters,
    ),
  );

  // Categories
  const [categories, setCategoriesState] = useState<string[]>(() =>
    normalizeCategories(
      readJson<unknown>("ws_categories_v1", seedCategories),
      seedCategories,
    ),
  );

  // Shop settings
  const [shop, setShopState] = useState<ShopSettings>(() =>
    normalizeShop(readJson<unknown>("ws_shop_v1", seedShop), seedShop),
  );

  // Featured
  const [featuredConfig, setFeaturedConfigState] = useState<FeaturedConfig>(
    () =>
      normalizeFeatured(
        readJson<unknown>("ws_featured_v1", seedFeaturedConfig),
        seedFeaturedConfig,
      ),
  );

  // Selection
  const [cartLines, setCartLines] = useState<CartLine[]>(() =>
    normalizeCart(readJson("sps.selection.v1", [])),
  );

  // Wishlist
  const [wishlist, setWishlist] = useState<string[]>(() =>
    stringList(readJson<unknown>("ws_wishlist_v1", []), [], 500),
  );

  // Enquiries
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() =>
    readJson("ws_enquiries_v1", []),
  );

  // Sent orders
  const [sentOrders, setSentOrders] = useState<SentOrder[]>(() =>
    readJson("ws_sent_orders_v1", []),
  );

  const [syncing, setSyncing] = useState(false);

  // ── Persist slices ────────────────────────────────────────────────────────

  useEffect(() => {
    writeJson("ws_posters_v1", posters);
  }, [posters]);
  useEffect(() => {
    writeJson("ws_categories_v1", categories);
  }, [categories]);
  useEffect(() => {
    writeJson("ws_shop_v1", shop);
  }, [shop]);
  useEffect(() => {
    writeJson("ws_featured_v1", featuredConfig);
  }, [featuredConfig]);
  useEffect(() => {
    writeJson("sps.selection.v1", cartLines);
  }, [cartLines]);
  useEffect(() => {
    writeJson("ws_wishlist_v1", wishlist);
  }, [wishlist]);
  useEffect(() => {
    writeJson("ws_enquiries_v1", enquiries);
  }, [enquiries]);
  useEffect(() => {
    writeJson("ws_sent_orders_v1", sentOrders);
  }, [sentOrders]);

  // ── Bootstrap from Supabase ───────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    loadPosters()
      .then((remote) => {
        if (active && remote !== null)
          setPostersState(normalizePosters(remote));
      })
      .catch(() => {});
    loadPublishedSettings()
      .then((settings: any) => {
        if (!active || !settings) return;
        if (settings.shop) setShopState(normalizeShop(settings.shop, seedShop));
        if (settings.featuredConfig)
          setFeaturedConfigState(
            normalizeFeatured(settings.featuredConfig, seedFeaturedConfig),
          );
        if (Array.isArray(settings.categories))
          setCategoriesState(
            normalizeCategories(settings.categories, seedCategories),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // ── Setters (also update in-memory seed arrays so old imports still work) ──

  const setPosters = useCallback((next: Poster[]) => {
    setPostersState(normalizePosters(next));
    const activeIds = new Set(
      next.filter((p) => p.status !== "draft").map((p) => p.id),
    );
    setCartLines((lines) =>
      lines.filter((line) => activeIds.has(line.posterId)),
    );
    setWishlist((ids) => ids.filter((id) => activeIds.has(id)));
    // Keep the module-level array in sync so legacy code that imports `posters` directly still works.
    seedPosters.splice(0, seedPosters.length, ...next);
  }, []);

  const setCategories = useCallback((next: string[]) => {
    setCategoriesState(normalizeCategories(next, seedCategories));
    seedCategories.splice(0, seedCategories.length, ...next);
  }, []);

  const setShop = useCallback((next: ShopSettings) => {
    setShopState(normalizeShop(next, seedShop));
    Object.assign(seedShop, next);
  }, []);

  const setFeaturedConfig = useCallback((next: FeaturedConfig) => {
    setFeaturedConfigState(normalizeFeatured(next, seedFeaturedConfig));
    Object.assign(seedFeaturedConfig, next);
  }, []);

  // ── Cart ──────────────────────────────────────────────────────────────────

  const addToCart = useCallback((posterId: string, size: SizeKey, qty = 1) => {
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return;
    setCartLines((prev) => {
      const idx = prev.findIndex(
        (l) => l.posterId === posterId && l.size === size,
      );
      if (idx === -1) return normalizeCart([...prev, { posterId, size, qty }]);
      const next = [...prev];
      next[idx] = { ...next[idx], qty: Math.min(20, next[idx].qty + qty) };
      return next;
    });
  }, []);

  const setCartQty = useCallback(
    (posterId: string, size: SizeKey, qty: number) => {
      if (!Number.isInteger(qty)) return;
      setCartLines((prev) =>
        qty <= 0
          ? prev.filter((l) => !(l.posterId === posterId && l.size === size))
          : prev.map((l) =>
              l.posterId === posterId && l.size === size
                ? { ...l, qty: Math.max(1, Math.min(20, Math.floor(qty))) }
                : l,
            ),
      );
    },
    [],
  );

  const removeFromCart = useCallback((posterId: string, size: SizeKey) => {
    setCartLines((prev) =>
      prev.filter((l) => !(l.posterId === posterId && l.size === size)),
    );
  }, []);

  const clearCart = useCallback(() => setCartLines([]), []);

  const qtyOf = useCallback(
    (posterId: string, size: SizeKey) =>
      cartLines.find((l) => l.posterId === posterId && l.size === size)?.qty ??
      0,
    [cartLines],
  );

  const cartDetailed = useMemo<DetailedLine[]>(() => {
    return cartLines.flatMap((line) => {
      const poster = posters.find((p) => p.id === line.posterId);
      if (
        !poster ||
        !poster.sizes.includes(line.size) ||
        poster.status === "draft"
      )
        return [];
      const unit = priceFor(poster, line.size);
      return [
        {
          ...line,
          key: `${line.posterId}::${line.size}`,
          poster,
          unit,
          subtotal: unit * line.qty,
        },
      ];
    });
  }, [cartLines, posters]);

  const cartCount = useMemo(
    () => cartDetailed.reduce((n, l) => n + l.qty, 0),
    [cartDetailed],
  );
  const cartTotal = useMemo(
    () => cartDetailed.reduce((n, l) => n + l.subtotal, 0),
    [cartDetailed],
  );

  // ── Wishlist ──────────────────────────────────────────────────────────────

  const toggleWishlist = useCallback((posterId: string) => {
    setWishlist((prev) =>
      prev.includes(posterId)
        ? prev.filter((id) => id !== posterId)
        : [...prev, posterId],
    );
  }, []);

  const isWishlisted = useCallback(
    (posterId: string) => wishlist.includes(posterId),
    [wishlist],
  );

  // ── Enquiries ─────────────────────────────────────────────────────────────

  const addEnquiry = useCallback((e: Omit<Enquiry, "id" | "createdAt">) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    setEnquiries((prev) => [{ ...e, id, createdAt: now }, ...prev]);
  }, []);

  const addSentOrder = useCallback((order: SentOrder) => {
    // Receipt display only. Server records alone establish payment status.
    setSentOrders((prev) => [order, ...prev].slice(0, 10));
  }, []);

  const changeLineSize = useCallback(
    (posterId: string, oldSize: SizeKey, newSize: SizeKey) => {
      if (oldSize === newSize) return;
      setCartLines((prev) => {
        const oldIdx = prev.findIndex(
          (l) => l.posterId === posterId && l.size === oldSize,
        );
        if (oldIdx === -1) return prev;
        const oldQty = prev[oldIdx].qty;
        const existingNewIdx = prev.findIndex(
          (l) => l.posterId === posterId && l.size === newSize,
        );
        const without = prev.filter((_, i) => i !== oldIdx);
        if (existingNewIdx !== -1) {
          return without.map((l) =>
            l.posterId === posterId && l.size === newSize
              ? { ...l, qty: Math.min(20, l.qty + oldQty) }
              : l,
          );
        }
        return [...without, { posterId, size: newSize, qty: oldQty }];
      });
    },
    [],
  );

  // ── Cloud publish ─────────────────────────────────────────────────────────

  const publishAll = useCallback(async () => {
    setSyncing(true);
    try {
      await Promise.all([
        savePosters(posters),
        saveShopSettings({ shop, featuredConfig, categories }),
      ]);
    } finally {
      setSyncing(false);
    }
  }, [posters, shop, featuredConfig, categories]);

  // ── Value ─────────────────────────────────────────────────────────────────

  const value = useMemo<StoreContextValue>(
    () => ({
      posters,
      setPosters,
      categories,
      setCategories,
      shop,
      setShop,
      featuredConfig,
      setFeaturedConfig,
      cartLines,
      cartCount,
      cartTotal,
      cartDetailed,
      addToCart,
      setCartQty,
      removeFromCart,
      clearCart,
      qtyOf,
      wishlist,
      toggleWishlist,
      isWishlisted,
      enquiries,
      addEnquiry,
      sentOrders,
      addSentOrder,
      changeLineSize,
      publishAll,
      syncing,
    }),
    [
      posters,
      setPosters,
      categories,
      setCategories,
      shop,
      setShop,
      featuredConfig,
      setFeaturedConfig,
      cartLines,
      cartCount,
      cartTotal,
      cartDetailed,
      addToCart,
      setCartQty,
      removeFromCart,
      clearCart,
      qtyOf,
      wishlist,
      toggleWishlist,
      isWishlisted,
      enquiries,
      addEnquiry,
      sentOrders,
      addSentOrder,
      changeLineSize,
      publishAll,
      syncing,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}
