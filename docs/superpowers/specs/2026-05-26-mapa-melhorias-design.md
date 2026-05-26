# Mapa de Disponibilidade — Correções e Melhorias

**Data:** 2026-05-26  
**Status:** v4 — terceira revisão

---

## Escopo

1. Corrigir parsing de blocos/unidades do CVCRM e nomenclatura das células
2. Redesenhar célula com faixa de status de vistoria na base
3. Substituir modal por painel lateral (Sheet) com dados + botão "Ir para Gestão"
4. Botão "Ir para Gestão" navega para `/unidades/:id` (admin pode criar se não existir)
5. Remover Unidades e Clientes do menu lateral
6. Mover Usuários para dentro de Configurações e remover do menu lateral

---

## 1. Parser (`src/lib/mapa-parser.ts`)

### `normBloco(v: any): string`

Exportada do parser para uso em outros módulos (hooks, BlocoGrid):

```typescript
export function normBloco(v: any): string {
  const s = String(v ?? '').trim()
  const m = s.match(/\d+/)
  if (!m) return s // fallback: retorna original se sem número
  return `BL ${m[0].padStart(2, '0')}`
}
```

Exemplos: `"1"` → `"BL 01"`, `"Bloco 2"` → `"BL 02"`, `"BL01"` → `"BL 01"`, `"BL 02"` → `"BL 02"`.

### Normalização no parser

O parser chama `normBloco` ao extrair o bloco de cada item:

```typescript
const bloco = normBloco(item.bloco ?? item.nome_bloco ?? item.idbloco ?? item.bl ?? '')
```

Portanto **`u.bloco` em qualquer `MapaUnidade` já está normalizado**. Os consumidores (BlocoGrid, hooks) usam `u.bloco` diretamente nas chaves, sem chamar `normBloco` novamente.

### Aliases de campo

```typescript
const fase    = String(item.etapa ?? item.fase ?? item.nome_etapa ?? item.idetapa ?? '').trim()
const status  = normStatus(item.situacao ?? item.status ?? item.situacao_unidade ?? item.status_unidade)
const unidade = String(item.unidade ?? item.idunidade_int ?? item.idunidade ?? '').trim()
```

### Fase opcional

- `fase` permanece `string` no tipo (pode ser `''`).
- Se `fase === ''`, o bloco não exibe label de fase no header (ver §3).
- **Não usar** `'Fase 1'` como fallback.

### Chave interna

- Chave no `blocoMap`: `${fase}||${bloco}` (bloco já normalizado).
- Chave nos mapas de valores e vistoria: `"${u.bloco}::${u.unidade}"` — bloco já normalizado.

---

## 2. Tipos (`src/types/mapa.ts`)

### Adições

Os **6 valores exatos** do tipo `VistoriaStatus` e seus labels:

```typescript
export type VistoriaStatus =
  | 'nao_liberada'   // label: 'NÃO LIB'
  | 'liberada'       // label: 'LIBERADA'
  | 'agendada'       // label: 'AGENDADA'
  | 'aprovada'       // label: 'APROVADA'
  | 'reprovada'      // label: 'REPROVADA'
  | 'cancelada'      // label: 'CANCELADA'

export const VISTORIA_STATUS_LABEL: Record<VistoriaStatus, string> = {
  nao_liberada: 'NÃO LIB',
  liberada:     'LIBERADA',
  agendada:     'AGENDADA',
  aprovada:     'APROVADA',
  reprovada:    'REPROVADA',
  cancelada:    'CANCELADA',
}

export type VistoriaStatusMap = Map<string, VistoriaStatus>
```

### Mapeamento `unidades.status` (string | null) → `VistoriaStatus`

```
null / não encontrada   → nao_liberada
aguardando_liberacao    → nao_liberada
unidade_liberada        → liberada
vistoria_agendada       → agendada
vistoria_concluida      → aprovada
vistoria_reprovada      → reprovada
vistoria_cancelada      → cancelada
qualquer outro valor    → nao_liberada
```

### Alinhamento `unidades.numero` ↔ CVCRM `unidade`

O campo `unidades.numero` (Supabase) deve conter o mesmo valor que o campo `unidade` do CVCRM (ex: `"101"`, `"102"`). Nenhuma normalização adicional é aplicada a este campo — a correspondência assume que os valores foram cadastrados consistentemente. Se houver divergência de formato (ex: Supabase `"Apto 101"` vs CVCRM `"101"`), o lookup falhará silenciosamente e a faixa mostrará `NÃO LIB`. Este risco de dados está fora do escopo desta implementação.

---

## 3. Hooks (`src/hooks/useMapaDisponibilidade.ts`)

### `useVistoriaStatusMap`

```typescript
export function useVistoriaStatusMap(
  empNome: string  // mapa.nome (do CVCRM API — campo nome_empreendimento)
): { data: VistoriaStatusMap }
```

- O parâmetro `idEmpreendimentoCvcrm` **não é incluído** — a chave da query usa `empNome`.
- `queryKey: ['vistoria-status-map', empNome]`, `staleTime: 30_000`.

