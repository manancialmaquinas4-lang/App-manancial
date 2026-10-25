import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./format";

type Profile = { id: string; nome: string; email: string | null; ativo: boolean };
type AuthCtx = {
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  roles: AppRole[];
  isAdmin: boolean;
  canFinance: boolean;
  isStaff: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);

  async function loadUser(s: Session | null) {
    if (!s) {
      setProfile(null);
      setRoles([]);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id,nome,email,ativo").eq("id", s.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", s.user.id),
    ]);
    setProfile(p ?? null);
    setRoles((r ?? []).map((x) => x.role));
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => loadUser(s), 0);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadUser(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const active = profile?.ativo !== false;
  const isAdmin = active && roles.includes("admin");
  const value: AuthCtx = {
    session,
    loading,
    profile,
    roles,
    isAdmin,
    canFinance: active && (isAdmin || roles.includes("atendimento")),
    isStaff: active && roles.length > 0,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refresh: () => loadUser(session),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth fora do AuthProvider");
  return c;
}
