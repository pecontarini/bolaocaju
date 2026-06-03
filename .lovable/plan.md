
# Modernização visual global — Caju x Sofascore

Objetivo: deixar o app mais denso, limpo e moderno (cara de app esportivo), **mantendo** a paleta Caju, os selos, o logo e o Playfair como assinatura de marca. Mudança aplicada como design system (tokens + componentes base), não tela a tela.

## 1. Tokens (src/styles.css)

- **Tipografia**
  - `--font-body: "Inter", system-ui, sans-serif` — usado por padrão em `html, body`, tabelas, dados, números, botões, navegação, labels, horários, nomes de time.
  - `--font-display: "Playfair Display", Georgia, serif` — usado **apenas** via classe `.font-display` em títulos de seção, nome do app, nome de tela e palavras-chave de marca ("Classificação", "Grupos", "Jogo de hoje", "Sobre a Copa", "Bolão Caju Limão").
  - Remover Playfair de placares grandes, números de tabela e nomes de time (hoje aparece em `CardJogoAberto`, `TabelaClassificacao`, `placar-chip`, etc.).
- **Numéricos**: nova utility `.num` que aplica `font-variant-numeric: tabular-nums` + `font-feature-settings: "tnum"`. Aplicada em toda célula numérica, placar, horário e contagem.
- **Cores** (mantém o que existe — só consolida o uso):
  - Primária `#2F591A` (cl-verde), forte `#1C3B16` (cl-verde-escuro), laranja `#F6B26B` (cl-laranja), fundo `#F5F2EA` (cl-cinza-bg), texto secundário `#5F5E5A` (cl-cinza-texto), branco.
- **Raios & sombras**: padronizar em `--radius: 0.625rem` (10px, mais Sofascore); sombras suaves discretas (`--shadow-card: 0 1px 2px rgba(28,59,22,.06), 0 1px 0 rgba(28,59,22,.04)`).
- **Densidade**:
  - `--row-h: 40px` (linha de tabela)
  - `--header-table-h: 28px`
  - Zebra `--zebra: #F5F2EA` (muito leve)
  - Divisor `--divider: color-mix(in oklab, #1C3B16 8%, transparent)`
- **Textura geométrica**: aplicada **apenas** em hero/visão geral (`/sobre-copa` hero, banner home) com opacidade 6–8%. Remover do `LayoutCliente` (hoje é fundo global).

## 2. Componentes base padronizados

Centralizar em `src/components/site/` (ou `ui-caju/`) para reuso:

1. **HeaderCliente** (existe) — sem mudança estrutural; só ajusta tipografia (logo + nome em Playfair, restante em Inter) e altura 52px.
2. **Tabs** (`TabsCaju`) — abas com indicador por **sublinhado verde** (`#2F591A`, 2px), label em Inter 13px maiúsculo medium, ativo em verde-escuro.
3. **Chip de filtro** (`ChipFiltro`) — pill arredondado, ativo preenchido verde com texto branco, inativo branco com borda fina e texto verde-escuro. Altura 32px.
4. **Badge de status** (`BadgeStatus`) — variantes `aberto` (verde-claro/verde-escuro), `aoVivo` (laranja com pulse), `encerrado` (cinza), `brasil` (laranja). 10px maiúsculo, tracking wide.
5. **CardJogo** (refaz `CardJogoAberto`) — layout enxuto em 3 colunas: 
   ```
   [hora/data | times empilhados (bandeira + nome) | placar/status/ação]
   ```
   Padding 12px, dois times em linhas separadas (Sofascore-style), número de placar em Inter tabular, bandeira 20px, sem o "×" gigante. Botão "Palpitar" vira link/seta pequena à direita em vez de botão full-width — pra densidade.
6. **TabelaClassificacao** (refaz visual) — linhas 40px, header `#1C3B16` em maiúsculo 11px, células em Inter 13px tabular, zebra suave, **sem** Playfair no header do grupo (vira label Inter), divisores finos, faixa de classificação como borda lateral verde de 2px.
7. **SectionTitle** — selo 08-selo-circular-verde.png (h-5) + título em Playfair 18px + opcional sublinhado verde de 24px. Reutilizado em todas as seções.
8. **Botões** — `Button` primary continua verde, mas com altura 44px (toque) e raio 10px. Secundário branco com borda cl-verde.

## 3. Aplicação global

- `src/styles.css`: ajustar tokens, adicionar `.num`, `.tabs-underline`, `.chip`, `.row-table`, atualizar `.glass` (mais sutil — quase plano, só leve translucidez no header).
- `src/components/site/LayoutCliente.tsx`: remover textura geométrica de fundo (mantém só `bg-cl-cinza-bg`); textura passa para `Hero` em `/sobre-copa` e banner da home.
- `src/components/site/HeaderCliente.tsx`: ajustar altura/tipografia.
- `src/components/jogos/CardJogoAberto.tsx`: reescrever layout denso.
- `src/components/jogos/TabelaClassificacao.tsx`: header e células em Inter tabular, densidade nova.
- `src/routes/index.tsx`: aplicar `TabsCaju`/`ChipFiltro` no seletor de grupos; `SectionTitle` nas seções "Grupos" e "Jogos".
- `src/routes/palpitar.$jogoId.tsx`: cabeçalho do jogo usa novo layout denso (bandeiras + nomes em Inter, números em Inter tabular grandes). Botões padronizados.
- `/sobre-copa`, `/meus-palpites`: herdam automaticamente os novos tokens + `SectionTitle`.

## 4. Acessibilidade e marca

- Texto mínimo 14px no corpo; números/labels secundários 12–13px.
- Contraste AA verificado (verde-escuro sobre branco, branco sobre verde-escuro, cinza-texto sobre branco).
- Header sempre com logo horizontal Caju; selo circular em todo título de seção; Playfair como assinatura.

## 5. Entregas demonstradas

Após implementar, mostrar:
- Home (`/`) com tabs/chips de grupo + lista de jogos densa + tabela compacta.
- Tela de palpite (`/palpitar/:id`) com novo cabeçalho do jogo e botões padronizados.

## Não-objetivos

- Não trocar paleta nem remover marca.
- Não mexer em rotas, dados, RPCs, Realtime ou lógica de admin.
- Não alterar fluxos de cadastro/confirmação.
