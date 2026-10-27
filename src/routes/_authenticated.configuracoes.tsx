import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Empty, Field, PageHeader, Panel } from "@/components/app/ui-bits";
import { useAuth } from "@/lib/auth";
import type { Config } from "@/lib/os-data";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Manancial Máquinas" }] }),
  component: Configuracoes,
});

function Configuracoes() {
  const { isAdmin } = useAuth();
  const q = useQuery({ queryKey: ["config"], queryFn: async () => (await supabase.from("configuracoes_empresa").select("*").eq("id", 1).single()).data });
  const [f, setF] = useState<Config | null>(null);
  useEffect(() => { if (q.data) setF(q.data); }, [q.data]);
  if (!isAdmin) return <Empty>Somente administradores acessam esta tela.</Empty>;
  if (!f) return <p className="text-muted-foreground">Carregando...</p>;
  const bind = (k: keyof Config) => ({ value: (f[k] as string) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value }) });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const { id: _id, updated_at: _u, ...rest } = f!;
    const { error } = await supabase.from("configuracoes_empresa").update({ ...rest, garantia_padrao_dias: Number(f!.garantia_padrao_dias), updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas. Elas aparecem nos próximos PDFs.");
  }

  return (
    <>
      <PageHeader title="Configurações da empresa" subtitle="Dados exibidos no cabeçalho dos PDFs e nas mensagens." />
      <form onSubmit={salvar} className="space-y-5">
        <Panel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome da empresa" required><Input {...bind("nome")} /></Field>
            <Field label="Slogan"><Input {...bind("slogan")} /></Field>
            <Field label="CNPJ"><Input {...bind("cnpj")} /></Field>
            <Field label="E-mail"><Input {...bind("email")} /></Field>
            <Field label="Telefone"><Input {...bind("telefone")} /></Field>
            <Field label="WhatsApp"><Input {...bind("whatsapp")} /></Field>
            <Field label="Endereço" className="sm:col-span-2"><Input {...bind("endereco")} /></Field>
            <Field label="Prazo de garantia padrão (dias)"><Input type="number" min={0} {...bind("garantia_padrao_dias")} /></Field>
            <Field label="Condições padrão da garantia" className="sm:col-span-2"><Textarea rows={4} {...bind("condicoes_garantia")} /></Field>
          </div>
        </Panel>
        <Panel title="Envio automático pelo WhatsApp">
          <p className="text-sm text-muted-foreground">Hoje o envio é feito pelo compartilhamento do celular (o PDF vai anexado). O envio 100% automático exige conectar uma conta oficial do WhatsApp Business — ainda não configurado.</p>
        </Panel>
        <Button type="submit" size="lg">Salvar configurações</Button>
      </form>
    </>
  );
}
