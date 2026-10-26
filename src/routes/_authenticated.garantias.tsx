import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Empty, GarantiaBadge, PageHeader, selectCls } from "@/components/app/ui-bits";
import { dataBR, formatarTelefone, situacaoGarantia, TIPO_EQUIPAMENTO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/garantias")({
  head: () => ({ meta: [{ title: "Garantias — Manancial Máquinas" }] }),
  component: Garantias,
});

function Garantias() {
  const [q, setQ] = useState("");
  const [sit, setSit] = useState("");
  const data = useQuery({
    queryKey: ["garantias"],
    queryFn: async () =>
      (await supabase.from("garantias").select("*, ordens_servico(id,numero_os,tipo_equipamento,marca,modelo, clientes(nome,whatsapp,telefone))").order("data_vencimento")).data ?? [],
  });
  const t = q.toLowerCase();
  const td = q.replace(/\D/g, "");
  const rows = (data.data ?? [])
    .map((g) => ({ ...g, sit: situacaoGarantia(g.data_vencimento!) }))
    .filter((g) => {
      const o = g.ordens_servico;
      if (sit && g.sit !== sit) return false;
      if (!t) return true;
      return (
        o?.clientes?.nome.toLowerCase().includes(t) ||
        String(o?.numero_os) === t.replace(/^0+/, "") ||
        `${o?.marca} ${o?.modelo}`.toLowerCase().includes(t) ||
        (td.length >= 4 && (o?.clientes?.whatsapp ?? "").includes(td))
      );
    });
  const count = (s: string) => (data.data ?? []).filter((g) => situacaoGarantia(g.data_vencimento!) === s).length;
  return (
    <>
      <PageHeader title="Garantias" subtitle={`${count("vigente")} vigentes • ${count("vencendo")} vencem em até 15 dias • ${count("vencida")} vencidas`} />
      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <Input placeholder="Cliente, telefone, nº da OS ou equipamento" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={selectCls} value={sit} onChange={(e) => setSit(e.target.value)}>
          <option value="">Todas</option>
          <option value="vigente">Vigentes</option>
          <option value="vencendo">Próximas do vencimento</option>
          <option value="vencida">Vencidas</option>
        </select>
      </div>
      {rows.length === 0 ? <Empty>Nenhuma garantia. Elas são criadas ao concluir uma OS.</Empty> : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((g) => (
            <Link key={g.id} to="/os/$id" params={{ id: g.ordens_servico!.id }} className="rounded-xl border bg-card p-4 shadow-card hover:border-primary">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-bold text-primary">OS #{String(g.ordens_servico?.numero_os).padStart(5, "0")}</span>
                <GarantiaBadge s={g.sit} />
              </div>
              <div className="mt-1 font-semibold">{g.ordens_servico?.clientes?.nome} <span className="text-sm font-normal text-muted-foreground">{formatarTelefone(g.ordens_servico?.clientes?.whatsapp)}</span></div>
              <div className="text-sm text-muted-foreground">{g.ordens_servico && TIPO_EQUIPAMENTO[g.ordens_servico.tipo_equipamento]} {g.ordens_servico?.marca} {g.ordens_servico?.modelo}</div>
              <div className="mt-2 line-clamp-2 text-sm">{g.descricao_cobertura}</div>
              <div className="mt-2 text-xs text-muted-foreground">{g.prazo_dias} dias • {dataBR(g.data_inicio)} até {dataBR(g.data_vencimento)} • {g.responsavel_tecnico}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
