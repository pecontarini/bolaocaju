## Problema

A RPC `fn_palpites_admin` é chamada uma única vez no botão "Participantes (CSV/PDF)" e o PostgREST/Supabase aplica um limite padrão de 1000 linhas por resposta. Resultado: o CSV sai truncado quando há mais de 1000 palpites.

## Solução

Paginar a chamada no cliente até esgotar os resultados, em vez de confiar em um único retorno.

### Passos

1. **`src/routes/admin.sorteios.tsx` — função `exportarParticipantes`**
   - Substituir a chamada única por um loop que busca em lotes de 1000 usando `.range(offset, offset + 999)` sobre a RPC:
     ```ts
     const PAGE = 1000;
     let offset = 0;
     const todos: ParticipanteExport[] = [];
     while (true) {
       const { data, error } = await supabase
         .rpc("fn_palpites_admin", { p_jogo_id: null })
         .range(offset, offset + PAGE - 1);
       if (error) throw error;
       const lote = (data ?? []) as ParticipanteExport[];
       todos.push(...lote);
       if (lote.length < PAGE) break;
       offset += PAGE;
     }
     ```
   - Passar `todos` para `exportarParticipantesCSV` / `exportarParticipantesPDF`.

2. **Feedback opcional**: manter o `Loader2` enquanto pagina (já existe via `exportandoPart`).

3. **Não alterar a RPC** nem mexer em `fn_meus_ganhadores` — ganhadores são poucos por jogo e não estouram o limite. Se quiser, posso aplicar a mesma paginação preventiva no "Exportar todos (ganhadores)", mas só se você confirmar.

### Por que paginar no cliente

- PostgREST tem `max-rows` configurado no projeto Supabase e não pode ser sobrescrito pelo front via header simples.
- `.range()` em cima de `.rpc()` é suportado e é a forma idiomática de iterar além do limite, sem mudanças no backend.

### Arquivos tocados

- `src/routes/admin.sorteios.tsx` (apenas a função `exportarParticipantes`)
