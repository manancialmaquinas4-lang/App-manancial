import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type OS = Database["public"]["Tables"]["ordens_servico"]["Row"];
export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
export type Item = Database["public"]["Tables"]["itens_ordem_servico"]["Row"];
export type Garantia = Database["public"]["Tables"]["garantias"]["Row"];
export type Config = Database["public"]["Tables"]["configuracoes_empresa"]["Row"];

export type OSCompleta = {
  os: OS;
  cliente: Cliente;
  itens: Item[];
  garantia: Garantia | null;
  config: Config;
  tecnico: string | null;
};

export async function carregarOS(id: string): Promise<OSCompleta> {
  const { data: os, error } = await supabase.from("ordens_servico").select("*").eq("id", id).single();
  if (error) throw error;
  const [cli, itens, gar, cfg, tec] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", os.cliente_id).single(),
    supabase.from("itens_ordem_servico").select("*").eq("ordem_servico_id", id),
    supabase.from("garantias").select("*").eq("ordem_servico_id", id).maybeSingle(),
    supabase.from("configuracoes_empresa").select("*").eq("id", 1).single(),
    os.tecnico_responsavel_id
      ? supabase.from("profiles").select("nome").eq("id", os.tecnico_responsavel_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (cli.error) throw cli.error;
  if (cfg.error) throw cfg.error;
  return {
    os,
    cliente: cli.data,
    itens: itens.data ?? [],
    garantia: gar.data ?? null,
    config: cfg.data,
    tecnico: (tec.data as { nome: string } | null)?.nome ?? null,
  };
}

export async function listarTecnicos() {
  const { data } = await supabase.from("profiles").select("id,nome,ativo").eq("ativo", true).order("nome");
  return data ?? [];
}
