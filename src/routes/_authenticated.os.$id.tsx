import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Copy, Download, Eye, FileText, MessageCircle, Pencil, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Empty, GarantiaBadge, PageHeader, Panel, StatusPagamentoBadge, StatusServicoBadge } from "@/components/app/ui-bits";
import { brl, dataBR, dataHoraBR, formatarTelefone, normalizarWhatsapp, situacaoGarantia, TIPO_EQUIPAMENTO } from "@/lib/format";
import { carregarOS } from "@/lib/os-data";
import { gerarPdfOS, mensagemWhatsapp, nomeArquivoPDF } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/os/$id")({
  head: () => ({ meta: [{ title: "Ordem de serviço — Manancial Máquinas" }] }),
  component: Detalhe,
});

function Info({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm">{v || "—"}</dd>
    </div>
  );
}

function Detalhe() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const d = useQuery({ queryKey: ["os", id], queryFn: () => carregarOS(id) });
  const docs = useQuery({
    queryKey: ["docs", id],
    queryFn: async () => (await supabase.from("documentos_servico").select("*").eq("ordem_servico_id", id).order("versao", { ascending: false })).data ?? [],
  });
  const envios = useQuery({
    queryKey: ["envios", id],
    queryFn: async () => (await supabase.from("historico_envios").select("*").eq("ordem_servico_id", id).order("data_envio", { ascending: false })).data ?? [],
  });
  const audit = useQuery({
    queryKey: ["audit", id],
    queryFn: async () => (await supabase.from("auditoria").select("id,acao,created_at,usuario_id,dados_antes,dados_depois").eq("registro_id", id).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [msg, setMsg] = useState("");
  const [waOpen, setWaOpen] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  if (d.isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (d.error || !d.data) return <Empty>Ordem de serviço não encontrada.</Empty>;
  const { os, cliente, itens, garantia, tecnico } = d.data;
  const numero = String(os.numero_os).padStart(5, "0");
  const ultimo = docs.data?.[0];
  const fone = normalizarWhatsapp(cliente.whatsapp || cliente.telefone);

  async function visualizar() {
    const blob = await gerarPdfOS(d.data!, { versao: (ultimo?.versao ?? 0) + 1, rascunho: true });
    setPreview(URL.createObjectURL(blob));
  }

  async function emitir() {
    if (os.status_servico !== "concluido") return toast.error("Conclua a ordem de serviço antes de emitir o comprovante definitivo.");
    if (ultimo && !motivo.trim()) return toast.error("Informe o motivo da nova versão (correção ou segunda via).");
    setBusy(true);
    try {
      const fresh = await carregarOS(id);
      const versao = (ultimo?.versao ?? 0) + 1;
      const blob = await gerarPdfOS(fresh, { versao });
      const path = `${id}/${nomeArquivoPDF(fresh.os.numero_os, versao)}`;
      const up = await supabase.storage.from("documentos").upload(path, blob, { contentType: "application/pdf" });
      if (up.error) throw up.error;
      const ins = await supabase.from("documentos_servico").insert({ ordem_servico_id: id, versao, arquivo_path: path, motivo: motivo || (versao === 1 ? "Emissão original" : null) });
      if (ins.error) throw ins.error;
      setMotivo("");
      toast.success(`PDF versão ${versao} gerado e arquivado.`);
      qc.invalidateQueries({ queryKey: ["docs", id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function baixarArquivo(path: string) {
    const { data, error } = await supabase.storage.from("documentos").download(path);
    if (error) throw error;
    return new File([data], path.split("/").pop()!, { type: "application/pdf" });
  }

  async function baixar(path: string) {
    try {
      const f = await baixarArquivo(path);
      const url = URL.createObjectURL(f);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function registrar(canal: string, status: string, erro?: string) {
    await supabase.from("historico_envios").insert({
      ordem_servico_id: id, cliente_id: cliente.id, documento_id: ultimo?.id ?? null,
      canal, destinatario: fone, status_envio: status, mensagem_erro: erro ?? null,
    });
    qc.invalidateQueries({ queryKey: ["envios", id] });
  }

  function abrirWhatsapp() {
    if (!ultimo) return toast.error("Gere o PDF do serviço antes de enviar.");
    if (!fone) return toast.error("O cliente não tem WhatsApp/telefone cadastrado.");
    setMsg(mensagemWhatsapp(d.data!));
    setWaOpen(true);
  }

  async function compartilharArquivo() {
    try {
      const file = await baixarArquivo(ultimo!.arquivo_path);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: msg, title: `OS ${numero}` });
        await registrar("compartilhamento_dispositivo", "compartilhado_pelo_usuario");
        toast.success("Escolha o WhatsApp e o contato do cliente na tela de compartilhamento.");
      } else {
        await baixar(ultimo!.arquivo_path);
        window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msg)}`, "_blank");
        await registrar("whatsapp_manual", "aberto_anexar_manualmente");
        toast.info("Seu navegador não permite anexar automaticamente. O PDF foi baixado: anexe-o na conversa que abriu.", { duration: 9000 });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      await registrar("compartilhamento_dispositivo", "erro", (e as Error).message);
      toast.error((e as Error).message);
    }
  }

  async function duplicar() {
    window.location.href = `/os/nova?duplicar=${id}`;
  }

  const sitGar = garantia ? situacaoGarantia(garantia.data_vencimento!) : null;

  return (
    <>
      <PageHeader
        title={`OS Nº ${numero}`}
        subtitle={`${cliente.nome} • ${TIPO_EQUIPAMENTO[os.tipo_equipamento]} ${os.marca} ${os.modelo}`}
        actions={
          <>
            <Button asChild variant="outline"><Link to="/os/editar/$id" params={{ id }}><Pencil /> Editar</Link></Button>
            <Button variant="outline" onClick={duplicar}><Copy /> Duplicar</Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 rounded-xl bg-gradient-navy p-4 text-navy-foreground shadow-card sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <StatusServicoBadge s={os.status_servico} />
          <StatusPagamentoBadge s={os.status_pagamento} />
          {sitGar && <GarantiaBadge s={sitGar} />}
          <span className="ml-1 font-display text-2xl font-bold">{brl(os.valor_total)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={visualizar}><Eye /> Pré-visualizar</Button>
          <Button variant="accent" size="lg" onClick={emitir} disabled={busy}><FileText /> {busy ? "Gerando..." : ultimo ? "GERAR NOVA VERSÃO / 2ª VIA" : "GERAR PDF DO SERVIÇO"}</Button>
          <Button variant="whatsapp" size="lg" onClick={abrirWhatsapp}><MessageCircle /> ENVIAR PDF PELO WHATSAPP</Button>
        </div>
      </div>
      {ultimo && (
        <div className="mb-5">
          <Textarea rows={2} placeholder="Motivo da nova versão (ex.: segunda via, correção do valor) — obrigatório para emitir outra versão" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Cliente e equipamento">
            <dl className="grid gap-4 sm:grid-cols-3">
              <Info k="Cliente" v={<Link to="/clientes/$id" params={{ id: cliente.id }} className="text-primary hover:underline">{cliente.nome}</Link>} />
              <Info k="WhatsApp" v={formatarTelefone(cliente.whatsapp || cliente.telefone)} />
              <Info k="Técnico" v={tecnico} />
              <Info k="Solicitação" v={dataBR(os.data_solicitacao)} />
              <Info k="Atendimento" v={dataBR(os.data_atendimento)} />
              <Info k="Conclusão" v={dataBR(os.data_conclusao)} />
              <Info k="Nº de série" v={os.numero_serie} />
              <Info k="Conservação" v={os.estado_conservacao} />
              <Info k="Acessórios" v={os.acessorios} />
            </dl>
          </Panel>
          <Panel title="Relatório técnico">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Info k="Problema relatado" v={os.problema_relatado} />
              <Info k="Diagnóstico" v={os.diagnostico} />
              <Info k="Serviço executado" v={os.servico_executado} />
              <Info k="Observações" v={os.observacoes} />
            </dl>
            {itens.length > 0 && (
              <table className="mt-4 w-full text-sm">
                <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-2">Peça</th><th>Qtd.</th><th className="text-right">Total</th></tr></thead>
                <tbody>{itens.map((i) => <tr key={i.id} className="border-b"><td className="py-2">{i.descricao}</td><td>{Number(i.quantidade)}</td><td className="text-right">{brl(i.valor_total)}</td></tr>)}</tbody>
              </table>
            )}
          </Panel>
          <Panel title="Histórico de alterações">
            {(audit.data ?? []).length === 0 ? <Empty>Sem registros.</Empty> : (
              <ul className="space-y-2 text-sm">
                {audit.data!.map((a) => {
                  const antes = (a.dados_antes ?? {}) as Record<string, unknown>;
                  const depois = (a.dados_depois ?? {}) as Record<string, unknown>;
                  const campos = a.acao === "UPDATE" ? Object.keys(depois).filter((k) => k !== "updated_at" && JSON.stringify(antes[k]) !== JSON.stringify(depois[k])) : [];
                  return (
                    <li key={a.id} className="rounded-md bg-muted px-3 py-2">
                      <span className="font-semibold">{a.acao === "INSERT" ? "Criada" : a.acao === "UPDATE" ? "Alterada" : "Excluída"}</span> em {dataHoraBR(a.created_at)}
                      {campos.length > 0 && <span className="text-muted-foreground"> — {campos.join(", ")}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Financeiro">
            <dl className="grid grid-cols-2 gap-3">
              <Info k="Peças" v={brl(os.valor_pecas)} />
              <Info k="Mão de obra" v={brl(os.valor_mao_obra)} />
              <Info k="Deslocamento" v={brl(os.valor_deslocamento)} />
              <Info k="Desconto" v={brl(os.desconto)} />
              <Info k="Recebido" v={brl(os.valor_recebido)} />
              <Info k="Saldo" v={brl(Math.max(0, Number(os.valor_total) - Number(os.valor_recebido)))} />
              <Info k="Forma" v={os.forma_pagamento} />
              <Info k="Pago em" v={dataBR(os.data_pagamento)} />
            </dl>
          </Panel>
          <Panel title="Garantia">
            {garantia ? (
              <dl className="grid grid-cols-2 gap-3">
                <Info k="Prazo" v={`${garantia.prazo_dias} dias`} />
                <Info k="Válida até" v={dataBR(garantia.data_vencimento)} />
                <Info k="Cobertura" v={garantia.descricao_cobertura} />
                <Info k="Peças" v={garantia.pecas_cobertas} />
              </dl>
            ) : <p className="text-sm text-muted-foreground">Registrada automaticamente ao concluir a OS ({os.prazo_garantia_dias} dias).</p>}
          </Panel>
          <Panel title="Documentos emitidos">
            {(docs.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nenhum PDF emitido.</p> : (
              <ul className="space-y-2">
                {docs.data!.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-semibold">Versão {doc.versao}</div>
                      <div className="truncate text-xs text-muted-foreground">{dataHoraBR(doc.data_emissao)} {doc.motivo && `• ${doc.motivo}`}</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => baixar(doc.arquivo_path)} aria-label="Baixar"><Download /></Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Envios">
            {(envios.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nenhum envio registrado.</p> : (
              <ul className="space-y-1 text-xs">
                {envios.data!.map((e) => <li key={e.id}>{dataHoraBR(e.data_envio)} • {e.canal} • {e.status_envio}{e.mensagem_erro && ` — ${e.mensagem_erro}`}</li>)}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Pré-visualização do PDF</DialogTitle></DialogHeader>
          {preview && <iframe src={preview} title="PDF" className="h-[70vh] w-full rounded-md border" />}
        </DialogContent>
      </Dialog>

      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Enviar comprovante para {cliente.nome}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">WhatsApp: {formatarTelefone(fone)} • PDF versão {ultimo?.versao}</p>
          <Textarea rows={12} value={msg} onChange={(e) => setMsg(e.target.value)} />
          <Button variant="whatsapp" size="lg" onClick={compartilharArquivo}><Share2 /> Compartilhar PDF + mensagem</Button>
          <p className="text-xs text-muted-foreground">
            No celular, abre a tela de compartilhamento com o arquivo anexado — escolha o WhatsApp e o cliente. No computador, o PDF é baixado e a conversa abre com a mensagem; anexe o arquivo manualmente. O envio automático sem intervenção exige conectar a conta WhatsApp Business oficial (ainda não configurado).
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
