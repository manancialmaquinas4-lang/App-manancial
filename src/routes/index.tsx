import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Manancial Máquinas — Gestão de Serviços Técnicos" },
      { name: "description", content: "Sistema de ordens de serviço, garantias e comprovantes da Manancial Máquinas." },
      { property: "og:title", content: "Manancial Máquinas — Gestão de Serviços Técnicos" },
      { property: "og:description", content: "Sistema de ordens de serviço, garantias e comprovantes." },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-gradient-navy" />;
  return <Navigate to={session ? "/painel" : "/login"} />;
}
