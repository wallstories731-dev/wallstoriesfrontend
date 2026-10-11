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
  type SiteContent,
  type AnnouncementContent,
  type HeroContent,
  type FaqItem,
  type CategoryMeta,
} from "../data/siteContent";
import { loadSiteContent, saveSiteContent } from "../api";

type SiteContentContextValue = {
  content: SiteContent;
  replaceContent: (next: SiteContent) => void;
  setAnnouncement: (a: AnnouncementContent) => void;
  setHero: (h: HeroContent) => void;
  setFaq: (items: FaqItem[]) => void;
  setCategoryMeta: (meta: CategoryMeta[]) => void;
};

const Ctx = createContext<SiteContentContextValue | null>(null);

export function useSiteContent() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useSiteContent must be inside SiteContentProvider");
  return ctx;
}

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(() => loadSiteContent());
  useEffect(() => {
    saveSiteContent(content);
  }, [content]);
  useEffect(() => {
    let active = true;
    void loadPublishedSettings()
      .then((s) => {
        if (active && s) setContent(s.content);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const setAnnouncement = useCallback((a: AnnouncementContent) => {
    setContent((c) => ({ ...c, announcement: a }));
  }, []);

  const setHero = useCallback((h: HeroContent) => {
    setContent((c) => ({ ...c, hero: h }));
  }, []);

  const setFaq = useCallback((items: FaqItem[]) => {
    setContent((c) => ({ ...c, faq: items }));
  }, []);

  const setCategoryMeta = useCallback((meta: CategoryMeta[]) => {
    setContent((c) => ({ ...c, categoryMeta: meta }));
  }, []);

  const value = useMemo<SiteContentContextValue>(
    () => ({
      content,
      replaceContent: setContent,
      setAnnouncement,
      setHero,
      setFaq,
      setCategoryMeta,
    }),
    [content, setAnnouncement, setHero, setFaq, setCategoryMeta],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
