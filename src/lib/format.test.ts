import { describe, expect, it } from "vitest";
import { calcularTotal, calcularVencimento, normalizarWhatsapp, situacaoGarantia } from "./format";

describe("regras de negócio", () => {
  it("total = peças + mão de obra + deslocamento − desconto", () => {
    expect(calcularTotal({ valor_pecas: 120, valor_mao_obra: 150, valor_deslocamento: 30, desconto: 20 })).toBe(280);
  });
  it("garantia de 90 dias a partir de 01/01/2026 vence em 01/04/2026", () => {
    expect(calcularVencimento("2026-01-01", 90)).toBe("2026-04-01");
  });
  it("telefone sem DDI recebe 55", () => {
    expect(normalizarWhatsapp("(11) 98765-4321")).toBe("5511987654321");
  });
  it("garantia vencida, próxima do vencimento e vigente", () => {
    expect(situacaoGarantia("2026-01-01", "2026-02-01")).toBe("vencida");
    expect(situacaoGarantia("2026-02-10", "2026-02-01")).toBe("vencendo");
    expect(situacaoGarantia("2026-06-10", "2026-02-01")).toBe("vigente");
  });
});
