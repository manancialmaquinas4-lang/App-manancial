import type { Database } from "@/integrations/supabase/types";

export type StatusServico = Database["public"]["Enums"]["status_servico"];
export type StatusPagamento = Database["public"]["Enums"]["status_pagamento"];
export type TipoEquipamento = Database["public"]["Enums"]["tipo_equipamento"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const STATUS_SERVICO: Record<StatusServico, string> = {
  solicitado: "Solicitado",
  agendado: "Agendado",
  em_diagnostico: "Em diagnóstico",
  aguardando_aprovacao: "Aguardando aprovação",
  aguardando_peca: "Aguardando peça",
  em_execucao: "Em execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
export const STATUS_PAGAMENTO: Record<StatusPagamento, string> = {
  pendente: "Pendente",
  parcial: "Parcialmente pago",
  pago: "Pago",
};
export const TIPO_EQUIPAMENTO: Record<TipoEquipamento, string> = {
  maquina_lavar: "Máquina de lavar",
  lava_seca: "Lava e seca",
  lava_loucas: "Lava-louças",
};
export const ROLES: Record<AppRole, string> = {
  admin: "Administrador",
  tecnico: "Técnico",
  atendimento: "Atendimento",
};
export const FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Cartão", "Transferência", "Outro"];

export const brl = (v: number | string | null | undefined) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Formata "AAAA-MM-DD" ou ISO em DD/MM/AAAA sem deslocamento de fuso. */
export function dataBR(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}
export const dataHoraBR = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("pt-BR") : "—";

export const hojeISO = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

/** Normaliza telefone para padrão WhatsApp (somente dígitos, com DDI 55). */
export function normalizarWhatsapp(tel: string | null | undefined) {
  const d = (tel ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("55") && d.length >= 12) return d;
  return `55${d}`;
}
export function formatarTelefone(tel: string | null | undefined) {
  let d = (tel ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel ?? "";
}

/** Valor total = peças + mão de obra + deslocamento − desconto */
export function calcularTotal(v: {
  valor_pecas: number;
  valor_mao_obra: number;
  valor_deslocamento: number;
  desconto: number;
}) {
  return (
    Math.round(
      (Number(v.valor_pecas) + Number(v.valor_mao_obra) + Number(v.valor_deslocamento) - Number(v.desconto)) * 100,
    ) / 100
  );
}

/** Vencimento = data de início + prazo em dias (mesma regra do banco). */
export function calcularVencimento(inicioISO: string, prazoDias: number) {
  const [y = 0, m = 1, d = 1] = inicioISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + prazoDias));
  return dt.toISOString().slice(0, 10);
}

export type SituacaoGarantia = "vigente" | "vencendo" | "vencida";
export function situacaoGarantia(vencimentoISO: string, hoje = hojeISO()): SituacaoGarantia {
  if (vencimentoISO < hoje) return "vencida";
  if (calcularVencimento(hoje, 15) >= vencimentoISO) return "vencendo";
  return "vigente";
}
