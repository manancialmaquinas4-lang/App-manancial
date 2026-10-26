import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Empty, PageHeader } from "@/components/app/ui-bits";
import { ClienteDialog } from "@/components/app/ClienteDialog";
import { supabase } from "@/integrations/supabase/client";
import { dataBR, formatarTelefone } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — Manancial Máquinas" }] }),
  component: Clientes,
});

function Clientes() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const data = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => (await supabase.from("clientes").select("*").order("nome")).data ?? [],
  });
  const t = q.toLowerCase();
  const td = q.replace(/\D/g, "");
  const rows = (data.data ?? []).filter(
    (c) => !t || c.nome.toLowerCase().includes(t) || String(c.codigo) === t || (td.length >= 3 && ((c.whatsapp ?? "").includes(td) || (c.telefone ?? "").replace(/\D/g, "").includes(td) || (c.cpf_cnpj ?? "").includes(td))),
  );
  return (
    <>
      <PageHeader title="Clientes" subtitle={`${data.data?.length ?? 0} cadastrados`} actions={<Button variant="accent" onClick={() => setOpen(true)}>+ Novo cliente</Button>} />
      <Input className="mb-4" placeholder="Pesquisar por nome, código, telefone ou CPF/CNPJ" value={q} onChange={(e) => setQ(e.target.value)} />
      {rows.length === 0 ? <Empty>Nenhum cliente encontrado.</Empty> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <Link key={c.id} to="/clientes/$id" params={{ id: c.id }} className="rounded-xl border bg-card p-4 shadow-card transition hover:border-primary">
              <div className="text-xs font-semibold text-muted-foreground">Cód. {c.codigo} • desde {dataBR(c.created_at)}</div>
              <div className="mt-1 truncate font-semibold">{c.nome}</div>
              <div className="text-sm text-muted-foreground">{formatarTelefone(c.whatsapp || c.telefone) || "Sem telefone"}</div>
              <div className="truncate text-sm text-muted-foreground">{[c.bairro, c.cidade].filter(Boolean).join(" — ")}</div>
            </Link>
          ))}
        </div>
      )}
      <ClienteDialog open={open} onOpenChange={setOpen} onSaved={() => qc.invalidateQueries({ queryKey: ["clientes"] })} />
    </>
  );
}
