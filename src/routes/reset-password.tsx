import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/ui-bits";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Manancial Máquinas" },
      { name: "description", content: "Defina uma nova senha de acesso." },
      { property: "og:title", content: "Nova senha — Manancial Máquinas" },
      { property: "og:description", content: "Defina uma nova senha de acesso." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [senha, setSenha] = useState("");
  const nav = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return toast.error("Use pelo menos 8 caracteres.");
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) return toast.error(error.message);
    toast.success("Senha alterada.");
    nav({ to: "/painel" });
  }
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-navy px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-6 shadow-card">
        <h1 className="text-xl font-bold">Definir nova senha</h1>
        <Field label="Nova senha" required>
          <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </Field>
        <Button type="submit" variant="accent" className="w-full">Salvar</Button>
      </form>
    </div>
  );
}
