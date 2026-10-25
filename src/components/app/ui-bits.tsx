import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { STATUS_PAGAMENTO, STATUS_SERVICO, type StatusPagamento, type StatusServico, type SituacaoGarantia } from "@/lib/format";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className, title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border bg-card p-4 shadow-card sm:p-5", className)}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const servicoTone: Record<StatusServico, string> = {
  solicitado: "bg-secondary text-secondary-foreground",
  agendado: "bg-primary/10 text-primary",
  em_diagnostico: "bg-primary/15 text-primary",
  aguardando_aprovacao: "bg-warning/25 text-warning-foreground",
  aguardando_peca: "bg-accent/20 text-accent",
  em_execucao: "bg-primary text-primary-foreground",
  concluido: "bg-success/15 text-success",
  cancelado: "bg-destructive/10 text-destructive",
};
const pagTone: Record<StatusPagamento, string> = {
  pendente: "bg-destructive/10 text-destructive",
  parcial: "bg-warning/25 text-warning-foreground",
  pago: "bg-success/15 text-success",
};
const garTone: Record<SituacaoGarantia, string> = {
  vigente: "bg-success/15 text-success",
  vencendo: "bg-warning/25 text-warning-foreground",
  vencida: "bg-destructive/10 text-destructive",
};
const pill = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold";

export const StatusServicoBadge = ({ s }: { s: StatusServico }) => <span className={cn(pill, servicoTone[s])}>{STATUS_SERVICO[s]}</span>;
export const StatusPagamentoBadge = ({ s }: { s: StatusPagamento }) => <span className={cn(pill, pagTone[s])}>{STATUS_PAGAMENTO[s]}</span>;
export const GarantiaBadge = ({ s }: { s: SituacaoGarantia }) => (
  <span className={cn(pill, garTone[s])}>{s === "vigente" ? "Vigente" : s === "vencendo" ? "Vence em breve" : "Vencida"}</span>
);

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Field({ label, children, className, required }: { label: string; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}

export const selectCls =
  "h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
