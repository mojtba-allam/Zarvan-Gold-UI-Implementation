import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Cart, User, UserRole, Wallet } from "../types";
import { authApi, orderApi, walletApi } from "../api";

interface AppState {
  user: User | null;
  authLoading: boolean;
  login: (u: User) => void;
  logout: () => Promise<void>;
  cart: Cart | null;
  cartCount: number;
  refreshCart: () => Promise<void>;
  wallets: Wallet[];
  refreshWallets: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cart, setCart] = useState<Cart | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  useEffect(() => {
    let alive = true;
    authApi.me().then((u) => {
      if (!alive) return;
      setUser(u);
      setAuthLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const refreshCart = useCallback(async () => {
    try { setCart(await orderApi.cart()); } catch { /* guest */ }
  }, []);

  const refreshWallets = useCallback(async () => {
    if (!sessionActive()) return;
    try { setWallets(await walletApi.wallets()); } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (user) {
      refreshCart();
      refreshWallets();
    } else {
      refreshCart();
      setWallets([]);
    }
  }, [user, refreshCart, refreshWallets]);

  const login = useCallback((u: User) => {
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setWallets([]);
  }, []);

  const cartCount = useMemo(() => (cart ? cart.lines.reduce((s, l) => s + l.qty, 0) : 0), [cart]);

  const value: AppState = { user, authLoading, login, logout, cart, cartCount, refreshCart, wallets, refreshWallets };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function sessionActive(): boolean {
  return !!localStorage.getItem("zarvan_uid");
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}

/** blocks until auth resolved; redirects guests to /login */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useApp();
  const location = useLocation();
  if (authLoading) return <AuthSplash />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

/** role gate; wrong role → /403 */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { user, authLoading } = useApp();
  if (authLoading) return <AuthSplash />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}

function AuthSplash() {
  return (
    <div className="min-h-screen grid place-items-center bg-cream-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-20 relative" aria-hidden>
          <svg viewBox="0 0 80 48" className="w-full h-full">
            <path d="M18 6h44l12 36H6z" fill="#C9A227" />
            <path d="M18 6h44l4 12H14z" fill="#E8CE7E" />
            <path d="M26 26h28l2 6H24z" fill="#A68516" opacity="0.5" />
          </svg>
        </div>
        <div className="skeleton h-3 w-36 mx-auto" />
      </div>
    </div>
  );
}
