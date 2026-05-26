# Mapa de Disponibilidade — Correções e Melhorias

**Data:** 2026-05-26  
**Status:** Aprovado pelo usuário

---

## Escopo

Seis melhorias no módulo Mapa de Disponibilidade e na navegação geral do sistema:

1. Corrigir parsing de blocos/unidades do CVCRM e nomenclatura das células
2. Redesenhar célula com faixa de status de vistoria na base
3. Substituir modal por painel lateral (Sheet) com dados da unidade + cliente + botão "Ir para Gestão"
4. Botão "Ir para Gestão" navega para `/unidades/:id` (cria unidade se não existir)
5. Remover Unidades e Clientes do menu lateral
6. Mover Usuários para dentro de Configurações e remover do menu lateral

---

## 1. Correção do Parser (`src/lib/mapa-parser.ts`)

### Problema
Empreendimentos diferentes no CVCRM retornam campos com nomes distintos. O parser atual não normaliza bloco e fase de forma consistente, causando blocos vazios ou nomenclatura errada.

### Solução

**Nomenclatura do bloco:**
- Se `item.bloco` chega como número puro (ex: `"1"`), normalizar para `"BL 01"` (zero-padded, dois dígitos).
- Se já vem como texto composto (ex: `"Bloco 1"`, `"BL01"`), normalizar para `"BL 01"`.
- Aliases adicionais a tentar: `item.bloco`, `item.nome_bloco`, `item.idbloco`, `item.bl`.

**Nomenclatura da unidade:**
- Usar o campo bruto como identificador curto (ex: `"101"`).
- A célula visual exibe `{bloco} - {unidade}` (ex: `BL 01 - 101`).

**Fase:**
- Se `item.etapa` ou `item.fase` está vazio/nulo, **não criar** grupo de fase — agrupar diretamente por bloco.
- Aliases: `item.etapa`, `item.fase`, `item.nome_etapa`, `item.idetapa`.

**Campos de status:**
- Aliases: `item.situacao`, `item.status`, `item.situacao_unidade`, `item.status_unidade`.

---

## 2. Redesenho das Células (`src/components/mapa/BlocoGrid.tsx`)

### Layout da célula

```
┌──────────────────────┐
│  BL 01 - 101  (bold) │  ← {bloco} - {unidade}
│    50,02 m²          │  ← área privativa ou total
├──────────────────────┤
│   NÃO LIB            │  ← faixa base: status vistoria
└──────────────────────┘
```

- **Fundo:** cor comercial CVCRM (`STATUS_BG[status]`)
- **Faixa base:** `div` absoluta na base, fundo `rgba(0,0,0,0.45)`, texto branco, `text-[9px]` uppercase
- **Altura mínima:** 58px (aumentar de 54px para acomodar faixa)

### Abreviações de status de vistoria

| Status Supabase (`unidades.status`) | Faixa |
|---|---|
| não encontrado no Supabase | `NÃO LIB` |
| `aguardando_liberacao` | `NÃO LIB` |
| `unidade_liberada` | `LIBERADA` |
| `vistoria_agendada` | `AGENDADA` |
| `vistoria_concluida` | `APROVADA` |
| `vistoria_reprovada` | `REPROVADA` |
| `vistoria_cancelada` | `CANCELADA` |

### Hook: `useVistoriaStatusMap`

```typescript
// src/hooks/useMapaDisponibilidade.ts (adição)
export type VistoriaStatusMap = Map<string, string> // key: "bloco::numero"

export function useVistoriaStatusMap(idEmpreendimento: string | null): {
  data: VistoriaStatusMap
}
```

- Query única em `unidades` filtrando por `empreendimento_id` (lookup por nome do empreendimento ou campo `id_cvcrm_empreendimento` se existir)
- Retorna Map com chave `"${bloco}::${numero}"` → status
- `staleTime: 30_000`

**Desafio de correspondência:** A tabela `unidades` usa `empreendimento_id` (UUID FK para `empreendimentos`). O mapa usa `id_empreendimento` (ID CVCRM string). Solução: buscar empreendimento pelo nome via `empreendimentos_mapa.nome` → `empreendimentos.nome` para obter o UUID, ou armazenar o `id_cvcrm` na tabela `empreendimentos`.

