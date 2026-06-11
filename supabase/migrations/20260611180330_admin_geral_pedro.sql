-- Promove pedrocontarini@empresasmult.com.br a admin_geral.
DO $$
DECLARE
  v_user_id uuid;
  v_table   text;
  v_email   text := 'pedrocontarini@empresasmult.com.br';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario % nao encontrado em auth.users. Cadastre-o antes.', v_email;
  END IF;

  SELECT t INTO v_table
  FROM (VALUES ('perfis_admin'),('usuarios_admin'),('admin_perfis'),('perfil_admin'),('admins'),('adm_perfis')) AS x(t)
  WHERE to_regclass('public.' || quote_ident(t)) IS NOT NULL
  LIMIT 1;

  IF v_table IS NULL THEN
    RAISE EXCEPTION 'Tabela de perfis admin nao encontrada.';
  END IF;

  EXECUTE format($f$
    INSERT INTO public.%1$I (user_id, papel, marca_id, unidade_id)
    VALUES ($1, 'admin_geral', NULL, NULL)
    ON CONFLICT (user_id) DO UPDATE
      SET papel = 'admin_geral', marca_id = NULL, unidade_id = NULL
  $f$, v_table) USING v_user_id;

  RAISE NOTICE 'OK: % promovido a admin_geral em public.%', v_email, v_table;
END
$$;
