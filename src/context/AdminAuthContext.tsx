import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  endAdminSession,
  hasAdminSession,
  subscribeAuth,
  verifyAdminLogin,
} from "../api";
type Auth = {
  authed: boolean;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};
const Ctx = createContext<Auth | null>(null);
export function useAdminAuth() {
  const value = useContext(Ctx);
  if (!value) throw new Error("Missing auth provider");
  return value;
}
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const epoch = useRef(0),
    alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    const refresh = async () => {
      const version = ++epoch.current;
      try {
        const ok = await hasAdminSession();
        if (alive.current && version === epoch.current) {
          setAuthed(ok);
          setLoading(false);
        }
      } catch {
        if (alive.current && version === epoch.current) {
          setAuthed(false);
          setLoading(false);
        }
      }
    };
    void refresh();
    const subscription = subscribeAuth(() => void refresh());
    return () => {
      alive.current = false;
      epoch.current++;
      subscription?.unsubscribe();
    };
  }, []);
  async function login(email: string, password: string) {
    setError("");
    try {
      const ok = await verifyAdminLogin(email, password);
      epoch.current++;
      if (alive.current) {
        setAuthed(ok);
        setLoading(false);
        setError(
          ok ? "" : "Invalid credentials or administrator access not granted.",
        );
      }
      return ok;
    } catch (e) {
      epoch.current++;
      if (alive.current) {
        setAuthed(false);
        setLoading(false);
        setError(e instanceof Error ? e.message : "Sign-in unavailable.");
      }
      return false;
    }
  }
  async function logout() {
    epoch.current++;
    setAuthed(false);
    setError("");
    try {
      await endAdminSession();
    } catch {
      setError(
        "Sign-out could not be confirmed. Close this tab and try again.",
      );
    }
  }
  return (
    <Ctx.Provider value={{ authed, loading, error, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}
