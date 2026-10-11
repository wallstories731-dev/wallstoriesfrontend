import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react"
import {
  type AdminOrder, type OrderStatus, type AdminNote,
  makeOrderRef,
} from "../data/adminOrders"
import { loadAdminOrders, updateAdminOrder, clearPrivateDrafts } from "../api"
import { useAdminAuth } from "./AdminAuthContext"
import { type SizeKey } from "../data/shop"

type AdminOrdersContextValue = {
  orders: AdminOrder[]
  error: string
  addOrder: (order: Omit<AdminOrder, "id" | "ref" | "createdAt" | "updatedAt" | "timeline" | "notes">) => AdminOrder
  updateOrder: (id: string, patch: Partial<AdminOrder>) => void
  updateStatus: (id: string, status: OrderStatus, note?: string) => void
  deleteOrder: (id: string) => void
  addNote: (id: string, text: string) => void
}

const Ctx = createContext<AdminOrdersContextValue | null>(null)

export function useAdminOrders() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useAdminOrders must be inside AdminOrdersProvider")
  return ctx
}

export function AdminOrdersProvider({ children }: { children: ReactNode }) {
  const { authed } = useAdminAuth()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [error, setError] = useState("")
  const authEpoch = useRef(0)
  const authActive = useRef(authed)
  authActive.current = authed
  const refresh = useCallback(async () => { const epoch = authEpoch.current; const rows = await loadAdminOrders(); if (authActive.current && epoch === authEpoch.current) setOrders(rows) }, [])
  useEffect(() => {
    let cancelled = false
    authEpoch.current++
    if (!authed) { setOrders([]); setError(""); clearPrivateDrafts(); return }
    void loadAdminOrders().then(rows => { if (!cancelled) setOrders(rows) }).catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true; authEpoch.current++ }
  }, [authed])
  const mutate = useCallback((id:string, patch:Record<string,unknown>) => {
    if (!authed) return
    setError("")
    const epoch = authEpoch.current
    void updateAdminOrder(id,patch).then(() => { if(authActive.current && epoch === authEpoch.current) return refresh() }).catch(e => { if(authActive.current && epoch === authEpoch.current) setError(e.message) })
  }, [authed, refresh])
  const addOrder = useCallback((_data: Omit<AdminOrder,"id"|"ref"|"createdAt"|"updatedAt"|"timeline"|"notes">): AdminOrder => {
    throw new Error("Orders are created by secure checkout; manual browser records are not supported.")
  }, [])
  const updateOrder = useCallback((id:string,patch:Partial<AdminOrder>) => mutate(id,patch), [mutate])
  const updateStatus = useCallback((id:string,status:OrderStatus,note?:string) => mutate(id,{status,...(note?{note}:{})}), [mutate])
  const deleteOrder = useCallback((_id:string) => setError("Payment records cannot be deleted. Cancel an unpaid order instead."), [])
  const addNote = useCallback((id:string,text:string) => mutate(id,{note:text}), [mutate])

  const value = useMemo<AdminOrdersContextValue>(
    () => ({ orders, error, addOrder, updateOrder, updateStatus, deleteOrder, addNote }),
    [orders, error, addOrder, updateOrder, updateStatus, deleteOrder, addNote],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// Helper: convert a storefront enquiry into an admin order
export function enquiryToAdminOrder(
  enquiry: {
    id: string
    name: string
    note: string
    posterId: string
    size: SizeKey
    qty: number
    createdAt: number
  },
  posterTitle: string,
  posterCode: string,
  unitPrice: number,
  existing?: AdminOrder,
): Omit<AdminOrder, "id" | "ref" | "createdAt" | "updatedAt" | "timeline" | "notes"> {
  return {
    source: "enquiry",
    status: existing?.status ?? "new",
    name: enquiry.name,
    phone: "",
    city: "",
    pincode: "",
    items: [{
      posterId: enquiry.posterId,
      posterTitle,
      posterCode,
      size: enquiry.size,
      qty: enquiry.qty,
      unitPrice,
      mrp: Math.round(unitPrice * 1.25),
    }],
    subtotal: unitPrice * enquiry.qty,
    discount: 0,
    shipping: 80,
    total: unitPrice * enquiry.qty + 80,
    via: "form",
  }
}
