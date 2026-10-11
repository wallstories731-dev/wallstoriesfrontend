import { loadPublishedSettings } from "../api/publication";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type OffersConfig,
  type BundleRule,
  type CouponCode,
} from "../data/offers";
import { loadOffers, saveOffers } from "../api";

type OffersContextValue = {
  config: OffersConfig;
  replaceOffers: (next: OffersConfig) => void;
  setBundleRule: (rule: BundleRule) => void;
  addCoupon: (c: Omit<CouponCode, "id" | "usedCount">) => void;
  updateCoupon: (id: string, patch: Partial<CouponCode>) => void;
  deleteCoupon: (id: string) => void;
  incrementCouponUse: (code: string) => void;
};

const Ctx = createContext<OffersContextValue | null>(null);

export function useOffers() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOffers must be inside OffersProvider");
  return ctx;
}

export function OffersProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<OffersConfig>(() => loadOffers());
  useEffect(() => {
    saveOffers(config);
  }, [config]);
  useEffect(() => {
    let active = true;
    void loadPublishedSettings()
      .then((s) => {
        if (active && s) setConfig(s.offers);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const setBundleRule = useCallback((rule: BundleRule) => {
    setConfig((c) => ({ ...c, bundleRule: rule }));
  }, []);

  const addCoupon = useCallback(
    (data: Omit<CouponCode, "id" | "usedCount">) => {
      const coupon: CouponCode = {
        ...data,
        id: crypto.randomUUID(),
        usedCount: 0,
      };
      setConfig((c) => ({ ...c, coupons: [coupon, ...c.coupons] }));
    },
    [],
  );

  const updateCoupon = useCallback((id: string, patch: Partial<CouponCode>) => {
    setConfig((c) => ({
      ...c,
      coupons: c.coupons.map((cp) => (cp.id === id ? { ...cp, ...patch } : cp)),
    }));
  }, []);

  const deleteCoupon = useCallback((id: string) => {
    setConfig((c) => ({
      ...c,
      coupons: c.coupons.filter((cp) => cp.id !== id),
    }));
  }, []);

  const incrementCouponUse = useCallback((code: string) => {
    setConfig((c) => ({
      ...c,
      coupons: c.coupons.map((cp) =>
        cp.code.toUpperCase() === code.toUpperCase()
          ? { ...cp, usedCount: cp.usedCount + 1 }
          : cp,
      ),
    }));
  }, []);

  const value = useMemo<OffersContextValue>(
    () => ({
      config,
      replaceOffers: setConfig,
      setBundleRule,
      addCoupon,
      updateCoupon,
      deleteCoupon,
      incrementCouponUse,
    }),
    [
      config,
      setBundleRule,
      addCoupon,
      updateCoupon,
      deleteCoupon,
      incrementCouponUse,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
