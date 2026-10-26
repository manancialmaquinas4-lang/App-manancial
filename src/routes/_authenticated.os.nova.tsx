import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { OSForm } from "@/components/app/OSForm";
import { PageHeader } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/os/nova")({
  validateSearch: z.object({ duplicar: z.string().optional() }),
  head: () => ({ meta: [{ title: "Nova OS — Manancial Máquinas" }] }),
  component: Nova,
});

function Nova() {
  const { duplicar } = Route.useSearch();
  const src = useQuery({
    queryKey: ["os-raw", duplicar],
    enabled: !!duplicar,
    queryFn: async () => (await supabase.from("ordens_servico").select("*").eq("id", duplicar!).single()).data,
  });
  if (duplicar && !src.data) return <p className="text-muted-foreground">Carregando...</p>;
  return (
    <>
      <PageHeader title={duplicar ? "Duplicar ordem de serviço" : "Nova ordem de serviço"} subtitle="O número da OS é gerado automaticamente ao salvar." />
      <OSForm duplicarDe={src.data ?? undefined} />
    </>
  );
}
