# Smart Condos

Aplicação demonstrativa de gestão de condomínio com painel de indicadores, cadastro fictício de unidades, visualização 3D interativa em Three.js e gerador de edifícios. O projeto é independente dos repositórios AI Virtual Office e Órbita.

> **Ambiente de demonstração:** moradores, contatos, animais, cobranças e status são dados inventados. Não use informações pessoais reais. A aplicação não tem backend nem conexão com sistemas de condomínio, bancos, meios de pagamento ou serviços externos.

## Requisitos

- Node.js 20.19 ou superior (inclui npm).
- Navegador moderno com suporte a WebGL para visualizar o modelo 3D.

## Executar localmente

1. Clone o repositório e entre na pasta:

   ```powershell
   git clone https://github.com/Xabregas-82/smart-condos.git
   cd smart-condos
   ```

2. Instale as dependências:

   ```powershell
   npm install
   ```

3. Inicie o servidor de desenvolvimento:

   ```powershell
   npm run dev
   ```

4. Abra no navegador o endereço local exibido pelo Vite, normalmente <http://localhost:5173>.

Para gerar e conferir a versão de produção:

```powershell
npm run build
npm run preview
```

O projeto também pode ser aberto no VS Code com `code .`.

## Funcionalidades

- **Visualização 3D:** gire a maquete com o mouse, use a roda para zoom e clique em uma unidade para ver os detalhes. As fachadas indicam situação regular (verde), pagamento pendente (vermelho) e alerta de manutenção (amarelo).
- **Lista de unidades:** pesquise pelo número do apartamento ou nome fictício do responsável e filtre por status.
- **Detalhes da unidade:** consulte responsável, moradores fictícios, informações de pet, área, taxa condominial, débitos e histórico demonstrativo de boletos.
- **Planta baixa:** cada apartamento tem uma planta SVG ilustrativa. Na tela do gerador, pode-se selecionar PDF ou imagem (PNG, JPEG, WebP ou SVG, até 10 MB) para visualizar localmente. O arquivo fica no navegador e não é transmitido.
- **Gerador do prédio:** altere o nome, o número de pavimentos e a quantidade de unidades por andar; ao reconstruir, a maquete e os dados derivados são atualizados.
- **Indicadores:** total de unidades, inadimplência por unidade, valores previstos e pagos, moradores e pets. O gráfico de arrecadação compara uma série histórica fictícia com os valores dos status demonstrativos.

## Regras de negócio demonstrativas

1. A configuração inicial é um edifício com **6 pavimentos** e **4 unidades por pavimento** (**24 unidades**).
2. O gerador aceita de **1 a 12 pavimentos** e de **2 a 6 unidades por pavimento**. O total de unidades é calculado por `pavimentos × unidades por pavimento`.
3. O número da unidade é formado pelo pavimento seguido da posição no andar: por exemplo, a primeira unidade do primeiro pavimento é `101`.
4. Ao reconstruir o prédio, são gerados dados fictícios repetíveis para responsáveis, moradores, pets, áreas, taxas e situações. Essa previsibilidade mantém indicadores e maquete consistentes entre visualizações; não representa cadastro real.
5. Cada unidade recebe uma situação: **regular**, **pendente** ou **alerta de manutenção**. A situação determina a cor da fachada. Apenas unidades pendentes contam para o indicador de inadimplência; unidades em alerta são distintas de devedores.
6. A taxa condominial demonstrativa depende do pavimento: `R$ 650 + R$ 25 × número do pavimento`. O valor previsto é a soma das taxas de todas as unidades. O valor pago exibido soma as taxas de unidades não pendentes; não representa liquidação bancária.
7. Uma unidade pendente recebe um débito ilustrativo de uma a três taxas. O histórico de boletos contém três meses de exemplo; pagamentos e débitos não são persistidos.
8. A taxa de inadimplência é calculada como `unidades pendentes ÷ unidades totais × 100`. O gráfico de arrecadação usa uma série histórica simulada e não é extrato financeiro.
9. A pesquisa e os filtros de status são aplicados à lista e à maquete 3D. A seleção de uma unidade abre abas de dados, financeiro e planta.
10. Alterar o arquivo da planta só cria uma pré-visualização local; o arquivo não é guardado em servidor. Atualizar ou fechar a página descarta as alterações da sessão.

## Limites do protótipo

Este projeto é somente uma interface de demonstração. Não oferece autenticação, autorização, banco de dados, armazenamento permanente, notificações, gestão documental, emissão ou baixa real de boletos, cobrança, pagamentos, integração bancária, comunicação com residentes ou gestão operacional de manutenção. Os dados devem ser substituídos por uma arquitetura segura antes de qualquer uso real.
