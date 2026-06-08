update public.marcas
set branding = coalesce(branding, '{}'::jsonb) || jsonb_build_object(
  'logo', 'caju-logo-horizontal.png',
  'logo_branco', 'caju-logo-branco-fundo-verde.png',
  'icone', 'caju-icone-512.png'
)
where slug = 'caju-limao';
