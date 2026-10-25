import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "@/assets/logo-manancial.png";
import { brl, dataBR, formatarTelefone, STATUS_PAGAMENTO, TIPO_EQUIPAMENTO } from "./format";
import type { OSCompleta } from "./os-data";

const NAVY: [number, number, number] = [22, 38, 99];
const BLUE: [number, number, number] = [30, 90, 200];
const GRAY: [number, number, number] = [90, 100, 120];

let logoCache: string | null = null;
async function logoDataUrl() {
  if (logoCache) return logoCache;
  const blob = await (await fetch(logoUrl)).blob();
  logoCache = await new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(blob);
  });
  return logoCache;
}

export const nomeArquivoPDF = (numero: number, versao: number) =>
  `OS-${String(numero).padStart(5, "0")}-v${versao}.pdf`;

export async function gerarPdfOS(d: OSCompleta, opts: { versao: number; rascunho?: boolean }) {
  const { os, cliente, itens, garantia, config, tecnico } = d;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const numero = String(os.numero_os).padStart(5, "0");

  // Cabeçalho
  const logo = await logoDataUrl();
  doc.addImage(logo, "PNG", M, 10, 46, 24);
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...NAVY);
  doc.text(config.nome, W - M, 15, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...GRAY);
  const contatos = [
    config.cnpj && `CNPJ: ${config.cnpj}`,
    [config.telefone && `Tel: ${formatarTelefone(config.telefone)}`, config.whatsapp && `WhatsApp: ${formatarTelefone(config.whatsapp)}`]
      .filter(Boolean)
      .join("  •  "),
    config.email,
    config.endereco,
  ].filter(Boolean) as string[];
  contatos.forEach((c, i) => doc.text(c, W - M, 20 + i * 4, { align: "right" }));

  doc.setFillColor(...NAVY).rect(M, 38, W - 2 * M, 12, "F");
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(10.5);
  doc.text("ORDEM DE SERVIÇO / COMPROVANTE DE SERVIÇO PRESTADO", M + 3, 45.5);
  doc.setFontSize(10).text(`OS Nº ${numero}`, W - M - 3, 45.5, { align: "right" });
  doc.setTextColor(...GRAY).setFont("helvetica", "normal").setFontSize(8);
  doc.text(
    `Emissão: ${new Date().toLocaleDateString("pt-BR")}   •   Versão ${opts.versao}${opts.rascunho ? "   •   PRÉ-VISUALIZAÇÃO" : ""}`,
    M,
    55,
  );

  let y = 59;
  const section = (title: string) => {
    if (y > 260) {
      doc.addPage();
      y = 18;
    }
    doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(...BLUE);
    doc.text(title.toUpperCase(), M, y + 4);
    doc.setDrawColor(...BLUE).setLineWidth(0.3).line(M, y + 5.5, W - M, y + 5.5);
    y += 7;
  };
  const kv = (rows: [string, string][]) => {
    autoTable(doc, {
      startY: y,
      body: rows,
      theme: "plain",
      margin: { left: M, right: M },
      styles: { fontSize: 8.8, cellPadding: 1.2, textColor: [30, 35, 50] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 42, textColor: NAVY } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
  };

  section("Dados do cliente");
  const end = [cliente.endereco, cliente.numero, cliente.complemento, cliente.bairro, cliente.cidade && `${cliente.cidade}/${cliente.estado ?? ""}`]
    .filter(Boolean)
    .join(", ");
  kv([
    ["Nome", cliente.nome],
    ["Telefone", formatarTelefone(cliente.whatsapp || cliente.telefone) || "—"],
    ...(end ? ([["Endereço", end]] as [string, string][]) : []),
  ]);

  section("Dados do equipamento");
  kv([
    ["Tipo", TIPO_EQUIPAMENTO[os.tipo_equipamento]],
    ["Marca / Modelo", `${os.marca} ${os.modelo}`.trim() || "—"],
    ...(os.numero_serie ? ([["Nº de série", os.numero_serie]] as [string, string][]) : []),
  ]);

  section("Relatório técnico");
  kv([
    ["Reclamação inicial", os.problema_relatado || "—"],
    ["Diagnóstico", os.diagnostico || "—"],
    ["Serviço executado", os.servico_executado || "—"],
    ["Observações técnicas", os.observacoes || "—"],
  ]);
  if (itens.length) {
    autoTable(doc, {
      startY: y,
      head: [["Peça utilizada", "Qtd.", "Valor unit.", "Total"]],
      body: itens.map((i) => [i.descricao, String(Number(i.quantidade)), brl(i.valor_unitario), brl(i.valor_total)]),
      margin: { left: M, right: M },
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: NAVY },
      columnStyles: { 1: { halign: "center", cellWidth: 16 }, 2: { halign: "right", cellWidth: 28 }, 3: { halign: "right", cellWidth: 28 } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
  }

  section("Resumo financeiro");
  autoTable(doc, {
    startY: y,
    body: [
      ["Peças", brl(os.valor_pecas)],
      ["Mão de obra", brl(os.valor_mao_obra)],
      ["Deslocamento", brl(os.valor_deslocamento)],
      ["Desconto", `- ${brl(os.desconto)}`],
      ["VALOR TOTAL", brl(os.valor_total)],
      ["Forma de pagamento", os.forma_pagamento || "—"],
      ["Situação do pagamento", `${STATUS_PAGAMENTO[os.status_pagamento]} (recebido ${brl(os.valor_recebido)})`],
    ],
    theme: "striped",
    margin: { left: M, right: W / 2 },
    styles: { fontSize: 8.8, cellPadding: 1.5 },
    columnStyles: { 1: { halign: "right" } },
    didParseCell: (h) => {
      if (h.row.index === 4) {
        h.cell.styles.fontStyle = "bold";
        h.cell.styles.textColor = NAVY;
        h.cell.styles.fontSize = 10;
      }
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;

  section("Termo de garantia");
  if (garantia) {
    kv([
      ["Data de conclusão", dataBR(os.data_conclusao)],
      ["Prazo", `${garantia.prazo_dias} dias`],
      ["Início", dataBR(garantia.data_inicio)],
      ["Vencimento", dataBR(garantia.data_vencimento)],
      ["Serviço coberto", garantia.descricao_cobertura],
      ...(garantia.pecas_cobertas ? ([["Peças abrangidas", garantia.pecas_cobertas]] as [string, string][]) : []),
      ["Condições", garantia.condicoes || "—"],
      ["Responsável técnico", garantia.responsavel_tecnico || tecnico || "—"],
    ]);
    doc.setFont("helvetica", "italic").setFontSize(7.5).setTextColor(...GRAY);
    doc.text("A garantia abrange somente o serviço executado e as peças descritas acima, não o equipamento inteiro.", M, y);
    y += 5;
  } else {
    kv([["Situação", "A garantia é emitida quando a ordem de serviço é concluída."]]);
  }

  // Assinaturas
  if (y > 245) {
    doc.addPage();
    y = 20;
  }
  y += 14;
  doc.setDrawColor(120, 120, 120).setLineWidth(0.2);
  const half = (W - 2 * M - 10) / 2;
  doc.line(M, y, M + half, y);
  doc.line(M + half + 10, y, W - M, y);
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...GRAY);
  doc.text(`Responsável técnico: ${tecnico ?? ""}`, M, y + 4);
  doc.text(`Cliente: ${cliente.nome}`, M + half + 10, y + 4);
  doc.text(`Data de conclusão/entrega: ${dataBR(os.data_conclusao)}`, M, y + 10);

  // Rodapé
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const H = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...NAVY).setLineWidth(0.4).line(M, H - 12, W - M, H - 12);
    doc.setFontSize(7.5).setTextColor(...GRAY);
    doc.text(`${config.nome} — ${config.slogan ?? ""}   •   OS Nº ${numero}`, M, H - 7.5);
    doc.text(`Página ${p} de ${pages}`, W - M, H - 7.5, { align: "right" });
  }
  return doc.output("blob");
}

export function mensagemWhatsapp(d: OSCompleta) {
  const { os, cliente, garantia, config } = d;
  const primeiro = cliente.nome.split(" ")[0];
  return [
    `Olá, ${primeiro}!`,
    "",
    `A ${config.nome} agradece pela confiança em nossos serviços.`,
    "",
    "Segue o comprovante do serviço realizado no seu equipamento.",
    "",
    `Número da OS: ${String(os.numero_os).padStart(5, "0")}`,
    `Equipamento: ${TIPO_EQUIPAMENTO[os.tipo_equipamento]} ${os.marca} ${os.modelo}`.trim(),
    `Serviço executado: ${os.servico_executado ?? "—"}`,
    `Data de conclusão: ${dataBR(os.data_conclusao)}`,
    garantia ? `Garantia: ${garantia.prazo_dias} dias` : null,
    garantia ? `Garantia válida até: ${dataBR(garantia.data_vencimento)}` : null,
    `Valor total: ${brl(os.valor_total)}`,
    "",
    "Guarde o PDF para consultar os detalhes do atendimento e as condições da garantia.",
    "",
    "Em caso de dúvidas, estamos à disposição.",
    "",
    config.nome,
    config.slogan ?? "",
  ]
    .filter((l) => l !== null)
    .join("\n");
}
