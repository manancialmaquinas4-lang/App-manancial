import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, selectCls } from "@/components/app/ui-bits";
import { brl, calcularVencimento, hojeISO, STATUS_SERVICO, type StatusServico } from "@/lib/format";
import { listarTecnicos } from "@/lib/os-data";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel — Manancial Máquinas" }] }),
  component: Painel,
});

function inicioPeriodo(p: string) {
  const h = hojeISO();
  if (p === "dia") return h;
  if (p === "semana") return calcularVencimento(h, -7);
  if (p === "mes") return h.slice(0, 8) + "01";
  if (p === "ano") return h.slice(0, 5) + "01-01";
  return "";
}

function Painel() {
  const [periodo, setPeriodo] = useState("mes");
  const [tec, setTec] = useState("");
  const [st, setSt] = useState("");
  const tecnicos = useQuery({ queryKey: ["tecnicos"], queryFn: listarTecnicos });
  const os = useQuery({
    queryKey: ["painel-os"],
    queryFn: async () => (await supabase.from("ordens_servico").select("id,status_servico,valor_total,valor_recebido,data_solicitacao,data_conclusao,tecnico_responsavel_id").limit(5000)).data ?? [],
  });
  const gar = useQuery({ queryKey: ["painel-gar"], queryFn: async () => (await supabase.from("garantias").select("data_vencimento")).data ?? [] });

  const ini = inicioPeriodo(periodo);
  const rows = (os.data ?? []).filter((o) => (!ini || o.data_solicitacao >= ini) && (!tec || o.tecnico_responsavel_id === tec) && (!st || o.status_servico === st));
  const cnt = (s: StatusServico) => rows.filter((o) => o.status_servico === s).length;
  const validas = rows.filter((o) => o.status_servico !== "cancelado");
  const mesIni = hojeISO().slice(0, 8) + "01";
  const fatMes = (os.data ?? []).filter((o) => o.status_servico === "concluido" && (o.data_conclusao ?? "") >= mesIni).reduce((a, o) => a + Number(o.valor_total), 0);
  const recebido = validas.reduce((a, o) => a + Number(o.valor_recebido), 0);
  const pendente = validas.reduce((a, o) => a + Math.max(0, Number(o.valor_total) - Number(o.valor_recebido)), 0);
  const vigentes = (gar.data ?? []).filter((g) => (g.data_vencimento ?? "") >= hojeISO()).length;
  const chart = (Object.keys(STATUS_SERVICO) as StatusServico[]).map((s) => ({ nome: STATUS_SERVICO[s], total: cnt(s) }));

  const cards: [string, string | number, string?][] = [
    ["Total de OS", rows.length],
    ["Faturamento do mês", brl(fatMes), "text-primary"],
    ["Valores recebidos", brl(recebido), "text-success"],
    ["Valores pendentes", brl(pendente), "text-destructive"],
    ["Garantias vigentes", vigentes, "text-success"],
    ...(Object.keys(STATUS_SERVICO) as StatusServico[]).map((s) => [STATUS_SERVICO[s], cnt(s)] as [string, number]),
  ];

  return (
    <>
      <PageHeader title="Painel" subtitle="Visão geral da assistência técnica" />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <select className={selectCls} value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
          <option value="dia">Hoje</option><option value="semana">Últimos 7 dias</option><option value="mes">Este mês</option><option value="ano">Este ano</option><option value="">Todo o período</option>
        </select>
        <select className={selectCls} value={tec} onChange={(e) => setTec(e.target.value)}>
          <option value="">Todos os técnicos</option>
          {tecnicos.data?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <select className={selectCls} value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_SERVICO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        {cards.map(([k, v, c], i) => (
          <div key={k} className={i === 0 ? "rounded-xl bg-gradient-navy p-4 text-navy-foreground shadow-card" : "rounded-xl border bg-card p-4 shadow-card"}>
            <div className="text-xs font-semibold uppercase tracking-wide opacity-75">{k}</div>
            <div className={`mt-1 font-display text-2xl font-bold ${c ?? ""}`}>{v}</div>
          </div>
        ))}
      </div>
      <Panel title="Serviços por status">
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </>
  );
}
