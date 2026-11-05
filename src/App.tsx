import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Building2,
  Users,
  Dog,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  X,
  Sliders,
  Layers,
  Search,
  FileText,
  Plus,
  Settings,
  TrendingUp,
  Activity,
  ShieldCheck,
  CreditCard,
  Maximize2,
  RefreshCw,
  Home,
  Check,
  Zap,
  LayoutGrid
} from 'lucide-react';

const formatCurrency = (value) => value.toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

// --- GERADOR DE DADOS FAKE INICIAIS ---
const generateBuildingData = (floorsCount, unitsPerFloor) => {
  const units = [];
  const names = ['Carlos Silva', 'Ana Oliveira', 'Roberto Souza', 'Mariana Costa', 'Fernanda Lima', 'Lucas Santos', 'Patricia Mendes', 'Gabriel Alves', 'Juliana Rocha', 'Marcelo Pereira', 'Beatriz Ferreira', 'Thiago Barbosa'];
  const petTypes = ['Cão · Golden Retriever · porte grande', 'Gato · Persa · porte médio', 'Cão · Poodle · porte pequeno', 'Gato · SRD · porte pequeno', 'Cão · Bulldog · porte médio'];

  for (let f = 1; f <= floorsCount; f++) {
    for (let u = 1; u <= unitsPerFloor; u++) {
      const unitNumber = f * 100 + u;
      const statusRand = ((unitNumber * 37 + f * 19) % 100) / 100;
      let status = 'ok'; // ok, pending, alert
      if (statusRand > 0.78) status = 'pending';
      else if (statusRand > 0.65) status = 'alert';

      const residents = (unitNumber * 7) % 4 + 1;
      const hasPet = (unitNumber + f * 3) % 5 !== 0;
      const pet = hasPet ? petTypes[(unitNumber + f) % petTypes.length] : 'Nenhum';
      const owner = names[(unitNumber + f * 2) % names.length];
      const condoFee = 650 + (f * 25);

      units.push({
        id: `apt-${unitNumber}`,
        number: unitNumber,
        floor: f,
        unitIndex: u,
        owner,
        phone: '(11) 99999-0000 (fictício)',
        email: `morador${unitNumber}@example.invalid`,
        residentsCount: residents,
        residentNames: Array.from({ length: residents }, (_, index) => names[(unitNumber + index) % names.length]),
        hasPet,
        petInfo: pet,
        status, // 'ok', 'pending', 'alert'
        condoFee,
        debtAmount: status === 'pending' ? condoFee * (unitNumber % 3 + 1) : 0,
        lastPaymentDate: status === 'pending' ? '2026-09-10' : '2026-10-05',
        history: [
          { month: 'Outubro/2026', amount: condoFee, paid: status !== 'pending' },
          { month: 'Setembro/2026', amount: condoFee, paid: true },
          { month: 'Agosto/2026', amount: condoFee, paid: true },
        ],
        layoutType: u % 2 === 0 ? 'Luxo 3 Quartos' : 'Standard 2 Quartos',
        area: u % 2 === 0 ? 88 : 65
      });
    }
  }
  return units;
};

