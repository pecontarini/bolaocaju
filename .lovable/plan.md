## Objetivo
Garantir que `pedrocontarini@empresasmult.com.br` consiga logar no `/admin/login` e ver palpites e movimentação de TODAS as lojas (papel `admin_geral`), independentemente do subdomínio que estiver acessando.

## O que será feito

### 1. Migration — promover o usuário a `admin_geral`
- Localizar o `auth.users.id` pelo e-mail `pedrocontarini@empresasmult.com.br`.
- UPSERT na tabela de perfis admin lida por `fn_meu_perfil` (assumindo `public.perfis_admin` com colunas `user_id`, `papel`, `marca_id`, `unidade_id`). Se a tabela tiver outro nome, a migration falha de forma clara e ajusto.
- `papel = 'admin_geral'`, `marca_id = NULL`, `unidade_id = NULL`.
- Se o e-mail ainda não existir em `auth.users`, a migration aborta com mensagem clara pedindo o cadastro prévio (não dá pra criar usuário do auth via migration sem service role).

### 2. Frontend — respeitar `admin_geral` (sem filtro de marca/unidade)
Hoje várias telas chumbam `marca_id` resolvido do hostname. Para `papel === 'admin_geral'`, remover o filtro:

- `src/routes/admin.sorteios.tsx`
  - Query de `jogos` encerrados: tirar `.eq("marca_id", marcaId)` quando `papel = admin_geral` (lista todos os jogos encerrados de todas as marcas).
  - Cabeçalho do item já agrupa por `marca_slug → unidade_nome` quando geral — mantido.

- `src/routes/admin.jogo.$id.tsx`
  - Carregar perfil antes de chamar queries que dependem de marca.
  - Quando `admin_geral`: a chamada de `fn_meus_ganhadores` já retorna `marca_slug`/`unidade_nome` e a tela já agrupa. Verificar que a página de detalhe não bloqueia acesso a jogos de outras marcas (hoje a rota carrega o jogo por `id` direto, sem filtro de marca — OK).

- `src/routes/admin.index.tsx` (Dashboard)
  - `NumerosDoDia` (palpites/clientes do dia) e listas de jogos hoje/abertos: hoje **não** filtram por marca — deixar como está (já é visão global, perfeito pro admin_geral).

- `src/components/admin/AdminShell.tsx`
  - `BannerPerfil` já mostra "Admin Geral — todas as marcas" quando `papel = admin_geral`. Mantido.

### 3. Verificação
- Login com o e-mail → confirmar que `fn_meu_perfil` devolve `papel=admin_geral`.
- `/admin/sorteios` mostra jogos encerrados de **todas** as marcas (Caju, Caminito, Responsa) e agrupa ganhadores por marca/unidade.
- `/admin` mostra números globais do dia.

## Detalhes técnicos
- Tabela alvo assumida: `public.perfis_admin (user_id uuid PK, papel text, marca_id uuid null, unidade_id uuid null)`. Se for outra (ex.: `usuarios_admin`), ajusto a migration na hora.
- Não mexo em `fn_meu_perfil`, `fn_meus_ganhadores`, `fn_ganhadores` — são read-only e já cobrem o caso `admin_geral`.
- Não toco em resolução de marca por hostname nem em logos/branding.
