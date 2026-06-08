# Restauração do modelo multi-marca

## 1. Sincronizar types do Supabase

- Regerar `src/integrations/supabase/types.ts` a partir do projeto `atolxisdfsnjqiitczbd` para enxergar `marcas`, `marca_jogos`, `unidades`, `jogos.finalizado` e as RPCs `fn_valida_geo`, `fn_identificar_cliente`, `fn_aplicar_resultado`.
- Tipar `client.ts` com `createClient<Database>(...)`.

## 2. Resolução de marca

- Novo módulo `src/lib/marca.ts`:
  - `resolverSlugMarca()`: lê `window.location.hostname` (primeiro segmento do subdomínio: `caminito.boteco.app` → `caminito`); fallback para query `?marca=`; default `caju-limao`. Ignora hostnames de preview da Lovable e `localhost` (usa default + query).
  - `useMarcaAtual()` (Zustand + React Query): carrega `marcas` pelo slug e expõe `{ id, slug, nome, branding }`.
- Trocar `src/store/cliente.ts` para guardar `marca_id` junto da sessão (ou criar `store/marca.ts` separado e limpar o cliente quando o slug mudar).

## 3. Branding dinâmico

- Componente `<BrandingProvider>` no `__root.tsx` que, ao carregar a marca:
  - Aplica vars CSS no `:root`: `--brand-primary`, `--brand-secondary`, `--brand-bg`, etc., mapeando as chaves de `branding` (cores variam por marca — usar um normalizador).
  - Troca `<title>` e `<link rel="icon">` para `branding.icone`.
  - Expõe `branding.logo`, `branding.nome_exibicao`, `branding.fonte_display` via contexto.
- `HeaderCliente` e `AdminShell`: ler logo e nome do contexto, não mais hardcode `/assets/01-logo-horizontal-verde.png`.
- Caminho de asset: `/assets/<slug>/<arquivo>` (ex.: `/assets/caminito/caminito-vaquinha-colorida.png`). Os arquivos físicos já devem existir; caso não existam para alguma marca, manter fallback para o logo do Caju.
- Mover tokens do `styles.css` (`--cl-verde*`, etc.) para usarem as vars de marca; classes Tailwind `bg-cl-verde-escuro` viram `bg-[var(--brand-primary)]` ou equivalente, ou redefinimos os tokens existentes para apontarem para as vars de marca (menos invasivo).

## 4. Queries por marca

- **Jogo do momento** (home + banner): `from('marca_jogos').select('status, palpites_encerrados, premio_descricao, premio_imagem_url, premio_produto_id, premio_quantidade, jogos!inner(*)').eq('marca_id', marcaId).eq('status','ativo').maybeSingle()`.
- **Próximos / Últimos / Por data / Por grupo / Por rodada / Por time**: continuam em `from('jogos')` (calendário global). Trocar filtros para `finalizado=false` (próximos, asc) e `finalizado=true` (últimos, desc), ambos por `data_hora_inicio`.
- **Total encerrados**: `from('jogos').select('*', { count: 'exact', head: true }).eq('finalizado', true)`.
- **Admin de jogos**: lista global vem de `jogos`; o estado por marca (status, prêmio, palpites_encerrados) vem de `marca_jogos`. O painel admin precisa de seletor de marca (ou escopo na marca atual). Esta entrega assume "marca atual = a do subdomínio/query" — admin opera sobre a marca atual; se precisar trocar, troca pelo seletor de marca.

## 5. Palpite + geo + cadastro

- `palpitar.$jogoId.tsx`:
  - Buscar o `marca_jogos` da marca atual para esse jogo e validar `status='ativo'` + `palpites_encerrados=false`.
  - Geo: `supabase.rpc('fn_valida_geo', { p_lat, p_lon, p_marca_id: marcaId })`.
  - Insert em `palpites` com `{ marca_id, jogo_id, cliente_id, comanda, placar_a, placar_b, latitude, longitude }`.
- `cadastro.tsx`: `supabase.rpc('fn_identificar_cliente', { p_marca_id: marcaId, p_nome, p_telefone, p_opt_in })`.
- `meus-palpites.tsx`: filtrar por `marca_id` + `cliente_id`.

## 6. Sincronização de resultados

- A edge function `sincronizar-resultados` já existe; confirmar que após atualizar `jogos` ela chama `fn_aplicar_resultado` para cada `marca_jogos` da partida (isso é trabalho de função SQL/edge — apenas verificar; ajustes ficam fora do escopo se já estiver correto no banco).

## 7. Verificação

- Testar `?marca=caju-limao`, `?marca=caminito`, `?marca=responsa` na preview:
  - Logo, nome e cores do header trocam.
  - "Jogo do momento" usa o `marca_jogos` correto (pode estar vazio se nenhuma marca tem `ativo` agora — mostrar "Nenhum jogo ativo agora").
  - Calendário (próximos/últimos) é idêntico nas três.
  - Palpite e cadastro enviam `marca_id` correto (verificar via network tab).

## Detalhes técnicos

- **Types**: como não tenho CLI do Supabase no sandbox, vou escrever o `types.ts` manualmente refletindo as tabelas confirmadas via REST (`marcas`, `marca_jogos`, `unidades`, `jogos` com `finalizado`, `clientes`, `palpites`, `produtos`, `sorteios`). Se você preferir, rode `npx supabase gen types typescript --project-id atolxisdfsnjqiitczbd` localmente e cole por cima — funciona igual.
- **CSS vars**: definidas em `:root` por JS no boot da marca, evitando flash usando `<script>` no `__root` head que lê o slug do URL e seta cores default conhecidas antes de o React montar (otimização opcional).
- **Assets das marcas**: presumo que estejam em `public/assets/<slug>/`. Se não estiverem, preciso de upload ou de um mapa de URLs absolutas em `branding` — me avise.
- **Backward compat**: rotas/queries do admin continuam funcionando; só passam a ler `marca_jogos` em vez de campos diretos em `jogos`.

## Fora de escopo desta entrega

- Migration nova: nenhuma (schema já existe).
- Edge function: não alterar.
- Seletor de marca no admin (operar sempre na marca da URL nesta primeira passada).
- Branding 100% pixel-perfect das marcas novas (Caminito/Responsa): aplicar cores e logo, mas ajustes finos de tipografia/layout específicos por marca ficam para uma segunda passada.