export default function App() {
  // Configurações do Prédio
  const [config, setConfig] = useState({
    name: 'Edifício Neo Residence',
    floors: 6,
    unitsPerFloor: 4,
  });

  const [units, setUnits] = useState(() => generateBuildingData(6, 4));
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [activeTab, setActiveTab] = useState('3d'); // '3d', 'list', 'generator'
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalTab, setModalTab] = useState('info'); // 'info', 'finance', 'blueprint'
  const [customBlueprint, setCustomBlueprint] = useState(null);
  const [blueprintError, setBlueprintError] = useState('');
  const [webglError, setWebglError] = useState('');

  // Canvas 3D Ref
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const meshesGroupRef = useRef(new THREE.Group());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Regenerar unidades quando alterar dimensões no formulário
  const handleGenerateBuilding = (newFloors, newUnitsPerFloor) => {
    const updatedFloors = Math.min(Math.max(Number(newFloors), 1), 12);
    const updatedUnits = Math.min(Math.max(Number(newUnitsPerFloor), 2), 6);

    setConfig(prev => ({ ...prev, floors: updatedFloors, unitsPerFloor: updatedUnits }));
    const newUnitsData = generateBuildingData(updatedFloors, updatedUnits);
    setUnits(newUnitsData);
    setSelectedUnit(null);
    setActiveTab('3d');
  };

  // KPIs Calculados
  const kpis = useMemo(() => {
    const totalUnits = units.length;
    const pendingUnits = units.filter(u => u.status === 'pending').length;
    const alertUnits = units.filter(u => u.status === 'alert').length;
    const okUnits = units.filter(u => u.status === 'ok').length;

    const totalResidents = units.reduce((acc, u) => acc + u.residentsCount, 0);
    const totalPets = units.filter(u => u.hasPet).length;

    const totalExpectedRevenue = units.reduce((acc, u) => acc + u.condoFee, 0);
    const totalPaidRevenue = units.reduce((acc, u) => acc + (u.status === 'pending' ? 0 : u.condoFee), 0);
    const totalDefaultAmount = units.reduce((acc, u) => acc + u.debtAmount, 0);
    const defaultRate = totalUnits ? ((pendingUnits / totalUnits) * 100).toFixed(1) : '0.0';
    const collectionRate = totalExpectedRevenue
      ? ((totalPaidRevenue / totalExpectedRevenue) * 100).toFixed(1)
      : '0.0';

    return {
      totalUnits,
      pendingUnits,
      alertUnits,
      okUnits,
      totalResidents,
      totalPets,
      totalExpectedRevenue,
      totalPaidRevenue,
      totalDefaultAmount,
      defaultRate,
      collectionRate
    };
  }, [units]);

  // UNIDADES FILTRADAS
  const filteredUnits = useMemo(() => {
    return units.filter(unit => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch = unit.number.toString().includes(normalizedSearch) ||
                            unit.owner.toLowerCase().includes(normalizedSearch);
      const matchesStatus = filterStatus === 'all' || unit.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [units, searchTerm, filterStatus]);

  useEffect(() => {
    if (!customBlueprint?.url) return undefined;
    return () => URL.revokeObjectURL(customBlueprint.url);
  }, [customBlueprint]);

  useEffect(() => {
    if (!selectedUnit) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedUnit(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedUnit]);

  // ==================== ENGINE THREE.JS ====================
  useEffect(() => {
    if (activeTab !== '3d' || !mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Cena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f19);
    scene.fog = new THREE.FogExp2(0x0b0f19, 0.015);
    sceneRef.current = scene;

    // Câmera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(30, 25, 40);

    // Renderer
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      setWebglError('');
    } catch {
      setWebglError('Não foi possível iniciar o WebGL neste navegador ou dispositivo. Use a lista de unidades ou habilite a aceleração gráfica.');
      return undefined;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Limpar container antigo
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Não passar abaixo do chão
    controls.minDistance = 15;
    controls.maxDistance = 90;
    controlsRef.current = controls;

    // Iluminação
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x60a5fa, 1.2);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 0.8, 50);
    pointLight.position.set(-15, 20, -15);
    scene.add(pointLight);

    // Chão / Grid Neon
    const gridHelper = new THREE.GridHelper(60, 30, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);

    const planeGeo = new THREE.PlaneGeometry(100, 100);
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 });
    const floorMesh = new THREE.Mesh(planeGeo, planeMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.15;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Construção do Prédio 3D
    build3DBuilding(scene, filteredUnits);

    // Loop de Animação
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Redimensionamento
    const handleResize = () => {
      if (!mountRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
      }
      controls.dispose();
      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.LineSegments ||
          object instanceof THREE.Line ||
          object instanceof THREE.Points
        ) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      if (rendererRef.current === renderer) rendererRef.current = null;
      if (controlsRef.current === controls) controlsRef.current = null;
      if (sceneRef.current === scene) sceneRef.current = null;
    };
  }, [units, filteredUnits, config, activeTab]);

  // Função para Renderizar a Estrutura 3D do Prédio
  const build3DBuilding = (scene, visibleUnits) => {
    if (meshesGroupRef.current) {
      scene.remove(meshesGroupRef.current);
    }
    const group = new THREE.Group();
    meshesGroupRef.current = group;

    const { floors, unitsPerFloor } = config;
    const unitWidth = 4.5;
    const unitHeight = 3.2;
    const unitDepth = 5.0;
    const gap = 0.6;

    // Base / Térreo
    const baseGeo = new THREE.BoxGeometry(
      unitsPerFloor * (unitWidth + gap) + 3,
      1.5,
      unitDepth + 4
    );
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, 0.75, 0);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // Núcleo central (Elevadores / Escadas)
    const coreHeight = floors * (unitHeight + gap) + 2;
    const coreGeo = new THREE.BoxGeometry(3, coreHeight, 3);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, coreHeight / 2 + 1.5, -unitDepth / 2 - 1.5);
    group.add(coreMesh);

    // Renderizar Apartamentos por Andar
    visibleUnits.forEach((unit) => {
      const fIndex = unit.floor - 1;
      const uIndex = unit.unitIndex - 1;

      // Cálculo de Posição
      const totalWidth = unitsPerFloor * (unitWidth + gap) - gap;
      const startX = -totalWidth / 2 + unitWidth / 2;

      const x = startX + uIndex * (unitWidth + gap);
      const y = 1.5 + fIndex * (unitHeight + gap) + unitHeight / 2 + 0.4;
      const z = 0;

      // Definir Cor com base no Status
      let statusColor = 0x10b981; // ok -> verde
      let glowColor = 0x059669;
      if (unit.status === 'pending') {
        statusColor = 0xef4444; // pending -> vermelho
        glowColor = 0xdc2626;
      } else if (unit.status === 'alert') {
        statusColor = 0xf59e0b; // alert -> amarelo
        glowColor = 0xd97706;
      }

      // Geometria da Unidade (Vidro + Moldura)
      const aptGeo = new THREE.BoxGeometry(unitWidth, unitHeight, unitDepth);
      const aptMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0.9,
      });

      const aptMesh = new THREE.Mesh(aptGeo, aptMat);
      aptMesh.position.set(x, y, z);
      aptMesh.castShadow = true;
      aptMesh.receiveShadow = true;

      // Atribuir dados da unidade ao Mesh para Raycasting
      aptMesh.userData = { unitData: unit };

      // Sacada / Janela com Neon de Status
      const windowGeo = new THREE.BoxGeometry(unitWidth * 0.8, unitHeight * 0.65, 0.2);
      const windowMat = new THREE.MeshStandardMaterial({
        color: statusColor,
        emissive: glowColor,
        emissiveIntensity: 0.4,
        roughness: 0.1,
      });
      const windowMesh = new THREE.Mesh(windowGeo, windowMat);
      windowMesh.position.set(0, 0, unitDepth / 2 + 0.1);
      aptMesh.add(windowMesh);

      // Bordas / Moldura Decorativa
      const edges = new THREE.EdgesGeometry(aptGeo);
      const lineMat = new THREE.LineBasicMaterial({
        color: unit.status === 'pending' ? 0xf87171 : (unit.status === 'alert' ? 0xfcd34d : 0x34d399),
        linewidth: 1
      });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      aptMesh.add(wireframe);

      group.add(aptMesh);
    });

    // Cobertura / Topo do Prédio
    const topY = 1.5 + floors * (unitHeight + gap) + 0.8;
    const roofGeo = new THREE.BoxGeometry(unitsPerFloor * (unitWidth + gap) + 1, 0.8, unitDepth + 2);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.set(0, topY, 0);
    group.add(roofMesh);

    scene.add(group);
  };

  // Tratar Clique nos Apartamentos do 3D
  const handleCanvasClick = (event) => {
    if (!mountRef.current || !sceneRef.current || !controlsRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, controlsRef.current.object);

    const intersects = raycasterRef.current.intersectObjects(meshesGroupRef.current.children, true);

    if (intersects.length > 0) {
      let targetObj = intersects[0].object;
      // Subir até encontrar o pai que guarda os dados da unidade
      while (targetObj && !targetObj.userData.unitData && targetObj.parent) {
        targetObj = targetObj.parent;
      }

      if (targetObj && targetObj.userData.unitData) {
        setSelectedUnit(targetObj.userData.unitData);
        setModalTab('info');
      }
    }
  };

  const collectionHistory = [0.74, 0.82, 0.79, 0.9, 0.86, Number(kpis.collectionRate) / 100]
    .map((rate) => Math.round(kpis.totalExpectedRevenue * rate));

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans flex flex-col selection:bg-cyan-500 selection:text-white">
      {/* HEADER SUPERIOR FINTECH */}
      <header className="border-b border-slate-800 bg-[#0b0f19]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-wrap items-center justify-between gap-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              {config.name}
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Painel de Gestão da Administradora
            </p>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 max-lg:order-3 max-lg:w-full max-lg:justify-center max-sm:justify-start max-sm:overflow-x-auto">
          <button
            onClick={() => setActiveTab('3d')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === '3d'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" /> Visualização 3D
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'list'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Lista de Unidades
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'generator'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-4 h-4" /> Gerador do Prédio
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-300">Administradora Apex</p>
            <p className="text-[10px] text-cyan-400">Licença Pro Active</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-cyan-400">
            AP
          </div>
        </div>
      </header>

      <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-xs text-amber-100" role="note">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p><strong>AMBIENTE DE DEMONSTRAÇÃO —</strong> moradores, contatos, pets, cobranças e status são fictícios. Não use dados pessoais reais. Este protótipo não realiza cobranças, pagamentos nem comunicação com moradores.</p>
      </div>

      {/* PAINEL DE KPIS / METRICAS DO TOPO */}
      <section className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#080c14] border-b border-slate-800/60">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition">
          <div>
            <p className="text-xs text-slate-400 font-medium">Inadimplência de unidades</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-red-400">{kpis.defaultRate}%</span>
              <span className="text-xs text-slate-400">({kpis.pendingUnits} aptos)</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Total pendente: R$ {kpis.totalDefaultAmount.toLocaleString('pt-BR')}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition">
          <div>
            <p className="text-xs text-slate-400 font-medium">Arrecadação Mensal</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-emerald-400">
                {formatCurrency(kpis.totalPaidRevenue)}
              </span>
            </div>
            <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {kpis.collectionRate}% da arrecadação prevista
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition">
          <div>
            <p className="text-xs text-slate-400 font-medium">Censo de Moradores</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-100">{kpis.totalResidents}</span>
              <span className="text-xs text-slate-400">pessoas</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Em {kpis.totalUnits} apartamentos</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition">
          <div>
            <p className="text-xs text-slate-400 font-medium">Animais Registrados</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-400">{kpis.totalPets}</span>
              <span className="text-xs text-slate-400">pets</span>
            </div>
            <p className="text-[10px] text-amber-500/80 mt-1">Cadastrados no condomínio</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Dog className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* CONTEÚDO PRINCIPAL (3D / LISTA / GERADOR) */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {/* VIEW 3D */}
        {activeTab === '3d' && (
          <div className="relative w-full h-[calc(100vh-210px)] bg-[#07090e]">
            {/* Canvas Three.js */}
            <div
              ref={mountRef}
              onClick={handleCanvasClick}
              className="building-canvas w-full h-full cursor-grab active:cursor-grabbing"
            />
            {webglError && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#07090e]/90 p-6 text-center">
                <div className="max-w-md rounded-xl border border-amber-500/30 bg-slate-900 p-5">
                  <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-amber-400" />
                  <p className="text-sm text-slate-200">{webglError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950"
                  >
                    Abrir lista de unidades
                  </button>
                </div>
              </div>
            )}

            {/* LEGENDA E CONTROLES SOBREPOSTOS NO 3D */}
            <div className="absolute top-4 left-6 bg-slate-900/85 backdrop-blur-md border border-slate-800 p-4 rounded-xl max-w-xs pointer-events-auto max-md:hidden">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400" /> Status do Edifício
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50"></span>
                    Adimplente / Regular
                  </span>
                  <span className="font-bold text-slate-400">{kpis.okUnits}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="w-3 h-3 rounded-full bg-red-500 shadow-md shadow-red-500/50"></span>
                    Pendente / Inadimplente
                  </span>
                  <span className="font-bold text-slate-400">{kpis.pendingUnits}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-md shadow-amber-500/50"></span>
                    Alerta / Manutenção
                  </span>
                  <span className="font-bold text-slate-400">{kpis.alertUnits}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-400">
                💡 <span className="text-slate-300">Dica:</span> Clique em qualquer unidade no 3D para abrir as informações.
              </div>
            </div>

            {/* BARRA DE FILTROS RÁPIDOS */}
            <div className="absolute top-4 right-6 bg-slate-900/85 backdrop-blur-md border border-slate-800 p-2 rounded-xl flex items-center gap-2 pointer-events-auto max-lg:top-auto max-lg:bottom-4 max-lg:left-4 max-lg:right-auto max-sm:flex-col max-sm:items-stretch">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar apto ou morador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-52 max-sm:w-[calc(100vw-64px)]"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 max-sm:w-full"
              >
                <option value="all">Todos os Status</option>
                <option value="ok">Apenas Regulares</option>
                <option value="pending">Inadimplentes</option>
                <option value="alert">Em Alerta</option>
              </select>
            </div>
            <div className="absolute bottom-5 right-6 w-60 rounded-xl border border-slate-800 bg-slate-900/85 p-4 shadow-xl backdrop-blur-md pointer-events-none max-sm:hidden" role="img" aria-label="Gráfico ilustrativo da arrecadação dos últimos seis meses">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Arrecadação mensal</h3>
                  <p className="mt-1 text-[10px] text-slate-400">Valores fictícios · 6 meses</p>
                </div>
                <TrendingUp className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="flex h-16 items-end gap-2">
                {collectionHistory.map((amount, index) => (
                  <div key={index} className="flex h-full flex-1 items-end" title={formatCurrency(amount)}>
                    <div
                      className="w-full rounded-t-sm bg-gradient-to-t from-blue-600/70 to-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                      style={{ height: `${Math.max(14, Math.round((amount / Math.max(...collectionHistory, 1)) * 100))}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[9px] text-slate-500"><span>6 meses atrás</span><span>Atual</span></div>
            </div>
            {filteredUnits.length === 0 && (
              <div className="absolute inset-x-1/2 top-1/2 w-max -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-700 bg-slate-900/95 px-5 py-4 text-center shadow-xl">
                <p className="text-sm font-semibold text-slate-200">Nenhuma unidade encontrada</p>
                <p className="mt-1 text-xs text-slate-400">Ajuste a busca ou o filtro de status.</p>
              </div>
            )}
          </div>
        )}

        {/* VIEW LISTA / TELA DE GRID */}
        {activeTab === 'list' && (
          <div className="p-6 flex-1 overflow-y-auto">
            {/* Filtros da Lista */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar por apto ou morador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">Todos os Status</option>
                  <option value="ok">Adimplentes</option>
                  <option value="pending">Inadimplentes</option>
                  <option value="alert">Alerta</option>
                </select>
              </div>

              <div className="text-xs text-slate-400">
                Exibindo <span className="font-bold text-white">{filteredUnits.length}</span> de {units.length} unidades
              </div>
            </div>

            {/* Grid de Cards dos Apartamentos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredUnits.map((unit) => (
                <div
                  key={unit.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir detalhes do apartamento ${unit.number}, responsável ${unit.owner}`}
                  onClick={() => {
                    setSelectedUnit(unit);
                    setModalTab('info');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedUnit(unit);
                      setModalTab('info');
                    }
                  }}
                  className={`bg-slate-900/60 border rounded-xl p-4 hover:border-cyan-500/50 transition cursor-pointer relative overflow-hidden group ${
                    unit.status === 'pending'
                      ? 'border-red-500/30 bg-red-950/10'
                      : unit.status === 'alert'
                      ? 'border-amber-500/30 bg-amber-950/10'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                      Apto {unit.number}
                      <span className="text-[10px] font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                        {unit.floor}º Andar
                      </span>
                    </span>

                    <span
                      className={`w-3 h-3 rounded-full ${
                        unit.status === 'ok'
                          ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
                          : unit.status === 'pending'
                          ? 'bg-red-500 shadow-lg shadow-red-500/50'
                          : 'bg-amber-500 shadow-lg shadow-amber-500/50'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 mb-4">
                    <p className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-medium text-white">{unit.owner}</span>
                    </p>
                    <p className="flex items-center gap-2 text-slate-400">
                      <Home className="w-3.5 h-3.5 text-slate-500" />
                      {unit.residentsCount} {unit.residentsCount === 1 ? 'Morador' : 'Moradores'} • {unit.area}m²
                    </p>
                    <p className="flex items-center gap-2 text-slate-400">
                      <Dog className="w-3.5 h-3.5 text-slate-500" />
                      {unit.hasPet ? unit.petInfo : 'Sem animais'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Taxa Condominial</span>
                    <span className="font-bold text-slate-200">R$ {unit.condoFee}</span>
                  </div>
                </div>
              ))}
            </div>
            {filteredUnits.length === 0 && (
              <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-10 text-center">
                <Search className="mx-auto mb-3 h-6 w-6 text-slate-500" />
                <p className="text-sm font-semibold text-slate-200">Nenhuma unidade encontrada</p>
                <p className="mt-1 text-xs text-slate-400">Tente outro apartamento, morador ou status.</p>
              </div>
            )}
          </div>
        )}

        {/* VIEW GERADOR DE EDIFÍCIO */}
        {activeTab === 'generator' && (
          <div className="p-6 max-w-4xl mx-auto flex-1 overflow-y-auto w-full">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Gerador de Estrutura do Prédio 3D</h2>
                  <p className="text-xs text-slate-400">
                    Configure as especificações técnicas para reconstruir o edifício e suas unidades em tempo real.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Nome do Condomínio
                  </label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Número de Andares (1 a 12)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    step="1"
                    value={config.floors}
                    onChange={(e) => setConfig({ ...config, floors: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Apartamentos por Andar (2 a 6)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="6"
                    step="1"
                    value={config.unitsPerFloor}
                    onChange={(e) => setConfig({ ...config, unitsPerFloor: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Planta baixa de referência
                  </label>
                  <label htmlFor="blueprint-upload" className="block border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl p-3 text-center cursor-pointer transition">
                    <FileText className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                    <span className="text-[11px] text-slate-400 block">
                      {customBlueprint ? customBlueprint.name : 'Selecionar PDF ou imagem da planta (máx. 10 MB)'}
                    </span>
                    <input
                      id="blueprint-upload"
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/webp,image/svg+xml"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) {
                          setBlueprintError('O arquivo deve ter no máximo 10 MB.');
                          event.target.value = '';
                          return;
                        }
                        if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
                          setBlueprintError('Formato não suportado. Selecione um PDF ou uma imagem.');
                          event.target.value = '';
                          return;
                        }
                        setBlueprintError('');
                        setCustomBlueprint({
                          name: file.name,
                          type: file.type,
                          url: URL.createObjectURL(file),
                        });
                      }}
                    />
                  </label>
                  <p className="mt-2 text-[10px] text-slate-500">
                    Arquivo processado apenas no navegador; não é enviado para nenhum servidor.
                  </p>
                  {blueprintError && <p className="mt-1 text-[10px] text-red-400" role="alert">{blueprintError}</p>}
                  {customBlueprint && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomBlueprint(null);
                        setBlueprintError('');
                      }}
                      className="mt-2 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300"
                    >
                      Remover planta selecionada
                    </button>
                  )}
                </div>
              </div>

              {/* Pré-visualização da Configuração */}
              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 mb-6">
                <h4 className="text-xs font-bold text-slate-300 mb-2">Resumo da Nova Arquitetura</h4>
                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Total de Aptos</span>
                    <span className="text-base font-black text-cyan-400">
                      {config.floors * config.unitsPerFloor}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Pavimentos</span>
                    <span className="text-base font-black text-slate-200">{config.floors}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block">Unidades/Andar</span>
                    <span className="text-base font-black text-slate-200">{config.unitsPerFloor}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleGenerateBuilding(config.floors, config.unitsPerFloor)}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Reconstruir Prédio 3D Agora
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DETALHADO DA UNIDADE (CLICOU -> ABRIU) */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div role="dialog" aria-modal="true" aria-labelledby="unit-dialog-title" className="bg-[#0e131f] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            {/* Header Modal */}
            <div className="bg-slate-900/90 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  selectedUnit.status === 'ok' ? 'bg-emerald-500' : selectedUnit.status === 'pending' ? 'bg-red-500' : 'bg-amber-500'
                }`} />
                <div>
                  <h3 id="unit-dialog-title" className="text-lg font-bold text-white flex items-center gap-2">
                    Apartamento {selectedUnit.number}
                    <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                      {selectedUnit.floor}º Andar
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">ID do imóvel: {selectedUnit.id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUnit(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Abas Internas do Modal */}
            <div className="flex border-b border-slate-800 bg-slate-950/50 px-6">
              <button
                onClick={() => setModalTab('info')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
                  modalTab === 'info'
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Dados Gerais & Moradores
              </button>
              <button
                onClick={() => setModalTab('finance')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
                  modalTab === 'finance'
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Financeiro & Boletos
              </button>
              <button
                onClick={() => setModalTab('blueprint')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
                  modalTab === 'blueprint'
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Planta do Imóvel
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* ABA INFO */}
              {modalTab === 'info' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                      <span className="text-[11px] text-slate-400 block mb-1">Proprietário Principal</span>
                      <p className="text-sm font-bold text-white">{selectedUnit.owner}</p>
                      <p className="text-xs text-slate-400 mt-1">{selectedUnit.phone}</p>
                      <p className="text-xs text-slate-500">{selectedUnit.email}</p>
                      <p className="mt-3 border-t border-slate-800 pt-3 text-[10px] text-slate-400">
                        Moradores fictícios: {selectedUnit.residentNames.join(', ')}
                      </p>
                    </div>

                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                      <span className="text-[11px] text-slate-400 block mb-1">Censo da Unidade</span>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-cyan-400" />
                        {selectedUnit.residentsCount} {selectedUnit.residentsCount === 1 ? 'Morador' : 'Moradores'} Cadastrados
                      </p>
                      <p className="text-xs text-slate-400 mt-2">Área: {selectedUnit.area} m²</p>
                    </div>
                  </div>

                  {/* Seção de Animais de Estimação */}
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                    <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2 mb-3">
                      <Dog className="w-4 h-4" /> Informações de Animais de Estimação (Pet)
                    </h4>
                    {selectedUnit.hasPet ? (
                      <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                          🐶
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200">{selectedUnit.petInfo}</p>
                          <p className="text-[10px] text-slate-400">Cadastro ilustrativo · nenhum dado real</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Nenhum animal registrado nesta unidade.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ABA FINANCEIRO */}
              {modalTab === 'finance' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-xs text-slate-400 block">Status Financeiro Atual</span>
                      <span className={`text-sm font-bold ${
                        selectedUnit.status === 'pending' ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {selectedUnit.status === 'pending' ? 'Possui Débitos Pendentes' : 'Adimplente / Em dia'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Taxa Mensal</span>
                      <span className="text-base font-black text-white">{formatCurrency(selectedUnit.condoFee)}</span>
                    </div>
                  </div>

                  {selectedUnit.debtAmount > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center justify-between text-xs text-red-300">
                      <span>Valor acumulado em atraso:</span>
                      <span className="font-extrabold text-sm">{formatCurrency(selectedUnit.debtAmount)}</span>
                    </div>
                  )}

                  <h4 className="text-xs font-bold text-slate-300 mt-4 mb-2">Histórico Recente de Boletos</h4>
                  <div className="space-y-2">
                    {selectedUnit.history.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg text-xs border border-slate-800/60">
                        <span className="text-slate-300">{item.month}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">{formatCurrency(item.amount)}</span>
                          {item.paid ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Pago
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 flex items-center gap-1">
                              <X className="w-3 h-3" /> Pendente
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ABA PLANTA DO IMÓVEL */}
              {modalTab === 'blueprint' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Layout da Planta: <strong className="text-white">{selectedUnit.layoutType}</strong></span>
                    <span className="text-xs text-cyan-400">{selectedUnit.area} m² privativos</span>
                  </div>

                  {customBlueprint ? (
                    <div className="relative flex min-h-[240px] flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <p className="w-full truncate text-xs text-cyan-300" title={customBlueprint.name}>
                        Planta local: {customBlueprint.name}
                      </p>
                      {customBlueprint.type === 'application/pdf' ? (
                        <iframe
                          title={`Pré-visualização local da planta ${customBlueprint.name}`}
                          src={customBlueprint.url}
                          className="h-[50vh] min-h-[300px] w-full rounded-lg bg-white"
                        />
                      ) : (
                        <img
                          src={customBlueprint.url}
                          alt={`Planta baixa fictícia para a unidade ${selectedUnit.number}`}
                          className="max-h-[50vh] max-w-full object-contain"
                        />
                      )}
                      <p className="text-[10px] text-slate-500">Pré-visualização local neste navegador; o arquivo não foi enviado.</p>
                    </div>
                  ) : (
                    /* Renderizador de Planta Baixa Interativa SVG */
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center relative min-h-[220px]">
                      <svg viewBox="0 0 300 200" className="w-full max-w-md h-auto">
                      {/* Paredes Externas */}
                      <rect x="10" y="10" width="280" height="180" fill="#0f172a" stroke="#38bdf8" strokeWidth="3" rx="4" />

                      {/* Divisória Sala / Cozinha */}
                      <line x1="100" y1="10" x2="100" y2="120" stroke="#475569" strokeWidth="2" />
                      {/* Quarto 1 */}
                      <line x1="180" y1="10" x2="180" y2="100" stroke="#475569" strokeWidth="2" />
                      <line x1="180" y1="100" x2="290" y2="100" stroke="#475569" strokeWidth="2" />
                      {/* Banheiro */}
                      <line x1="100" y1="120" x2="180" y2="120" stroke="#475569" strokeWidth="2" />

                      {/* Textos dos Cômodos */}
                      <text x="45" y="60" fill="#94a3b8" fontSize="10" textAnchor="middle">Sala Estar</text>
                      <text x="50" y="150" fill="#94a3b8" fontSize="10" textAnchor="middle">Varanda</text>
                      <text x="140" y="60" fill="#94a3b8" fontSize="10" textAnchor="middle">Cozinha</text>
                      <text x="140" y="155" fill="#94a3b8" fontSize="10" textAnchor="middle">WC</text>
                      <text x="235" y="55" fill="#94a3b8" fontSize="10" textAnchor="middle">Suíte Master</text>
                      <text x="235" y="150" fill="#94a3b8" fontSize="10" textAnchor="middle">Dormitório</text>
                      </svg>

                      <div className="absolute bottom-2 right-2 text-[10px] text-slate-500 flex items-center gap-1">
                        <Maximize2 className="w-3 h-3" /> Escala ilustrativa 1:50
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="bg-slate-900/90 px-6 py-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedUnit(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}