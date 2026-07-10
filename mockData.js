/**
 * CidadeScan AI - Banco de Dados Simulado (Semente de Dados)
 * Este arquivo cria a base de dados inicial no localStorage para demonstração.
 */

(function () {
  const DB_KEY = 'cidadescan_db';

  // Coordenadas centrais aproximadas dos bairros de Cidade Azul (região de Cabo Frio/Arraial do Cabo)
  const NEIGHBORHOOD_CENTERS = {
    'Centro': { lat: -22.8820, lng: -42.0180 },
    'Prainha': { lat: -22.9660, lng: -42.0230 },
    'Monte Alto': { lat: -22.9400, lng: -42.0900 },
    'Figueira': { lat: -22.9370, lng: -42.1380 },
    'Vila Nova': { lat: -22.8880, lng: -42.0240 },
    'Parque das Águas': { lat: -22.8750, lng: -42.0350 },
    'Jardim Esperança': { lat: -22.8600, lng: -42.0650 },
    'Porto do Sol': { lat: -22.8700, lng: -42.0050 }
  };

  const STREETS_BY_NEIGHBORHOOD = {
    'Centro': ['Av. Assunção', 'Rua Francisco Mendes', 'Rua Porto Alegre', 'Av. Julia Kubitschek', 'Rua Major Belegard'],
    'Prainha': ['Av. Leonel Brizola', 'Rua da Prainha', 'Rua Projetada A', 'Av. Getúlio Vargas', 'Rua Castro Alves'],
    'Monte Alto': ['Rua das Flores', 'Rua do Comércio', 'Av. Central', 'Rua da Lagoa', 'Rua Cabo Frio'],
    'Figueira': ['Rua Hermes Barcelos', 'Av. Pedro Francisco Sanches', 'Rua das Palmeiras', 'Rua Marambaia'],
    'Vila Nova': ['Rua Jorge Lóssio', 'Rua Teixeira de Souza', 'Rua Manoel Francisco Valentim', 'Av. Henrique Terra'],
    'Parque das Águas': ['Rua das Casuarinas', 'Rua dos Eucaliptos', 'Rua Pinheiro', 'Rua Ipê Amarelo'],
    'Jardim Esperança': ['Estrada de Búzios', 'Rua David Garcia da Silva', 'Rua Central', 'Rua Esperança'],
    'Porto do Sol': ['Rua Sol Nascente', 'Av. Beira Mar', 'Rua do Farol', 'Rua dos Pescadores']
  };

  const CATEGORIES = {
    'Pavimentação': {
      color: '#EF4444',
      subcategories: ['Buraco', 'Rachadura', 'Afundamento', 'Desnível', 'Asfalto deteriorado', 'Paralelepípedo solto', 'Tampa de bueiro danificada'],
      department: 'Secretaria de Obras',
      images: [
        'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=600&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1599740831464-5a21c17290ce?w=600&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=60'
      ]
    },
    'Limpeza Urbana': {
      color: '#F97316',
      subcategories: ['Lixo acumulado', 'Entulho', 'Descarte irregular', 'Resíduos na via', 'Lixeira danificada', 'Resíduos de construção'],
      department: 'Secretaria de Serviços Públicos',
      images: [
        'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1605600611283-c48a702277ed?w=600&auto=format&fit=crop&q=60'
      ]
    },
    'Vegetação': {
      color: '#22C55E',
      subcategories: ['Mato alto', 'Vegetação invadindo calçada', 'Vegetação invadindo pista', 'Galho sobre a via', 'Árvore caída', 'Árvore com risco aparente'],
      department: 'Secretaria de Meio Ambiente',
      images: [
        'https://images.unsplash.com/photo-1508962914676-134849a727f0?w=600&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600&auto=format&fit=crop&q=60'
      ]
    },
    'Sinalização': {
      color: '#38BDF8',
      subcategories: ['Placa caída', 'Placa danificada', 'Placa encoberta', 'Placa ilegível', 'Pintura viária apagada', 'Faixa de pedestre apagada', 'Semáforo danificado'],
      department: 'Secretaria de Mobilidade Urbana',
      images: [
        'https://images.unsplash.com/photo-1571217684074-be4661858a74?w=600&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=600&auto=format&fit=crop&q=60'
      ]
    },
    'Iluminação Pública': {
      color: '#F59E0B',
      subcategories: ['Poste apagado', 'Luminária danificada', 'Poste inclinado', 'Fiação aparente', 'Poste obstruído'],
      department: 'Secretaria de Serviços Públicos',
      images: [
        'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?w=600&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1509395062183-67c5ad6faff9?w=600&auto=format&fit=crop&q=60'
      ]
    },
    'Calçadas e Acessibilidade': {
      color: '#8B5CF6',
      subcategories: ['Calçada quebrada', 'Ausência de rampa', 'Rampa irregular', 'Obstáculo na calçada', 'Calçada estreita', 'Buraco na calçada', 'Piso tátil danificado'],
      department: 'Secretaria de Obras',
      images: [
        'https://images.unsplash.com/photo-1596276122653-651a3898309f?w=600&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=60'
      ]
    },
    'Drenagem': {
      color: '#06B6D4',
      subcategories: ['Bueiro entupido', 'Boca de lobo danificada', 'Água acumulada', 'Possível alagamento', 'Canal obstruído', 'Esgoto aparente'],
      department: 'Secretaria de Obras',
      images: [
        'https://images.unsplash.com/photo-1605001011156-cbf0b0f67a51?w=600&auto=format&fit=crop&q=60'
      ]
    },
    'Patrimônio Público': {
      color: '#EC4899',
      subcategories: ['Banco danificado', 'Ponto de ônibus danificado', 'Abrigo danificado', 'Praça degradada', 'Equipamento público quebrado', 'Pichação', 'Depredação'],
      department: 'Secretaria de Serviços Públicos',
      images: [
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=600&auto=format&fit=crop&q=60'
      ]
    }
  };

  const SEVERITIES = ['Baixa', 'Média', 'Alta', 'Crítica'];
  const STATUSES = [
    'Detectada pela IA',
    'Aguardando validação',
    'Confirmada',
    'Rejeitada',
    'Encaminhada',
    'Em atendimento',
    'Serviço executado',
    'Resolvida',
    'Reaberta'
  ];

  // Seed de dados estruturado
  const seedData = {
    municipalities: [
      { id: 1, name: 'Prefeitura Municipal de Cidade Azul' }
    ],
    users: [
      { id: 1, name: 'Carlos Menezes', email: 'admin@cidadescan.gov.br', role: 'Superadministrador', dept: 'Secretaria de Tecnologia' },
      { id: 2, name: 'Luciana Porto', email: 'luciana.porto@cidadescan.gov.br', role: 'Gestor Municipal', dept: 'Secretaria de Governo' },
      { id: 3, name: 'Roberto Alencar', email: 'roberto.obras@cidadescan.gov.br', role: 'Gestor de Secretaria', dept: 'Secretaria de Obras' },
      { id: 4, name: 'Maria Eduarda', email: 'maria.servicos@cidadescan.gov.br', role: 'Gestor de Secretaria', dept: 'Secretaria de Serviços Públicos' },
      { id: 5, name: 'Jorge Silva', email: 'jorge.fiscal@cidadescan.gov.br', role: 'Fiscal ou Operador', dept: 'Secretaria de Obras' },
      { id: 6, name: 'Ricardo Santos', email: 'ricardo.driver@cidadescan.gov.br', role: 'Motorista ou Agente de Coleta', dept: 'Secretaria de Serviços Públicos' },
      { id: 7, name: 'Amanda Costa', email: 'amanda.driver@cidadescan.gov.br', role: 'Motorista ou Agente de Coleta', dept: 'Secretaria de Serviços Públicos' },
      { id: 8, name: 'Renato Silva', email: 'renato.fiscal@cidadescan.gov.br', role: 'Fiscal ou Operador', dept: 'Secretaria de Serviços Públicos' }
    ],
    departments: [
      { id: 1, name: 'Secretaria de Serviços Públicos', manager: 'Maria Eduarda', color: '#1473E6' },
      { id: 2, name: 'Secretaria de Obras', manager: 'Roberto Alencar', color: '#F97316' },
      { id: 3, name: 'Secretaria de Meio Ambiente', manager: 'Flávia Neves', color: '#22C55E' },
      { id: 4, name: 'Secretaria de Mobilidade Urbana', manager: 'Gustavo Lima', color: '#38BDF8' },
      { id: 5, name: 'Secretaria de Segurança Pública', manager: 'Cel. Alberto', color: '#EF4444' },
      { id: 6, name: 'Secretaria de Governo', manager: 'Luciana Porto', color: '#64748B' },
      { id: 7, name: 'Secretaria de Tecnologia', manager: 'Carlos Menezes', color: '#8B5CF6' }
    ],
    teams: [
      { id: 1, name: 'Equipe Alpha Obras', department: 'Secretaria de Obras', coordinator: 'Marcos Rezende', members: '4 fiscais', status: 'Ativo', openCases: 12, avgResolutionDays: 3.5, neighborhoods: ['Centro', 'Vila Nova'] },
      { id: 2, name: 'Equipe Pavimentação Sul', department: 'Secretaria de Obras', coordinator: 'Júlio Cesar', members: '6 operários', status: 'Ativo', openCases: 18, avgResolutionDays: 4.8, neighborhoods: ['Prainha', 'Figueira', 'Monte Alto'] },
      { id: 3, name: 'Limpeza e Varrição Central', department: 'Secretaria de Serviços Públicos', coordinator: 'Sandra Lima', members: '12 agentes', status: 'Ativo', openCases: 5, avgResolutionDays: 1.2, neighborhoods: ['Centro', 'Vila Nova', 'Parque das Águas'] },
      { id: 4, name: 'Equipe Verde e Parques', department: 'Secretaria de Meio Ambiente', coordinator: 'Pedro Rocha', members: '5 jardineiros', status: 'Ativo', openCases: 8, avgResolutionDays: 2.1, neighborhoods: ['Parque das Águas', 'Jardim Esperança'] },
      { id: 5, name: 'Iluminação Cidade Azul', department: 'Secretaria de Serviços Públicos', coordinator: 'Valter Dias', members: '4 eletricistas', status: 'Ativo', openCases: 9, avgResolutionDays: 1.8, neighborhoods: ['Todos os bairros'] },
      { id: 6, name: 'Sinalização e Trânsito', department: 'Secretaria de Mobilidade Urbana', coordinator: 'Ten. Cavalcanti', members: '4 técnicos', status: 'Ativo', openCases: 7, avgResolutionDays: 2.5, neighborhoods: ['Centro', 'Prainha', 'Vila Nova'] }
    ],
    vehicles: [
      { id: 1, name: 'Caminhão de Coleta 01', plate: 'KGY-4829', type: 'Caminhão de coleta', model: 'Mercedes Benz Atego', year: 2021, dept: 'Secretaria de Serviços Públicos', responsible: 'Ricardo Santos', status: 'Operando', cameraStatus: 'Conectada', storageFree: '78%', lastRouteDate: '2026-07-10', kmAnalyzed: 1420, occurrencesDetected: 428 },
      { id: 2, name: 'Caminhão de Coleta 02', plate: 'KGY-4830', type: 'Caminhão de coleta', model: 'Mercedes Benz Atego', year: 2021, dept: 'Secretaria de Serviços Públicos', responsible: 'Amanda Costa', status: 'Operando', cameraStatus: 'Conectada', storageFree: '64%', lastRouteDate: '2026-07-10', kmAnalyzed: 1150, occurrencesDetected: 310 },
      { id: 3, name: 'Viatura Fiscalização 05', plate: 'LUY-0982', type: 'Veículo de fiscalização', model: 'Chevrolet Spin', year: 2020, dept: 'Secretaria de Obras', responsible: 'Jorge Silva', status: 'Operando', cameraStatus: 'Conectada', storageFree: '90%', lastRouteDate: '2026-07-09', kmAnalyzed: 2310, occurrencesDetected: 649 },
      { id: 4, name: 'Van Trânsito 02', plate: 'PXT-9811', type: 'Van', model: 'Renault Master', year: 2019, dept: 'Secretaria de Mobilidade Urbana', responsible: 'Carlos Dutra', status: 'Operando', cameraStatus: 'Sem Sinal', storageFree: '12%', lastRouteDate: '2026-07-08', kmAnalyzed: 980, occurrencesDetected: 187 },
      { id: 5, name: 'Viatura Guarda 12', plate: 'GMS-9022', type: 'Viatura', model: 'Renault Duster', year: 2022, dept: 'Secretaria de Segurança Pública', responsible: 'Guarda Oliveira', status: 'Operando', cameraStatus: 'Conectada', storageFree: '88%', lastRouteDate: '2026-07-10', kmAnalyzed: 3450, occurrencesDetected: 124 },
      { id: 6, name: 'Carro Oficial Obras 03', plate: 'OOV-1223', type: 'Carro oficial', model: 'Fiat Cronos', year: 2021, dept: 'Secretaria de Obras', responsible: 'Eng. Sergio', status: 'Manutenção', cameraStatus: 'Desconectada', storageFree: '100%', lastRouteDate: '2026-07-05', kmAnalyzed: 870, occurrencesDetected: 205 },
      { id: 7, name: 'Moto Coleta Rápida 01', plate: 'MXG-2323', type: 'Motocicleta', model: 'Honda CG 160', year: 2022, dept: 'Secretaria de Serviços Públicos', responsible: 'Luis Moto', status: 'Operando', cameraStatus: 'Conectada', storageFree: '45%', lastRouteDate: '2026-07-10', kmAnalyzed: 540, occurrencesDetected: 98 },
      { id: 8, name: 'Caminhão Operacional Iluminação', plate: 'OOB-8922', type: 'Veículo terceirizado', model: 'Ford Cargo', year: 2018, dept: 'Secretaria de Serviços Públicos', responsible: 'Eletricista Roberto', status: 'Operando', cameraStatus: 'Conectada', storageFree: '81%', lastRouteDate: '2026-07-10', kmAnalyzed: 1890, occurrencesDetected: 412 },
      { id: 9, name: 'Ônibus Escolar 04', plate: 'KGY-1299', type: 'Ônibus', model: 'Volkswagen Bus', year: 2017, dept: 'Secretaria de Serviços Públicos', responsible: 'Motorista Jair', status: 'Inativo', cameraStatus: 'Desconectada', storageFree: '100%', lastRouteDate: '2026-06-20', kmAnalyzed: 145, occurrencesDetected: 33 },
      { id: 10, name: 'Viatura Meio Ambiente 01', plate: 'KGY-0988', type: 'Veículo de fiscalização', model: 'Mitsubishi L200', year: 2022, dept: 'Secretaria de Meio Ambiente', responsible: 'Fiscal André', status: 'Operando', cameraStatus: 'Conectada', storageFree: '95%', lastRouteDate: '2026-07-10', kmAnalyzed: 1720, occurrencesDetected: 194 }
    ],
    missions: [
      { id: 1, name: 'Varredura Completa Prainha 360', desc: 'Mapeamento total do pavimento e iluminação da Prainha após o feriado prolongado.', neighborhood: 'Prainha', startDate: '2026-07-01', endDate: '2026-07-10', vehicles: ['Caminhão de Coleta 02', 'Moto Coleta Rápida 01'], priorityCats: ['Pavimentação', 'Limpeza Urbana', 'Iluminação Pública'], targetKm: 150, currentKm: 144, targetCoverage: 100, currentCoverage: 96, status: 'Em andamento', occurrences: 47, critical: 12, resolved: 8 },
      { id: 2, name: 'Operação Inverno Monte Alto & Figueira', desc: 'Mapeamento preventivo de drenagem e vegetação nas áreas periféricas de lagoa.', neighborhood: 'Monte Alto', startDate: '2026-07-05', endDate: '2026-07-20', vehicles: ['Viatura Fiscalização 05'], priorityCats: ['Drenagem', 'Vegetação'], targetKm: 200, currentKm: 98, targetCoverage: 100, currentCoverage: 49, status: 'Em andamento', occurrences: 32, critical: 5, resolved: 3 },
      { id: 3, name: 'Mapeamento Acessibilidade Centro', desc: 'Inspeção focada em calçadas, rampas e piso tátil nos eixos de maior fluxo de pedestres no Centro.', neighborhood: 'Centro', startDate: '2026-06-15', endDate: '2026-06-30', vehicles: ['Viatura Fiscalização 05'], priorityCats: ['Calçadas e Acessibilidade'], targetKm: 80, currentKm: 80, targetCoverage: 100, currentCoverage: 100, status: 'Concluída', occurrences: 54, critical: 14, resolved: 42 },
      { id: 4, name: 'Inspeção Iluminação Parque das Águas', desc: 'Monitoramento noturno de lâmpadas queimadas ou fiação exposta na região do parque.', neighborhood: 'Parque das Águas', startDate: '2026-07-08', endDate: '2026-07-12', vehicles: ['Caminhão Operacional Iluminação'], priorityCats: ['Iluminação Pública'], targetKm: 40, currentKm: 38, targetCoverage: 100, currentCoverage: 95, status: 'Em andamento', occurrences: 15, critical: 3, resolved: 1 },
      { id: 5, name: 'Varredura Geral Jardim Esperança', desc: 'Levantamento geral pré-obras de pavimentação.', neighborhood: 'Jardim Esperança', startDate: '2026-07-12', endDate: '2026-07-25', vehicles: ['Caminhão de Coleta 01'], priorityCats: ['Pavimentação', 'Drenagem'], targetKm: 180, currentKm: 0, targetCoverage: 100, currentCoverage: 0, status: 'Planejada', occurrences: 0, critical: 0, resolved: 0 }
    ],
    urbanHealthScores: {
      'Centro': { overall: 84, pav: 78, clean: 88, sign: 82, light: 92, access: 71, drain: 86, pat: 85 },
      'Prainha': { overall: 76, pav: 68, clean: 82, sign: 74, light: 91, access: 55, drain: 79, pat: 78 },
      'Monte Alto': { overall: 58, pav: 49, clean: 62, sign: 55, light: 71, access: 42, drain: 59, pat: 64 },
      'Figueira': { overall: 61, pav: 52, clean: 65, sign: 58, light: 72, access: 44, drain: 60, pat: 68 },
      'Vila Nova': { overall: 81, pav: 76, clean: 84, sign: 80, light: 89, access: 68, drain: 82, pat: 80 },
      'Parque das Águas': { overall: 89, pav: 85, clean: 92, sign: 88, light: 94, access: 80, drain: 89, pat: 91 },
      'Jardim Esperança': { overall: 52, pav: 39, clean: 54, sign: 48, light: 65, access: 35, drain: 47, pat: 58 },
      'Porto do Sol': { overall: 70, pav: 62, clean: 74, sign: 68, light: 80, access: 50, drain: 72, pat: 71 }
    },
    routes: []
  };

  // Gerar as 20 rotas simuladas com polilinhas ao redor dos bairros
  function generateRoutes() {
    const list = [];
    const neighborhoods = Object.keys(NEIGHBORHOOD_CENTERS);
    for (let i = 1; i <= 20; i++) {
      const bName = neighborhoods[i % neighborhoods.length];
      const center = NEIGHBORHOOD_CENTERS[bName];
      const points = [];
      const steps = 8 + Math.floor(Math.random() * 8); // número de pontos da rota
      let currentLat = center.lat;
      let currentLng = center.lng;

      for (let s = 0; s < steps; s++) {
        points.push([currentLat, currentLng]);
        currentLat += (Math.random() - 0.5) * 0.006;
        currentLng += (Math.random() - 0.5) * 0.006;
      }

      list.push({
        id: i,
        name: `Rota ${bName} #${String(i).padStart(3, '0')}`,
        neighborhood: bName,
        points: points,
        date: `2026-07-${String(Math.floor(Math.random() * 10) + 1).padStart(2, '0')}`,
        vehicleId: (i % 8) + 1,
        driverName: seedData.users.filter(u => u.role === 'Motorista ou Agente de Coleta')[i % 2].name,
        distanceKm: parseFloat((2.5 + Math.random() * 8).toFixed(2)),
        timeMinutes: 15 + Math.floor(Math.random() * 45)
      });
    }
    return list;
  }
  seedData.routes = generateRoutes();

  // Gerar as 150 ocorrências iniciais
  function generateOccurrences() {
    const list = [];
    const catKeys = Object.keys(CATEGORIES);
    const neighborhoods = Object.keys(NEIGHBORHOOD_CENTERS);

    for (let i = 1; i <= 150; i++) {
      const category = catKeys[i % catKeys.length];
      const catData = CATEGORIES[category];
      const subcategory = catData.subcategories[Math.floor(Math.random() * catData.subcategories.length)];
      const neighborhood = neighborhoods[i % neighborhoods.length];
      const street = STREETS_BY_NEIGHBORHOOD[neighborhood][i % STREETS_BY_NEIGHBORHOOD[neighborhood].length];
      const center = NEIGHBORHOOD_CENTERS[neighborhood];

      // Espalhar coordenadas a partir do centro do bairro
      const lat = center.lat + (Math.random() - 0.5) * 0.015;
      const lng = center.lng + (Math.random() - 0.5) * 0.015;

      // Definir gravidade
      let severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
      if (neighborhood === 'Jardim Esperança' || neighborhood === 'Monte Alto') {
        severity = i % 3 === 0 ? 'Crítica' : (i % 3 === 1 ? 'Alta' : 'Média');
      } else if (neighborhood === 'Parque das Águas') {
        severity = i % 4 === 0 ? 'Alta' : (i % 2 === 0 ? 'Média' : 'Baixa');
      }

      // Definir status
      let status = STATUSES[i % STATUSES.length];
      if (i <= 30) {
        status = 'Resolvida';
      } else if (i > 30 && i <= 60) {
        status = 'Detectada pela IA';
      } else if (i > 60 && i <= 95) {
        status = 'Aguardando validação';
      } else if (i > 95 && i <= 125) {
        status = 'Confirmada';
      } else if (i > 125 && i <= 140) {
        status = 'Em atendimento';
      } else {
        status = 'Serviço executado';
      }

      const vehicle = seedData.vehicles[(i % 8)];
      const confidence = parseFloat((72.5 + Math.random() * 26.5).toFixed(1));
      const imageIndex = i % catData.images.length;
      const mainImage = catData.images[imageIndex];

      const captureDay = Math.floor(Math.random() * 9) + 1;
      const captureDate = `2026-07-${String(captureDay).padStart(2, '0')}`;
      const captureTime = `${String(Math.floor(Math.random() * 12) + 8).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`;

      // Simular histórico
      const history = [
        { status: 'Detectada pela IA', date: `${captureDate} ${captureTime}`, user: 'CidadeScan AI Core v1.4' }
      ];

      if (status !== 'Detectada pela IA') {
        history.push({ status: 'Aguardando validação', date: `${captureDate} ${captureTime}`, user: 'Sistema' });
      }

      let resolvedDate = null;
      let userValidated = null;
      let userCompleted = null;

      if (['Confirmada', 'Encaminhada', 'Em atendimento', 'Serviço executado', 'Resolvida'].includes(status)) {
        const valUser = seedData.users.find(u => u.role === 'Fiscal ou Operador');
        userValidated = valUser.name;
        history.push({ status: 'Confirmada', date: `2026-07-10 09:30:00`, user: valUser.name });
      }

      if (status === 'Resolvida') {
        resolvedDate = `2026-07-10`;
        const compUser = seedData.users.find(u => u.role === 'Gestor de Secretaria');
        userCompleted = compUser.name;
        history.push({ status: 'Resolvida', date: `2026-07-10 17:15:00`, user: compUser.name });
      }

      // Comparação temporal simulada
      const comparisons = [];
      if (status === 'Resolvida') {
        comparisons.push({
          date: captureDate,
          status: 'Detectada',
          image: mainImage,
          desc: 'Buraco original detectado com ' + confidence + '% de confiança.'
        });
        comparisons.push({
          date: resolvedDate,
          status: 'Resolvida',
          image: 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?w=600&auto=format&fit=crop&q=60',
          desc: 'Recapeamento asfáltico executado.'
        });
      }

      list.push({
        id: i,
        code: `CS-${2026000 + i}`,
        municipalityId: 1,
        category: category,
        subcategory: subcategory,
        descriptionAuto: `IA identificou possível ${subcategory.toLowerCase()} com ${confidence}% de confiança.`,
        descriptionManual: '',
        imageMain: mainImage,
        imagesComplementary: [
          'https://images.unsplash.com/photo-1582268611958-ebfd161ff975?w=600&auto=format&fit=crop&q=60'
        ],
        videoClipUrl: 'simulated_video_clip.mp4',
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
        address: `${street}, ~${Math.floor(Math.random() * 900) + 1}`,
        street: street,
        neighborhood: neighborhood,
        cep: '28930-000',
        dateCapture: captureDate,
        timeCapture: captureTime,
        dateCreated: captureDate,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        driverName: vehicle.responsible,
        routeName: `Rota ${neighborhood} #${String(i % 20 + 1).padStart(3, '0')}`,
        missionId: (i % 4) + 1,
        cameraModel: 'Dashcam RoadEye Pro v2',
        confidence: confidence,
        severitySuggested: severity,
        severityConfirmed: severity,
        department: catData.department,
        teamName: seedData.teams.find(t => t.department === catData.department)?.name || 'Equipe Alpha Obras',
        status: status,
        priority: severity === 'Crítica' ? 'Urgente' : (severity === 'Alta' ? 'Alta' : 'Normal'),
        deadline: `2026-07-${String(Math.min(31, captureDay + 5)).padStart(2, '0')}`,
        history: history,
        comments: [
          { user: 'Sistema', comment: 'Ocorrência geolocalizada via telemetria GPS.', date: `${captureDate} ${captureTime}` }
        ],
        resolvedDate: resolvedDate,
        userValidated: userValidated,
        userCompleted: userCompleted,
        isDuplicate: false,
        duplicateGroupId: null,
        comparisons: comparisons
      });
    }

    return list;
  }
  seedData.occurrences = [];

  function initLocalStorage() {
    try {
      // Limpeza da base de dados antiga para início de testes reais na rua
      const hasReset = localStorage.getItem('cidadescan_has_reset_empty_db_v3');
      if (!hasReset) {
        localStorage.setItem(DB_KEY, JSON.stringify(seedData));
        localStorage.setItem('cidadescan_has_reset_empty_db_v3', 'true');
        console.log('CidadeScan AI: Banco de dados zerado com sucesso para testes reais na rua.');
      } else {
        const data = localStorage.getItem(DB_KEY);
        if (!data) {
          localStorage.setItem(DB_KEY, JSON.stringify(seedData));
        }
      }
    } catch (e) {
      console.error('Erro ao acessar localStorage:', e);
    }
  }

  function getDB() {
    try {
      const data = localStorage.getItem(DB_KEY);
      return data ? JSON.parse(data) : seedData;
    } catch (e) {
      return seedData;
    }
  }

  function saveDB(db) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Erro ao gravar no localStorage:', e);
    }
  }

  window.CidadeScan = {
    init: initLocalStorage,
    getDB: getDB,
    saveDB: saveDB,
    CATEGORIES: CATEGORIES,
    SEVERITIES: SEVERITIES,
    STATUSES: STATUSES,
    NEIGHBORHOOD_CENTERS: NEIGHBORHOOD_CENTERS,
    STREETS_BY_NEIGHBORHOOD: STREETS_BY_NEIGHBORHOOD
  };

  initLocalStorage();
})();
