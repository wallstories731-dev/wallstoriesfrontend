import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  currentMember,
  signOutCustomer,
  type Member,
} from "../api/customerAuth"
import { subscribeAuth } from "../api/auth"
type Auth = {
  member: Member | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}
const Context = createContext<Auth | null>(null)
export function useCustomerAuth() {
  const value = useContext(Context)
  if (!value) throw new Error("Missing customer auth provider")
  return value
}
export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null),
    [loading, setLoading] = useState(true)
  const sequence = useRef(0),
    active = useRef(true)
  const refresh = async () => {
    const id = ++sequence.current
    let user: Member | null = null
    try {
      user = await currentMember()
    } catch {
      /* Treat an unavailable identity service as signed out. */
    }
    if (active.current && id === sequence.current) {
      setMember(user)
      setLoading(false)
    }
  }
  useEffect(() => {
    active.current = true
    void refresh()
    const subscription = subscribeAuth(() => {
      void refresh()
    })
    return () => {
      active.current = false
      sequence.current++
      subscription?.unsubscribe()
    }
  }, [])
  const logout = async () => {
    await signOutCustomer()
    await refresh()
  }
  return (
    <Context.Provider value={{ member, loading, refresh, logout }}>
      {children}
    </Context.Provider>
  )
}
