# Domma Vistorias

Sistema de gestão de vistorias de entrega de unidades imobiliárias, integrado ao CVCRM. Permite que a construtora gerencie empreendimentos, unidades e agendamentos de vistoria, enquanto clientes acessam um portal próprio para acompanhar e agendar suas vistorias.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS + Radix UI |
| Roteamento | React Router DOM v6 |
| Estado / Cache | TanStack Query v5 |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Edge Functions | Deno (TypeScript) |
| Calendário | react-big-calendar |
| Integração CRM | CVCRM REST API |

---

## Funcionalidades

### Painel Administrativo

#### Empreendimentos
- Cadastro e edição de empreendimentos
- Liberação de unidades em duas alçadas (relacionamento → vistoriador)
- Configuração de disponibilidade por unidade (dias da semana, horários, período)

#### Mapa de Disponibilidade
- Visualização em tempo real do mapa de unidades integrado ao CVCRM
- Cores por status: disponível, reservada, vendida, bloqueada, em processo
- Sobreposição com status de vistoria do sistema local
- Importação de valores por planilha XLSX

#### Agendamentos
- Calendário interativo com visão mensal/semanal/diária
- Filtros por empreendimento e status
- Confirmação, conclusão e cancelamento de vistorias
- Histórico de status por agendamento

#### Clientes
- Cadastro manual de clientes vinculados a unidades
- Importação via CSV
- **Importação direta do CVCRM**: busca clientes de unidades vendidas e cria unidades automaticamente caso não existam
- Filtros por empreendimento
- Detalhamento com dados pessoais, agendamentos e documentos

#### Configurações
- Parâmetros de agendamento (antecedência mínima, prazo máximo)
- Gerenciamento de usuários (admin, vistoriador, relacionamento)

---

### Portal do Cliente (`/cliente`)

Portal mobile-first para que o comprador acompanhe e agende a vistoria da sua unidade.

- **Login**: CPF + e-mail (autenticação via RPC PostgreSQL)
- **Home**: resumo de vistorias, status da unidade, link para o Portal CV da construtora
- **Agendar**: fluxo em etapas — dados → data → horário → confirmação — respeitando a disponibilidade configurada por unidade
- **Histórico**: listagem de todos os agendamentos com status
- **Unidade**: detalhes da unidade vinculada ao cliente

---

## Integração CVCRM

Duas Edge Functions consomem a API do CVCRM:

| Função | Endpoint CVCRM | Uso |
|--------|---------------|-----|
| `cv-crm-mapa` | `/api/v1/comercial/mapadisponibilidade/{id}` | Mapa de disponibilidade com paginação automática |
| `cv-crm-reservas` | `/api/v1/cvdw/reservas` | Lista de unidades vendidas com dados do comprador |

---

## Edge Functions (Supabase / Deno)

| Função | Descrição |
|--------|-----------|
| `cancel-agendamento` | Cancelamento de agendamento com validação de antecedência |
| `get-available-slots` | Horários disponíveis para uma unidade em uma data |
| `manage-users` | Criação e gestão de usuários admin via service role |
| `cv-crm-mapa` | Proxy autenticado para o mapa do CVCRM |
| `cv-crm-reservas` | Proxy autenticado para reservas do CVCRM |

---

## Perfis de Acesso

| Perfil | Acesso |
|--------|--------|
| `admin` | Acesso total: empreendimentos, clientes, agendamentos, mapa, configurações, usuários |
| `vistoriador` | Agendamentos e mapa |
| `relacionamento` | Agendamentos, mapa e liberação de unidades (alçada 1) |

---

## Banco de Dados — Principais tabelas

| Tabela | Descrição |
|--------|-----------|
| `empreendimentos` | Projetos imobiliários |
| `unidades` | Unidades de cada empreendimento |
| `clientes` | Compradores vinculados a unidades |
| `agendamentos` | Vistorias agendadas |
| `historico_status` | Log de mudanças de status |
| `sessoes_cliente` | Sessões do portal do cliente |
| `configuracoes` | Parâmetros globais do sistema |
| `disponibilidade` | Slots de disponibilidade por data |
| `documentos` | Arquivos vinculados a clientes |
| `profiles` | Perfis dos usuários admin |

---

## Configuração Local

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)

### 1. Clone e instale dependências

```bash
git clone https://github.com/Dommainc/Domma-Vistorias.git
cd Domma-Vistorias
npm install
```

### 2. Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_anon_key
VITE_SUPABASE_PROJECT_ID=seu_project_id
```

### 3. Função de autenticação do portal

No SQL Editor do Supabase, execute:

```sql
ALTER TABLE clientes ALTER COLUMN data_nascimento DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.authenticate_cliente(p_cpf text, p_email text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cliente record;
  v_token uuid;
BEGIN
  p_cpf   := regexp_replace(p_cpf, '\D', '', 'g');
  p_email := lower(trim(p_email));
  SELECT id, nome_completo INTO v_cliente
  FROM clientes WHERE cpf = p_cpf AND lower(email) = p_email LIMIT 1;
  IF v_cliente IS NULL THEN
    RETURN json_build_object('error', 'CPF ou e-mail incorretos.');
  END IF;
  INSERT INTO sessoes_cliente (cliente_id, expira_em)
  VALUES (v_cliente.id, now() + interval '8 hours')
  RETURNING token_sessao INTO v_token;
  RETURN json_build_object(
    'token_sessao', v_token::text,
    'cliente_id',   v_cliente.id::text,
    'nome',         v_cliente.nome_completo
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.authenticate_cliente TO anon, authenticated;
```

### 4. Variáveis de ambiente das Edge Functions

No painel do Supabase → **Settings → Edge Functions**, configure:

```
CVCRM_EMAIL=seu@email.com
CVCRM_TOKEN=seu_token_cvcrm
CVCRM_BASE_URL=https://suaempresa.cvcrm.com.br/api/v1
```

### 5. Rode o projeto

```bash
npm run dev
# http://localhost:8080
```

---

## Rotas

### Painel Admin

| Rota | Descrição |
|------|-----------|
| `/` | Dashboard |
| `/empreendimentos` | Lista de empreendimentos |
| `/empreendimentos/:id/liberacao` | Liberação de unidades |
| `/agendamentos` | Calendário de agendamentos |
| `/mapa` | Mapa de disponibilidade CVCRM |
| `/clientes` | Gestão de clientes |
| `/configuracoes` | Configurações e usuários |

### Portal do Cliente

| Rota | Descrição |
|------|-----------|
| `/cliente/login` | Login com CPF + e-mail |
| `/cliente` | Home do cliente |
| `/cliente/agendamento` | Fluxo de agendamento |
| `/cliente/historico` | Histórico de vistorias |
| `/cliente/unidade` | Detalhes da unidade |

---

## Scripts

```bash
npm run dev       # Servidor de desenvolvimento (porta 8080)
npm run build     # Build de produção
npm run preview   # Preview do build
npm run test      # Testes unitários
npm run lint      # Lint
```

---

## Licença

Uso interno — Domma Incorporadora.
