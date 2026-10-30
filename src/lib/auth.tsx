import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./format";

type Profile = { id: string; nome: string; email: string | null; ativo: boolean };
type AuthCtx = {
  session: Session | null;
  loading: boolean;
  accessIssue: string | null;
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
  const [accessIssue, setAccessIssue] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);

  async function loadUser(s: Session | null) {
    setAccessIssue(null);
    if (!s) {
      setProfile(null);
      setRoles([]);
      return;
    }
    const [profileResult, rolesResult] = await Promise.all([
      supabase.from("profiles").select("id,nome,email,ativo").eq("id", s.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", s.user.id),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (rolesResult.error) throw rolesResult.error;

    const loadedRoles = (rolesResult.data ?? []).map((x) => x.role);
    setProfile(profileResult.data ?? null);
    setRoles(loadedRoles);

    if (!profileResult.data) {
      setAccessIssue(
        "A conta entrou, mas não tem perfil na tabela public.profiles. Verifique a migração e o trigger de cadastro no projeto Supabase usado pelo app.",
      );
    } else if (loadedRoles.length === 0) {
      setAccessIssue(
        "O perfil foi encontrado, mas a conta não tem papel em public.user_roles. Verifique se a migração 0001 foi aplicada no projeto Supabase usado pelo app.",
      );
    }
  }

  function showAccessError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Auth] Não foi possível carregar perfil e papéis do Supabase.", error);
    setProfile(null);
    setRoles([]);
    setAccessIssue(`Falha ao consultar o Supabase: ${message}`);
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => {
        void loadUser(s).catch(showAccessError);
      }, 0);
    });
    void supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (error) throw error;
        setSession(data.session);
        await loadUser(data.session);
      })
      .catch(showAccessError)
      .finally(() => setLoading(false));
    return () => sub.subscription.unsubscribe();
  }, []);

  const active = profile?.ativo !== false;
  const isAdmin = active && roles.includes("admin");
  const value: AuthCtx = {
    session,
    loading,
    accessIssue,
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
