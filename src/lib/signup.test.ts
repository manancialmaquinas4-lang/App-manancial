import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("cadastro de colaboradores", () => {
  const migration = readFileSync("drizzle/migrations/0001_automatic_employee_signup_role.sql", "utf8");
  it("atribui acesso técnico automaticamente sem aprovação", () => {
    expect(migration).toMatch(/insert into public\.user_roles\s*\(user_id, role\) values \(new\.id, 'tecnico'\)/i);
  });
  it("não concede administração ou acesso financeiro no cadastro", () => {
    expect(migration).not.toMatch(/'admin'|'atendimento'/);
  });
});