# Fluxo — Controle de Gastos Mensais

SPA para registrar entradas e saídas, acompanhar o saldo mensal e visualizar a distribuição dos gastos.

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
- interface responsiva.

## Conceitos de JavaScript

O projeto aplica spread operator, `map`, `filter` e `reduce` para atualizar dados sem mutações desnecessárias, filtrar períodos, consolidar valores e renderizar componentes.

## Análise inteligente

O assistente utiliza regras explicáveis para avaliar saldo, taxa de economia, maior categoria de gastos e cumprimento das metas. Todo o processamento acontece localmente, sem transmitir dados financeiros.

## Como executar

Abra `frontend/index.html` em um navegador moderno. Não há dependências externas de JavaScript.
