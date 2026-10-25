
create type public.app_role as enum ('admin','tecnico','atendimento');
create type public.status_servico as enum ('solicitado','agendado','em_diagnostico','aguardando_aprovacao','aguardando_peca','em_execucao','concluido','cancelado');
create type public.status_pagamento as enum ('pendente','parcial','pago');
create type public.tipo_equipamento as enum ('maquina_lavar','lava_seca','lava_loucas');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text,
  telefone text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.profiles, public.user_roles to service_role;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id
    where ur.user_id = _user_id and ur.role = _role and p.ativo)
$$;
create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id
    where ur.user_id = _user_id and p.ativo)
$$;
create or replace function public.can_finance(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id,'admin') or public.has_role(_user_id,'atendimento')
$$;
grant execute on function public.has_role, public.is_staff, public.can_finance to authenticated;

create policy "perfil proprio ou staff" on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "perfil proprio atualiza" on public.profiles for update to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "roles leitura" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "roles admin insere" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "roles admin remove" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email) values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)), new.email);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.configuracoes_empresa (
  id int primary key default 1 check (id = 1),
  nome text not null default 'Manancial Máquinas',
  slogan text default 'Sua máquina em boas mãos!',
  telefone text, whatsapp text, email text, endereco text, cnpj text,
  garantia_padrao_dias int not null default 90,
  condicoes_garantia text not null default 'A garantia cobre exclusivamente o serviço executado e as peças substituídas descritas neste documento. Não cobre danos por mau uso, quedas, oscilação de energia, instalação inadequada, violação por terceiros ou defeitos em outras partes do equipamento.',
  updated_at timestamptz not null default now()
);
insert into public.configuracoes_empresa (id) values (1);
grant select, update on public.configuracoes_empresa to authenticated;
grant all on public.configuracoes_empresa to service_role;
alter table public.configuracoes_empresa enable row level security;
create policy "config leitura" on public.configuracoes_empresa for select to authenticated using (public.is_staff(auth.uid()));
create policy "config admin" on public.configuracoes_empresa for update to authenticated using (public.has_role(auth.uid(),'admin'));

create sequence public.clientes_codigo_seq start 1;
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  codigo int not null unique default nextval('public.clientes_codigo_seq'),
  nome text not null,
  telefone text,
  whatsapp text,
  cpf_cnpj text,
  cep text, endereco text, numero text, complemento text, bairro text, cidade text, estado text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index clientes_whatsapp_uniq on public.clientes (whatsapp) where whatsapp is not null and whatsapp <> '';
create unique index clientes_doc_uniq on public.clientes (cpf_cnpj) where cpf_cnpj is not null and cpf_cnpj <> '';

create sequence public.os_numero_seq start 1;
create table public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  numero_os int not null unique default nextval('public.os_numero_seq'),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  data_solicitacao date not null default current_date,
  data_atendimento date,
  data_conclusao date,
  tipo_equipamento public.tipo_equipamento not null,
  marca text not null default '',
  modelo text not null default '',
  numero_serie text,
  estado_conservacao text,
  acessorios text,
  problema_relatado text not null default '',
  diagnostico text,
  servico_executado text,
  valor_pecas numeric(12,2) not null default 0 check (valor_pecas >= 0),
  valor_mao_obra numeric(12,2) not null default 0 check (valor_mao_obra >= 0),
  valor_deslocamento numeric(12,2) not null default 0 check (valor_deslocamento >= 0),
  desconto numeric(12,2) not null default 0 check (desconto >= 0),
  valor_total numeric(12,2) generated always as (valor_pecas + valor_mao_obra + valor_deslocamento - desconto) stored,
  forma_pagamento text,
  valor_recebido numeric(12,2) not null default 0 check (valor_recebido >= 0),
  data_pagamento date,
  status_pagamento public.status_pagamento not null default 'pendente',
  status_servico public.status_servico not null default 'solicitado',
  tecnico_responsavel_id uuid references public.profiles(id),
  prazo_garantia_dias int not null default 90 check (prazo_garantia_dias >= 0),
  pecas_garantia text,
  condicoes_garantia text,
  observacoes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.itens_ordem_servico (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references public.ordens_servico(id) on delete cascade,
  descricao text not null,
  quantidade numeric(10,2) not null default 1 check (quantidade > 0),
  valor_unitario numeric(12,2) not null default 0 check (valor_unitario >= 0),
  valor_total numeric(12,2) generated always as (quantidade * valor_unitario) stored
);

create table public.garantias (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null unique references public.ordens_servico(id) on delete cascade,
  data_inicio date not null,
  prazo_dias int not null,
  data_vencimento date generated always as (data_inicio + prazo_dias) stored,
  descricao_cobertura text not null,
  pecas_cobertas text,
  condicoes text,
  responsavel_tecnico text,
  empresa text not null default 'Manancial Máquinas',
  created_at timestamptz not null default now()
);

create table public.documentos_servico (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references public.ordens_servico(id) on delete cascade,
  versao int not null,
  arquivo_path text not null,
  motivo text,
  data_emissao timestamptz not null default now(),
  emitido_por uuid default auth.uid(),
  unique (ordem_servico_id, versao)
);

create table public.historico_envios (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references public.ordens_servico(id) on delete cascade,
  cliente_id uuid references public.clientes(id),
  documento_id uuid references public.documentos_servico(id),
  canal text not null,
  destinatario text,
  data_envio timestamptz not null default now(),
  status_envio text not null,
  mensagem_erro text,
  enviado_por uuid default auth.uid()
);

