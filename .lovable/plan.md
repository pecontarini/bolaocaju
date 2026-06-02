# Revisão mobile do Bolão Caju Limão

Refino sutil, mobile-first, sem alterar marca, paleta, fontes (Playfair + Inter), banco, RPCs ou regras de negócio. Foco principal: como placares e confrontos são exibidos.

## Princípios visuais

- **Hierarquia do confronto**: bandeira maior + sigla (3 letras) como elemento dominante, nome do país secundário em caixa baixa. Placar tabular com `font-variant-numeric: tabular-nums` em peso display, sempre alinhado por baseline.
- **Espaçamento**: 16px (px-4) padrão, 12px entre cards, gutters seguros para iPhone SE (375px) sem cortes. `min-w-0` + `truncate` em todos os blocos de nome.
- **Safe areas**: aplicar `env(safe-area-inset-bottom)` em CTAs sticky e no padding do `<main>` para iOS.
- **Toque**: alvos mínimos 44×44px (botões +/- do palpite, ícones do header, linhas clicáveis em listas).
- **Glass**: manter o utilitário `.glass` já corrigido (sem `-webkit-backdrop-filter` manual). Sombra mais suave nos cards do cliente para dar leveza.
- **Microanimações sutis**: `transition-transform active:scale-[0.98]` nos cards/CTAs, fade-in dos cards de jogo, pulse leve no badge "Aberto".

## Cliente

### 1. Card de jogo aberto (`CardJogoAberto`)
Hoje: linha única apertada com `time_a × time_b`, bandeiras 22px, sigla pequena.
Novo layout mobile-first:
- Cabeçalho: hora à esquerda, badge "Aberto" (verde-claro com bolinha pulsante) à direita, fase/grupo discreto.
- Confronto centrado em 3 colunas: bandeira 40×30 com sombra, sigla 18px (display, peso 700), nome 11px truncado, ambos lados simétricos.
- Separador "×" em display 24px com cor cinza-texto.
- Linha de meta abaixo do confronto: estádio · cidade (texto 11px, ícone MapPin opcional) — só se couber.
- CTA "Palpitar" full-width, 48px, sombra verde discreta.

### 2. Lista de resultados (`ListaResultados`)
- Migrar de `<ul>` denso para cards de vidro empilhados com 56–64px de altura.
- Layout: data curta à esquerda (col fixa), confronto centro com siglas + bandeiras, placar à direita em chip arredondado verde-escuro destacando o resultado (`23  ×  10` com nums tabulares).
- Indicar vencedor com sigla em negrito; empate sem destaque.

### 3. Tela de palpite (`palpitar.$jogoId`)
- Reduzir o selo laranja de 80px para 56px no mobile e mover a saudação acima dele em coluna única para evitar quebra estranha quando o nome é longo.
- "É a hora!" passa a viver dentro do card de placar como subtítulo, liberando vertical no topo.
- Bloco placar: aumentar bandeira para 48px, sigla 20px; ticker (display do número) cresce para 64×64; botões +/- mantêm 40px mas ganham `min-h-11 min-w-11` com hit-area transparente.
- Estado vazio/erro de geo: ícone maior, texto mais arejado.
- CTA sticky com `pb-[env(safe-area-inset-bottom)]` e gradient blur por baixo para não cobrir o input.

### 4. Confirmação (`/confirmacao`)
- Card do palpite ganha placar em "chip" gigante centralizado, igual ao da apuração, reforçando memorabilidade.
- Comanda em pill destacada acima dos botões.

### 5. Home (`/`)
- Banner Copa: padding reduzido no mobile (`p-5`), `text-4xl` no número de dias, próximo jogo com bandeiras 28px e nome truncado correto.
- Saudação "Boa, fera!" + subtítulo virando um único bloco glass curto.
- SectionTitle ganha tamanho consistente (16px) e cor.
- `SemJogoAberto`: card glass com selo, mais ar.

### 6. Header cliente (`HeaderCliente`)
- Altura compacta (56px), logo 40px, sheet com itens 44px de altura, footer com versão/Boteco discreto.

## Admin

### 7. Topbar mobile (`AdminShell`)
- Mostrar o título da página atual ao lado do logo (compacto) para orientação. Reduzir padding para liberar área útil.
- Sheet: ativos ganham faixa laranja de 3px à esquerda.

### 8. PageHeader
- No mobile: título 24px (não 30px), subtítulo 13px. Ações descem para nova linha quando faltar largura (flex-wrap).

### 9. Cards de jogo/ganhadores no admin
- Aplicar mesmo padrão de confronto da home (siglas grandes, placar em chip) para consistência.
- Tabelas que estouram viram listas de cards no breakpoint `<md`.

## Tokens & CSS (`src/styles.css`)
- Adicionar utilitários:
  - `.tabular` → `font-variant-numeric: tabular-nums;`
  - `.placar-chip` → fundo `--cl-verde-escuro`, texto branco, radius 12, padding 6/12, display tabular.
  - `.safe-bottom` → `padding-bottom: max(12px, env(safe-area-inset-bottom));`
- Ajustar `.glass` para sombra menor no mobile via media query (mantendo desktop como está).
- Garantir `html { -webkit-text-size-adjust: 100%; }` para evitar zoom automático no iOS.

## Arquivos a editar

```text
src/styles.css                                  (utilitários + ajustes glass/safe-area)
src/components/site/HeaderCliente.tsx           (altura, alvos de toque)
src/components/site/LayoutCliente.tsx           (padding-bottom safe-area)
src/components/site/BannerCopa.tsx              (densidade mobile)
src/components/jogos/CardJogoAberto.tsx         (novo layout confronto)
src/components/jogos/ListaJogos.tsx             (resultados em cards + chip)
src/routes/index.tsx                            (espaçamentos, SectionTitle)
src/routes/palpitar.$jogoId.tsx                 (selo, placar maior, sticky safe-area)
src/routes/confirmacao.tsx                      (placar chip, comanda pill)
src/components/admin/AdminShell.tsx             (topbar mobile, PageHeader)
src/routes/admin.index.tsx                      (consistência de cards)
src/routes/admin.jogos.tsx                      (tabela→cards no mobile)
src/routes/admin.jogo.$id.tsx                   (placar chip + comandas em cards)
src/routes/admin.sorteios.tsx                   (consistência)
src/routes/admin.usuarios.tsx                   (cards mobile)
```

## Fora de escopo
- Mudanças de paleta, fontes, copy, fluxo de negócio, RPCs, schema, autenticação.
- Adicionar bibliotecas novas (sem framer-motion etc. — animações com CSS).
- Refatorações que não impactem mobile/visual.

## Verificação
1. Preview em 375×812 (iPhone SE), 390×844 (iPhone padrão) e 414×896.
2. Conferir home, palpitar, confirmação, /admin, /admin/jogo/:id sem scroll horizontal e sem texto cortado.
3. Smoke test do fluxo: cadastro → palpitar → confirmação.
