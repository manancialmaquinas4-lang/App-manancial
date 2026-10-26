import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Empty, PageHeader, Panel, selectCls, StatusPagamentoBadge } from "@/components/app/ui-bits";
import { brl, dataBR, STATUS_PAGAMENTO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos — Manancial Máquinas" }] }),
  component: Pagamentos,
});

function Pagamentos() {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [st, setSt] = useState("");
  const data = useQuery({
    queryKey: ["pagamentos"],
    queryFn: async () =>
      (await supabase.from("ordens_servico").select("id,numero_os,valor_total,valor_recebido,status_pagamento,forma_pagamento,data_pagamento,data_solicitacao,data_conclusao,status_servico, clientes(nome)").neq("status_servico", "cancelado").order("numero_os", { ascending: false })).data ?? [],
  });
  const rows = (data.data ?? []).filter((o) => {
    const d = o.data_pagamento ?? o.data_conclusao ?? o.data_solicitacao;
    return (!de || d >= de) && (!ate || d <= ate) && (!st || o.status_pagamento === st);
  });
  const recebido = rows.reduce((a, o) => a + Number(o.valor_recebido), 0);
  const faturado = rows.filter((o) => o.status_servico === "concluido").reduce((a, o) => a + Number(o.valor_total), 0);
  const pendente = rows.reduce((a, o) => a + Math.max(0, Number(o.valor_total) - Number(o.valor_recebido)), 0);
  return (
    <>
      <PageHeader title="Pagamentos" subtitle="Ordens canceladas não entram no faturamento." />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Panel><div className="text-xs uppercase text-muted-foreground">Faturamento (concluídas)</div><div className="font-display text-2xl font-bold">{brl(faturado)}</div></Panel>
        <Panel><div className="text-xs uppercase text-muted-foreground">Recebido</div><div className="font-display text-2xl font-bold text-success">{brl(recebido)}</div></Panel>
        <Panel><div className="text-xs uppercase text-muted-foreground">Pendente</div><div className="font-display text-2xl font-bold text-destructive">{brl(pendente)}</div></Panel>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} aria-label="De" />
        <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} aria-label="Até" />
        <select className={selectCls} value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="">Todas as situações</option>
          {Object.entries(STATUS_PAGAMENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {rows.length === 0 ? <Empty>Nenhum registro no período.</Empty> : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">OS</th><th>Cliente</th><th className="text-right">Total</th><th className="text-right">Recebido</th><th className="text-right">Saldo</th><th className="pl-4">Forma</th><th>Data</th><th>Situação</th></tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="p-3"><Link to="/os/$id" params={{ id: o.id }} className="font-semibold text-primary">#{String(o.numero_os).padStart(5, "0")}</Link></td>
                  <td>{o.clientes?.nome}</td>
                  <td className="text-right">{brl(o.valor_total)}</td>
                  <td className="text-right">{brl(o.valor_recebido)}</td>
                  <td className="text-right">{brl(Math.max(0, Number(o.valor_total) - Number(o.valor_recebido)))}</td>
                  <td className="pl-4">{o.forma_pagamento ?? "—"}</td>
                  <td>{dataBR(o.data_pagamento)}</td>
                  <td><StatusPagamentoBadge s={o.status_pagamento} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
