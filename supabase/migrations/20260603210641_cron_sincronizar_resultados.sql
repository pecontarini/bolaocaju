-- Agenda a Edge Function sincronizar-resultados a cada 2 minutos.
-- Usa pg_cron + pg_net para chamar a URL com o service_role.
-- A service_role key deve estar no Vault como 'service_role_key'.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove agendamento anterior se existir (idempotente).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'sincronizar-resultados-2min') then
    perform cron.unschedule('sincronizar-resultados-2min');
  end if;
end$$;

select cron.schedule(
  'sincronizar-resultados-2min',
  '*/2 * * * *',
  $cmd$
  select net.http_post(
    url := 'https://atolxisdfsnjqiitczbd.supabase.co/functions/v1/sincronizar-resultados',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cmd$
);