create table public.auditoria (
  id bigserial primary key,
  tabela text not null,
  registro_id uuid not null,
  acao text not null,
  dados_antes jsonb,
  dados_depois jsonb,
  usuario_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.clientes, public.ordens_servico, public.itens_ordem_servico, public.garantias, public.documentos_servico, public.historico_envios to authenticated;
grant select, insert on public.auditoria to authenticated;
grant usage on sequence public.auditoria_id_seq, public.clientes_codigo_seq, public.os_numero_seq to authenticated;
grant all on public.clientes, public.ordens_servico, public.itens_ordem_servico, public.garantias, public.documentos_servico, public.historico_envios, public.auditoria to service_role;

alter table public.clientes enable row level security;
alter table public.ordens_servico enable row level security;
alter table public.itens_ordem_servico enable row level security;
alter table public.garantias enable row level security;
alter table public.documentos_servico enable row level security;
alter table public.historico_envios enable row level security;
alter table public.auditoria enable row level security;

do $$ declare t text; begin
  foreach t in array array['clientes','ordens_servico','itens_ordem_servico','garantias','documentos_servico','historico_envios'] loop
    execute format('create policy "staff le" on public.%I for select to authenticated using (public.is_staff(auth.uid()))', t);
    execute format('create policy "staff insere" on public.%I for insert to authenticated with check (public.is_staff(auth.uid()))', t);
    execute format('create policy "staff atualiza" on public.%I for update to authenticated using (public.is_staff(auth.uid()))', t);
    execute format('create policy "admin remove" on public.%I for delete to authenticated using (public.has_role(auth.uid(),''admin''))', t);
  end loop;
end $$;
create policy "staff le auditoria" on public.auditoria for select to authenticated using (public.is_staff(auth.uid()));

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger t_cli_upd before update on public.clientes for each row execute function public.touch_updated_at();

create or replace function public.validar_os() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  if new.desconto > (new.valor_pecas + new.valor_mao_obra + new.valor_deslocamento) then
    raise exception 'O desconto não pode ser maior que a soma dos valores.';
  end if;
  if tg_op = 'UPDATE' and auth.uid() is not null and not public.can_finance(auth.uid()) and
     (new.valor_recebido is distinct from old.valor_recebido or new.forma_pagamento is distinct from old.forma_pagamento
      or new.data_pagamento is distinct from old.data_pagamento) then
    raise exception 'Seu perfil não permite alterar dados de pagamento.';
  end if;
  if new.valor_recebido <= 0 then new.status_pagamento = 'pendente';
  elsif new.valor_recebido < (new.valor_pecas + new.valor_mao_obra + new.valor_deslocamento - new.desconto) then new.status_pagamento = 'parcial';
  else new.status_pagamento = 'pago';
  end if;
  if new.status_servico = 'concluido' then
    if new.data_conclusao is null then new.data_conclusao = current_date; end if;
    if coalesce(trim(new.diagnostico),'') = '' or coalesce(trim(new.servico_executado),'') = ''
       or coalesce(trim(new.problema_relatado),'') = '' or new.tecnico_responsavel_id is null
       or coalesce(trim(new.marca),'') = '' or coalesce(trim(new.modelo),'') = '' then
      raise exception 'Para concluir a OS preencha: problema relatado, diagnóstico, serviço executado, marca, modelo e técnico responsável.';
    end if;
  end if;
  return new;
end $$;
create trigger t_os_validar before insert or update on public.ordens_servico for each row execute function public.validar_os();

create or replace function public.sync_garantia() returns trigger language plpgsql security definer set search_path = public as $$
declare tec text; cond text;
begin
  if new.status_servico = 'concluido' then
    select nome into tec from public.profiles where id = new.tecnico_responsavel_id;
    select condicoes_garantia into cond from public.configuracoes_empresa where id = 1;
    insert into public.garantias (ordem_servico_id, data_inicio, prazo_dias, descricao_cobertura, pecas_cobertas, condicoes, responsavel_tecnico)
    values (new.id, new.data_conclusao, new.prazo_garantia_dias, new.servico_executado, new.pecas_garantia, coalesce(nullif(new.condicoes_garantia,''), cond), tec)
    on conflict (ordem_servico_id) do update set data_inicio = excluded.data_inicio, prazo_dias = excluded.prazo_dias,
      descricao_cobertura = excluded.descricao_cobertura, pecas_cobertas = excluded.pecas_cobertas,
      condicoes = excluded.condicoes, responsavel_tecnico = excluded.responsavel_tecnico;
  elsif new.status_servico = 'cancelado' then
    delete from public.garantias where ordem_servico_id = new.id;
  end if;
  return new;
end $$;
create trigger t_os_garantia after insert or update on public.ordens_servico for each row execute function public.sync_garantia();

create or replace function public.auditar() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.auditoria (tabela, registro_id, acao, dados_antes, dados_depois, usuario_id)
  values (tg_table_name, coalesce(new.id, old.id), tg_op,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end, auth.uid());
  return coalesce(new, old);
end $$;
create trigger t_aud_os after insert or update or delete on public.ordens_servico for each row execute function public.auditar();
create trigger t_aud_cli after insert or update or delete on public.clientes for each row execute function public.auditar();

create policy "staff le docs" on storage.objects for select to authenticated using (bucket_id = 'documentos' and public.is_staff(auth.uid()));
create policy "staff envia docs" on storage.objects for insert to authenticated with check (bucket_id = 'documentos' and public.is_staff(auth.uid()));
