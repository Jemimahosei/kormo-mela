import { createContext, useContext, useState, type ReactNode } from "react";
import {
  clearAuth,
  getStoredUser,
  storeAuth,
  type AuthUser,
} from "./api";

interface AuthCtx {
  user: AuthUser | null;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx>({ user: null, signIn: () => {}, signOut: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  return (
    <Ctx.Provider
      value={{
        user,
        signIn: (token, u) => {
          storeAuth(token, u);
          setUser(u);
        },
        signOut: () => {
          clearAuth();
          setUser(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
