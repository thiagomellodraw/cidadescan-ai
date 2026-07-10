/**
 * CidadeScan AI - Controladora Principal (SPA Core)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Logger de Depuração na Tela
  function logToDebug(msg, type = 'info') {
    const logsDiv = document.getElementById('debug-logs');
    if (logsDiv) {
      const color = type === 'error' ? '#ef4444' : (type === 'success' ? '#22c55e' : '#38bdf8');
      logsDiv.innerHTML += `<span style="color:${color}">[${new Date().toLocaleTimeString()}] ${msg}</span>\n`;
      logsDiv.scrollTop = logsDiv.scrollHeight;
    }
  }

  // Intercepta erros globais e logs
  window.addEventListener('error', (e) => {
    logToDebug(`${e.message} (${e.filename.split('/').pop()}:${e.lineno})`, 'error');
  });

  const originalConsoleLog = console.log;
  console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    logToDebug(args.join(' '), 'info');
  };

  const originalConsoleError = console.error;
  console.error = function(...args) {
    originalConsoleError.apply(console, args);
    logToDebug(args.join(' '), 'error');
  };

  logToDebug('CidadeScan Dashboard: Depurador iniciado.', 'success');

  // Inicializa a base de dados
  if (window.CidadeScan) {
    window.CidadeScan.init();
  }

  // --- 1. ESTADO GLOBAL ---
  const state = {
    db: window.CidadeScan ? window.CidadeScan.getDB() : {},
    currentUser: null,
    currentCity: 'Prefeitura Municipal de Cidade Azul',
    activeTab: 'dashboard',
    leafletMap: null,
    markersGroup: null,
    routesGroup: null,
    heatLayer: null,
    neighborhoodPolygons: [],
    selectedOccurrence: null,
    validationIndex: 0,
    activeValidationList: [],
    demoInterval: null,
    demoRoutePoints: [],
    demoRouteIndex: 0,
    demoMarker: null,
    // Coordenadas centrais padrão (Cidade Azul)
    mapCenter: [-22.8820, -42.0180],
    isWebcamActive: false,
    liveWebcamStream: null,
    dashcam: {
      isOn: false,
      isScanning: false,
      duration: 0,
      distance: 0,
      filesCount: 0,
      intervalId: null,
      isOnline: true,
      offlineQueue: []
    },
    liveCamCycle: 0,
    liveCamerasList: [
      { id: 1, name: 'CAM-01', vehicle: 'Caminhão de Coleta 01', operator: 'Ricardo Santos', neighborhood: 'Centro', lat: -22.8820, lng: -42.0180, img: 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?w=400&q=80', speed: 30 }
    ]
  };

  // --- 2. CONTROLE DE PERFIS E PERMISSÕES ---
  const profilePermissions = {
    'Superadministrador': ['all'],
    'Gestor Municipal': ['dashboard', 'map', 'live-cameras', 'occurrences', 'missions', 'health', 'reports', 'notifications', 'settings'],
    'Gestor de Secretaria': ['dashboard', 'map', 'live-cameras', 'occurrences', 'teams', 'work-orders', 'reports', 'notifications'],
    'Fiscal ou Operador': ['map', 'live-cameras', 'validation', 'occurrences', 'notifications'],
    'Motorista ou Agente de Coleta': ['mobile-nav', 'routes', 'vehicles']
  };

  function hasPermission(view) {
    if (!state.currentUser) return false;
    const perms = profilePermissions[state.currentUser.role];
    if (!perms) return false;
    return perms.includes('all') || perms.includes(view);
  }

  function setupUserSession(userId) {
    state.currentUser = state.db.users.find(u => u.id === parseInt(userId)) || state.db.users[0];
    document.getElementById('user-avatar').innerText = state.currentUser.name.split(' ').map(n => n[0]).join('');
    document.getElementById('user-name').innerText = state.currentUser.name;
    document.getElementById('user-role').innerText = state.currentUser.role;
    
    // Atualiza links visíveis no menu lateral
    updateSidebarVisibility();
    
    // Se o perfil mudar e o usuário não tiver permissão para a aba ativa, redireciona
    if (!hasPermission(state.activeTab)) {
      const allowed = profilePermissions[state.currentUser.role];
      const target = allowed.includes('all') ? 'dashboard' : (allowed[0] || 'login');
      switchTab(target);
    }

    showToast(`Sessão alterada: ${state.currentUser.name} (${state.currentUser.role})`, 'success');
  }

  function updateSidebarVisibility() {
    const menuItems = document.querySelectorAll('.menu-item[data-tab]');
    menuItems.forEach(item => {
      const tab = item.getAttribute('data-tab');
      if (hasPermission(tab)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });

    // Seção especial do Superadmin
    const superadminSection = document.getElementById('menu-section-superadmin');
    if (superadminSection) {
      superadminSection.style.display = state.currentUser.role === 'Superadministrador' ? 'block' : 'none';
    }
  }

  // --- 3. SPA ROTEADOR DE ABAS ---
  function switchTab(tabId) {
    if (tabId !== 'live-cameras' && dashboardCocoRequestFrameId) {
      cancelAnimationFrame(dashboardCocoRequestFrameId);
      dashboardCocoRequestFrameId = null;
    }

    if (tabId === 'login') {
      document.getElementById('login-screen').style.display = 'flex';
      document.getElementById('app-main-layout').style.display = 'none';
      return;
    }

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-main-layout').style.display = 'flex';

    // Desativa abas ativas
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active-view'));
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));

    // Ativa aba selecionada
    const section = document.getElementById(`view-${tabId}`);
    if (section) {
      section.classList.add('active-view');
      state.activeTab = tabId;
      
      const menuItem = document.querySelector(`.menu-item[data-tab="${tabId}"]`);
      if (menuItem) menuItem.classList.add('active');

      // Atualiza título do Header
      const headerTitle = document.querySelector('.page-title-section h1');
      if (headerTitle && menuItem) {
        headerTitle.innerText = menuItem.innerText.trim();
      }

      // Gatilhos específicos de tela
      if (tabId === 'dashboard') {
        renderDashboardStats();
        renderDashboardCharts();
      } else if (tabId === 'map') {
        setTimeout(initLeafletMap, 100);
      } else if (tabId === 'validation') {
        initValidationCenter();
      } else if (tabId === 'occurrences') {
        renderOccurrencesTable();
      } else if (tabId === 'health') {
        renderHealthScores();
      } else if (tabId === 'vehicles') {
        renderVehiclesList();
      } else if (tabId === 'teams') {
        renderTeamsList();
      } else if (tabId === 'missions') {
        renderMissionsList();
      } else if (tabId === 'live-cameras') {
        renderLiveCamerasGrid();
        const syncCodeInput = document.getElementById('header-sync-code');
        const syncCode = syncCodeInput ? syncCodeInput.value.trim().toLowerCase() : 'thiago-scan';
        if (syncSocket && syncSocket.readyState === WebSocket.OPEN) {
          syncSocket.send(JSON.stringify({
            type: 'REQUEST_STREAM',
            syncCode: syncCode
          }));
        }
      } else if (tabId === 'reports') {
        // Inicializa opções de relatório
      } else if (tabId === 'superadmin') {
        renderSuperadminPanel();
      }
    }
  }

  // Event Listeners para Menu e Seletores
  document.querySelectorAll('.menu-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => {
      switchTab(item.getAttribute('data-tab'));
    });
  });

  const profileSelect = document.getElementById('profile-switcher-select');
  if (profileSelect) {
    profileSelect.addEventListener('change', (e) => {
      setupUserSession(e.target.value);
    });
  }

  // --- 4. DASHBOARD - STATS & GRÁFICOS ---
  let charts = {};

  function renderDashboardStats() {
    const occ = state.db.occurrences;
    
    // Contadores
    const total = occ.length;
    const pendingVal = occ.filter(o => o.status === 'Aguardando validação').length;
    const confirmed = occ.filter(o => ['Confirmada', 'Encaminhada', 'Em atendimento'].includes(o.status)).length;
    const critical = occ.filter(o => o.severityConfirmed === 'Crítica' && o.status !== 'Resolvida').length;
    const resolved = occ.filter(o => o.status === 'Resolvida').length;
    const vehiclesActive = state.db.vehicles.filter(v => v.status === 'Operando').length;
    const routesTotal = state.db.routes.length;

    // Métricas estimadas
    const kmTotal = state.db.vehicles.reduce((acc, v) => acc + v.kmAnalyzed, 0);
    const avgResolutionTime = "2.4 dias";

    // Set nos elementos
    document.getElementById('stat-total-detected').innerText = total;
    document.getElementById('stat-pending-val').innerText = pendingVal;
    document.getElementById('stat-confirmed').innerText = confirmed;
    document.getElementById('stat-critical-active').innerText = critical;
    document.getElementById('stat-resolved').innerText = resolved;
    document.getElementById('stat-vehicles-active').innerText = vehiclesActive;
    document.getElementById('stat-routes-total').innerText = routesTotal;
    document.getElementById('stat-km-total').innerText = kmTotal.toLocaleString() + ' km';

    // Resumo Inteligente da Cidade (Dinâmico)
    const topNeighborhoods = getTopProblemNeighborhoods(3);
    const pavedPct = Math.round((occ.filter(o => o.category === 'Pavimentação').length / total) * 100);
    
    const summaryText = `Nas últimas semanas, foram identificadas <strong>${total} ocorrências urbanas</strong> em Cidade Azul. Os bairros com maior concentração de problemas foram <strong>${topNeighborhoods.join(', ')}</strong>. Problemas relacionados à <strong>Pavimentação</strong> representaram <strong>${pavedPct}%</strong> das detecções da inteligência artificial. A <strong>Secretaria de Serviços Públicos</strong> apresentou o menor tempo médio de resposta no período, com <strong>1.8 dias</strong>.`;
    
    document.getElementById('smart-summary-text-p').innerHTML = summaryText;
  }

  function getTopProblemNeighborhoods(limit) {
    const counts = {};
    state.db.occurrences.forEach(o => {
      counts[o.neighborhood] = (counts[o.neighborhood] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => entry[0]);
  }

  function renderDashboardCharts() {
    // Destruir gráficos anteriores se existirem
    Object.keys(charts).forEach(key => {
      if (charts[key]) charts[key].destroy();
    });

    const occ = state.db.occurrences;

    // 1. Ocorrências por Categoria (Doughnut)
    const catCounts = {};
    occ.forEach(o => { catCounts[o.category] = (catCounts[o.category] || 0) + 1; });
    const catLabels = Object.keys(catCounts);
    const catData = Object.values(catCounts);
    const catColors = catLabels.map(cat => window.CidadeScan.CATEGORIES[cat]?.color || '#64748B');

    const ctxCat = document.getElementById('chart-category').getContext('2d');
    charts.category = new Chart(ctxCat, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catData,
          backgroundColor: catColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Outfit' } } }
        }
      }
    });

    // 2. Ocorrências por Bairro (Bar)
    const neighCounts = {};
    occ.forEach(o => { neighCounts[o.neighborhood] = (neighCounts[o.neighborhood] || 0) + 1; });
    const neighLabels = Object.keys(neighCounts);
    const neighData = Object.values(neighCounts);

    const ctxNeigh = document.getElementById('chart-neighborhood').getContext('2d');
    charts.neighborhood = new Chart(ctxNeigh, {
      type: 'bar',
      data: {
        labels: neighLabels,
        datasets: [{
          label: 'Detecções',
          data: neighData,
          backgroundColor: '#1473E6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: '#E2E8F0' }, ticks: { font: { family: 'Inter' } } },
          x: { grid: { display: false }, ticks: { font: { family: 'Outfit', size: 10 } } }
        }
      }
    });

    // 3. Gravidade (Pie)
    const sevCounts = { 'Baixa': 0, 'Média': 0, 'Alta': 0, 'Crítica': 0 };
    occ.forEach(o => { sevCounts[o.severityConfirmed] = (sevCounts[o.severityConfirmed] || 0) + 1; });
    
    const ctxSev = document.getElementById('chart-severity').getContext('2d');
    charts.severity = new Chart(ctxSev, {
      type: 'pie',
      data: {
        labels: Object.keys(sevCounts),
        datasets: [{
          data: Object.values(sevCounts),
          backgroundColor: ['#22C55E', '#F59E0B', '#F97316', '#EF4444'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Outfit' } } }
        }
      }
    });

    // 4. Detecções vs Soluções (Line)
    // Simula evolução diária nos últimos 10 dias
    const days = Array.from({length: 10}, (_, i) => `0${i+1}/07`);
    const detectionsTimeline = [12, 18, 15, 22, 28, 20, 24, 30, 26, 32];
    const resolutionsTimeline = [8, 12, 10, 15, 20, 18, 22, 25, 21, 28];

    const ctxEvol = document.getElementById('chart-evolution').getContext('2d');
    charts.evolution = new Chart(ctxEvol, {
      type: 'line',
      data: {
        labels: days,
        datasets: [
          {
            label: 'Detectados',
            data: detectionsTimeline,
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Resolvidos',
            data: resolutionsTimeline,
            borderColor: '#22C55E',
            backgroundColor: 'rgba(34, 197, 94, 0.05)',
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Outfit' } } }
        },
        scales: {
          y: { grid: { color: '#E2E8F0' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Filtros do Dashboard
  document.getElementById('dashboard-apply-filters')?.addEventListener('click', () => {
    // Para fins do MVP de alta fidelidade, aplicamos um leve delay de simulação de consulta
    const btn = document.getElementById('dashboard-apply-filters');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="lucide-refresh-cw animate-spin"></i> Filtrando...';
    btn.disabled = true;

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
      
      // Filtrar dados em memória e atualizar gráficos
      const neighborhood = document.getElementById('filter-dashboard-neighborhood').value;
      const severity = document.getElementById('filter-dashboard-severity').value;
      const status = document.getElementById('filter-dashboard-status').value;

      let filteredOccurrences = [...state.db.occurrences];

      if (neighborhood) {
        filteredOccurrences = filteredOccurrences.filter(o => o.neighborhood === neighborhood);
      }
      if (severity) {
        filteredOccurrences = filteredOccurrences.filter(o => o.severityConfirmed === severity);
      }
      if (status) {
        filteredOccurrences = filteredOccurrences.filter(o => o.status === status);
      }

      // Atualiza stats e gráficos baseado na seleção
      updateStatsAndCharts(filteredOccurrences);
      showToast('Filtros do dashboard aplicados.', 'success');
    }, 400);
  });

  function updateStatsAndCharts(filteredList) {
    const total = filteredList.length;
    const pendingVal = filteredList.filter(o => o.status === 'Aguardando validação').length;
    const confirmed = filteredList.filter(o => ['Confirmada', 'Encaminhada', 'Em atendimento'].includes(o.status)).length;
    const critical = filteredList.filter(o => o.severityConfirmed === 'Crítica' && o.status !== 'Resolvida').length;
    const resolved = filteredList.filter(o => o.status === 'Resolvida').length;

    document.getElementById('stat-total-detected').innerText = total;
    document.getElementById('stat-pending-val').innerText = pendingVal;
    document.getElementById('stat-confirmed').innerText = confirmed;
    document.getElementById('stat-critical-active').innerText = critical;
    document.getElementById('stat-resolved').innerText = resolved;

    // Atualiza apenas os gráficos de pizza/doughnut em tempo real
    if (charts.category) {
      const catCounts = {};
      filteredList.forEach(o => { catCounts[o.category] = (catCounts[o.category] || 0) + 1; });
      charts.category.data.labels = Object.keys(catCounts);
      charts.category.data.datasets[0].data = Object.values(catCounts);
      charts.category.update();
    }
    if (charts.severity) {
      const sevCounts = { 'Baixa': 0, 'Média': 0, 'Alta': 0, 'Crítica': 0 };
      filteredList.forEach(o => { sevCounts[o.severityConfirmed] = (sevCounts[o.severityConfirmed] || 0) + 1; });
      charts.severity.data.datasets[0].data = Object.values(sevCounts);
      charts.severity.update();
    }
  }

  // --- 5. MAPA OPERACIONAL (Leaflet) ---
  function initLeafletMap() {
    if (state.leafletMap) return; // Já inicializado

    // Inicializa o Leaflet focando em Cidade Azul
    state.leafletMap = L.map('leaflet-map-container').setView(state.mapCenter, 13);
    
    // Camada base OpenStreetMap moderna
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(state.leafletMap);

    // Grupos de marcadores
    state.markersGroup = L.featureGroup().addTo(state.leafletMap);
    state.routesGroup = L.featureGroup().addTo(state.leafletMap);

    // Plotar dados iniciais
    plotOccurrencesOnMap();
    
    // Registrar Eventos do Painel do Mapa
    setupMapUIEvents();
  }

  function plotOccurrencesOnMap(filterOpts = {}) {
    if (!state.markersGroup) return;
    state.markersGroup.clearLayers();

    const occs = state.db.occurrences;
    const severityColors = {
      'Baixa': '#22C55E', // verde
      'Média': '#F59E0B', // amarelo
      'Alta': '#F97316',  // laranja
      'Crítica': '#EF4444', // vermelho
      'Resolvida': '#1473E6' // azul
    };

    occs.forEach(o => {
      // Aplica filtros se houver
      if (filterOpts.category && o.category !== filterOpts.category) return;
      if (filterOpts.severity && o.severityConfirmed !== filterOpts.severity) return;
      if (filterOpts.status && o.status !== filterOpts.status) return;
      if (filterOpts.neighborhood && o.neighborhood !== filterOpts.neighborhood) return;

      const markerColor = o.status === 'Resolvida' ? severityColors['Resolvida'] : (o.status === 'Aguardando validação' ? '#64748B' : severityColors[o.severityConfirmed]);

      // Desenha um círculo pulsante customizado ou um marcador padrão de cor
      const marker = L.circleMarker([o.latitude, o.longitude], {
        radius: o.severityConfirmed === 'Crítica' ? 10 : 8,
        fillColor: markerColor,
        color: '#FFFFFF',
        weight: 1.5,
        fillOpacity: 0.85
      });

      // Bind de popup simples com detalhes rápidos
      marker.on('click', () => {
        openOccurrenceDetailsPanel(o);
      });

      state.markersGroup.addLayer(marker);
    });
  }

  function openOccurrenceDetailsPanel(occurrence) {
    state.selectedOccurrence = occurrence;
    
    // Inserir metadados no Painel Lateral
    document.getElementById('map-panel-title').innerText = occurrence.code;
    document.getElementById('map-panel-category').innerText = `${occurrence.category} (${occurrence.subcategory})`;
    document.getElementById('map-panel-addr').innerText = occurrence.address;
    document.getElementById('map-panel-neighborhood').innerText = occurrence.neighborhood;
    document.getElementById('map-panel-date').innerText = `${occurrence.dateCapture} às ${occurrence.timeCapture}`;
    document.getElementById('map-panel-vehicle').innerText = `${occurrence.vehicleName} (Motorista: ${occurrence.driverName})`;
    document.getElementById('map-panel-confidence').innerText = `Confiança IA: ${occurrence.confidence}%`;
    document.getElementById('map-panel-dept').innerText = occurrence.department;
    document.getElementById('map-panel-desc').innerText = occurrence.descriptionAuto || 'Nenhuma descrição adicional.';
    
    // Configura o Badge de Status
    const statusEl = document.getElementById('map-panel-status');
    statusEl.innerText = occurrence.status;
    statusEl.className = 'badge ' + getBadgeClassForStatus(occurrence.status);

    // Configura o Badge de Gravidade
    const sevEl = document.getElementById('map-panel-severity');
    sevEl.innerText = occurrence.severityConfirmed;
    sevEl.className = 'badge ' + getBadgeClassForSeverity(occurrence.severityConfirmed);

    // Imagem
    document.getElementById('map-panel-img').src = occurrence.imageMain;
    
    // Histórico
    const histContainer = document.getElementById('map-panel-history-list');
    histContainer.innerHTML = '';
    occurrence.history.forEach(h => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.style.padding = '8px 0';
      div.style.borderBottom = '1px solid var(--color-border)';
      div.style.fontSize = '0.8rem';
      div.innerHTML = `<strong>${h.status}</strong> - ${h.date}<br><span style="color: var(--color-text-sub)">Por: ${h.user}</span>`;
      histContainer.appendChild(div);
    });

    // Controlar visibilidade de botões com base no status e permissão
    const validationActionBox = document.getElementById('map-panel-validation-actions');
    if (occurrence.status === 'Aguardando validação' && hasPermission('validation')) {
      validationActionBox.style.display = 'flex';
    } else {
      validationActionBox.style.display = 'none';
    }

    // Botão de Comparação de Imagens (Apenas se for Resolvida e tiver comparações)
    const compareBtn = document.getElementById('map-panel-compare-btn');
    if (occurrence.status === 'Resolvida' && occurrence.comparisons && occurrence.comparisons.length > 0) {
      compareBtn.style.display = 'block';
    } else {
      compareBtn.style.display = 'none';
    }

    // Abrir o painel lateral
    document.getElementById('map-side-panel-el').classList.add('open');
  }

  function getBadgeClassForStatus(status) {
    switch (status) {
      case 'Detectada pela IA': return 'badge-detect';
      case 'Aguardando validação': return 'badge-validate';
      case 'Confirmada': return 'badge-confirm';
      case 'Em atendimento': return 'badge-progress';
      case 'Resolvida': return 'badge-resolved';
      default: return 'badge-detect';
    }
  }

  function getBadgeClassForSeverity(sev) {
    switch (sev) {
      case 'Baixa': return 'badge-low';
      case 'Média': return 'badge-medium';
      case 'Alta': return 'badge-high';
      case 'Crítica': return 'badge-critical';
      default: return 'badge-low';
    }
  }

  function setupMapUIEvents() {
    // Fechar painel lateral
    document.getElementById('close-map-side-panel').addEventListener('click', () => {
      document.getElementById('map-side-panel-el').classList.remove('open');
    });

    // Botões de Ação Rápida no Painel Lateral do Mapa
    document.getElementById('map-panel-btn-approve').addEventListener('click', () => {
      if (state.selectedOccurrence) {
        updateOccurrenceStatus(state.selectedOccurrence.id, 'Confirmada');
        showToast(`Ocorrência ${state.selectedOccurrence.code} confirmada com sucesso!`, 'success');
        openOccurrenceDetailsPanel(state.selectedOccurrence); // Recarrega painel
        plotOccurrencesOnMap(); // Replota pontos
      }
    });

    document.getElementById('map-panel-btn-reject').addEventListener('click', () => {
      if (state.selectedOccurrence) {
        updateOccurrenceStatus(state.selectedOccurrence.id, 'Rejeitada');
        showToast(`Ocorrência ${state.selectedOccurrence.code} rejeitada.`, 'warning');
        document.getElementById('map-side-panel-el').classList.remove('open');
        plotOccurrencesOnMap();
      }
    });

    // Abrir no Google Maps
    document.getElementById('map-panel-gmaps-btn').addEventListener('click', () => {
      if (state.selectedOccurrence) {
        const url = `https://www.google.com/maps/search/?api=1&query=${state.selectedOccurrence.latitude},${state.selectedOccurrence.longitude}`;
        window.open(url, '_blank');
      }
    });

    // Ordem de Serviço
    document.getElementById('map-panel-os-btn').addEventListener('click', () => {
      if (state.selectedOccurrence) {
        showWorkOrderModal(state.selectedOccurrence);
      }
    });

    // Comparador temporal
    document.getElementById('map-panel-compare-btn').addEventListener('click', () => {
      if (state.selectedOccurrence) {
        openTemporalComparison(state.selectedOccurrence);
      }
    });

    // Filtros Flutuantes Rápidos do Mapa
    document.querySelectorAll('.map-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filterType = btn.getAttribute('data-filter');
        if (filterType === 'all') {
          plotOccurrencesOnMap();
          clearMapLayers();
        } else if (filterType === 'critical') {
          plotOccurrencesOnMap({ severity: 'Crítica' });
        } else if (filterType === 'resolved') {
          plotOccurrencesOnMap({ status: 'Resolvida' });
        } else if (filterType === 'routes') {
          plotOccurrencesOnMap();
          drawRoutesOnMap();
        } else if (filterType === 'heat') {
          drawHeatmapOnMap();
        } else if (filterType === 'health') {
          drawNeighborhoodHealthOnMap();
        }
      });
    });
  }

  function clearMapLayers() {
    if (state.routesGroup) state.routesGroup.clearLayers();
    // Limpa polígonos de bairros se houver
    state.neighborhoodPolygons.forEach(p => state.leafletMap.removeLayer(p));
    state.neighborhoodPolygons = [];
  }

  function drawRoutesOnMap() {
    clearMapLayers();
    state.db.routes.forEach(route => {
      const polyline = L.polyline(route.points, {
        color: '#1473E6',
        weight: 4,
        opacity: 0.7
      }).addTo(state.routesGroup);
      
      polyline.bindPopup(`<strong>${route.name}</strong><br>Veículo: ${route.vehicleId}<br>Distância: ${route.distanceKm} km`);
    });
    // Ajusta o zoom do mapa para englobar as rotas
    if (state.routesGroup.getLayers().length > 0) {
      state.leafletMap.fitBounds(state.routesGroup.getBounds());
    }
  }

  function drawHeatmapOnMap() {
    clearMapLayers();
    // Simula um heatmap desenhando círculos coloridos com opacidade graduada e raios maiores
    state.db.occurrences.forEach(o => {
      if (o.status === 'Resolvida') return;
      
      const radius = o.severityConfirmed === 'Crítica' ? 60 : (o.severityConfirmed === 'Alta' ? 45 : 30);
      const color = o.severityConfirmed === 'Crítica' ? '#EF4444' : (o.severityConfirmed === 'Alta' ? '#F97316' : '#F59E0B');
      
      const circle = L.circle([o.latitude, o.longitude], {
        radius: radius,
        fillColor: color,
        color: 'transparent',
        fillOpacity: 0.25
      }).addTo(state.routesGroup); // reutiliza o grupo para limpar fácil
    });
    showToast('Visualização do mapa de calor ativada.', 'info');
  }

  function drawNeighborhoodHealthOnMap() {
    clearMapLayers();
    
    // Desenha círculos/polígonos transparentes nos bairros de Cidade Azul
    // colorindo de acordo com o Score de Saúde Urbana
    const centers = window.CidadeScan.NEIGHBORHOOD_CENTERS;
    const scores = state.db.urbanHealthScores;

    Object.keys(centers).forEach(name => {
      const coord = centers[name];
      const score = scores[name]?.overall || 70;
      
      let color = '#22C55E'; // verde
      if (score < 40) color = '#EF4444'; // vermelho
      else if (score < 60) color = '#F97316'; // laranja
      else if (score < 80) color = '#F59E0B'; // amarelo

      // Desenha um polígono quadrado representativo ao redor do centro do bairro
      const size = 0.008; // tamanho do quadrante do bairro
      const bounds = [
        [coord.lat - size, coord.lng - size],
        [coord.lat - size, coord.lng + size],
        [coord.lat + size, coord.lng + size],
        [coord.lat + size, coord.lng - size]
      ];

      const polygon = L.polygon(bounds, {
        color: color,
        fillColor: color,
        fillOpacity: 0.2,
        weight: 1.5
      }).addTo(state.leafletMap);

      polygon.bindPopup(`<strong>Bairro: ${name}</strong><br>Saúde Urbana Score: <strong>${score}</strong>`);
      state.neighborhoodPolygons.push(polygon);
    });

    showToast('Visualização do Índice de Saúde Urbana ativada.', 'info');
  }

  // --- 6. CENTRAL DE VALIDAÇÃO (Keyboard Navigation) ---
  function initValidationCenter() {
    // Carrega ocorrências pendentes
    state.activeValidationList = state.db.occurrences.filter(o => o.status === 'Aguardando validação');
    state.validationIndex = 0;
    
    renderValidationCard();
    setupValidationKeybindings();
  }

  function renderValidationCard() {
    const container = document.getElementById('validation-card-target');
    const emptyState = document.getElementById('validation-empty-state');
    
    if (state.activeValidationList.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';

    const item = state.activeValidationList[state.validationIndex];
    
    // Preenche imagem principal com caixa delimitadora simulada
    const frame = document.getElementById('validation-img-frame');
    frame.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = item.imageMain;
    img.alt = 'Detecção CidadeScan';
    frame.appendChild(img);

    // Cria a caixa delimitadora por cima da imagem (simulado no frame de tamanho relativo)
    const box = document.createElement('div');
    box.className = 'ai-bounding-box-sim';
    
    // Posições da caixa simulada baseadas no ID da ocorrência para variar
    const boxPositions = [
      { top: '35%', left: '25%', width: '120px', height: '90px' },
      { top: '45%', left: '40%', width: '150px', height: '110px' },
      { top: '20%', left: '50%', width: '100px', height: '80px' },
      { top: '60%', left: '30%', width: '130px', height: '95px' }
    ];
    const pos = boxPositions[item.id % boxPositions.length];
    box.style.top = pos.top;
    box.style.left = pos.left;
    box.style.width = pos.width;
    box.style.height = pos.height;
    
    box.innerHTML = `<span class="ai-bounding-box-label">${item.subcategory} (${item.confidence}%)</span>`;
    frame.appendChild(box);

    // Detalhes textuais
    document.getElementById('val-item-code').innerText = item.code;
    document.getElementById('val-item-cat').value = item.category;
    document.getElementById('val-item-subcat').innerText = item.subcategory;
    document.getElementById('val-item-severity').value = item.severityConfirmed;
    document.getElementById('val-item-addr').innerText = item.address;
    document.getElementById('val-item-neighborhood').innerText = item.neighborhood;
    document.getElementById('val-item-date').innerText = `${item.dateCapture} às ${item.timeCapture}`;
    document.getElementById('val-item-vehicle').innerText = item.vehicleName;
    document.getElementById('val-item-confidence').innerText = `${item.confidence}%`;

    // Atualiza contadores do rodapé da central
    document.getElementById('val-counter-text').innerText = `Ocorrência ${state.validationIndex + 1} de ${state.activeValidationList.length}`;

    // Ações de botões na Central de Validação
    setupValidationActionButtons(item);
  }

  function setupValidationActionButtons(item) {
    const btnApprove = document.getElementById('val-btn-approve');
    const btnReject = document.getElementById('val-btn-reject');
    const btnDuplicate = document.getElementById('val-btn-duplicate');

    // Remove event listeners antigos clonando os botões
    const newApprove = btnApprove.cloneNode(true);
    const newReject = btnReject.cloneNode(true);
    const newDuplicate = btnDuplicate.cloneNode(true);

    btnApprove.replaceWith(newApprove);
    btnReject.replaceWith(newReject);
    btnDuplicate.replaceWith(newDuplicate);

    // Re-vincula ações
    newApprove.addEventListener('click', () => validateItem('Confirmada'));
    newReject.addEventListener('click', () => validateItem('Rejeitada'));
    newDuplicate.addEventListener('click', () => validateItem('Duplicada'));

    // Navegação manual anterior/próximo
    const btnPrev = document.getElementById('val-btn-prev');
    const btnNext = document.getElementById('val-btn-next');
    
    btnPrev.disabled = state.validationIndex === 0;
    btnNext.disabled = state.validationIndex === state.activeValidationList.length - 1;

    btnPrev.onclick = () => {
      if (state.validationIndex > 0) {
        state.validationIndex--;
        renderValidationCard();
      }
    };

    btnNext.onclick = () => {
      if (state.validationIndex < state.activeValidationList.length - 1) {
        state.validationIndex++;
        renderValidationCard();
      }
    };
  }

  function validateItem(newStatus) {
    if (state.activeValidationList.length === 0) return;
    const item = state.activeValidationList[state.validationIndex];
    
    // Atualiza status e categoria/gravidade editadas no painel de validação
    const editedCat = document.getElementById('val-item-cat').value;
    const editedSev = document.getElementById('val-item-severity').value;
    
    updateOccurrenceStatus(item.id, newStatus, {
      category: editedCat,
      severityConfirmed: editedSev,
      descriptionManual: newStatus === 'Duplicada' ? 'Ocorrência marcada como duplicada durante validação.' : ''
    });

    showToast(`Ocorrência ${item.code} validada como: ${newStatus}`, 'success');

    // Remove da fila da Central de Validação
    state.activeValidationList.splice(state.validationIndex, 1);
    
    // Ajusta o índice
    if (state.validationIndex >= state.activeValidationList.length && state.validationIndex > 0) {
      state.validationIndex--;
    }

    renderValidationCard();
  }

  function setupValidationKeybindings() {
    // Atalhos de teclado apenas se a aba de validação estiver ativa
    document.onkeydown = (e) => {
      if (state.activeTab !== 'validation') return;

      // Ignora atalhos se o usuário estiver focando em inputs ou selects para editar
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') {
        return;
      }

      if (e.key === 'a' || e.key === 'A') {
        validateItem('Confirmada');
      } else if (e.key === 'r' || e.key === 'R') {
        validateItem('Rejeitada');
      } else if (e.key === 'd' || e.key === 'D') {
        validateItem('Duplicada');
      } else if (e.key === 'ArrowRight') {
        if (state.validationIndex < state.activeValidationList.length - 1) {
          state.validationIndex++;
          renderValidationCard();
        }
      } else if (e.key === 'ArrowLeft') {
        if (state.validationIndex > 0) {
          state.validationIndex--;
          renderValidationCard();
        }
      }
    };
  }

  function updateOccurrenceStatus(id, newStatus, updates = {}) {
    const item = state.db.occurrences.find(o => o.id === id);
    if (item) {
      item.status = newStatus;
      item.severityConfirmed = updates.severityConfirmed || item.severityConfirmed;
      item.category = updates.category || item.category;
      item.descriptionManual = updates.descriptionManual || item.descriptionManual;
      
      // Adiciona ao histórico
      item.history.push({
        status: newStatus,
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: state.currentUser.name
      });

      // Grava no LocalStorage
      window.CidadeScan.saveDB(state.db);
    }
  }

  // --- 7. COMPARADOR TEMPORAL ---
  function openTemporalComparison(occurrence) {
    const modal = document.getElementById('compare-modal-backdrop');
    if (!modal) return;

    document.getElementById('compare-item-code').innerText = occurrence.code;
    document.getElementById('compare-item-sub').innerText = `${occurrence.category} - ${occurrence.address}`;

    // Configura as imagens do comparador antes/depois
    const beforeImg = document.getElementById('compare-img-before');
    const afterImg = document.getElementById('compare-img-after');

    if (occurrence.comparisons && occurrence.comparisons.length >= 2) {
      beforeImg.src = occurrence.comparisons[0].image;
      afterImg.src = occurrence.comparisons[1].image;
      document.getElementById('compare-date-before').innerText = `Antes (${occurrence.comparisons[0].date})`;
      document.getElementById('compare-date-after').innerText = `Depois (${occurrence.comparisons[1].date})`;
      document.getElementById('compare-details-text').innerText = `${occurrence.comparisons[1].desc} A ocorrência progrediu e foi solucionada no prazo programado.`;
    } else {
      // Caso genérico se não tiver histórico
      beforeImg.src = occurrence.imageMain;
      afterImg.src = 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?w=600&auto=format&fit=crop&q=60';
      document.getElementById('compare-date-before').innerText = `Antes (${occurrence.dateCapture})`;
      document.getElementById('compare-date-after').innerText = `Depois (Serviço Executado)`;
      document.getElementById('compare-details-text').innerText = 'Simulação de repavimentação asfáltica. Serviço executado pela equipe designada pela secretaria responsável.';
    }

    // Inicializa o slider na metade
    const sliderBar = document.getElementById('compare-slider-bar');
    const sliderContainer = document.getElementById('compare-slider-container');
    const afterWrapper = document.getElementById('compare-after-wrapper');
    
    let isSliding = false;

    // Reseta slider
    afterWrapper.style.width = '50%';
    sliderBar.style.left = '50%';

    // Eventos do Slider
    sliderBar.onmousedown = () => isSliding = true;
    window.onmouseup = () => isSliding = false;
    
    window.onmousemove = (e) => {
      if (!isSliding) return;
      const rect = sliderContainer.getBoundingClientRect();
      let x = e.clientX - rect.left;
      if (x < 0) x = 0;
      if (x > rect.width) x = rect.width;
      const pct = (x / rect.width) * 100;
      
      afterWrapper.style.width = `${pct}%`;
      sliderBar.style.left = `${pct}%`;
    };

    // Para Mobile/Touch
    sliderBar.ontouchstart = () => isSliding = true;
    window.ontouchend = () => isSliding = false;
    window.ontouchmove = (e) => {
      if (!isSliding) return;
      const rect = sliderContainer.getBoundingClientRect();
      const touch = e.touches[0];
      let x = touch.clientX - rect.left;
      if (x < 0) x = 0;
      if (x > rect.width) x = rect.width;
      const pct = (x / rect.width) * 100;
      
      afterWrapper.style.width = `${pct}%`;
      sliderBar.style.left = `${pct}%`;
    };

    modal.classList.add('show');
  }

  // Fechar Modal do comparador
  document.getElementById('close-compare-modal')?.addEventListener('click', () => {
    document.getElementById('compare-modal-backdrop').classList.remove('show');
  });

  // --- 8. SIMULADORES DE VARREDURA POR INTELIGÊNCIA ARTIFICIAL ---
  
  // A. Varredura Manual (Upload)
  const btnManualSweep = document.getElementById('trigger-manual-sweep-modal');
  const modalManual = document.getElementById('sweep-manual-modal-backdrop');
  
  btnManualSweep?.addEventListener('click', () => {
    modalManual.classList.add('show');
  });

  document.getElementById('close-manual-modal')?.addEventListener('click', () => {
    modalManual.classList.remove('show');
    resetManualSweepModal();
  });

  // Alterar imagem pré-selecionada no modal manual
  document.getElementById('sweep-manual-select-preset')?.addEventListener('change', (e) => {
    const previewImg = document.getElementById('sweep-manual-preview-img');
    previewImg.src = e.target.value;
    previewImg.style.display = 'block';
  });

  document.getElementById('sweep-manual-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const neighborhood = document.getElementById('sweep-manual-neighborhood').value;
    const vehicleId = document.getElementById('sweep-manual-vehicle').value;
    const imageUrl = document.getElementById('sweep-manual-select-preset').value;
    
    if (!neighborhood || !vehicleId || !imageUrl) {
      showToast('Preencha todas as informações para a varredura.', 'warning');
      return;
    }

    // Iniciar animação de processamento
    const btnSubmit = document.getElementById('sweep-manual-submit-btn');
    const progressBar = document.getElementById('sweep-manual-progress-container');
    const progressFill = document.getElementById('sweep-manual-progress-fill');
    const resultsContainer = document.getElementById('sweep-manual-results');

    btnSubmit.disabled = true;
    progressBar.style.display = 'block';
    resultsContainer.style.display = 'none';
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      progressFill.style.width = `${progress}%`;
      if (progress >= 100) {
        clearInterval(interval);
        
        // Simular a detecção
        simulateAIDetectionResult(neighborhood, vehicleId, imageUrl);
      }
    }, 200);
  });

  function simulateAIDetectionResult(neighborhood, vehicleId, imageUrl) {
    const db = state.db;
    const vehicle = db.vehicles.find(v => v.id === parseInt(vehicleId));
    
    // Determinar categoria simulada baseado na imagem selecionada
    let category = 'Pavimentação';
    let subcategory = 'Buraco';
    let severity = 'Alta';
    
    if (imageUrl.includes('trash') || imageUrl.includes('photo-1611284446314-60a58ac0deb9') || imageUrl.includes('photo-1530587191325-3db32d826c18')) {
      category = 'Limpeza Urbana';
      subcategory = 'Lixo acumulado';
      severity = 'Média';
    } else if (imageUrl.includes('grass') || imageUrl.includes('photo-1508962914676-134849a727f0') || imageUrl.includes('photo-1542273917363-3b1817f69a2d')) {
      category = 'Vegetação';
      subcategory = 'Mato alto';
      severity = 'Baixa';
    }

    const confidence = parseFloat((85 + Math.random() * 14).toFixed(1));
    const center = window.CidadeScan.NEIGHBORHOOD_CENTERS[neighborhood];
    const lat = center.lat + (Math.random() - 0.5) * 0.008;
    const lng = center.lng + (Math.random() - 0.5) * 0.008;

    // Criar nova ocorrência
    const newId = db.occurrences.length + 1;
    const dateStr = new Date().toISOString().substring(0, 10);
    const timeStr = new Date().toTimeString().substring(0, 8);
    const street = window.CidadeScan.STREETS_BY_NEIGHBORHOOD[neighborhood][Math.floor(Math.random() * 5)];

    const newOcc = {
      id: newId,
      code: `CS-${2026000 + newId}`,
      municipalityId: 1,
      category: category,
      subcategory: subcategory,
      descriptionAuto: `IA identificou possível ${subcategory.toLowerCase()} no asfalto com ${confidence}% de confiança.`,
      descriptionManual: '',
      imageMain: imageUrl,
      imagesComplementary: [],
      videoClipUrl: 'simulated_video_clip.mp4',
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      address: `${street}, ~${Math.floor(Math.random() * 800) + 1}`,
      street: street,
      neighborhood: neighborhood,
      cep: '28930-000',
      dateCapture: dateStr,
      timeCapture: timeStr,
      dateCreated: dateStr,
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      driverName: vehicle.responsible,
      routeName: `Varredura Manual`,
      cameraModel: 'Dashcam RoadEye Pro v2',
      confidence: confidence,
      severitySuggested: severity,
      severityConfirmed: severity,
      department: window.CidadeScan.CATEGORIES[category].department,
      teamName: db.teams.find(t => t.department === window.CidadeScan.CATEGORIES[category].department)?.name || 'Equipe Alpha Obras',
      status: 'Aguardando validação',
      priority: severity === 'Crítica' ? 'Urgente' : (severity === 'Alta' ? 'Alta' : 'Normal'),
      deadline: dateStr,
      history: [
        { status: 'Detectada pela IA', date: `${dateStr} ${timeStr}`, user: 'CidadeScan AI Core v1.4' },
        { status: 'Aguardando validação', date: `${dateStr} ${timeStr}`, user: 'Sistema' }
      ],
      comments: [],
      isDuplicate: false,
      duplicateGroupId: null
    };

    // Adicionar no banco de dados local
    db.occurrences.unshift(newOcc); // Adiciona no início
    window.CidadeScan.saveDB(db);
    state.db = db;

    // Mostrar os resultados no modal
    document.getElementById('sweep-manual-progress-container').style.display = 'none';
    const resultsContainer = document.getElementById('sweep-manual-results');
    resultsContainer.style.display = 'block';

    document.getElementById('res-val-cat').innerText = category;
    document.getElementById('res-val-sub').innerText = subcategory;
    document.getElementById('res-val-confidence').innerText = `${confidence}%`;
    document.getElementById('res-val-addr').innerText = newOcc.address;
    document.getElementById('res-val-severity').innerText = severity;

    // Atualiza gráficos e mapa caso estejam abertos
    renderDashboardStats();
    if (state.activeTab === 'map') {
      plotOccurrencesOnMap();
    }

    // Botão de submissão do modal volta a ficar ativo
    document.getElementById('sweep-manual-submit-btn').disabled = false;
    
    showToast(`Ocorrência ${newOcc.code} inserida na Central de Validação.`, 'success');
  }

  function resetManualSweepModal() {
    document.getElementById('sweep-manual-form').reset();
    document.getElementById('sweep-manual-preview-img').style.display = 'none';
    document.getElementById('sweep-manual-progress-container').style.display = 'none';
    document.getElementById('sweep-manual-progress-fill').style.width = '0%';
    document.getElementById('sweep-manual-results').style.display = 'none';
  }


  // B. Demonstração Automática (Modo Live Route)
  const btnAutoSweep = document.getElementById('trigger-auto-sweep-demo');
  const modalAuto = document.getElementById('sweep-auto-modal-backdrop');

  btnAutoSweep?.addEventListener('click', () => {
    modalAuto.classList.add('show');
    startAutoSweepSimulation();
  });

  document.getElementById('close-auto-modal')?.addEventListener('click', () => {
    modalAuto.classList.remove('show');
    stopAutoSweepSimulation();
  });

  function startAutoSweepSimulation() {
    // Configura a rota simulada (Prainha)
    const prainhaCenter = window.CidadeScan.NEIGHBORHOOD_CENTERS['Prainha'];
    
    // Cria 10 pontos sequenciais para mover o veículo
    state.demoRoutePoints = [
      [-22.9660, -42.0230],
      [-22.9665, -42.0238],
      [-22.9672, -42.0245], // Detecção 1: Buraco
      [-22.9680, -42.0242],
      [-22.9688, -42.0235],
      [-22.9692, -42.0225], // Detecção 2: Lixo Acumulado
      [-22.9685, -42.0215],
      [-22.9675, -42.0218],
      [-22.9665, -42.0224]  // Detecção 3: Sinalização Danificada
    ];

    state.demoRouteIndex = 0;
    
    // Carrega o mapa do modal se necessário
    setTimeout(() => {
      const modalMap = L.map('auto-sweep-map').setView(state.demoRoutePoints[0], 16);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(modalMap);
      
      const routeLine = L.polyline(state.demoRoutePoints, { color: '#38BDF8', weight: 4, dashArray: '5, 10' }).addTo(modalMap);
      
      // Ícone do Veículo customizado
      const vehicleIcon = L.divIcon({
        html: '<div style="background-color: #1473E6; border: 3px solid white; width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
        className: 'custom-vehicle-icon',
        iconSize: [16, 16]
      });

      state.demoMarker = L.marker(state.demoRoutePoints[0], { icon: vehicleIcon }).addTo(modalMap);

      // Loop de movimentação do veículo
      state.demoInterval = setInterval(() => {
        state.demoRouteIndex++;
        if (state.demoRouteIndex >= state.demoRoutePoints.length) {
          state.demoRouteIndex = 0; // recomeça
        }

        const nextPoint = state.demoRoutePoints[state.demoRouteIndex];
        state.demoMarker.setLatLng(nextPoint);
        modalMap.panTo(nextPoint);

        // Atualiza painel do GPS
        document.getElementById('auto-sweep-hud-lat').innerText = `LAT: ${nextPoint[0].toFixed(5)}`;
        document.getElementById('auto-sweep-hud-lng').innerText = `LNG: ${nextPoint[1].toFixed(5)}`;
        document.getElementById('auto-sweep-hud-km').innerText = `${((state.demoRouteIndex * 0.4)).toFixed(1)} km`;

        // Detecções em pontos específicos da rota
        handleAutoSweepDetections(state.demoRouteIndex, nextPoint, modalMap);

      }, 2500); // move a cada 2.5s

    }, 300);
  }

  function handleAutoSweepDetections(index, point, map) {
    const feedImg = document.getElementById('auto-sweep-feed-img');
    const overlayBox = document.getElementById('auto-sweep-overlay-box');
    const logList = document.getElementById('auto-sweep-log-list');

    // Reseta caixa delimitadora anterior
    overlayBox.style.display = 'none';

    // Lista de frames detectados correspondentes aos índices
    const detections = {
      2: {
        img: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=600&auto=format&fit=crop&q=60',
        cat: 'Pavimentação',
        sub: 'Buraco',
        sev: 'Alta',
        conf: '94.2%',
        box: { top: '45%', left: '30%', width: '120px', height: '80px' }
      },
      5: {
        img: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=60',
        cat: 'Limpeza Urbana',
        sub: 'Lixo acumulado',
        sev: 'Média',
        conf: '89.5%',
        box: { top: '55%', left: '45%', width: '140px', height: '100px' }
      },
      8: {
        img: 'https://images.unsplash.com/photo-1571217684074-be4661858a74?w=600&auto=format&fit=crop&q=60',
        cat: 'Sinalização',
        sub: 'Placa danificada',
        sev: 'Média',
        conf: '91.8%',
        box: { top: '25%', left: '55%', width: '80px', height: '110px' }
      }
    };

    if (detections[index]) {
      const d = detections[index];
      
      // Atualiza câmera feed
      feedImg.src = d.img;
      
      // Exibe caixa delimitadora vermelha na câmera
      overlayBox.style.top = d.box.top;
      overlayBox.style.left = d.box.left;
      overlayBox.style.width = d.box.width;
      overlayBox.style.height = d.box.height;
      overlayBox.querySelector('.ai-bounding-box-label').innerText = `${d.sub} (${d.conf})`;
      overlayBox.style.display = 'block';

      // Desenha ponto no mapa do modal
      L.circleMarker(point, { radius: 8, fillColor: '#EF4444', color: '#FFF', weight: 2, fillOpacity: 0.9 }).addTo(map);

      // Adiciona linha no Log da varredura
      const li = document.createElement('li');
      li.style.padding = '8px 0';
      li.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
      li.style.fontSize = '0.8rem';
      li.innerHTML = `<span style="color:#EF4444;font-weight:700;">[IA DETECTED]</span> <strong>${d.sub}</strong> (${d.conf} Conf.) - Prainha. Gravidade sugerida: ${d.sev}.`;
      logList.insertBefore(li, logList.firstChild);

      // Toca um sinal sonoro de sistema para simular alerta da cabine (usando o Web Audio API do navegador!)
      playBeepChime();

      // Gravar no DB como nova ocorrência
      saveDetectedOccurrenceFromAuto(d.cat, d.sub, d.sev, point[0], point[1], d.img);
    } else {
      // Feed de estrada normal sem detecções
      feedImg.src = 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?w=600&auto=format&fit=crop&q=60';
    }
  }

  function playBeepChime() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Tom agudo
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime); // volume baixo
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 150);
    } catch (e) {
      console.log('Audio Context não suportado ou bloqueado.');
    }
  }

  function saveDetectedOccurrenceFromAuto(category, subcategory, severity, lat, lng, imgUrl) {
    const db = state.db;
    const newId = db.occurrences.length + 1;
    const dateStr = new Date().toISOString().substring(0, 10);
    const timeStr = new Date().toTimeString().substring(0, 8);
    const street = window.CidadeScan.STREETS_BY_NEIGHBORHOOD['Prainha'][Math.floor(Math.random() * 5)];

    const newOcc = {
      id: newId,
      code: `CS-${2026000 + newId}`,
      municipalityId: 1,
      category: category,
      subcategory: subcategory,
      descriptionAuto: `IA identificou possível ${subcategory.toLowerCase()} no asfalto com 92% de confiança.`,
      descriptionManual: '',
      imageMain: imgUrl,
      imagesComplementary: [],
      videoClipUrl: '',
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      address: `${street}, ~${Math.floor(Math.random() * 900) + 1}`,
      street: street,
      neighborhood: 'Prainha',
      cep: '28930-000',
      dateCapture: dateStr,
      timeCapture: timeStr,
      dateCreated: dateStr,
      vehicleId: 1,
      vehicleName: 'Caminhão de Coleta 01',
      driverName: 'Ricardo Santos',
      routeName: `Demonstração Automática`,
      cameraModel: 'Dashcam RoadEye Pro v2',
      confidence: 92,
      severitySuggested: severity,
      severityConfirmed: severity,
      department: window.CidadeScan.CATEGORIES[category].department,
      teamName: db.teams.find(t => t.department === window.CidadeScan.CATEGORIES[category].department)?.name || 'Equipe Alpha Obras',
      status: 'Aguardando validação',
      priority: severity === 'Crítica' ? 'Urgente' : (severity === 'Alta' ? 'Alta' : 'Normal'),
      deadline: dateStr,
      history: [
        { status: 'Detectada pela IA', date: `${dateStr} ${timeStr}`, user: 'CidadeScan AI Core v1.4' },
        { status: 'Aguardando validação', date: `${dateStr} ${timeStr}`, user: 'Sistema' }
      ],
      comments: [],
      isDuplicate: false,
      duplicateGroupId: null
    };

    db.occurrences.unshift(newOcc);
    window.CidadeScan.saveDB(db);
    state.db = db;

    // Atualiza contadores globais e mapa em segundo plano
    renderDashboardStats();
    if (state.activeTab === 'map') {
      plotOccurrencesOnMap();
    }
  }

  function stopAutoSweepSimulation() {
    if (state.demoInterval) {
      clearInterval(state.demoInterval);
      state.demoInterval = null;
    }
    // Limpar os logs do modal
    const logList = document.getElementById('auto-sweep-log-list');
    if (logList) logList.innerHTML = '';
  }

  // --- 9. TABELAS RICAS (Busca, paginação e ordenação) ---
  let occurrencesCurrentPage = 1;
  const rowsPerPage = 10;

  function renderOccurrencesTable() {
    const listBody = document.getElementById('occurrences-table-body');
    if (!listBody) return;

    listBody.innerHTML = '';
    
    // Filtros
    const searchVal = document.getElementById('search-occ').value.toLowerCase();
    const catVal = document.getElementById('filter-occ-category').value;
    const sevVal = document.getElementById('filter-occ-severity').value;
    const statusVal = document.getElementById('filter-occ-status').value;

    let filtered = [...state.db.occurrences];

    if (searchVal) {
      filtered = filtered.filter(o => 
        o.code.toLowerCase().includes(searchVal) ||
        o.street.toLowerCase().includes(searchVal) ||
        o.neighborhood.toLowerCase().includes(searchVal)
      );
    }
    if (catVal) {
      filtered = filtered.filter(o => o.category === catVal);
    }
    if (sevVal) {
      filtered = filtered.filter(o => o.severityConfirmed === sevVal);
    }
    if (statusVal) {
      filtered = filtered.filter(o => o.status === statusVal);
    }

    // Paginação
    const totalRows = filtered.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    
    if (occurrencesCurrentPage > totalPages) occurrencesCurrentPage = Math.max(1, totalPages);
    
    const start = (occurrencesCurrentPage - 1) * rowsPerPage;
    const paginatedList = filtered.slice(start, start + rowsPerPage);

    // Contadores de paginação
    document.getElementById('occ-page-indicator').innerText = `Página ${occurrencesCurrentPage} de ${totalPages || 1}`;
    document.getElementById('occ-range-indicator').innerText = `Exibindo ${start + 1}-${Math.min(start + rowsPerPage, totalRows)} de ${totalRows} ocorrências`;

    // Desenha tabela
    if (paginatedList.length === 0) {
      listBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-text-sub); padding: 30px;">Nenhuma ocorrência encontrada.</td></tr>`;
      return;
    }

    paginatedList.forEach(o => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--color-primary);">${o.code}</td>
        <td>
          <div style="font-weight: 600;">${o.category}</div>
          <div style="font-size: 0.78rem; color: var(--color-text-sub);">${o.subcategory}</div>
        </td>
        <td>
          <div>${o.street}</div>
          <div style="font-size: 0.78rem; color: var(--color-text-sub);">${o.neighborhood}</div>
        </td>
        <td>${o.dateCapture}</td>
        <td><span class="badge ${getBadgeClassForSeverity(o.severityConfirmed)}">${o.severityConfirmed}</span></td>
        <td><span class="badge ${getBadgeClassForStatus(o.status)}">${o.status}</span></td>
        <td>
          <button class="btn btn-secondary btn-icon view-details-btn" data-id="${o.id}">
            <i class="lucide-eye" style="width:16px;height:16px;"></i>
          </button>
        </td>
      `;
      listBody.appendChild(tr);
    });

    // Eventos de clique nos botões de detalhes da ocorrência
    document.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(btn.getAttribute('data-id'));
        const occurrence = state.db.occurrences.find(o => o.id === id);
        if (occurrence) {
          switchTab('map');
          setTimeout(() => {
            state.leafletMap.setView([occurrence.latitude, occurrence.longitude], 17);
            openOccurrenceDetailsPanel(occurrence);
          }, 150);
        }
      });
    });

    // Controla botões de paginação anterior/próximo
    document.getElementById('occ-btn-prev').disabled = occurrencesCurrentPage === 1;
    document.getElementById('occ-btn-next').disabled = occurrencesCurrentPage === totalPages || totalPages === 0;
  }

  // Event Listeners de busca e paginação de ocorrências
  document.getElementById('search-occ')?.addEventListener('input', () => {
    occurrencesCurrentPage = 1;
    renderOccurrencesTable();
  });
  document.getElementById('filter-occ-category')?.addEventListener('change', () => {
    occurrencesCurrentPage = 1;
    renderOccurrencesTable();
  });
  document.getElementById('filter-occ-severity')?.addEventListener('change', () => {
    occurrencesCurrentPage = 1;
    renderOccurrencesTable();
  });
  document.getElementById('filter-occ-status')?.addEventListener('change', () => {
    occurrencesCurrentPage = 1;
    renderOccurrencesTable();
  });

  document.getElementById('occ-btn-prev')?.addEventListener('click', () => {
    if (occurrencesCurrentPage > 1) {
      occurrencesCurrentPage--;
      renderOccurrencesTable();
    }
  });

  document.getElementById('occ-btn-next')?.addEventListener('click', () => {
    occurrencesCurrentPage++;
    renderOccurrencesTable();
  });

  // --- 10. CADASTROS: VEÍCULOS, EQUIPES E MISSÕES ---
  
  // Lista de Veículos
  function renderVehiclesList() {
    const list = document.getElementById('vehicles-list-target');
    if (!list) return;

    list.innerHTML = '';
    state.db.vehicles.forEach(v => {
      const card = document.createElement('div');
      card.className = 'card card-hover';
      card.innerHTML = `
        <div class="card-header" style="margin-bottom: 8px;">
          <div style="font-weight: 700; font-size: 1.1rem; color: var(--color-primary-dark);">${v.name}</div>
          <span class="badge ${v.status === 'Operando' ? 'badge-low' : 'badge-critical'}">${v.status}</span>
        </div>
        <div style="font-size:0.85rem; color:var(--color-text-sub); margin-bottom: 12px;">Placa: ${v.plate} | Tipo: ${v.type}</div>
        <div style="display:flex; flex-direction:column; gap:6px; font-size: 0.85rem;">
          <div style="display:flex; justify-content:space-between;"><strong>Responsável:</strong> <span>${v.responsible}</span></div>
          <div style="display:flex; justify-content:space-between;"><strong>Câmera vinculada:</strong> <span>${v.cameraStatus}</span></div>
          <div style="display:flex; justify-content:space-between;"><strong>Armazenamento:</strong> <span>${v.storageFree} livre</span></div>
          <div style="display:flex; justify-content:space-between; margin-top:8px; border-top:1px solid var(--color-border); padding-top:6px;"><strong>Km Analisados:</strong> <span>${v.kmAnalyzed} km</span></div>
          <div style="display:flex; justify-content:space-between;"><strong>Ocorrências Detectadas:</strong> <span style="color:var(--color-danger); font-weight:700;">${v.occurrencesDetected}</span></div>
        </div>
      `;
      list.appendChild(card);
    });
  }

  // Lista de Equipes
  function renderTeamsList() {
    const list = document.getElementById('teams-list-target');
    if (!list) return;

    list.innerHTML = '';
    state.db.teams.forEach(t => {
      const card = document.createElement('div');
      card.className = 'card card-hover';
      card.innerHTML = `
        <div class="card-header" style="margin-bottom: 8px;">
          <div style="font-weight: 700; font-size: 1.1rem; color: var(--color-primary-dark);">${t.name}</div>
          <span class="badge badge-low">${t.status}</span>
        </div>
        <div style="font-size:0.85rem; color:var(--color-primary); font-weight:600; margin-bottom: 12px;">${t.department}</div>
        <div style="display:flex; flex-direction:column; gap:6px; font-size: 0.85rem;">
          <div style="display:flex; justify-content:space-between;"><strong>Coordenador:</strong> <span>${t.coordinator}</span></div>
          <div style="display:flex; justify-content:space-between;"><strong>Integrantes:</strong> <span>${t.members}</span></div>
          <div style="display:flex; justify-content:space-between;"><strong>Ocorrências Designadas:</strong> <span>${t.openCases}</span></div>
          <div style="display:flex; justify-content:space-between;"><strong>Tempo Médio Resposta:</strong> <span>${t.avgResolutionDays} dias</span></div>
        </div>
      `;
      list.appendChild(card);
    });
  }

  // Lista de Missões
  function renderMissionsList() {
    const list = document.getElementById('missions-list-target');
    if (!list) return;

    list.innerHTML = '';
    state.db.missions.forEach(m => {
      const pct = Math.round((m.currentKm / m.targetKm) * 100) || 0;
      const card = document.createElement('div');
      card.className = 'card card-hover';
      card.innerHTML = `
        <div class="card-header" style="margin-bottom: 4px;">
          <div style="font-weight: 700; font-size: 1.1rem; color: var(--color-primary-dark);">${m.name}</div>
          <span class="badge ${m.status === 'Concluída' ? 'badge-low' : (m.status === 'Em andamento' ? 'badge-validate' : 'badge-detect')}">${m.status}</span>
        </div>
        <div style="font-size:0.82rem; color:var(--color-text-sub); margin-bottom:12px;">Bairro prioritário: ${m.neighborhood}</div>
        <p style="font-size:0.85rem; margin-bottom:12px; height: 38px; overflow:hidden; text-overflow:ellipsis;">${m.desc}</p>
        
        <div style="margin-bottom: 12px;">
          <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
            <span><strong>Cobertura territorial:</strong></span>
            <span><strong>${pct}% (${m.currentKm}/${m.targetKm} km)</strong></span>
          </div>
          <div style="width:100%; height:6px; background-color:var(--color-border); border-radius:3px; overflow:hidden;">
            <div style="width:${pct}%; height:100%; background-color:var(--color-primary-light);"></div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; font-size:0.8rem; text-align:center; background-color:var(--color-bg-gray); padding:8px; border-radius:6px;">
          <div><div style="font-weight:700;color:var(--color-text-main);">${m.occurrences}</div><div style="color:var(--color-text-sub);font-size:0.7rem;">Ocorrências</div></div>
          <div><div style="font-weight:700;color:var(--color-danger);">${m.critical}</div><div style="color:var(--color-text-sub);font-size:0.7rem;">Críticas</div></div>
          <div><div style="font-weight:700;color:var(--color-success);">${m.resolved}</div><div style="color:var(--color-text-sub);font-size:0.7rem;">Resolvidas</div></div>
        </div>
      `;
      list.appendChild(card);
    });
  }

  // --- 11. URBAN HEALTH SCORE ---
  function renderHealthScores() {
    const target = document.getElementById('health-scores-target');
    if (!target) return;

    target.innerHTML = '';
    const scores = state.db.urbanHealthScores;

    Object.keys(scores).sort((a,b) => scores[b].overall - scores[a].overall).forEach(neigh => {
      const s = scores[neigh];
      
      let scoreColorClass = 'score-green';
      if (s.overall < 40) scoreColorClass = 'score-red';
      else if (s.overall < 60) scoreColorClass = 'score-orange';
      else if (s.overall < 80) scoreColorClass = 'score-yellow';

      const div = document.createElement('div');
      div.className = 'card card-hover';
      div.innerHTML = `
        <div class="score-badge-circle ${scoreColorClass}">${s.overall}</div>
        <h4 style="text-align:center; font-weight:700; font-size:1.1rem; color:var(--color-primary-dark); margin-bottom:12px;">${neigh}</h4>
        
        <div style="display:flex; flex-direction:column; gap:6px; font-size:0.8rem;">
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--color-bg-gray); padding-bottom:4px;"><span>Pavimentação:</span> <strong>${s.pav}/100</strong></div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--color-bg-gray); padding-bottom:4px;"><span>Limpeza Urbana:</span> <strong>${s.clean}/100</strong></div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--color-bg-gray); padding-bottom:4px;"><span>Sinalização:</span> <strong>${s.sign}/100</strong></div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--color-bg-gray); padding-bottom:4px;"><span>Iluminação Pública:</span> <strong>${s.light}/100</strong></div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--color-bg-gray); padding-bottom:4px;"><span>Acessibilidade:</span> <strong>${s.access}/100</strong></div>
          <div style="display:flex; justify-content:space-between;"><span>Drenagem:</span> <strong>${s.drain}/100</strong></div>
        </div>
      `;
      target.appendChild(div);
    });
  }

  // --- 12. MODAIS E ORDEM DE SERVIÇO ---
  function showWorkOrderModal(occurrence) {
    const modal = document.getElementById('os-modal-backdrop');
    if (!modal) return;

    document.getElementById('os-occurrence-code').innerText = occurrence.code;
    document.getElementById('os-category').innerText = `${occurrence.category} (${occurrence.subcategory})`;
    document.getElementById('os-address').innerText = occurrence.address;
    document.getElementById('os-department').innerText = occurrence.department;
    document.getElementById('os-team').innerText = occurrence.teamName;

    // Ação do formulário OS
    document.getElementById('os-form').onsubmit = (e) => {
      e.preventDefault();
      
      const osId = Math.floor(Math.random() * 9000) + 1000;
      updateOccurrenceStatus(occurrence.id, 'Em atendimento', {
        descriptionManual: `Ordem de Serviço #${osId} criada para a equipe: ${occurrence.teamName}.`
      });

      showToast(`Ordem de Serviço #${osId} gerada com sucesso!`, 'success');
      modal.classList.remove('show');
      openOccurrenceDetailsPanel(occurrence); // Recarrega painel do mapa
    };

    modal.classList.add('show');
  }

  document.getElementById('close-os-modal')?.addEventListener('click', () => {
    document.getElementById('os-modal-backdrop').classList.remove('show');
  });

  // --- 13. SUPERADMIN PANEL ---
  function renderSuperadminPanel() {
    const auditLogsBody = document.getElementById('audit-logs-table-body');
    if (!auditLogsBody) return;

    // Desenha alguns logs de auditoria LGPD simulados
    const logs = [
      { date: '2026-07-10 13:42:15', user: 'Carlos Menezes', action: 'Visualizou logs de auditoria geral', ip: '192.168.1.15' },
      { date: '2026-07-10 12:15:30', user: 'Luciana Porto', action: 'Exportou relatório geral Cidade Azul (PDF)', ip: '192.168.1.10' },
      { date: '2026-07-10 10:20:00', user: 'Maria Eduarda', action: 'Designou equipe Limpeza Central para Buraco Centro', ip: '186.230.12.99' },
      { date: '2026-07-10 09:30:12', user: 'Jorge Silva', action: 'Aprovou ocorrência CS-2026042', ip: '186.230.12.102' },
      { date: '2026-07-10 08:45:00', user: 'Ricardo Santos', action: 'Iniciou varredura automática (Caminhão 01)', ip: 'LTE Mobile' }
    ];

    auditLogsBody.innerHTML = '';
    logs.forEach(l => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: monospace; font-size:0.8rem;">${l.date}</td>
        <td><strong>${l.user}</strong></td>
        <td>${l.action}</td>
        <td style="font-family: monospace; font-size:0.8rem; color:var(--color-text-sub);">${l.ip}</td>
      `;
      auditLogsBody.appendChild(tr);
    });
  }

  // --- 14. EXPORTAÇÃO DE RELATÓRIOS ---
  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const format = btn.getAttribute('data-format');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="lucide-refresh-cw animate-spin"></i> Exportando...';
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        showToast(`Relatório exportado em formato ${format} com sucesso!`, 'success');
        
        // Simulação de impressão se for PDF
        if (format === 'PDF') {
          window.print();
        }
      }, 800);
    });
  });

  // --- 15. NOTIFICAÇÕES (Toasts) ---
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    else if (type === 'warning') icon = 'alert-triangle';
    else if (type === 'critical') icon = 'alert-circle';

    toast.innerHTML = `
      <i class="lucide-${icon}" style="width:20px;height:20px;"></i>
      <div style="flex:1;font-size:0.85rem;font-weight:600;">${message}</div>
    `;

    container.appendChild(toast);

    // Substitui ícones lucide dinamicamente no toast
    if (window.lucide) {
      window.lucide.createIcons();
    }

    setTimeout(() => {
      toast.style.transform = 'translateY(100px) scale(0.9)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Sincronização em tempo real (Escuta alterações em outras abas, ex: mobile.html)
  window.addEventListener('storage', (e) => {
    if (e.key === 'cidadescan_db') {
      state.db = JSON.parse(e.newValue);
      
      // Atualiza a tela ativa se for relevante
      if (state.activeTab === 'dashboard') {
        renderDashboardStats();
        renderDashboardCharts();
      } else if (state.activeTab === 'map') {
        plotOccurrencesOnMap();
      } else if (state.activeTab === 'validation') {
        initValidationCenter();
      } else if (state.activeTab === 'occurrences') {
        renderOccurrencesTable();
      }

      showToast('Novos dados de varredura recebidos do aplicativo móvel!', 'success');
    }
  });

  // --- 15.2. CENTRO DE MONITORAMENTO DE CÂMERAS AO VIVO ---
  function renderLiveCamerasGrid() {
    const container = document.getElementById('live-cameras-grid-container');
    if (!container) return;
    container.innerHTML = '';

    state.liveCamerasList.forEach(cam => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.padding = '16px';
      card.style.backgroundColor = '#0f172a';
      card.style.borderColor = '#1e293b';
      card.style.color = 'white';
      card.style.position = 'relative';
      card.style.boxShadow = 'var(--shadow-md)';
      card.style.borderRadius = 'var(--radius-md)';
      
      const isThisWebcam = cam.id === 1 && state.isWebcamActive;

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px;">
          <div style="font-weight:700; font-size:0.82rem; color:#38bdf8; display:flex; align-items:center; gap:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            <i class="lucide-aperture" style="width:14px;height:14px;flex-shrink:0;"></i>
            <span>${cam.name} - ${cam.vehicle}</span>
          </div>
          <span class="badge" style="background-color:#22c55e; color:white; font-size:0.6rem; padding:2px 6px; display:flex; align-items:center; gap:4px; flex-shrink:0; font-weight:700;">
            <span style="width:5px; height:5px; background-color:white; border-radius:50%; animation: blinkRec 1s infinite alternate;"></span> AO VIVO
          </span>
        </div>

        <div style="position:relative; height:140px; background-color:#020617; border-radius:6px; overflow:hidden; border:1px solid rgba(255,255,255,0.1);" id="live-cam-feed-${cam.id}">
          <img id="live-cam-img-${cam.id}" src="${cam.img}" alt="${cam.name}" style="width:100%; height:100%; object-fit:cover; opacity:0.8; display: ${isThisWebcam ? 'none' : 'block'};">
          ${cam.id === 1 ? `<video id="live-cam-video-1" autoplay playsinline style="width:100%; height:100%; object-fit:cover; filter: brightness(0.85); transform: scaleX(-1); display: ${isThisWebcam ? 'block' : 'none'};"></video>` : ''}
          
          <!-- Bounding box overlay -->
          <div class="ai-bounding-box-sim" id="live-cam-box-${cam.id}" style="display:none; width:80px; height:60px; top:40%; left:30%;">
            <span class="ai-bounding-box-label" style="font-size:0.55rem; top:-16px; padding:1px 4px; border-radius: 3px 3px 0 0;" id="live-cam-box-label-${cam.id}">DETECÇÃO</span>
          </div>

          <!-- HUD overlays -->
          <div style="position:absolute; top:8px; left:8px; background-color:rgba(0,0,0,0.6); padding:2px 6px; border-radius:4px; font-size:0.65rem; font-family:monospace; color:#ef4444; font-weight:700; display:flex; align-items:center; gap:4px;">
            <span style="width:6px; height:6px; background-color:#ef4444; border-radius:50%; animation: blinkRec 1s infinite alternate;"></span> REC [AI]
          </div>
          
          <div style="position:absolute; top:8px; right:8px; background-color:rgba(0,0,0,0.6); padding:2px 6px; border-radius:4px; font-size:0.6rem; font-family:monospace; color:#38bdf8;" id="live-cam-coords-${cam.id}">
            LAT: ${cam.lat.toFixed(5)}<br>LNG: ${cam.lng.toFixed(5)}
          </div>

          <div style="position:absolute; bottom:8px; left:8px; background-color:rgba(0,0,0,0.6); padding:2px 6px; border-radius:4px; font-size:0.6rem; font-family:monospace; color:rgba(255,255,255,0.6);">
            Bairro: ${cam.neighborhood}
          </div>

          <div style="position:absolute; bottom:8px; right:8px; background-color:rgba(0,0,0,0.6); padding:2px 6px; border-radius:4px; font-size:0.65rem; font-family:monospace; color:#38bdf8; font-weight:700;" id="live-cam-speed-${cam.id}">
            ${cam.speed} km/h
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; font-size:0.78rem;">
          <div>Condutor: <strong style="color:white;">${cam.operator.split(' ')[0]}</strong></div>
          <button class="btn btn-secondary live-cam-focus-btn" data-id="${cam.id}" style="padding:4px 8px; font-size:0.7rem; background-color:#1e293b; color:white; border-color:rgba(255,255,255,0.1); font-weight:700;">
            <i class="lucide-map-pin" style="width:12px;height:12px;margin-right:2px;"></i> Focar no Mapa
          </button>
        </div>
      `;
      container.appendChild(card);
    });

    // Se a webcam estiver ativa, reconecta o stream no video recém-gerado
    if (state.isWebcamActive && state.liveWebcamStream) {
      const videoEl = document.getElementById('live-cam-video-1');
      if (videoEl) {
        videoEl.srcObject = state.liveWebcamStream;
        if (!dashboardCocoRequestFrameId) {
          dashboardCocoRequestFrameId = requestAnimationFrame(runDashboardLiveCamCocoDetection);
        }
      }
    }

    // Focar no Mapa
    document.querySelectorAll('.live-cam-focus-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const cam = state.liveCamerasList.find(c => c.id === id);
        if (cam) {
          switchTab('map');
          setTimeout(() => {
            state.leafletMap.setView([cam.lat, cam.lng], 16);
            
            // Plota veículo temporário
            const markerColor = '#1473E6';
            const vehicleMarker = L.circleMarker([cam.lat, cam.lng], {
              radius: 12,
              fillColor: markerColor,
              color: '#FFFFFF',
              weight: 3,
              fillOpacity: 0.95
            }).addTo(state.leafletMap);
            
            vehicleMarker.bindPopup(`<strong>Câmera ${cam.name}</strong><br>Veículo: ${cam.vehicle}<br>Operador: ${cam.operator}`).openPopup();
          }, 150);
        }
      });
    });

    // Configura botões de toggle da webcam do notebook
    const btnToggleWebcam = document.getElementById('btn-toggle-local-webcam');
    if (btnToggleWebcam) {
      if (state.isWebcamActive) {
        btnToggleWebcam.innerHTML = '<i class="lucide-camera-off" style="width:14px;height:14px;margin-right:4px;"></i> Desativar Webcam';
        btnToggleWebcam.style.color = '#ef4444';
        btnToggleWebcam.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      } else {
        btnToggleWebcam.innerHTML = '<i class="lucide-camera" style="width:14px;height:14px;margin-right:4px;"></i> Ativar Webcam (CAM-01)';
        btnToggleWebcam.style.color = 'white';
        btnToggleWebcam.style.borderColor = 'rgba(255,255,255,0.1)';
      }

      if (!btnToggleWebcam.dataset.wired) {
        btnToggleWebcam.dataset.wired = 'true';
        btnToggleWebcam.addEventListener('click', () => {
          if (!state.isWebcamActive) {
            btnToggleWebcam.innerHTML = '<i class="lucide-loader" style="width:14px;height:14px;margin-right:4px;"></i> Carregando...';
            btnToggleWebcam.disabled = true;

            const startWebcam = () => {
              navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" }, width: { ideal: 640 }, height: { ideal: 480 } } })
                .then(stream => {
                  state.isWebcamActive = true;
                  state.liveWebcamStream = stream;
                  
                  renderLiveCamerasGrid();
                  
                  // Inicia detecção do COCO-SSD
                  dashboardCocoRequestFrameId = requestAnimationFrame(runDashboardLiveCamCocoDetection);
                  
                  showToast('Webcam integrada com sucesso na CAM-01!', 'success');
                })
                .catch(err => {
                  console.error(err);
                  btnToggleWebcam.disabled = false;
                  showToast('Erro ao obter acesso à webcam do notebook.', 'danger');
                  renderLiveCamerasGrid();
                });
            };

            if (!window.cocoSsdLoadedModel) {
              cocoSsd.load()
                .then(model => {
                  window.cocoSsdLoadedModel = model;
                  btnToggleWebcam.disabled = false;
                  startWebcam();
                })
                .catch(err => {
                  console.error(err);
                  btnToggleWebcam.disabled = false;
                  showToast('Erro ao carregar o modelo de IA COCO-SSD.', 'danger');
                  renderLiveCamerasGrid();
                });
            } else {
              btnToggleWebcam.disabled = false;
              startWebcam();
            }
          } else {
            state.isWebcamActive = false;
            if (state.liveWebcamStream) {
              state.liveWebcamStream.getTracks().forEach(track => track.stop());
              state.liveWebcamStream = null;
            }
            if (dashboardPeerConnection) {
              dashboardPeerConnection.close();
              dashboardPeerConnection = null;
            }
            if (dashboardCocoRequestFrameId) {
              cancelAnimationFrame(dashboardCocoRequestFrameId);
              dashboardCocoRequestFrameId = null;
            }
            renderLiveCamerasGrid();
            showToast('Webcam do notebook desativada na CAM-01.', 'warning');
          }
        });
      }
    }

    if (window.lucide) window.lucide.createIcons();
  }

  let dashboardCocoRequestFrameId = null;
  function runDashboardLiveCamCocoDetection() {
    if (!state.isWebcamActive || !state.liveWebcamStream || state.activeTab !== 'live-cameras') {
      const feedContainer = document.getElementById('live-cam-feed-1');
      if (feedContainer) {
        feedContainer.querySelectorAll('.dynamic-webcam-bbox').forEach(el => el.remove());
      }
      return;
    }

    const videoEl = document.getElementById('live-cam-video-1');
    if (videoEl && videoEl.readyState === 4 && window.cocoSsdLoadedModel) {
      window.cocoSsdLoadedModel.detect(videoEl)
        .then(predictions => {
          renderDashboardCamPredictions(predictions);
          
          if (state.isWebcamActive) {
            dashboardCocoRequestFrameId = requestAnimationFrame(runDashboardLiveCamCocoDetection);
          }
        })
        .catch(err => {
          console.error(err);
          if (state.isWebcamActive) {
            dashboardCocoRequestFrameId = requestAnimationFrame(runDashboardLiveCamCocoDetection);
          }
        });
    } else {
      if (state.isWebcamActive) {
        dashboardCocoRequestFrameId = requestAnimationFrame(runDashboardLiveCamCocoDetection);
      }
    }
  }

  function renderDashboardCamPredictions(predictions) {
    const feedContainer = document.getElementById('live-cam-feed-1');
    if (!feedContainer) return;

    feedContainer.querySelectorAll('.dynamic-webcam-bbox').forEach(el => el.remove());

    const videoEl = document.getElementById('live-cam-video-1');
    if (!videoEl || videoEl.videoWidth === 0) return;

    const scaleX = feedContainer.offsetWidth / videoEl.videoWidth;
    const scaleY = feedContainer.offsetHeight / videoEl.videoHeight;

    predictions.forEach(pred => {
      const classesInteresse = ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'person', 'stop sign', 'traffic light'];
      if (!classesInteresse.includes(pred.class)) return;

      const [x, y, w, h] = pred.bbox;
      const box = document.createElement('div');
      box.className = 'dynamic-webcam-bbox';
      box.style.position = 'absolute';
      
      const boxLeft = feedContainer.offsetWidth - (x + w) * scaleX;
      
      box.style.left = `${boxLeft}px`;
      box.style.top = `${y * scaleY}px`;
      box.style.width = `${w * scaleX}px`;
      box.style.height = `${h * scaleY}px`;
      
      let color = '#38bdf8'; // Azul
      if (pred.class === 'person') color = '#c084fc';
      else if (pred.class === 'stop sign' || pred.class === 'traffic light') color = '#34d399';

      box.style.border = `1.5px solid ${color}`;
      box.style.borderRadius = '3px';
      box.style.pointerEvents = 'none';
      box.style.zIndex = '4';

      const label = document.createElement('span');
      const trans = {
        'car': 'VEÍCULO', 'truck': 'CAMINHÃO', 'bus': 'ÔNIBUS', 'motorcycle': 'MOTO',
        'bicycle': 'BIKE', 'person': 'PEDESTRE', 'stop sign': 'PARE', 'traffic light': 'SEMÁFORO'
      };
      const translatedClass = trans[pred.class] || pred.class.toUpperCase();

      label.innerText = `${translatedClass} (${Math.round(pred.score * 100)}%)`;
      label.style.position = 'absolute';
      label.style.top = '-14px';
      label.style.left = '-1px';
      label.style.backgroundColor = color;
      label.style.color = '#000000';
      label.style.fontSize = '0.5rem';
      label.style.fontWeight = 'bold';
      label.style.padding = '0px 3px';
      label.style.borderRadius = '2px 2px 0 0';
      label.style.whiteSpace = 'nowrap';

      box.appendChild(label);
      feedContainer.appendChild(box);
    });
  }

  function startLiveCamerasUpdates() {
    setInterval(() => {
      state.liveCamerasList.forEach(cam => {
        // Simula deslocamento físico
        cam.lat += (Math.random() - 0.5) * 0.0006;
        cam.lng += (Math.random() - 0.5) * 0.0006;
        cam.speed = Math.floor(Math.max(10, Math.min(65, cam.speed + (Math.random() - 0.5) * 6)));

        // Atualiza no visor se a aba estiver ativa
        if (state.activeTab === 'live-cameras') {
          const coordEl = document.getElementById(`live-cam-coords-${cam.id}`);
          const speedEl = document.getElementById(`live-cam-speed-${cam.id}`);
          if (coordEl) coordEl.innerHTML = `LAT: ${cam.lat.toFixed(5)}<br>LNG: ${cam.lng.toFixed(5)}`;
          if (speedEl) speedEl.innerText = `${cam.speed} km/h`;
        }
      });
      
      // Detecção aleatória automática desativada temporariamente para permitir testes de rua 100% limpos
      /*
      state.liveCamCycle++;
      if (state.liveCamCycle % 10 === 0) {
        triggerRandomLiveCameraAIDetection();
      }
      */
    }, 2000);
  }

  function triggerRandomLiveCameraAIDetection() {
    const randomCam = state.liveCamerasList[Math.floor(Math.random() * state.liveCamerasList.length)];
    
    const detectionOptions = [
      { cat: 'Pavimentação', sub: 'Buraco na via', img: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=600&auto=format&fit=crop&q=60', sev: 'Alta' },
      { cat: 'Limpeza Urbana', sub: 'Lixo acumulado', img: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=60', sev: 'Média' },
      { cat: 'Vegetação', sub: 'Mato alto na via', img: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?w=600&auto=format&fit=crop&q=60', sev: 'Baixa' }
    ];
    const detect = detectionOptions[Math.floor(Math.random() * detectionOptions.length)];
    const confidence = parseFloat((80 + Math.random() * 15).toFixed(1));

    // Exibe overlay se o usuário estiver monitorando a aba
    if (state.activeTab === 'live-cameras') {
      const box = document.getElementById(`live-cam-box-${randomCam.id}`);
      const label = document.getElementById(`live-cam-box-label-${randomCam.id}`);
      if (box && label) {
        label.innerText = `${detect.sub} (${confidence}%)`;
        box.style.display = 'block';
        playBeepChime();
        
        setTimeout(() => {
          box.style.display = 'none';
        }, 3000);
      }
    }

    // Salva no banco de dados local
    const newId = state.db.occurrences.length + 1;
    const dateStr = new Date().toISOString().substring(0, 10);
    const timeStr = new Date().toTimeString().substring(0, 8);
    const street = window.CidadeScan.STREETS_BY_NEIGHBORHOOD[randomCam.neighborhood][Math.floor(Math.random() * 5)];

    const newOcc = {
      id: newId,
      code: `CS-${2026000 + newId}`,
      municipalityId: 1,
      category: detect.cat,
      subcategory: detect.sub,
      descriptionAuto: `Identificado automaticamente via visão computacional na câmera ${randomCam.name} em circulação.`,
      descriptionManual: '',
      imageMain: detect.img,
      imagesComplementary: [],
      videoClipUrl: '',
      latitude: parseFloat(randomCam.lat.toFixed(6)),
      longitude: parseFloat(randomCam.lng.toFixed(6)),
      address: `${street}, ~${Math.floor(Math.random() * 800) + 1}`,
      street: street,
      neighborhood: randomCam.neighborhood,
      cep: '28930-000',
      dateCapture: dateStr,
      timeCapture: timeStr,
      dateCreated: dateStr,
      vehicleId: randomCam.id,
      vehicleName: randomCam.vehicle,
      driverName: randomCam.operator,
      routeName: `Monitoramento ${randomCam.name}`,
      cameraModel: 'Onboard Smart Dashcam v1.4',
      confidence: confidence,
      severitySuggested: detect.sev,
      severityConfirmed: detect.sev,
      department: window.CidadeScan.CATEGORIES[detect.cat].department,
      teamName: state.db.teams.find(t => t.department === window.CidadeScan.CATEGORIES[detect.cat].department)?.name || 'Equipe Alpha Obras',
      status: 'Aguardando validação',
      priority: 'Normal',
      deadline: dateStr,
      history: [
        { status: 'Detectada pela IA', date: `${dateStr} ${timeStr}`, user: `Câmera ${randomCam.name}` },
        { status: 'Aguardando validação', date: `${dateStr} ${timeStr}`, user: 'Sistema' }
      ],
      comments: [],
      isDuplicate: false,
      duplicateGroupId: null
    };

    state.db.occurrences.unshift(newOcc);
    window.CidadeScan.saveDB(state.db);

    // Re-renderiza estatísticas do dashboard caso o usuário volte nele
    renderDashboardStats();
    
    // Atualiza tabela se estiver na aba
    if (state.activeTab === 'occurrences') {
      renderOccurrencesTable();
    }

    showToast(`Inspeção Urbana: Câmera ${randomCam.name} identificou um ${detect.sub.toLowerCase()} em ${randomCam.neighborhood}!`, 'success');
  }

  // --- 16. INICIALIZAÇÃO INICIAL ---
  // Inicia com o primeiro usuário (Superadmin)
  setupUserSession(1);
  startLiveCamerasUpdates();
  
  // Vai para a tela de login inicialmente, mas com preenchimento fácil
  // Para fins do MVP, o usuário pode clicar em Entrar ou bypass
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    // Encontra usuário correspondente pelo email
    const user = state.db.users.find(u => u.email === email) || state.db.users[0];
    setupUserSession(user.id);
    
    // Atualiza a opção selecionada no topo do header
    if (profileSelect) {
      profileSelect.value = user.id;
    }

    switchTab('dashboard');
  });

  // Inicializa a navegação de abas padrão
  switchTab('dashboard');

  // Inicializa Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // --- 17. SINCRONIZAÇÃO EM TEMPO REAL VIA NUVEM (WEBSOCKET) ---
  let syncSocket = null;

  function connectDashboardSyncSocket() {
    const syncCodeInput = document.getElementById('header-sync-code');
    const syncCode = syncCodeInput ? syncCodeInput.value.trim().toLowerCase() : 'thiago-scan';

    try {
      if (syncSocket) {
        syncSocket.close();
      }
      
      syncSocket = new WebSocket('wss://free.piesocket.com/v3/demo?api_key=VCbEZPAZWSVJE4fsEPYvCwTM503q1IQOfmwh1y2P');
      
      syncSocket.onopen = () => {
        console.log(`CidadeScan Cloud Sync: Conectado ao canal com código '${syncCode}'`);
      };

      syncSocket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.syncCode === syncCode) {
            if (msg.type === 'NEW_OCCURRENCE') {
              const newOcc = msg.occurrence;
              
              // Evita duplicados
              const exists = state.db.occurrences.some(o => o.code === newOcc.code);
              if (!exists) {
                state.db.occurrences.unshift(newOcc);
                window.CidadeScan.saveDB(state.db);
                
                // Alerta sonoro e visual
                playBeepChime();
                
                // Atualiza visualização ativa
                renderDashboardStats();
                renderDashboardCharts();
                if (state.activeTab === 'occurrences') {
                  renderOccurrencesTable();
                }
                if (state.activeTab === 'map') {
                  plotOccurrencesOnMap();
                }
                
                showToast(`[NUVEM] Nova ocorrência real sincronizada: ${newOcc.subcategory}!`, 'success');
              }
            } else if (msg.type === 'RTC_OFFER') {
              handleRTCOffer(msg.offer, syncCode);
            } else if (msg.type === 'RTC_CANDIDATE') {
              if (dashboardPeerConnection && msg.candidate) {
                dashboardPeerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate))
                  .catch(e => console.warn('Aviso ao adicionar candidato ICE:', e));
              }
            } else if (msg.type === 'CAM_SNAPSHOT') {
              // Recebe o frame da câmera real em tempo real via WebSocket (100% livre de bloqueio de NAT)
              const camId = 1;
              const cam = state.liveCamerasList.find(c => c.id === camId);
              if (cam) {
                cam.img = msg.imgData;
                cam.lat = msg.lat;
                cam.lng = msg.lng;
                cam.speed = msg.speed;
                cam.operator = msg.operator;
                cam.vehicle = msg.vehicle;

                // Se o painel de monitoramento estiver ativo, atualiza o visor e telemetria na hora
                if (state.activeTab === 'live-cameras') {
                  const imgEl = document.getElementById('live-cam-img-1');
                  const coordsEl = document.getElementById('live-cam-coords-1');
                  const speedEl = document.getElementById('live-cam-speed-1');
                  
                  if (imgEl) {
                    imgEl.src = msg.imgData;
                    imgEl.style.display = 'block';
                    imgEl.style.opacity = '1';
                  }

                  const videoEl = document.getElementById('live-cam-video-1');
                  if (videoEl) videoEl.style.display = 'none';

                  if (coordsEl) {
                    coordsEl.innerHTML = `LAT: ${msg.lat.toFixed(5)}<br>LNG: ${msg.lng.toFixed(5)}`;
                  }
                  if (speedEl) {
                    speedEl.innerText = `${msg.speed} km/h`;
                  }
                }
              }
            }
          }
        } catch (e) {
          // Ignora mensagens que não sejam JSON ou que pertençam a outros usuários
        }
      };

      syncSocket.onclose = () => {
        // Tenta reconectar a cada 5 segundos
        setTimeout(connectDashboardSyncSocket, 5000);
      };
    } catch (e) {
      console.error('Falha ao conectar no WebSocket de Sincronização:', e);
    }
  }

  // Monitora alterações do código de sincronização no cabeçalho
  const syncCodeInput = document.getElementById('header-sync-code');
  if (syncCodeInput) {
    syncCodeInput.addEventListener('change', () => {
      connectDashboardSyncSocket();
      showToast('Código de sincronização atualizado!', 'success');
    });
  }

  // Inicializa a conexão de sync no carregamento do app
  connectDashboardSyncSocket();

  let dashboardPeerConnection = null;
  function handleRTCOffer(offer, syncCode) {
    try {
      if (dashboardPeerConnection) {
        dashboardPeerConnection.close();
      }

      dashboardPeerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      dashboardPeerConnection.onicecandidate = (event) => {
        if (event.candidate && syncSocket && syncSocket.readyState === WebSocket.OPEN) {
          syncSocket.send(JSON.stringify({
            type: 'RTC_CANDIDATE',
            syncCode: syncCode,
            candidate: event.candidate
          }));
        }
      };

      dashboardPeerConnection.ontrack = (event) => {
        console.log('WebRTC: Recebido stream de vídeo ao vivo do celular!');
        // Ativa o visor
        state.isWebcamActive = true;
        state.liveWebcamStream = event.streams[0];
        
        // Re-renderiza o grid
        renderLiveCamerasGrid();
        showToast('[NUVEM] Conectado ao vídeo ao vivo do celular!', 'success');
      };

      dashboardPeerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => dashboardPeerConnection.createAnswer())
        .then(answer => dashboardPeerConnection.setLocalDescription(answer))
        .then(() => {
          syncSocket.send(JSON.stringify({
            type: 'RTC_ANSWER',
            syncCode: syncCode,
            answer: dashboardPeerConnection.localDescription
          }));
          console.log('WebRTC: Resposta de transmissão de vídeo enviada ao celular.');
        })
        .catch(e => console.error('Erro ao responder oferta WebRTC:', e));
    } catch (e) {
      console.error('Erro ao configurar receptor WebRTC:', e);
    }
  }
});
