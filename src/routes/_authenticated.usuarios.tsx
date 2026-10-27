import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Empty, PageHeader, Panel } from "@/components/app/ui-bits";
import { useAuth } from "@/lib/auth";
import { ROLES, type AppRole } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Manancial Máquinas" }] }),
  component: Usuarios,
});

function Usuarios() {
  const { isAdmin, session } = useAuth();
  const qc = useQueryClient();
  const data = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const [p, r] = await Promise.all([supabase.from("profiles").select("*").order("nome"), supabase.from("user_roles").select("*")]);
      return (p.data ?? []).map((u) => ({ ...u, roles: (r.data ?? []).filter((x) => x.user_id === u.id).map((x) => x.role) }));
    },
  });
  if (!isAdmin) return <Empty>Somente administradores acessam esta tela.</Empty>;
  const refresh = () => qc.invalidateQueries({ queryKey: ["usuarios"] });

  async function toggleRole(uid: string, role: AppRole, on: boolean) {
    if (uid === session?.user.id && role === "admin" && !on) return toast.error("Você não pode remover seu próprio acesso de administrador.");
    const { error } = on ? await supabase.from("user_roles").insert({ user_id: uid, role }) : await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
    if (error) toast.error(error.message);
    refresh();
  }
  async function toggleAtivo(uid: string, ativo: boolean) {
    if (uid === session?.user.id) return toast.error("Você não pode desativar a si mesmo.");
    const { error } = await supabase.from("profiles").update({ ativo }).eq("id", uid);
    if (error) toast.error(error.message);
    refresh();
  }

  return (
    <>
      <PageHeader title="Usuários e perfis" subtitle="Novos usuários se cadastram em “Solicitar acesso” e só entram depois que você define o perfil." />
      <Panel>
        <div className="divide-y">
          {data.data?.map((u) => (
            <div key={u.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="truncate font-semibold">{u.nome}</div>
                <div className="truncate text-sm text-muted-foreground">{u.email}</div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {(Object.keys(ROLES) as AppRole[]).map((r) => (
                  <label key={r} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={u.roles.includes(r)} onChange={(e) => toggleRole(u.id, r, e.target.checked)} />
                    {ROLES[r]}
                  </label>
                ))}
                <label className="flex items-center gap-2">Ativo <Switch checked={u.ativo} onCheckedChange={(v) => toggleAtivo(u.id, v)} /></label>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
