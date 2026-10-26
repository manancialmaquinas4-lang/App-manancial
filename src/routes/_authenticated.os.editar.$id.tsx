import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OSForm } from "@/components/app/OSForm";
import { PageHeader } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/os/editar/$id")({
  head: () => ({ meta: [{ title: "Editar OS — Manancial Máquinas" }] }),
  component: Editar,
});

function Editar() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["os-raw", id],
    queryFn: async () => (await supabase.from("ordens_servico").select("*").eq("id", id).single()).data,
  });
  if (!q.data) return <p className="text-muted-foreground">Carregando...</p>;
  return (
    <>
      <PageHeader title={`Editar OS Nº ${String(q.data.numero_os).padStart(5, "0")}`} />
      <OSForm existing={q.data} />
    </>
  );
}
