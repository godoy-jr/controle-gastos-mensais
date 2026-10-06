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
