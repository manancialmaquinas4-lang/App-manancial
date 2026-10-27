import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, FileSpreadsheet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel } from "@/components/app/ui-bits";
import { brl, hojeISO, TIPO_EQUIPAMENTO } from "@/lib/format";
import { listarTecnicos } from "@/lib/os-data";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Manancial Máquinas" }] }),
  component: Relatorios,
});

type Tabela = { titulo: string; cab: string[]; linhas: (string | number)[][] };

function agrupar<T>(arr: T[], key: (t: T) => string, val: (t: T) => number = () => 1) {
  const m = new Map<string, number>();
  arr.forEach((t) => m.set(key(t), (m.get(key(t)) ?? 0) + val(t)));
  return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

function Relatorios() {
  const [de, setDe] = useState(hojeISO().slice(0, 5) + "01-01");
  const [ate, setAte] = useState(hojeISO());
  const tecs = useQuery({ queryKey: ["tecnicos"], queryFn: listarTecnicos });
  const os = useQuery({
    queryKey: ["rel-os"],
    queryFn: async () => (await supabase.from("ordens_servico").select("id,status_servico,tipo_equipamento,valor_total,valor_recebido,data_solicitacao,data_conclusao,tecnico_responsavel_id, clientes(nome)").limit(5000)).data ?? [],
  });
  const itens = useQuery({ queryKey: ["rel-itens"], queryFn: async () => (await supabase.from("itens_ordem_servico").select("descricao,quantidade,valor_total,ordem_servico_id")).data ?? [] });
  const gar = useQuery({ queryKey: ["painel-gar"], queryFn: async () => (await supabase.from("garantias").select("data_vencimento")).data ?? [] });

  const rows = (os.data ?? []).filter((o) => o.data_solicitacao >= de && o.data_solicitacao <= ate);
  const conc = rows.filter((o) => o.status_servico === "concluido");
  const validas = rows.filter((o) => o.status_servico !== "cancelado");
  const ids = new Set(rows.map((o) => o.id));
  const tecNome = (id: string | null) => tecs.data?.find((t) => t.id === id)?.nome ?? "Sem técnico";
  const mes = (o: { data_conclusao: string | null }) => (o.data_conclusao ?? "").slice(0, 7);

  const servMes = agrupar(conc, mes);
  const fatMes = agrupar(conc, mes, (o) => Number(o.valor_total));
  const tabelas: Tabela[] = [
    { titulo: "Serviços realizados e faturamento por mês", cab: ["Mês", "Serviços", "Faturamento"], linhas: servMes.map(([m, n]) => [m.split("-").reverse().join("/"), n, brl(fatMes.find((f) => f[0] === m)?.[1])]) },
    { titulo: "Serviços por tipo de equipamento", cab: ["Tipo", "Qtd."], linhas: agrupar(validas, (o) => TIPO_EQUIPAMENTO[o.tipo_equipamento]) },
    { titulo: "Serviços por técnico", cab: ["Técnico", "Qtd."], linhas: agrupar(validas, (o) => tecNome(o.tecnico_responsavel_id)) },
    { titulo: "Peças utilizadas", cab: ["Peça", "Qtd."], linhas: agrupar((itens.data ?? []).filter((i) => ids.has(i.ordem_servico_id)), (i) => i.descricao, (i) => Number(i.quantidade)).sort((a, b) => b[1] - a[1]) },
    { titulo: "Garantias", cab: ["Situação", "Qtd."], linhas: [["Vigentes", (gar.data ?? []).filter((g) => g.data_vencimento! >= hojeISO()).length], ["Vencidas", (gar.data ?? []).filter((g) => g.data_vencimento! < hojeISO()).length]] },
    { titulo: "Valores", cab: ["Item", "Valor"], linhas: [["Recebido", brl(validas.reduce((a, o) => a + Number(o.valor_recebido), 0))], ["Pendente", brl(validas.reduce((a, o) => a + Math.max(0, Number(o.valor_total) - Number(o.valor_recebido)), 0))]] },
    { titulo: "Clientes com mais atendimentos", cab: ["Cliente", "Atendimentos"], linhas: agrupar(validas, (o) => o.clientes?.nome ?? "—").sort((a, b) => b[1] - a[1]).slice(0, 10) },
  ];

  function exportarPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14).text("Manancial Máquinas — Relatório", 14, 16);
    doc.setFontSize(9).text(`Período: ${de.split("-").reverse().join("/")} a ${ate.split("-").reverse().join("/")}`, 14, 22);
    let y = 28;
    tabelas.forEach((t) => {
      autoTable(doc, { startY: y, head: [[t.titulo, ...t.cab.slice(1).map(() => "")], t.cab], body: t.linhas.map((l) => l.map(String)), styles: { fontSize: 8.5 }, headStyles: { fillColor: [22, 38, 99] } });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    });
    doc.save(`relatorio-manancial-${de}-${ate}.pdf`);
  }
  function exportarCSV() {
    const csv = tabelas.map((t) => [t.titulo, t.cab.join(";"), ...t.linhas.map((l) => l.join(";"))].join("\n")).join("\n\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-manancial-${de}-${ate}.csv`;
    a.click();
  }

  return (
    <>
      <PageHeader title="Relatórios" actions={<><Button variant="outline" onClick={exportarCSV}><FileSpreadsheet /> Excel (CSV)</Button><Button onClick={exportarPDF}><Download /> PDF</Button></>} />
      <div className="mb-5 grid max-w-md grid-cols-2 gap-3">
        <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
      </div>
      <Panel title="Faturamento por mês" className="mb-5">
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={fatMes.map(([m, v]) => ({ mes: m.split("-").reverse().join("/"), v }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" /><YAxis /><Tooltip formatter={(v: number) => brl(v)} />
              <Bar dataKey="v" name="Faturamento" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <div className="grid gap-5 md:grid-cols-2">
        {tabelas.map((t) => (
          <Panel key={t.titulo} title={t.titulo}>
            {t.linhas.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados no período.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-muted-foreground">{t.cab.map((c) => <th key={c} className="pb-2">{c}</th>)}</tr></thead>
                <tbody>{t.linhas.map((l, i) => <tr key={i} className="border-t">{l.map((c, j) => <td key={j} className="py-1.5">{c}</td>)}</tr>)}</tbody>
              </table>
            )}
          </Panel>
        ))}
      </div>
    </>
  );
}