Abordagem mais simples: a query busca **todos** os registros de `unidades` com join em `empreendimentos` filtrando por `empreendimentos.nome = mapa.nome`. Assim não é necessária migração.

---

## 3. Painel Lateral (`src/components/mapa/UnidadeSidePanel.tsx`)

Novo componente. Substitui o `UnidadeModal` (Dialog) por um `Sheet` deslizante da direita.

### Estrutura

```
Sheet (side="right", width ~420px)
├── Cabeçalho colorido (STATUS_BG[status comercial])
│   ├── Código: "BL 01 - 101"
│   ├── Empreendimento
│   └── Badge status comercial
├── Seção: Dados Técnicos (CVCRM)
│   ├── Tipologia
│   ├── Área total / privativa
│   └── Vagas
├── Seção: Status de Vistoria
│   └── Badge colorido
├── Seção: Proprietário / Cliente (Supabase)
│   ├── Nome, e-mail, CPF (se vinculado)
│   └── "Sem cliente vinculado" (se não houver)
├── Seção: Valores (admin only)
│   ├── Valor de venda
│   └── Valor de avaliação (editável inline)
└── Footer
    └── Botão "Ir para Gestão da Vistoria" (primary, full-width)
```

### Lógica do botão "Ir para Gestão da Vistoria"

```
1. Buscar em `unidades` WHERE bloco = cvcrm.bloco AND numero = cvcrm.unidade
   AND empreendimento_id IN (SELECT id FROM empreendimentos WHERE nome = mapa.nome)
2. Se encontrar → navigate('/unidades/:id')
3. Se não encontrar → INSERT em `unidades` (bloco, numero, empreendimento_id, status='aguardando_liberacao')
                    → navigate('/unidades/:id_criado')
```

### Dados carregados no painel

```typescript
// hook interno do painel
function useUnidadeSupabase(bloco: string, numero: string, empNome: string) {
  // query: unidades + cliente vinculado + agendamento ativo
}
```

---

## 4. Navegação (`src/components/layout/AppSidebar.tsx`)

### Remover do sidebar
- **Unidades** — rota `/unidades` continua existindo, apenas some do menu
- **Clientes** — rota `/clientes` continua existindo, apenas some do menu

### Mover Usuários → Configurações

**`src/pages/configuracoes/ConfiguracoesAgendamento.tsx`** (ou nova página `Configuracoes.tsx`):
- Adicionar aba `Tabs` com duas abas: **Agendamentos** | **Usuários**
- A aba Usuários renderiza o conteúdo atual de `src/pages/usuarios/Usuarios.tsx`
- Remover **Usuários** do sidebar
- Rota `/usuarios` pode redirecionar para `/configuracoes?tab=usuarios`

---

## 5. Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `src/lib/mapa-parser.ts` | Modificar — normalização de bloco/fase/unidade |
| `src/hooks/useMapaDisponibilidade.ts` | Adicionar `useVistoriaStatusMap` |
| `src/components/mapa/BlocoGrid.tsx` | Modificar — novo layout de célula com faixa |
| `src/components/mapa/UnidadeSidePanel.tsx` | Criar — substitui UnidadeModal |
| `src/components/mapa/UnidadeModal.tsx` | Remover ou manter para compatibilidade |
| `src/pages/mapa/MapaDisponibilidade.tsx` | Modificar — usar UnidadeSidePanel |
| `src/components/layout/AppSidebar.tsx` | Modificar — remover Unidades, Clientes, Usuários |
| `src/pages/configuracoes/ConfiguracoesAgendamento.tsx` | Modificar — adicionar aba Usuários |
| `src/App.tsx` | Adicionar redirect `/usuarios` → `/configuracoes` |

---

## 6. Não está no escopo

- Migração de schema (sem novas colunas no banco)
- Alterações no portal do cliente
- Alterações nas páginas de Agendamentos
- Remoção das rotas `/unidades` e `/clientes` (apenas saem do menu)
