# CidadeScan AI - Plataforma de Inspeção Urbana Inteligente

> **Slogan:** A cidade mostra onde precisa de cuidado.
> **Público-alvo:** Prefeituras Municipais, Secretarias de Obras, Serviços Públicos, Meio Ambiente e Mobilidade.

CidadeScan AI é uma plataforma GovTech completa que utiliza imagens captadas por câmeras de veículos públicos, dashcams ou smartphones para identificar automaticamente problemas urbanos (como buracos, lixo acumulado, postes apagados e calçadas quebradas) enquanto os veículos trafegam pelas ruas.

---

## 🚀 Como Executar o Projeto (Demonstração Local)

O projeto foi construído utilizando **HTML5, CSS3 Customizado, JavaScript Moderno (ES6)** e bibliotecas via CDN seguras. Por não possuir dependências pesadas de servidores, você pode executá-lo imediatamente em qualquer navegador:

1. **Painel Web Unificado (CidadeScan AI)**: Abra o arquivo [index.html](file:///c:/Users/Thiago%20Mello/Desktop/Smart%20City/index.html) no navegador. O simulador da câmera veicular (dashcam) está integrado diretamente no Dashboard para facilitar a apresentação!
2. **Câmera Standalone (Opcional)**: Caso queira abrir a câmera em tela cheia como um dispositivo separado, abra [mobile.html](file:///c:/Users/Thiago%20Mello/Desktop/Smart%20City/mobile.html) em outra aba.

---

## 🛠️ Arquitetura do Projeto

- **`mockData.js`**: Banco de dados simulado contendo a semente inicial de dados para a **Prefeitura de Cidade Azul**: 8 bairros, 7 secretarias, 8 usuários com perfis e permissões, 6 equipes operacionais, 10 veículos com telemetria, 20 rotas GPS e 150 ocorrências iniciais distribuídas em vários estados. Ele persiste as alterações no `localStorage`.
- **`app.css`**: Folha de estilos centralizada. Define a identidade visual tecnológica da plataforma usando a tipografia **Outfit**, sombras modernas, grids responsivos, componentes de formulário, animações de laser scanner e molduras móveis.
- **`app.js`**: Lógica de controle do painel web: roteador SPA, inicialização e filtragem do mapa Leaflet, renderização de gráficos Chart.js,Central de Validação, comparador temporal de imagens e simuladores de Inteligência Artificial.
- **`mobile.html`**: A tela da Câmera de Bordo / Dashcam Inteligente com visor integrado, telemetria GPS, simulação offline via MicroSD e bip físico.

---

## 💡 Roteiro de Apresentação (Passo a Passo)

Para encantar prefeitos e secretários municipais durante a demonstração, siga estes passos:

### 1. Alternância de Perfis (Controle de Acesso)
- Na barra superior do painel web (`index.html`), alterne o seletor **"Perfil"**:
  - **Superadministrador**: Tem acesso a todas as opções, incluindo a aba "Auditoria e IA" (exibe logs LGPD e configuração de sensibilidade do modelo).
  - **Fiscal**: Vê apenas o "Mapa", a "Central de Validação" e a lista de "Ocorrências".
  - **Gestor de Secretaria**: Focado no controle de ordens de serviço e na gestão de equipes.

### 2. Painel e Estatísticas Dinâmicas
- No menu lateral, acesse **Dashboard**. Veja os contadores consolidados de Cidade Azul.
- Leia o **Resumo Inteligente da Cidade**: um texto gerado dinamicamente que analisa quais bairros têm mais problemas e qual secretaria é a mais eficiente.
- Modifique os filtros de bairros e gravidades no topo e clique em **Filtrar** para ver os números e os gráficos (Chart.js) se ajustarem automaticamente.

### 3. Mapa Operacional e Camadas Avançadas
- Vá para **Mapa Operacional**. O mapa (Leaflet.js) exibe todas as ocorrências mapeadas geograficamente.
- Clique nos botões de filtros flutuantes no topo do mapa:
  - **Críticas**: Filtra apenas os problemas urgentes de gravidade máxima.
  - **Rotas**: Desenha as polilinhas azuis das rotas percorridas pelos caminhões de coleta.
  - **Calor**: Ativa o mapa de calor de problemas.
  - **Saúde Urbana**: Desenha polígonos coloridos sobre os bairros de acordo com o Score de Conservação.
- Clique em qualquer marcador para abrir o painel lateral com foto, confiança da IA, histórico detalhado, botão para abrir no Google Maps e botão para despachar equipe (Ordem de Serviço).

### 4. Comparador Temporal (Antes e Depois)
- No menu superior do mapa, clique no filtro **Resolvidas** (ou clique na aba Ocorrências e selecione uma ocorrência com status "Resolvida").
- Clique no marcador correspondente para abrir seus detalhes.
- Clique em **Comparar Antes e Depois**: um modal se abrirá exibindo um controle deslizante sobreposto. Arraste-o horizontalmente para ver a rua com o buraco (Antes) se transformar na via repavimentada (Depois).

### 5. Central de Validação Humana (Teclado Eficiente)
- Acesse **Central de Validação**.
- Pressione as teclas do teclado para triagem rápida:
  - Pressione **A** para Aprovar (a ocorrência é confirmada e direcionada para a secretaria).
  - Pressione **R** para Rejeitar (marca como falso positivo).
  - Pressione **D** para Duplicada (agrupa o problema).
  - Pressione as **setas direcionais (← / →)** para navegar entre as imagens.

### 6. Rota ao Vivo (Demonstração Automática)
- No topo do Dashboard, clique no botão verde **Demo Rota Ao Vivo**.
- Um modal escuro se abrirá. Ele simula o veículo circulando pelas ruas da Prainha:
  - O mapa acompanha o ícone do veículo em tempo real.
  - O HUD de telemetria atualiza as coordenadas e a velocidade.
  - O feed de câmera exibe uma linha de laser scanner e simula a visão de bordo.
  - Quando o veículo atinge pontos específicos, o sistema emite um bipe sonoro de alerta, desenha a caixa de detecção (bounding box) sobre a imagem e registra a ocorrência no painel.

### 7. Sincronização Offline da Câmera ("Efeito Wow")
- Abra o painel web ([index.html](file:///c:/Users/Thiago%20Mello/Desktop/Smart%20City/index.html)) e a Câmera Veicular ([mobile.html](file:///c:/Users/Thiago%20Mello/Desktop/Smart%20City/mobile.html)) lado a lado em duas abas ou janelas.
- Na Câmera de Bordo (`mobile.html`):
  - Ligue o visor clicando em **Ligar Sistema**.
  - Clique no botão **5G ON** para desligar o sinal de rede (o status mudará para `OFFLINE` e o LED físico azul de GPS apagará).
  - Clique em **Iniciar Varredura** e clique em **Foto Manual** algumas vezes. Veja que os arquivos entram no MicroSD virtual como `SD QUEUE`.
  - Reative o sinal clicando no botão vermelho **5G OFF**. A câmera transmitirá os arquivos salvos.
  - **Veja o efeito**: Sem recarregar a página, a aba do Painel Web recebe a transmissão via rede em tempo real, disparando uma notificação por toast e atualizando as estatísticas!
### 8. Monitoramento Multi-feed (Câmeras ao Vivo)
- Navegue para a aba **Câmeras ao Vivo** no menu lateral.
- Você verá um grid de monitoramento contendo 6 câmeras veiculares ativas transmitindo telemetria (GPS e Velocidade) de forma concorrente em tempo real.
- **Detecção Concorrente de IA**: A cada 20 segundos, uma câmera aleatória no grid identificará um problema (buraco, lixo ou mato alto), exibirá o retângulo limitador (bounding box) e emitirá um som de alerta. Isso demonstra a capacidade da plataforma de processar múltiplos feeds simultâneos.
- **Focar no Mapa**: Clique em *Focar no Mapa* em qualquer câmera para ser direcionado ao Mapa Operacional com foco imediato na localização daquele veículo.

### 9. Teste com Webcam Física do Notebook ("Efeito Showroom")
A CidadeScan AI permite utilizar a webcam real do seu computador para demonstrar a plataforma:
- **No Monitoramento**: Na aba **Câmeras ao Vivo** do painel web, clique no botão **Ativar Webcam (CAM-01)** no topo da tela e aprove o acesso do navegador. A imagem da sua webcam aparecerá no primeiro painel do grid.
- **No Visor Embarcado (`mobile.html`)**: Nas configurações iniciais do visor da câmera, selecione **Webcam Real (Notebook)** no campo *Origem da Câmera*. Ao clicar em **Ligar Sistema**, a webcam abrirá.
- **Detecção de IA ao Vivo**: Ao iniciar a varredura, assista às caixas de marcação (bounding boxes) e alertas sonoros da Inteligência Artificial aparecerem sobrepostos à imagem da sua webcam em tempo real!

---

## ⚖️ Conformidade com a LGPD

A plataforma está projetada sob princípios de *Privacy by Design* para atender às exigências da LGPD:
1. **Desfoque LGPD**: Todas as imagens capturadas passam por uma camada simulada de desfoque automático de rostos e placas de veículos para proteger a privacidade dos cidadãos.
2. **Logs de Auditoria**: Qualquer visualização de ocorrências ou exportação de relatórios é registrada na aba "Auditoria e IA" (Superadmin), especificando o operador, data, hora e IP de origem.
3. **URL Temporária**: Os links de evidências expiram após o atendimento e os trechos originais de vídeo são removidos, mantendo apenas a imagem da ocorrência.
