import { createFileRoute, Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ROLES } from "@/lib/format";
import logo from "@/assets/logo-manancial.png";

export const Route = createFileRoute("/_authenticated")({ component: Layout });

const items = [
  { title: "Painel", url: "/painel", icon: LayoutDashboard },
  { title: "Ordens de serviço", url: "/os", icon: ClipboardList },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Garantias", url: "/garantias", icon: ShieldCheck },
  { title: "Pagamentos", url: "/pagamentos", icon: CreditCard },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
] as const;
const adminItems = [
  { title: "Usuários", url: "/usuarios", icon: UserCog },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
] as const;

function AppSidebar() {
  const { isAdmin, profile, roles, signOut } = useAuth();
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const list = isAdmin ? [...items, ...adminItems] : items;
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        {collapsed ? (
          <div className="grid h-10 place-items-center font-display text-lg font-extrabold text-sidebar-primary">
            M
          </div>
        ) : (
          <img src={logo} alt="Manancial Máquinas" className="mx-auto w-40 py-2" />
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {list.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={path.startsWith(it.url)}
                    tooltip={it.title}
                    size="lg"
                  >
                    <Link to={it.url} onClick={() => setOpenMobile(false)}>
                      <it.icon />
                      <span>{it.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-2 text-xs">
            <div className="truncate font-semibold">{profile?.nome}</div>
            <div className="opacity-70">
              {roles.map((r) => ROLES[r]).join(", ") || "Sem perfil"}
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sair">
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function Layout() {
  const { session, loading, accessIssue, isStaff, profile, signOut } = useAuth();
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Carregando...
      </div>
    );
  if (!session) return <Navigate to="/login" />;
  if (!isStaff)
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-navy px-4">
        <div className="max-w-md rounded-2xl bg-card p-8 text-center shadow-card">
          <img src={logo} alt="Manancial Máquinas" className="mx-auto mb-4 w-48" />
          <h1 className="text-xl font-bold">Acesso indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile?.ativo === false
              ? "Seu usuário foi desativado."
              : (accessIssue ??
                "Não foi possível carregar seu acesso. Tente sair e entrar novamente.")}
          </p>
          <Button className="mt-6" variant="outline" onClick={signOut}>
            Sair
          </Button>
        </div>
      </div>
    );
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/90 px-3 backdrop-blur">
            <SidebarTrigger />
            <img src={logo} alt="Manancial Máquinas" className="h-8 md:hidden" />
            <span className="hidden text-sm font-semibold text-muted-foreground md:block">
              Gestão de Serviços Técnicos
            </span>
            <div className="ml-auto">
              <Button asChild variant="accent" size="sm">
                <Link to="/os/nova">+ Nova OS</Link>
              </Button>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
