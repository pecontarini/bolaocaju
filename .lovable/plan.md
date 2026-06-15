## Objetivo
Na aba admin `/admin/sorteios` (Ganhadores), adicionar, dentro de cada jogo expandido, dois botões: **Exportar PDF** e **Exportar CSV**, contendo todos os ganhadores daquele jogo, agrupados por marca e unidade.

## Escopo
- Apenas tela `src/routes/admin.sorteios.tsx` (componente `ItemJogo`).
- Usa os dados já carregados via `fn_meus_ganhadores(p_jogo_id)` — sem mudar RPC nem backend.
- Admin geral → exporta de todas as marcas/unidades visíveis; gerente → apenas da unidade dele (a RPC já filtra).

## CSV
- Nome do arquivo: `ganhadores-jogo-{numero_jogo}-{TIMEA}x{TIMEB}.csv`.
- Separador `;` (padrão BR para abrir no Excel), UTF-8 com BOM.
- Cabeçalho: `Marca;Unidade;Comanda;Nome;Telefone;Placar;Jogo;Data`.
- Uma linha por ganhador. Telefone em formato cru (sem máscara) para facilitar contato.
- Geração client-side com `Blob` + link `download`. Sem libs novas.

## PDF
- Geração client-side com `jspdf` + `jspdf-autotable` (adicionar como dependências).
- Identidade visual da marca atual via `useBranding()`:
  - Logo no topo (carregado de `logoSrc`, convertido para dataURL antes de adicionar).
  - Cor primária (`--cl-verde` resolvida via `getComputedStyle`) na faixa do cabeçalho e nos headers das tabelas.
  - Nome de exibição da marca no título: "Bolão {nomeExibicao} — Ganhadores".
- Conteúdo:
  - Cabeçalho: logo + título + subtítulo com placar final (`TIMEA X x Y TIMEB`), número do jogo e data/hora (`formatarDataHoraBR`).
  - Resumo: total de comandas ganhadoras.
  - Para admin geral: uma seção por marca (slug em destaque) e, dentro, subseção por unidade com tabela (Comanda, Nome, Telefone).
  - Para gerente: uma única tabela (Comanda, Nome, Telefone) com o nome da unidade no subtítulo.
  - Rodapé com numeração de página e data de emissão.
- Nome do arquivo: `ganhadores-jogo-{numero_jogo}.pdf`.

## UI
- Dois botões `Button` (variant `outline`, size `sm`) lado a lado, acima da caixa "Chopps servidos", visíveis somente quando `lista.length > 0`.
- Ícones `FileDown` (lucide) já disponível.
- Desabilitados enquanto `ganhadoresQ.isLoading`.

## Detalhes técnicos
- Novo módulo `src/lib/admin/export-ganhadores.ts` exportando `exportarGanhadoresCSV(jogo, lista)` e `exportarGanhadoresPDF(jogo, lista, branding)`.
- Carregar logo como dataURL via `fetch(logoSrc).then(r => r.blob()).then(...FileReader)` — fallback silencioso se falhar (PDF sai sem logo).
- Resolver cor primária a partir de `getComputedStyle(document.documentElement).getPropertyValue('--cl-verde')`.
- Dependências novas: `jspdf`, `jspdf-autotable` (instalar via `bun add` antes de importar).
- Sem alterações em rotas, RPCs, RLS, ou outras telas.
