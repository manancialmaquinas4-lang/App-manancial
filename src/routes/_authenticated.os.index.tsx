import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Empty, PageHeader, Panel, selectCls, StatusPagamentoBadge, StatusServicoBadge } from "@/components/app/ui-bits";
import { brl, dataBR, STATUS_SERVICO, TIPO_EQUIPAMENTO } from "@/lib/format";
import { listarTecnicos } from "@/lib/os-data";

export const Route = createFileRoute("/_authenticated/os/")({
  head: () => ({ meta: [{ title: "Ordens de serviço — Manancial Máquinas" }] }),
  component: Lista,
});

function Lista() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [tec, setTec] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const tecnicos = useQuery({ queryKey: ["tecnicos"], queryFn: listarTecnicos });
  const data = useQuery({
    queryKey: ["os-lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("*, clientes(nome,telefone,whatsapp)")
        .order("numero_os", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });
  const rows = useMemo(() => {
    const t = q.toLowerCase().trim();
    const td = t.replace(/\D/g, "");
    return (data.data ?? []).filter((o) => {
      if (status && o.status_servico !== status) return false;
      if (tec && o.tecnico_responsavel_id !== tec) return false;
      if (de && o.data_solicitacao < de) return false;
      if (ate && o.data_solicitacao > ate) return false;
      if (!t) return true;
      const c = o.clientes;
      return (
        String(o.numero_os) === t.replace(/^0+/, "") ||
        c?.nome.toLowerCase().includes(t) ||
        (td.length >= 4 && ((c?.telefone ?? "").replace(/\D/g, "").includes(td) || (c?.whatsapp ?? "").includes(td))) ||
        `${o.marca} ${o.modelo}`.toLowerCase().includes(t)
      );
    });
  }, [data.data, q, status, tec, de, ate]);

  return (
    <>
      <PageHeader
        title="Ordens de serviço"
        subtitle="Histórico completo, segunda via e reenvio pelo WhatsApp."
        actions={<Button asChild variant="accent"><Link to="/os/nova">+ Nova OS</Link></Button>}
      />
      <Panel className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input placeholder="Nº da OS, cliente, telefone, marca/modelo" value={q} onChange={(e) => setQ(e.target.value)} className="lg:col-span-2" />
          <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_SERVICO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={selectCls} value={tec} onChange={(e) => setTec(e.target.value)}>
            <option value="">Todos os técnicos</option>
            {tecnicos.data?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <div className="flex gap-2">
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} aria-label="De" />
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} aria-label="Até" />
          </div>
        </div>
      </Panel>
      {data.isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <Empty>Nenhuma ordem de serviço encontrada.</Empty>
      ) : (
        <div className="grid gap-3">
          {rows.map((o) => (
            <Link key={o.id} to="/os/$id" params={{ id: o.id }} className="grid gap-2 rounded-xl border bg-card p-4 shadow-card transition hover:border-primary sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-center">
              <div className="font-display text-lg font-bold text-primary">#{String(o.numero_os).padStart(5, "0")}</div>
              <div className="min-w-0">
                <div className="truncate font-semibold">{o.clientes?.nome}</div>
                <div className="truncate text-sm text-muted-foreground">
                  {TIPO_EQUIPAMENTO[o.tipo_equipamento]} {o.marca} {o.modelo} • {dataBR(o.data_solicitacao)}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <StatusServicoBadge s={o.status_servico} />
                <StatusPagamentoBadge s={o.status_pagamento} />
                <span className="font-semibold">{brl(o.valor_total)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
