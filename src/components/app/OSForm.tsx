import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, Panel, selectCls } from "./ui-bits";
import { useAuth } from "@/lib/auth";
import {
  brl,
  calcularTotal,
  calcularVencimento,
  dataBR,
  FORMAS_PAGAMENTO,
  hojeISO,
  STATUS_SERVICO,
  TIPO_EQUIPAMENTO,
  type StatusServico,
  type TipoEquipamento,
} from "@/lib/format";
import { listarTecnicos, type OS } from "@/lib/os-data";

type ItemDraft = { descricao: string; quantidade: number; valor_unitario: number };

const empty = {
  cliente_id: "",
  data_solicitacao: hojeISO(),
  data_atendimento: "",
  data_conclusao: "",
  tecnico_responsavel_id: "",
  tipo_equipamento: "maquina_lavar" as TipoEquipamento,
  marca: "",
  modelo: "",
  numero_serie: "",
  estado_conservacao: "",
  acessorios: "",
  problema_relatado: "",
  diagnostico: "",
  servico_executado: "",
  observacoes: "",
  valor_mao_obra: 0,
  valor_deslocamento: 0,
  desconto: 0,
  forma_pagamento: "",
  valor_recebido: 0,
  data_pagamento: "",
  status_servico: "solicitado" as StatusServico,
  prazo_garantia_dias: 90,
  pecas_garantia: "",
  condicoes_garantia: "",
};
type Form = typeof empty;

