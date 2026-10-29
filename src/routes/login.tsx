import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, PasswordInput } from "@/components/app/ui-bits";
import logo from "@/assets/logo-manancial.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Manancial Máquinas" },
      { name: "description", content: "Acesso restrito à equipe da Manancial Máquinas." },
      { property: "og:title", content: "Entrar — Manancial Máquinas" },
      { property: "og:description", content: "Acesso restrito à equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"entrar" | "criar" | "recuperar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { emailRedirectTo: `${window.location.origin}/login` },
        });
        if (error) throw error;
        toast.success(data.session ? "Cadastro realizado!" : "Cadastro realizado! Confirme seu e-mail para entrar, sem precisar de aprovação.");
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
              {mode === "entrar" ? "Acessar o sistema" : mode === "criar" ? "Cadastrar" : "Recuperar senha"}
            </h1>
            <p className="text-sm text-muted-foreground">Gestão de Serviços Técnicos</p>
          </div>
          <Field label="E-mail" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          {mode !== "recuperar" && (
            <Field label="Senha" required>
              <PasswordInput value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={mode === "criar" ? 8 : undefined} autoComplete={mode === "criar" ? "new-password" : "current-password"} />
            </Field>
          )}
          <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
            {busy ? "Aguarde..." : mode === "entrar" ? "Entrar" : mode === "criar" ? "Criar conta" : "Enviar link"}
          </Button>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            {mode !== "entrar" ? (
              <Button type="button" variant="link" className="h-auto p-0" onClick={() => setMode("entrar")}>
                Voltar ao login
              </Button>
            ) : (
              <>
                <Button type="button" variant="link" className="h-auto p-0" onClick={() => setMode("recuperar")}>
                  Esqueci minha senha
                </Button>
                <Button type="button" variant="link" className="h-auto p-0" onClick={() => setMode("criar")}>
                  Cadastrar
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
