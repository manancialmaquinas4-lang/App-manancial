import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "./ui-bits";
import { normalizarWhatsapp } from "@/lib/format";
import type { Cliente } from "@/lib/os-data";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  telefone: z.string().trim().max(20),
  whatsapp: z.string().trim().max(20),
  cpf_cnpj: z.string().trim().max(20),
  cep: z.string().trim().max(9),
  endereco: z.string().trim().max(200),
  numero: z.string().trim().max(10),
  complemento: z.string().trim().max(100),
  bairro: z.string().trim().max(100),
  cidade: z.string().trim().max(100),
  estado: z.string().trim().max(2),
  observacoes: z.string().trim().max(1000),
});
type F = z.infer<typeof schema>;
const blank: F = { nome: "", telefone: "", whatsapp: "", cpf_cnpj: "", cep: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", observacoes: "" };

export function ClienteDialog({ open, onOpenChange, cliente, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; cliente?: Cliente; onSaved: () => void }) {
  const [f, setF] = useState<F>(blank);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setF(cliente ? (Object.fromEntries(Object.keys(blank).map((k) => [k, (cliente as Record<string, unknown>)[k] ?? ""])) as F) : blank);
  }, [open, cliente]);
  const bind = (k: keyof F) => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value }) });

  async function buscarCep() {
    const cep = f.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const r = await (await fetch(`https://viacep.com.br/ws/${cep}/json/`)).json();
      if (!r.erro) setF((p) => ({ ...p, endereco: r.logradouro || p.endereco, bairro: r.bairro || p.bairro, cidade: r.localidade || p.cidade, estado: r.uf || p.estado }));
    } catch { /* CEP opcional */ }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse(f);
    if (!p.success) return toast.error(p.error.issues[0].message);
    const v = p.data;
    const whatsapp = normalizarWhatsapp(v.whatsapp || v.telefone);
    const row = { ...v, whatsapp: whatsapp || null, cpf_cnpj: v.cpf_cnpj.replace(/\D/g, "") || null, estado: v.estado.toUpperCase() };
    setBusy(true);
    const { error } = cliente ? await supabase.from("clientes").update(row).eq("id", cliente.id) : await supabase.from("clientes").insert(row);
    setBusy(false);
    if (error) return toast.error(error.code === "23505" ? "Já existe um cliente com este WhatsApp ou CPF/CNPJ." : error.message);
    toast.success("Cliente salvo.");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{cliente ? `Editar cliente (cód. ${cliente.codigo})` : "Novo cliente"}</DialogTitle></DialogHeader>
        <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-6">
          <Field label="Nome completo" required className="sm:col-span-6"><Input {...bind("nome")} /></Field>
          <Field label="Telefone" className="sm:col-span-2"><Input {...bind("telefone")} placeholder="(11) 3333-4444" /></Field>
          <Field label="WhatsApp" className="sm:col-span-2"><Input {...bind("whatsapp")} placeholder="(11) 98888-7777" /></Field>
          <Field label="CPF/CNPJ" className="sm:col-span-2"><Input {...bind("cpf_cnpj")} /></Field>
          <Field label="CEP" className="sm:col-span-2"><Input {...bind("cep")} onBlur={buscarCep} /></Field>
          <Field label="Endereço" className="sm:col-span-3"><Input {...bind("endereco")} /></Field>
          <Field label="Número" className="sm:col-span-1"><Input {...bind("numero")} /></Field>
          <Field label="Complemento" className="sm:col-span-2"><Input {...bind("complemento")} /></Field>
          <Field label="Bairro" className="sm:col-span-2"><Input {...bind("bairro")} /></Field>
          <Field label="Cidade" className="sm:col-span-1"><Input {...bind("cidade")} /></Field>
          <Field label="UF" className="sm:col-span-1"><Input {...bind("estado")} maxLength={2} /></Field>
          <Field label="Observações" className="sm:col-span-6"><Textarea rows={2} {...bind("observacoes")} /></Field>
          <div className="flex justify-end gap-2 sm:col-span-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