export function OSForm({ existing, duplicarDe }: { existing?: OS; duplicarDe?: OS }) {
  const nav = useNavigate();
  const { canFinance } = useAuth();
  const [f, setF] = useState<Form>(empty);
  const [itens, setItens] = useState<ItemDraft[]>([]);
  const [busy, setBusy] = useState(false);

  const clientes = useQuery({
    queryKey: ["clientes-min"],
    queryFn: async () => (await supabase.from("clientes").select("id,codigo,nome,whatsapp").order("nome")).data ?? [],
  });
  const tecnicos = useQuery({ queryKey: ["tecnicos"], queryFn: listarTecnicos });
  const cfg = useQuery({
    queryKey: ["config"],
    queryFn: async () => (await supabase.from("configuracoes_empresa").select("*").eq("id", 1).single()).data,
  });

  useEffect(() => {
    const src = existing ?? duplicarDe;
    if (!src) {
      if (cfg.data) setF((p) => ({ ...p, prazo_garantia_dias: cfg.data!.garantia_padrao_dias }));
      return;
    }
    const s = src;
    setF({
      cliente_id: s.cliente_id,
      data_solicitacao: existing ? s.data_solicitacao : hojeISO(),
      data_atendimento: existing ? (s.data_atendimento ?? "") : "",
      data_conclusao: existing ? (s.data_conclusao ?? "") : "",
      tecnico_responsavel_id: s.tecnico_responsavel_id ?? "",
      tipo_equipamento: s.tipo_equipamento,
      marca: s.marca,
      modelo: s.modelo,
      numero_serie: s.numero_serie ?? "",
      estado_conservacao: s.estado_conservacao ?? "",
      acessorios: s.acessorios ?? "",
      problema_relatado: s.problema_relatado,
      diagnostico: existing ? (s.diagnostico ?? "") : "",
      servico_executado: existing ? (s.servico_executado ?? "") : "",
      observacoes: s.observacoes ?? "",
      valor_mao_obra: existing ? Number(s.valor_mao_obra) : 0,
      valor_deslocamento: existing ? Number(s.valor_deslocamento) : 0,
      desconto: existing ? Number(s.desconto) : 0,
      forma_pagamento: existing ? (s.forma_pagamento ?? "") : "",
      valor_recebido: existing ? Number(s.valor_recebido) : 0,
      data_pagamento: existing ? (s.data_pagamento ?? "") : "",
      status_servico: existing ? s.status_servico : "solicitado",
      prazo_garantia_dias: s.prazo_garantia_dias,
      pecas_garantia: s.pecas_garantia ?? "",
      condicoes_garantia: s.condicoes_garantia ?? "",
    });
    if (existing) {
      supabase
        .from("itens_ordem_servico")
        .select("*")
        .eq("ordem_servico_id", existing.id)
        .then(({ data }) =>
          setItens((data ?? []).map((i) => ({ descricao: i.descricao, quantidade: Number(i.quantidade), valor_unitario: Number(i.valor_unitario) }))),
        );
    }
  }, [existing, duplicarDe, cfg.data]);

  const valorPecas = useMemo(
    () => Math.round(itens.reduce((a, i) => a + i.quantidade * i.valor_unitario, 0) * 100) / 100,
    [itens],
  );
  const total = calcularTotal({ valor_pecas: valorPecas, valor_mao_obra: f.valor_mao_obra, valor_deslocamento: f.valor_deslocamento, desconto: f.desconto });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const num = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Math.max(0, Number(e.target.value || 0)) as never);

  const concluir = f.status_servico === "concluido";
  const inicioGar = f.data_conclusao || hojeISO();

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.cliente_id) return toast.error("Selecione o cliente.");
    if (!f.problema_relatado.trim()) return toast.error("Informe o problema relatado pelo cliente.");
    if (f.desconto > valorPecas + f.valor_mao_obra + f.valor_deslocamento) return toast.error("Desconto maior que a soma dos valores.");
    if (concluir) {
      const faltando = [
        !f.diagnostico.trim() && "diagnóstico",
        !f.servico_executado.trim() && "serviço executado",
        !f.marca.trim() && "marca",
        !f.modelo.trim() && "modelo",
        !f.tecnico_responsavel_id && "técnico responsável",
      ].filter(Boolean);
      if (faltando.length) return toast.error(`Para concluir, preencha: ${faltando.join(", ")}.`);
    }
    setBusy(true);
    const payload = {
      cliente_id: f.cliente_id,
      data_solicitacao: f.data_solicitacao,
      data_atendimento: f.data_atendimento || null,
      data_conclusao: f.data_conclusao || (concluir ? hojeISO() : null),
      tecnico_responsavel_id: f.tecnico_responsavel_id || null,
      tipo_equipamento: f.tipo_equipamento,
      marca: f.marca.trim(),
      modelo: f.modelo.trim(),
      numero_serie: f.numero_serie || null,
      estado_conservacao: f.estado_conservacao || null,
      acessorios: f.acessorios || null,
      problema_relatado: f.problema_relatado.trim(),
      diagnostico: f.diagnostico || null,
      servico_executado: f.servico_executado || null,
      observacoes: f.observacoes || null,
      valor_pecas: valorPecas,
      valor_mao_obra: f.valor_mao_obra,
      valor_deslocamento: f.valor_deslocamento,
      desconto: f.desconto,
      status_servico: f.status_servico,
      prazo_garantia_dias: f.prazo_garantia_dias,
      pecas_garantia: f.pecas_garantia || null,
      condicoes_garantia: f.condicoes_garantia || null,
      ...(canFinance
        ? { forma_pagamento: f.forma_pagamento || null, valor_recebido: f.valor_recebido, data_pagamento: f.data_pagamento || null }
        : {}),
    };
    try {
      let id = existing?.id;
      if (existing) {
        const { error } = await supabase.from("ordens_servico").update(payload).eq("id", existing.id);
        if (error) throw error;
        const del = await supabase.from("itens_ordem_servico").delete().eq("ordem_servico_id", existing.id);
        if (del.error) throw del.error;
      } else {
        const { data, error } = await supabase.from("ordens_servico").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const valid = itens.filter((i) => i.descricao.trim());
      if (valid.length) {
        const { error } = await supabase.from("itens_ordem_servico").insert(valid.map((i) => ({ ...i, ordem_servico_id: id! })));
        if (error) throw error;
      }
      toast.success(existing ? "Ordem de serviço atualizada." : "Ordem de serviço criada.");
      nav({ to: "/os/$id", params: { id: id! } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-5">
      <Panel title="Identificação">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Cliente" required className="sm:col-span-2">
            <select className={selectCls} value={f.cliente_id} onChange={(e) => set("cliente_id", e.target.value)}>
              <option value="">Selecione...</option>
              {clientes.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} — {c.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Técnico responsável">
            <select className={selectCls} value={f.tecnico_responsavel_id} onChange={(e) => set("tecnico_responsavel_id", e.target.value)}>
              <option value="">—</option>
              {tecnicos.data?.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Status do serviço">
            <select className={selectCls} value={f.status_servico} onChange={(e) => set("status_servico", e.target.value as StatusServico)}>
              {Object.entries(STATUS_SERVICO).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Data da solicitação" required>
            <Input type="date" value={f.data_solicitacao} onChange={(e) => set("data_solicitacao", e.target.value)} required />
          </Field>
          <Field label="Data do atendimento">
            <Input type="date" value={f.data_atendimento} onChange={(e) => set("data_atendimento", e.target.value)} />
          </Field>
          <Field label="Data de conclusão">
            <Input type="date" value={f.data_conclusao} onChange={(e) => set("data_conclusao", e.target.value)} />
          </Field>
        </div>
      </Panel>

      <Panel title="Equipamento">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Tipo" required>
            <select className={selectCls} value={f.tipo_equipamento} onChange={(e) => set("tipo_equipamento", e.target.value as TipoEquipamento)}>
              {Object.entries(TIPO_EQUIPAMENTO).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Marca" required={concluir}>
            <Input value={f.marca} onChange={(e) => set("marca", e.target.value)} maxLength={60} />
          </Field>
          <Field label="Modelo" required={concluir}>
            <Input value={f.modelo} onChange={(e) => set("modelo", e.target.value)} maxLength={60} />
          </Field>
          <Field label="Nº de série">
            <Input value={f.numero_serie} onChange={(e) => set("numero_serie", e.target.value)} maxLength={60} />
          </Field>
          <Field label="Estado de conservação" className="sm:col-span-2">
            <Input value={f.estado_conservacao} onChange={(e) => set("estado_conservacao", e.target.value)} maxLength={200} />
          </Field>
          <Field label="Acessórios recebidos" className="sm:col-span-2">
            <Input value={f.acessorios} onChange={(e) => set("acessorios", e.target.value)} maxLength={200} />
          </Field>
        </div>
      </Panel>

      <Panel title="Atendimento técnico">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Problema relatado pelo cliente" required>
            <Textarea rows={3} value={f.problema_relatado} onChange={(e) => set("problema_relatado", e.target.value)} maxLength={2000} />
          </Field>
          <Field label="Diagnóstico técnico" required={concluir}>
            <Textarea rows={3} value={f.diagnostico} onChange={(e) => set("diagnostico", e.target.value)} maxLength={2000} />
          </Field>
          <Field label="Serviço executado" required={concluir}>
            <Textarea rows={3} value={f.servico_executado} onChange={(e) => set("servico_executado", e.target.value)} maxLength={2000} />
          </Field>
          <Field label="Observações técnicas">
            <Textarea rows={3} value={f.observacoes} onChange={(e) => set("observacoes", e.target.value)} maxLength={2000} />
          </Field>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Peças utilizadas</span>
            <Button type="button" size="sm" variant="outline" onClick={() => setItens([...itens, { descricao: "", quantidade: 1, valor_unitario: 0 }])}>
              <Plus /> Adicionar peça
            </Button>
          </div>
          {itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma peça adicionada.</p>}
          <div className="space-y-2">
            {itens.map((it, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_70px_110px_auto] items-center gap-2">
                <Input placeholder="Descrição da peça" value={it.descricao} onChange={(e) => setItens(itens.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))} />
                <Input type="number" min={1} step="1" value={it.quantidade} onChange={(e) => setItens(itens.map((x, j) => (j === i ? { ...x, quantidade: Math.max(1, Number(e.target.value)) } : x)))} />
                <Input type="number" min={0} step="0.01" value={it.valor_unitario} onChange={(e) => setItens(itens.map((x, j) => (j === i ? { ...x, valor_unitario: Math.max(0, Number(e.target.value)) } : x)))} />
                <Button type="button" variant="ghost" size="icon" onClick={() => setItens(itens.filter((_, j) => j !== i))} aria-label="Remover peça">
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Valores">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Peças (soma automática)">
              <Input value={brl(valorPecas)} readOnly className="bg-muted" />
            </Field>
            <Field label="Mão de obra (R$)">
              <Input type="number" min={0} step="0.01" value={f.valor_mao_obra} onChange={num("valor_mao_obra")} />
            </Field>
            <Field label="Deslocamento (R$)">
              <Input type="number" min={0} step="0.01" value={f.valor_deslocamento} onChange={num("valor_deslocamento")} />
            </Field>
            <Field label="Desconto (R$)">
              <Input type="number" min={0} step="0.01" value={f.desconto} onChange={num("desconto")} />
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-gradient-navy px-4 py-3 text-navy-foreground">
            <span className="text-sm font-semibold">Valor total</span>
            <span className="font-display text-2xl font-bold">{brl(total)}</span>
          </div>
          {canFinance ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Forma de pagamento">
                <select className={selectCls} value={f.forma_pagamento} onChange={(e) => set("forma_pagamento", e.target.value)}>
                  <option value="">—</option>
                  {FORMAS_PAGAMENTO.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Valor recebido (R$)">
                <Input type="number" min={0} step="0.01" value={f.valor_recebido} onChange={num("valor_recebido")} />
              </Field>
              <Field label="Data do pagamento">
                <Input type="date" value={f.data_pagamento} onChange={(e) => set("data_pagamento", e.target.value)} />
              </Field>
              <p className="text-xs text-muted-foreground sm:col-span-3">Saldo pendente: {brl(Math.max(0, total - f.valor_recebido))}. A situação (pendente, parcial ou pago) é calculada automaticamente.</p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Pagamentos são registrados pelo atendimento ou administrador.</p>
          )}
        </Panel>

        <Panel title="Garantia">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prazo de garantia (dias)" required>
              <Input type="number" min={0} value={f.prazo_garantia_dias} onChange={(e) => set("prazo_garantia_dias", Math.max(0, Number(e.target.value)))} />
            </Field>
            <Field label="Válida até (previsão)">
              <Input readOnly className="bg-muted" value={dataBR(calcularVencimento(inicioGar, f.prazo_garantia_dias))} />
            </Field>
            <Field label="Peças abrangidas" className="sm:col-span-2">
              <Input value={f.pecas_garantia} onChange={(e) => set("pecas_garantia", e.target.value)} placeholder="Ex.: bomba de drenagem substituída" maxLength={300} />
            </Field>
            <Field label="Condições específicas (opcional)" className="sm:col-span-2">
              <Textarea rows={3} value={f.condicoes_garantia} onChange={(e) => set("condicoes_garantia", e.target.value)} placeholder="Em branco, usa as condições padrão da empresa." maxLength={2000} />
            </Field>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">A garantia é registrada ao concluir a OS, começa na data de conclusão e cobre somente o serviço e as peças descritos.</p>
        </Panel>
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="button" variant="outline" onClick={() => history.back()}>Cancelar</Button>
        <Button type="submit" size="lg" disabled={busy}>{busy ? "Salvando..." : "Salvar ordem de serviço"}</Button>
      </div>
    </form>
  );
}
