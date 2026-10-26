import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ClienteDialog } from "@/components/app/ClienteDialog";
import { Empty, PageHeader, Panel, StatusServicoBadge } from "@/components/app/ui-bits";
import { brl, dataBR, formatarTelefone, TIPO_EQUIPAMENTO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  head: () => ({ meta: [{ title: "Cliente — Manancial Máquinas" }] }),
  component: ClienteDet,
});

function ClienteDet() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const c = useQuery({ queryKey: ["cliente", id], queryFn: async () => (await supabase.from("clientes").select("*").eq("id", id).single()).data });
  const os = useQuery({
    queryKey: ["cliente-os", id],
    queryFn: async () => (await supabase.from("ordens_servico").select("*").eq("cliente_id", id).order("numero_os", { ascending: false })).data ?? [],
  });
  if (!c.data) return <p className="text-muted-foreground">Carregando...</p>;
  const cl = c.data;
  return (
    <>
      <PageHeader
        title={cl.nome}
        subtitle={`Cód. ${cl.codigo} • ${formatarTelefone(cl.whatsapp || cl.telefone)}`}
        actions={<>
          <Button variant="outline" onClick={() => setOpen(true)}><Pencil /> Editar</Button>
          <Button asChild variant="accent"><Link to="/os/nova">+ Nova OS</Link></Button>
        </>}
      />
      <Panel title="Dados" className="mb-5">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>CPF/CNPJ: {cl.cpf_cnpj || "—"}</div>
          <div>Telefone: {formatarTelefone(cl.telefone) || "—"}</div>
          <div className="sm:col-span-2">Endereço: {[cl.endereco, cl.numero, cl.complemento, cl.bairro, cl.cidade, cl.estado, cl.cep].filter(Boolean).join(", ") || "—"}</div>
          <div className="sm:col-span-2">Observações: {cl.observacoes || "—"}</div>
        </div>
      </Panel>
      <Panel title={`Histórico de atendimentos (${os.data?.length ?? 0})`}>
        {(os.data ?? []).length === 0 ? <Empty>Nenhum atendimento ainda.</Empty> : (
          <ul className="divide-y">
            {os.data!.map((o) => (
              <li key={o.id}>
                <Link to="/os/$id" params={{ id: o.id }} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-primary">
                  <span className="font-semibold">#{String(o.numero_os).padStart(5, "0")} — {TIPO_EQUIPAMENTO[o.tipo_equipamento]} {o.marca} {o.modelo}</span>
                  <span className="flex items-center gap-2 text-sm">{dataBR(o.data_solicitacao)} <StatusServicoBadge s={o.status_servico} /> {brl(o.valor_total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <ClienteDialog open={open} onOpenChange={setOpen} cliente={cl} onSaved={() => qc.invalidateQueries({ queryKey: ["cliente", id] })} />
    </>
  );
}
