import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/ui-bits";
import logo from "@/assets/logo-manancial.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Manancial Máquinas" },
      { name: "description", content: "Acesso restrito à equipe da Manancial Máquinas." },
      { property: "og:title", content: "Entrar — Manancial Máquinas" },
      { property: "og:description", content: "Acesso restrito à equipe." },
    ],
  }),
  component: Login,
});

function Login() {
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"entrar" | "criar" | "recuperar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/painel" />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw new Error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message);
      } else if (mode === "criar") {
        if (senha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome }, emailRedirectTo: `${window.location.origin}/painel` },
        });
        if (error) throw error;
        toast.success("Conta criada! Confirme o e-mail recebido. O administrador precisa liberar seu acesso.");
        setMode("entrar");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Enviamos um link de redefinição para seu e-mail.");
        setMode("entrar");
      }
    } catch (err) {
      const e = err as Error & { code?: string };
      const m = e.message || "";
      const msg =
        e.code === "weak_password" || /weak|pwned|easy to guess/i.test(m)
          ? "Essa senha é fraca ou já vazou na internet. Escolha outra, misturando letras, números e símbolos."
          : /already registered|already exists/i.test(m)
            ? "Este e-mail já tem cadastro. Use “Entrar” ou “Esqueci minha senha”."
            : /email not confirmed/i.test(m)
              ? "Confirme seu e-mail pelo link que enviamos antes de entrar."
              : /invalid.*email/i.test(m)
                ? "E-mail inválido."
                : /rate limit|too many/i.test(m)
                  ? "Muitas tentativas. Aguarde alguns minutos e tente de novo."
                  : m;
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-navy px-4 py-10">
      <div className="w-full max-w-md">
        <img src={logo} alt="Manancial Máquinas" className="mx-auto mb-6 w-64 drop-shadow-xl" />
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-card p-6 shadow-card sm:p-8">
          <div>
            <h1 className="text-xl font-bold">
              {mode === "entrar" ? "Acessar o sistema" : mode === "criar" ? "Solicitar acesso" : "Recuperar senha"}
            </h1>
            <p className="text-sm text-muted-foreground">Gestão de Serviços Técnicos</p>
          </div>
          {mode === "criar" && (
            <Field label="Nome completo" required>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={100} />
            </Field>
          )}
          <Field label="E-mail" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          {mode !== "recuperar" && (
            <Field label="Senha" required>
              <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" />
            </Field>
          )}
          <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
            {busy ? "Aguarde..." : mode === "entrar" ? "Entrar" : mode === "criar" ? "Criar conta" : "Enviar link"}
          </Button>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            {mode !== "entrar" ? (
              <button type="button" className="text-primary hover:underline" onClick={() => setMode("entrar")}>
                Voltar ao login
              </button>
            ) : (
              <>
                <button type="button" className="text-primary hover:underline" onClick={() => setMode("recuperar")}>
                  Esqueci minha senha
                </button>
                <button type="button" className="text-primary hover:underline" onClick={() => setMode("criar")}>
                  Solicitar acesso
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