**Passos da queryFn:**

1. Buscar em tabela **`empreendimentos`** (não `empreendimentos_mapa`): `SELECT id FROM empreendimentos WHERE nome ILIKE :empNome LIMIT 1`
2. Se não encontrar → retornar `new Map()` (células exibirão `NÃO LIB`)
3. Buscar em tabela **`unidades`**: `SELECT bloco, numero, status FROM unidades WHERE empreendimento_id = :uuid`
4. Construir mapa: `map.set(\`${u.bloco}::${u.numero}\`, mapVistoriaStatus(u.status))`
   - `u.bloco` pode vir sem normalização do banco → chamar `normBloco(u.bloco)` ao construir a chave neste passo
5. Retornar mapa

> **Risco de nome:** se `empreendimentos.nome` no Supabase diferir do `nome_empreendimento` do CVCRM (acento, caixa, espaço), a query retorna vazio e as células mostram `NÃO LIB`. O ILIKE resolve diferenças de caixa; diferenças de acento ou espaço não são tratadas automaticamente. Este é um risco de dados a monitorar, não tratado em código neste escopo.

### `useUnidadeValores` — normalização de chaves

Ao construir o `ValoresMap` a partir das linhas do banco, usar `normBloco` na chave:

```typescript
map[`${normBloco(row.bloco)}::${row.unidade}`] = row
```

Assim chaves antigas com bloco numérico (`"1::101"`) e novas normalizadas (`"BL 01::101"`) convergem para o mesmo formato.

---

## 4. Células (`src/components/mapa/BlocoGrid.tsx`)

### Props adicionais

```typescript
interface Props {
  bloco: MapaBloco
  valores: ValoresMap
  vistoriaMap: VistoriaStatusMap  // novo
  onSelect: (u: MapaUnidade) => void
  hideBloqueada?: boolean
}
```

### Layout da célula

A linha atual `<span>{u.unidade}</span>` (linha 100) é **substituída** por:

```tsx
<span className="font-bold text-[11px] leading-tight tracking-wide truncate w-full text-center">
  {u.bloco} - {u.unidade}
</span>
```

Estrutura completa da célula:

```tsx
<button style={{ backgroundColor: bg, minHeight: 62 }} ...>
  {/* Conteúdo central */}
  <div className="flex flex-col items-center justify-center h-full px-1 py-1.5 gap-0.5 pb-5">
    <span className="font-bold text-[11px] ...">{u.bloco} - {u.unidade}</span>
    {u.area_total != null && (
      <span className="text-[9px] opacity-85">{u.area_total.toFixed(2)} m²</span>
    )}
  </div>
  {/* Faixa de vistoria */}
  <div
    className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-semibold uppercase leading-none py-1"
    style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: 'white' }}
  >
    {VISTORIA_STATUS_LABEL[vistoriaMap.get(`${u.bloco}::${u.unidade}`) ?? 'nao_liberada']}
  </div>
</button>
```

### Header do BlocoGrid — fase condicional

```tsx
{bloco.fase ? (
  <>
    <span className="text-muted-foreground font-normal">{bloco.fase}</span>
    <span className="text-muted-foreground">»</span>
    <span className="text-muted-foreground">{'>'}</span>
  </>
) : null}
<span>{bloco.bloco}</span>
```

---

## 5. Painel Lateral (`src/components/mapa/UnidadeSidePanel.tsx`)

Novo componente. Usa `Sheet` (shadcn/ui, `side="right"`), largura `w-[440px]`.

### Hook interno `useUnidadeSupabase`

```typescript
function useUnidadeSupabase(bloco: string, numero: string, empNome: string) {
  // Query 1: empreendimentos WHERE nome ILIKE empNome (tabela: empreendimentos)
  // Query 2 (depende Q1): unidades WHERE empreendimento_id = uuid AND bloco = bloco AND numero = numero (maybeSingle)
  // Query 3 (depende Q2): clientes WHERE unidade_id = unidade.id LIMIT 1
  // Retorna: { unidade, cliente, empId, isLoading }
}
```

`empNome` vem de `mapa.nome` em `MapaDisponibilidade` (campo `nome_empreendimento` retornado pela API CVCRM).

### Estrutura

```
Sheet (right, w-[440px])
├── Cabeçalho colorido (STATUS_BG[status comercial])
│   ├── "{bloco} – {unidade}"
│   ├── empNome
│   └── Badge status comercial
├── ScrollArea
│   ├── Dados Técnicos (CVCRM): tipologia, área total, área privativa, vagas
│   ├── Status de Vistoria: Badge com VISTORIA_STATUS_LABEL
│   ├── Proprietário / Cliente:
│   │   ├── [loading] skeleton
│   │   ├── [com cliente] Nome, e-mail, CPF
│   │   └── [sem cliente] "Sem cliente vinculado"
│   └── Valores (admin only): valor de venda e avaliação (editável inline)
└── Footer fixo
    └── Botão "Ir para Gestão da Vistoria" (primary, full-width)
```

