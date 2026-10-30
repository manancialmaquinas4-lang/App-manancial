# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Supabase

O app usa o Supabase para autenticação, banco de dados (Postgres) e armazenamento privado dos PDFs. O projeto associado a este repositório está indicado em `supabase/config.toml`.

### Configuração local

1. Copie `.env.example` para `.env`.
2. Preencha `VITE_SUPABASE_URL` e `SUPABASE_URL` com a URL do projeto, e `VITE_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_PUBLISHABLE_KEY` com a chave pública (publishable/anon) do Supabase.
3. Execute `npm run dev`.

Configure as mesmas quatro variáveis no provedor onde o app será hospedado. O Supabase hospeda o backend (banco, autenticação e arquivos); o app TanStack Start precisa ser publicado separadamente. Não use uma chave `service_role`/`sb_secret` em variáveis `VITE_*` nem no navegador.

### Banco de dados

O schema SQL está em `drizzle/migrations/`:

- `0000_migration.sql` cria tabelas, funções, políticas RLS, triggers e o bucket privado `documentos`.
- `0001_automatic_employee_signup_role.sql` garante que novos usuários recebam somente o papel `tecnico`.
- `0002_repair_auth_user_profiles.sql` recria o trigger de cadastro e corrige perfil/papel ausentes para contas existentes sem alterar papéis já atribuídos.

Para um banco Supabase novo, abra o **SQL Editor** do projeto configurado e execute os arquivos `0000_migration.sql`, `0001_automatic_employee_signup_role.sql` e `0002_repair_auth_user_profiles.sql`, nessa ordem. Só habilite o uso do app depois que todos terminarem sem erros.

Se `public.profiles` e `public.user_roles` já existem, execute somente `0002_repair_auth_user_profiles.sql` para corrigir o trigger e completar registros ausentes. Para outros schemas existentes, não execute a migração inicial novamente: verifique o schema antes de aplicar SQL. Caso o bucket ainda não exista, crie-o como privado com:

```sql
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do update set public = false;
```

O trigger de cadastro atribui apenas o papel `tecnico`. Conceda o papel `admin` a uma conta autorizada pelo SQL Editor do Supabase, nunca pelo cadastro público.
