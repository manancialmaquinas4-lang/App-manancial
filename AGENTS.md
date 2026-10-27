<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Data access is client-side via the Supabase browser client with RLS (`is_staff`/`has_role`/`can_finance`); business rules (OS total, payment status, completion validation, warranty creation, audit) live in DB triggers so every client obeys them.
- Protected pages live under `src/routes/_authenticated.*` (client-side guard in the layout); PDFs are generated in-browser with jsPDF (`src/lib/pdf.ts`) from saved DB data and archived in the private `documentos` bucket with versioned rows in `documentos_servico`.
