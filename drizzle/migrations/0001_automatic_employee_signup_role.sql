CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'nome',''), split_part(new.email,'@',1)), new.email);
  insert into public.user_roles (user_id, role) values (new.id, 'tecnico')
  on conflict (user_id, role) do nothing;
  return new;
end
$function$;