### Lógica do botão

```
Se unidade encontrada:
  → navigate('/unidades/' + unidade.id)

Se não encontrada + isAdmin:
  → INSERT INTO unidades { empreendimento_id: empId, bloco, numero, status: 'aguardando_liberacao' }
     (apenas esses 4 campos; demais são nullable)
  → toast.success("Unidade criada e aberta para gestão")
  → navigate('/unidades/' + novaUnidade.id)

Se não encontrada + !isAdmin (vistoriador):
  → Botão disabled, tooltip: "Unidade não cadastrada. Solicite ao administrador."
```

### Substituição em `MapaDisponibilidade.tsx`

- `unidadeAtiva` continua como `MapaUnidade | null`
- `<UnidadeModal>` é substituído por `<UnidadeSidePanel>`
- `UnidadeModal.tsx` mantido no repositório (não deletado), mas não mais renderizado na página principal

---

## 6. Navegação

### Sidebar (`src/components/layout/AppSidebar.tsx`)

Remover de `adminItems`:
- `{ title: "Unidades", ... }`, `{ title: "Clientes", ... }`, `{ title: "Usuários", ... }`

Remover de `vistoriadorItems`:
- `{ title: "Unidades", ... }`, `{ title: "Clientes", ... }`

Atualizar em ambas as listas:
- `{ title: "Configurações", url: "/configuracoes", ... }` (era `/configuracoes/agendamentos`)

> Atenção: sidebar e rotas devem ser atualizados na mesma mudança para evitar redirect-loop.

### Nova página `Configuracoes.tsx`

`src/pages/configuracoes/Configuracoes.tsx`:

```tsx
// Tabs shadcn/ui: "Agendamentos" | "Usuários" (tab Usuários visível só para admin)
// Aba "Agendamentos": importa <ConfiguracoesAgendamento embedded /> 
// Aba "Usuários": importa <Usuarios embedded />
```

**Modo embedded:** Tanto `ConfiguracoesAgendamento.tsx` quanto `Usuarios.tsx` têm padding externo (`p-6 space-y-6` etc.) que causaria duplo espaçamento dentro de uma aba. A solução:

- Adicionar prop `embedded?: boolean` em cada componente
- Quando `embedded === true`, omitir o `<div className="p-6 ...">` externo — o layout fica a cargo da `Configuracoes.tsx`
- O modo padrão (sem prop) mantém o comportamento atual (página standalone ainda funciona via rota direta)

`ConfiguracoesAgendamento.tsx` e `Usuarios.tsx` continuam exportando um componente standalone — apenas ganham a prop opcional `embedded`.

### `src/App.tsx`

```tsx
// Nova rota principal
<Route path="/configuracoes" element={<AdminPage><Configuracoes /></AdminPage>} />

// Redirects
<Route path="/configuracoes/agendamentos" element={<Navigate to="/configuracoes" replace />} />
<Route path="/usuarios" element={<Navigate to="/configuracoes" replace />} />
```

### `AdminLayout.tsx`

- **Remover** a guarda `pathname.startsWith("/mapa/")` (com barra final — nunca bate em `/mapa` exato)
- **Adicionar** entrada no `pageTitles`: `'/mapa': 'Mapa de Disponibilidade'`
- O mecanismo de lookup usa `pageTitles[pathname]` ou `Object.entries(pageTitles).find(([p]) => pathname.startsWith(p))` — garantir que `/mapa` seja incluído nesse mapa, não em uma guarda separada

---

## 7. Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `src/types/mapa.ts` | Adicionar `VistoriaStatus`, `VistoriaStatusMap`, `VISTORIA_STATUS_LABEL` |
| `src/lib/mapa-parser.ts` | Exportar `normBloco`, corrigir aliases, remover fallback 'Fase 1' |
| `src/hooks/useMapaDisponibilidade.ts` | Adicionar `useVistoriaStatusMap`; normalizar chaves em `useUnidadeValores` |
| `src/components/mapa/BlocoGrid.tsx` | Nova célula com faixa de vistoria, prop `vistoriaMap`, fase condicional |
| `src/components/mapa/UnidadeSidePanel.tsx` | Criar — Sheet com dados CVCRM + Supabase + botão gestão |
| `src/pages/mapa/MapaDisponibilidade.tsx` | Usar `UnidadeSidePanel` + `useVistoriaStatusMap` |
| `src/pages/configuracoes/Configuracoes.tsx` | Criar — Tabs: Agendamentos + Usuários |
| `src/components/layout/AppSidebar.tsx` | Remover Unidades/Clientes/Usuários; Configurações → `/configuracoes` |
| `src/components/layout/AdminLayout.tsx` | Adicionar `/mapa` ao pageTitles |
| `src/App.tsx` | Rota `/configuracoes` + redirects de `/configuracoes/agendamentos` e `/usuarios` |

---

## 8. Fora do escopo

- Migração de schema
- Portal do cliente
- Remoção das rotas `/unidades`, `/clientes`, `/usuarios`
- Migração de dados existentes em `unidade_valores`
