# Fluxo — Controle de Gastos Mensais

SPA para registrar entradas e saídas, acompanhar o saldo mensal e visualizar a distribuição dos gastos.

## Aplicação publicada

[Abrir o Controle de Gastos](https://godoy-jr.github.io/controle-gastos-mensais/)

## Primeira versão

- Cadastro, edição e remoção de receitas e despesas;
- duplicação assistida de movimentações recorrentes, com revisão antes de salvar;
- categorias dinâmicas por tipo;
- filtro por mês e tipo;
- resumo de saldo, entradas e saídas;
- gráficos de fluxo financeiro e categorias;
- histórico com exclusão;
- metas mensais de gastos por categoria;
- pontuação de saúde financeira;
- assistente local com recomendações personalizadas;
- comparação com o mês anterior;
- gráfico de evolução dos últimos seis meses;
- busca por descrição ou categoria;
- exportação das movimentações para CSV;
- aba de aparência com temas claro, escuro e automático, mantendo a preferência salva;
- persistência local;
- consulta de cotações B3 de ações, ETFs e FIIs via brapi.dev;
- carteira local com preço médio, valor atual e lucro/prejuízo estimado;
- interface responsiva.

## Tecnologias

- React para a interface e gerenciamento de estado;
- Vite para desenvolvimento local e geração da versão de produção.

## Análise inteligente

O assistente utiliza regras explicáveis para avaliar saldo, taxa de economia, maior categoria de gastos e cumprimento das metas. Todo o processamento acontece localmente, sem transmitir dados financeiros.

As recomendações locais continuam sem transmissão de dados. O novo chat Gemini é separado e envia somente a pergunta e um resumo agregado dos últimos 30 dias, depois de autenticar e enviar a mensagem.

## Cotações e carteira

A busca e as cotações usam a API pública da [brapi.dev](https://brapi.dev/), sem chave de API no navegador. A carteira (até 8 ativos) fica salva no armazenamento local do navegador. No plano gratuito, a API informa atualização de cotações em intervalos de até 30 minutos; a aplicação consulta a carteira automaticamente a cada 30 minutos. Os valores de lucro/prejuízo são estimativas sobre o preço médio informado e não incluem taxas, impostos ou proventos.

## Como executar localmente

Requer Node.js 22 ou superior.

```bash
npm ci
npm run dev
```

Para validar a versão de produção:

```bash
npm run build
```

O GitHub Actions gera e publica automaticamente `frontend/dist` no GitHub Pages quando há um push para a branch `main`.

## Mercado e API financeira

O projeto inclui uma API Express em TypeScript e páginas para câmbio, notícias financeiras e assistência Gemini. Os gráficos de entradas/saídas, distribuição por categoria, evolução mensal e câmbio usam Recharts. As movimentações e metas do dashboard legado continuam salvas no navegador.

### Estrutura

```text
backend/src/
├── config/          # Configuração validada por Zod
├── controllers/     # Controladores HTTP
├── lib/             # Prisma e cache TTL em memória
├── middleware/      # JWT e tratamento central de erros
├── repositories/    # Acesso a dados via Prisma
├── routes/          # Rotas REST
├── services/        # Regras de negócio e integrações externas
└── utils/
frontend/
├── components/      # Páginas, gráficos e componentes de mercado
└── services/        # Cliente HTTP da API
prisma/schema.prisma
```

### Banco de dados

O schema Prisma em `prisma/schema.prisma` define:

- `User`: e-mail único e hash da senha (nunca a senha em texto puro);
- `Category`: categorias próprias por usuário e tipo, únicas por nome/tipo;
- `Transaction`: valor decimal, data, tipo (entrada, despesa ou investimento), usuário e categoria.

A API oferece CRUD multiusuário autenticado para movimentações e listagem/criação de categorias. A tela de movimentações atual permanece local e ainda não sincroniza automaticamente com esse CRUD. Para perguntas no chat, o frontend envia apenas totais e despesas por categoria agregadas dos últimos 30 dias; não envia descrições nem o histórico completo.

### Executar localmente

1. Copie `.env.example` para `.env` e defina `JWT_SECRET` com ao menos 32 caracteres aleatórios. Para habilitar respostas do chat, configure `GEMINI_API_KEY`. Não compartilhe nem coloque chaves no frontend.
2. Inicie o PostgreSQL local com `docker compose up -d postgres` (ou informe uma instância em `DATABASE_URL`).
3. Instale as dependências e aplique a migration inicial:

```bash
npm ci
npm run db:migrate:dev
```

4. Em terminais separados, inicie a API e a aplicação:

```bash
npm run dev:api
npm run dev
```

O Vite encaminha `/api` para `http://localhost:3001`. A API disponibiliza `GET /api/health`.
Em ambientes publicados, aplique migrations existentes com `npm run db:migrate:deploy`.

### Rotas REST

| Método | Rota | Acesso | Finalidade |
|---|---|---|---|
| `POST` | `/api/auth/register` | Público | Criar conta e receber JWT |
| `POST` | `/api/auth/login` | Público | Autenticar e receber JWT |
| `GET`, `POST` | `/api/transactions` | JWT | Listar por mês e criar movimentações |
| `GET` | `/api/transactions/summary?month=AAAA-MM` | JWT | Resumo mensal |
| `PATCH`, `DELETE` | `/api/transactions/:id` | JWT | Atualizar/remover movimentação |
| `GET`, `POST` | `/api/transactions/categories` | JWT | Listar/criar categorias da conta |
| `GET` | `/api/currencies?base=BRL&symbols=USD,EUR` | Público | Câmbio via AwesomeAPI (cache de 60 s); usa referência diária alternativa quando o provedor principal está indisponível |
| `GET` | `/api/currencies/history?base=BRL&quote=USD&days=30` | Público | Histórico de câmbio; usa Frankfurter como alternativa para pares suportados |
| `GET` | `/api/news?category=economy` | Público | Feed RSS por categoria (cache de 10 min) |
| `POST` | `/api/assistant/chat` | JWT | Responder com Gemini usando pergunta e resumo agregado |

Os tipos aceitos nas movimentações são `INCOME`, `EXPENSE` e `INVESTMENT`. Exemplo de criação de despesa:

```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer SEU_JWT" \
  -H "Content-Type: application/json" \
  -d '{"description":"Almoço","amount":42.5,"type":"EXPENSE","date":"2026-10-07"}'
```

O feed de notícias usa RSS de pesquisa do Google Notícias e direciona para o veículo de origem. Câmbio é indicativo; provedores podem atrasar ou limitar consultas. Cache é local à instância (em memória); Redis é recomendado para múltiplas instâncias. O chat exige `GEMINI_API_KEY`, autenticação e limite de requisições; não fornece recomendações de compra/venda.

### Publicação

GitHub Pages publica apenas o frontend estático; API e PostgreSQL precisam de hospedagem própria. Configure `FRONTEND_ORIGIN` no backend com a origem exata do site e a variável de repositório `VITE_API_BASE_URL` (GitHub → Settings → Secrets and variables → Actions → Variables) com a URL HTTPS da API. O workflow injeta essa variável no build. Configure `DATABASE_URL`, `JWT_SECRET` e `GEMINI_API_KEY` exclusivamente no provedor do backend.

#### Publicar a API no Render

O arquivo `render.yaml` define um serviço web e um PostgreSQL gratuitos para teste. Para iniciar o deploy:

1. Entre no Render com sua conta e conecte este repositório como um **Blueprint**: [Render Blueprints](https://dashboard.render.com/blueprints).
2. Revise os recursos e confirme a criação. O Render gera `JWT_SECRET`, conecta o banco e executa `prisma migrate deploy` ao iniciar a API.
3. Na configuração do serviço `fluxo-api`, adicione `GEMINI_API_KEY` como variável secreta para habilitar o chat. Nunca coloque essa chave no GitHub Pages.
4. Depois do deploy, teste `https://<URL-do-serviço>/api/health`; a resposta deve ser `{"status":"ok"}`.
5. No GitHub, abra **Settings → Secrets and variables → Actions → Variables** e crie `VITE_API_BASE_URL` com a URL HTTPS do serviço (sem `/api` no final). Rode novamente o workflow **Publicar aplicação no GitHub Pages** em **Actions → Run workflow**.

O plano gratuito do Render é somente para demonstração: serviços podem hibernar e o banco de dados gratuito expira. Não use esse banco para guardar dados financeiros importantes ou de produção. O primeiro acesso após a hibernação pode demorar. A interface financeira existente continua usando `localStorage`; a API autenticada ainda não sincroniza automaticamente essas movimentações.
