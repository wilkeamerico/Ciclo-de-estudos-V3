import React, { useState, useEffect } from "react";
import { CicloEstudo, StudyState, Edital } from "../types";
import { THEMES, ThemeStyles } from "../utils/themeHelpers";
import { Plus, Trash2, Award, BookOpen, Settings, CheckCircle2, Trophy, ShieldAlert, Sparkles, User, Monitor, Palette, LogOut, RefreshCw, FileText, Target, BrainCircuit, ArrowLeft } from "lucide-react";
import { DEFAULT_STUDY_STATE } from "../utils/defaultData";
import { saveSimuladosAvulsosToFirestore, getSimuladosAvulsosFromFirestore } from "../utils/firebaseDb";
import EditalScanModal from "./EditalScanModal";
import SimuladoView from "./SimuladoView";

const DEFAULT_SIMULADOS_AVULSOS_STATE: StudyState = {
  edital: {
    banca: "Banca da Prova",
    orgao: "Simulado Avulso",
    cargo: "Geral",
    categorias: []
  },
  metas: {
    horasDisponiveis: {},
    dataInicial: new Date().toISOString().split("T")[0],
    dataFinal: "",
    diasImprodutivos: [],
    calendarOverrides: {}
  },
  currentCycle: 1,
  sessions: [],
  discursivas: [],
  simulados: {
    historico: [],
    metaAproveitamento: 80,
    criteriosPorCargo: {}
  }
};

interface PainelGeralProps {
  ciclos: CicloEstudo[];
  onSelectCiclo: (id: string, activeTab?: "dashboard" | "estudar" | "planejamento" | "edital" | "discursiva" | "simulado" | "resumo") => void;
  onExcluirCiclo: (id: string) => void;
  onLimparCiclo: (id: string) => void;
  onCriarCiclo: (orgao: string, cargoDesejado: string, nivel: "Médio" | "Técnico" | "Superior", scannedEdital?: Edital) => void;
  onUpdateCicloState?: (id: string, newState: StudyState) => void;
  currentTheme: string;
  setCurrentTheme: (theme: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  user: any;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export default function PainelGeral({
  ciclos,
  onSelectCiclo,
  onExcluirCiclo,
  onLimparCiclo,
  onCriarCiclo,
  onUpdateCicloState,
  currentTheme,
  setCurrentTheme,
  darkMode,
  setDarkMode,
  user,
  onLogout,
  onDeleteAccount,
}: PainelGeralProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const activeTheme: ThemeStyles = THEMES[currentTheme] || THEMES.cosmic;

  // Tab switching in Painel Geral: "ciclos" (Meus Concursos) vs "simulado" (Simulados e Provas Avulsas)
  const [painelTab, setPainelTab] = useState<"ciclos" | "simulado">("ciclos");

  // Estado dedicado para Simulados Avulsos (independentes de ciclos de estudo)
  const [simuladosAvulsosState, setSimuladosAvulsosState] = useState<StudyState>(() => {
    try {
      const saved = localStorage.getItem("simulados_avulsos_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch (e) {
      console.error("Erro ao carregar simulados avulsos do localStorage:", e);
    }
    return DEFAULT_SIMULADOS_AVULSOS_STATE;
  });

  // Carregar simulados avulsos do Firestore se houver usuário autenticado
  useEffect(() => {
    if (user?.uid) {
      getSimuladosAvulsosFromFirestore(user.uid)
        .then((remoteState) => {
          if (remoteState && remoteState.simulados) {
            setSimuladosAvulsosState(remoteState);
            try {
              localStorage.setItem("simulados_avulsos_state", JSON.stringify(remoteState));
            } catch (e) {
              // ignore
            }
          }
        })
        .catch(console.error);
    }
  }, [user?.uid]);

  const handleUpdateSimuladosAvulsos = (newState: StudyState) => {
    setSimuladosAvulsosState(newState);
    try {
      localStorage.setItem("simulados_avulsos_state", JSON.stringify(newState));
    } catch (e) {
      console.error("Erro ao salvar simulados avulsos no localStorage:", e);
    }
    if (user?.uid) {
      saveSimuladosAvulsosToFirestore(user.uid, newState).catch(console.error);
    }
  };

  // New cycle form modal & method state ("manual" | "ia")
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMethod, setCreateMethod] = useState<"manual" | "ia">("manual");
  const [newOrgao, setNewOrgao] = useState("");
  const [newCargo, setNewCargo] = useState("");
  const [newNivel, setNewNivel] = useState<"Médio" | "Técnico" | "Superior">("Superior");

  // CEGÁS cycle action modal
  const [selectedCycleForModal, setSelectedCycleForModal] = useState<CicloEstudo | null>(null);

  // Deletion confirmation modal
  const [cycleToDelete, setCycleToDelete] = useState<CicloEstudo | null>(null);
  // Cleaning confirmation modal
  const [cycleToClean, setCycleToClean] = useState<CicloEstudo | null>(null);

  // Calculates edital progress for a cycle synchronized with GUIA RESUMO - CONTEÚDO
  const getCycleProgress = (state: StudyState) => {
    let totalAssuntos = 0;
    let concluidos = 0;

    // 1. Calculate from Edital Categorias (Verticalized topics)
    if (state.edital && state.edital.categorias) {
      state.edital.categorias.forEach((cat) => {
        if (cat.disciplinas) {
          cat.disciplinas.forEach((disc) => {
            if (disc.assuntos) {
              disc.assuntos.forEach((ass) => {
                totalAssuntos++;
                if (
                  ass.status === "ESTUDADO" ||
                  ass.status === "REVISADO" ||
                  ass.teoria ||
                  ass.revisao ||
                  ass.questoes ||
                  (ass.registros && ass.registros.length > 0)
                ) {
                  concluidos++;
                }
              });
            }
          });
        }
      });
    }

    // 2. Check if there are checked topics in GUIA RESUMO (from localStorage)
    let totalResumo = 0;
    let concluidosResumo = 0;
    try {
      const savedResumoChecked = localStorage.getItem("resumo_checked_topics");
      if (savedResumoChecked) {
        const checkedMap = JSON.parse(savedResumoChecked);
        if (state.edital?.resumoExecutivo?.cargos) {
          const cargos = state.edital.resumoExecutivo.cargos;
          cargos.forEach((c) => {
            const cg = c.conteudoProgramatico?.conhecimentosGerais || [];
            const ce = c.conteudoProgramatico?.conhecimentosEspecificos || [];
            cg.forEach((m) => {
              m.topicos.forEach((t) => {
                totalResumo++;
                const key = `${c.cargoName}_CG_${m.materia}_${t}`;
                if (checkedMap[key]) concluidosResumo++;
              });
            });
            ce.forEach((m) => {
              m.topicos.forEach((t) => {
                totalResumo++;
                const key = `${c.cargoName}_CE_${m.materia}_${t}`;
                if (checkedMap[key]) concluidosResumo++;
              });
            });
          });
        }
      }
    } catch {
      // ignore
    }

    if (totalResumo > 0 && concluidosResumo > 0) {
      const resPerc = Math.round((concluidosResumo / totalResumo) * 100);
      const editalPerc = totalAssuntos > 0 ? Math.round((concluidos / totalAssuntos) * 100) : 0;
      const percentage = Math.max(resPerc, editalPerc);
      return { percentage, totalAssuntos: totalResumo, concluidos: concluidosResumo };
    }

    const percentage = totalAssuntos > 0 ? Math.round((concluidos / totalAssuntos) * 100) : 0;
    return { percentage, totalAssuntos, concluidos };
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgao.trim()) {
      alert("Por favor, informe o Órgão / Concurso!");
      return;
    }
    onCriarCiclo(newOrgao, newCargo || "Geral", newNivel);
    setNewOrgao("");
    setNewCargo("");
    setNewNivel("Superior");
    setShowCreateModal(false);
  };

  const handleScanAndCreateCycle = (scannedEdital: Edital) => {
    const orgaoFinal = scannedEdital.orgao || newOrgao || "NOVO CONCURSO";
    const cargoFinal = scannedEdital.cargo || newCargo || "Geral";
    onCriarCiclo(orgaoFinal, cargoFinal, newNivel, scannedEdital);
    setNewOrgao("");
    setNewCargo("");
    setNewNivel("Superior");
    setShowCreateModal(false);
  };

  return (
    <div className={`min-h-screen ${activeTheme.bg} transition-colors duration-300 font-sans pb-16`}>
      {/* PAINEL HEADER */}
      <header className={`border-b ${activeTheme.border} py-3 sm:py-4 px-4 sm:px-6 md:px-12`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className={`p-2 sm:p-2.5 rounded-xl ${activeTheme.accentBg} text-white shadow-lg shrink-0`}>
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">Ciclos de Estudo</h1>
              <p className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-blue-500">
                PAINEL GERAL DE CONCURSOS
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Top Tabs: Meus Concursos vs Simulado (IA) */}
            <div className={`flex items-center p-1 rounded-2xl border ${
              darkMode ? "bg-[#091224] border-[#1a2d52]" : "bg-gray-100 border-gray-200"
            }`}>
              <button
                onClick={() => setPainelTab("ciclos")}
                className={`flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  painelTab === "ciclos"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Meus Concursos</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/20 text-blue-200">
                  {ciclos.length}
                </span>
              </button>

              <button
                onClick={() => setPainelTab("simulado")}
                className={`flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  painelTab === "simulado"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/50"
                    : darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulado</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  IA
                </span>
              </button>
            </div>

            {/* User Profile Badge (non-dropdown) */}
            <div className={`flex items-center space-x-2 sm:space-x-2.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border ${activeTheme.card}`}>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600/25 flex items-center justify-center text-blue-400 font-black text-[10px] sm:text-xs shrink-0">
                {(user?.displayName || "U").substring(0, 2).toUpperCase()}
              </div>
              <div className="text-left">
                <span className={`block text-[11px] sm:text-xs font-black leading-none ${activeTheme.textPrimary}`}>
                  {user?.displayName || "Estudante"}
                </span>
                <span className="text-[8px] sm:text-[9px] font-black uppercase text-amber-500 tracking-wider">Estudante Ativo</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
        {painelTab === "simulado" ? (
          <div className="space-y-6 animate-fade-in">
            <SimuladoView
              state={simuladosAvulsosState}
              updateState={handleUpdateSimuladosAvulsos}
              darkMode={darkMode}
              onVoltarParaCiclos={() => setPainelTab("ciclos")}
              isPainelGeral={true}
              isAvulso={true}
            />
          </div>
        ) : (
          <>
            {/* HERO BANNER AREA */}
            <div className={`p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border ${activeTheme.card} relative overflow-hidden bg-gradient-to-r ${
              currentTheme === "cosmic" ? "from-[#101d3b] to-[#17254a]" :
              currentTheme === "emerald" ? "from-[#043d30] to-[#0a5240]" :
              currentTheme === "sunset" ? "from-[#351a14] to-[#45221b]" :
              currentTheme === "slate" ? "from-[#1e293b] to-[#334155]" : "from-blue-50 to-indigo-50"
            }`}>
              <div className="relative z-10 max-w-2xl space-y-2 sm:space-y-3">
                <span className={`inline-flex items-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                  currentTheme === "light" ? "bg-blue-600 text-white" : "bg-blue-500/10 text-blue-400"
                }`}>
                  Área do Aluno
                </span>
                <h2 className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight ${activeTheme.textPrimary}`}>
                  Seus Concursos e Ciclos de Estudos
                </h2>
                <p className={`text-xs md:text-sm ${currentTheme === "light" ? "text-slate-600" : "text-gray-300"} leading-relaxed`}>
                  Gerencie seus concursos ativos, crie novos ciclos de estudos alimentados por IA e acompanhe seu progresso de disciplinas e tópicos do edital de forma integrada.
                </p>
              </div>

              <div className="mt-4 md:absolute md:right-8 md:top-1/2 md:-translate-y-1/2 z-10">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full sm:w-auto px-5 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 hover:scale-102 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Ciclo de Estudos</span>
                </button>
              </div>
            </div>

            {/* ACTIVE CYCLES LISTING */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100/10">
                <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider flex items-center space-x-2 ${activeTheme.textPrimary}`}>
                  <Monitor className="w-4 h-4 text-blue-500" />
                  <span>Ciclos Ativos</span>
                </h3>
                <span className="text-[11px] sm:text-xs font-semibold text-gray-400">
                  Total: <strong>{ciclos.length} concurso(s)</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Cycle cards list */}
                {ciclos.map((ciclo) => {
                  const { percentage, totalAssuntos, concluidos } = getCycleProgress(ciclo.state);
                  return (
                    <div
                      key={ciclo.id}
                      onClick={() => setSelectedCycleForModal(ciclo)}
                      className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all duration-200 hover:scale-[1.02] cursor-pointer hover:shadow-xl relative flex flex-col justify-between min-h-[220px] group ${activeTheme.card} ${
                        currentTheme === "light" ? "hover:border-blue-400" : "hover:border-blue-500/40"
                      }`}
                    >
                      <div>
                        {/* Top row with level badge and delete icon */}
                        <div className="flex justify-between items-center mb-3 sm:mb-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                            currentTheme === "light"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              : "bg-blue-500/10 text-blue-400 border border-blue-900/30"
                          }`}>
                            {ciclo.nivel || "SUPERIOR"}
                          </span>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCycleToDelete(ciclo);
                            }}
                            className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Excluir este ciclo de estudos"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Organ Title */}
                        <h4 className={`text-base sm:text-lg font-black tracking-tight leading-tight uppercase ${activeTheme.textPrimary} line-clamp-2`}>
                          {ciclo.orgao}
                        </h4>

                        {/* Cargo Desejado */}
                        <p className="text-[11px] text-gray-400 font-medium mt-1 line-clamp-1">
                          Cargo Desejado: <span className={activeTheme.textPrimary}>{ciclo.cargoDesejado}</span>
                        </p>
                      </div>

                      {/* Progress segment */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-gray-400">
                          <span>Progresso do Edital</span>
                          <span className={activeTheme.textPrimary}>
                            {percentage}% ({concluidos}/{totalAssuntos || 100} tópicos)
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100/10 dark:bg-gray-800/60 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Bottom Enter button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCiclo(ciclo.id, "dashboard");
                        }}
                        className="mt-4 w-full py-2.5 bg-[#121c33] dark:bg-[#0c1224] hover:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-gray-100/10 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <span>Acessar Ciclo de Estudos</span>
                        <span className="text-xs">&gt;</span>
                      </button>
                    </div>
                  );
                })}

                {/* Dotted placeholder card to create new */}
                <div
                  onClick={() => setShowCreateModal(true)}
                  className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-dashed border-gray-400/30 flex flex-col items-center justify-center text-center min-h-[220px] hover:border-blue-500/60 transition-colors cursor-pointer group ${activeTheme.card}`}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Plus className="w-6 h-6 text-blue-500" />
                  </div>
                  <h4 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${activeTheme.textPrimary}`}>
                    Novo Ciclo de Estudos
                  </h4>
                  <p className="text-[10px] text-gray-400 max-w-[200px] mt-1 leading-relaxed">
                    Clique para registrar um novo concurso, informar o cargo desejado e carregar o edital
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className={`mt-12 sm:mt-16 py-6 sm:py-8 text-center text-xs border-t ${activeTheme.border} ${
        currentTheme === "light" ? "bg-white text-slate-400" : "bg-[#090f21] text-gray-500"
      }`}>
        <p className="px-4">Ciclos de Estudo Inteligente © {new Date().getFullYear()} — Planejamento de Alto Rendimento para Concursos Públicos</p>
      </footer>

      {/* POPUP MODAL: NOVO CICLO DE ESTUDOS */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className={`w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-2xl sm:rounded-3xl border animate-fade-in shadow-2xl relative ${
            darkMode ? "bg-[#0f1b35] border-[#1e2d4d] text-white" : "bg-white border-gray-200 text-gray-800"
          }`}>
            <h3 className="text-lg font-black uppercase tracking-wider mb-1 text-blue-500 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Novo Ciclo de Estudos
            </h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Escolha como deseja preencher os dados para organizar o ciclo de estudos:
            </p>

            {/* Choice Tabs: Manual vs IA */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-gray-100/10 rounded-2xl">
              <button
                type="button"
                onClick={() => setCreateMethod("manual")}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  createMethod === "manual"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Cadastro Manual</span>
              </button>

              <button
                type="button"
                onClick={() => setCreateMethod("ia")}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  createMethod === "ia"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>Escanear por IA</span>
              </button>
            </div>

            {createMethod === "manual" ? (
              <form onSubmit={handleCreateSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Órgão / Concurso Desejado
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CEGÁS, DATAPREV, SEFAZ..."
                    value={newOrgao}
                    onChange={(e) => setNewOrgao(e.target.value)}
                    className={`w-full p-3 rounded-xl border outline-none text-xs transition-all ${
                      darkMode
                        ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                        : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Cargo Desejado
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Engenheiro Mecânico, Analista..."
                    value={newCargo}
                    onChange={(e) => setNewCargo(e.target.value)}
                    className={`w-full p-3 rounded-xl border outline-none text-xs transition-all ${
                      darkMode
                        ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                        : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    Nível de Escolaridade
                  </label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setNewNivel("Médio")}
                      className={`p-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border cursor-pointer ${
                        newNivel === "Médio"
                          ? "bg-blue-600 border-blue-500 text-white"
                          : darkMode
                          ? "bg-[#16223f] border-[#25365e] text-gray-400"
                          : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}
                    >
                      Médio
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewNivel("Técnico")}
                      className={`p-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border cursor-pointer ${
                        newNivel === "Técnico"
                          ? "bg-blue-600 border-blue-500 text-white"
                          : darkMode
                          ? "bg-[#16223f] border-[#25365e] text-gray-400"
                          : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}
                    >
                      Técnico
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewNivel("Superior")}
                      className={`p-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border cursor-pointer ${
                        newNivel === "Superior"
                          ? "bg-blue-600 border-blue-500 text-white"
                          : darkMode
                          ? "bg-[#16223f] border-[#25365e] text-gray-400"
                          : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}
                    >
                      Superior
                    </button>
                  </div>
                </div>

                <div className="flex space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer ${
                      darkMode ? "border-[#25365e] hover:bg-[#16223f]" : "border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Criar Ciclo Manual
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-2">
                <p className="text-xs text-gray-400 mb-4">
                  Faça o upload do edital em PDF ou cole o texto. A IA preencherá automaticamente as guias: <strong>EDITAL, METAS, PLANEJAMENTO, ESTUDAR, DISCURSIVA E RESUMO</strong>, mantendo tudo liberado para edição manual.
                </p>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer ${
                      darkMode ? "border-[#25365e] hover:bg-[#16223f]" : "border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    Cancelar
                  </button>
                </div>
                
                {/* Embedded scan trigger modal call */}
                <EditalScanModal
                  isOpen={true}
                  onClose={() => setShowCreateModal(false)}
                  onScanSuccess={handleScanAndCreateCycle}
                  initialOrgao={newOrgao}
                  initialCargo={newCargo}
                  darkMode={darkMode}
                  title="Escanear Edital por IA para Novo Ciclo"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* POPUP MODAL: DYNAMIC ACTION CHANGER (CEGÁS MODAL) */}
      {selectedCycleForModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl border animate-fade-in shadow-2xl relative ${
            darkMode ? "bg-[#0f1b35] border-[#1e2d4d] text-white" : "bg-white border-gray-200 text-gray-800"
          }`}>
            {/* Modal Close Button */}
            <button
              onClick={() => setSelectedCycleForModal(null)}
              className="absolute right-3 sm:right-4 top-3 sm:top-4 text-gray-400 hover:text-white font-black text-sm p-1.5 cursor-pointer"
            >
              ✕
            </button>

            {/* Header Title representing organ name */}
            <div className="text-center pb-3 sm:pb-4 border-b border-gray-100/10 mb-4 sm:mb-6">
              <h2 className={`text-xl sm:text-2xl font-black tracking-widest uppercase ${activeTheme.textPrimary} pr-6`}>
                {selectedCycleForModal.orgao}
              </h2>
              <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
                Cargo Desejado: {selectedCycleForModal.cargoDesejado}
              </p>
            </div>

            {/* CEGÁS Modal Options Layout - 5 cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              
              {/* Option 1: Usar o ciclo */}
              <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between items-center text-center space-y-3 ${
                darkMode ? "bg-[#16223f]/50 border-[#25365e]" : "bg-gray-50 border-gray-100"
              }`}>
                <div>
                  <span className={`block text-xs font-bold ${activeTheme.textPrimary}`}>
                    Usar o ciclo de estudo
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Entre direto para o painel de cronômetro e registro de sessões de estudo.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const id = selectedCycleForModal.id;
                    setSelectedCycleForModal(null);
                    onSelectCiclo(id, "estudar");
                  }}
                  className="w-full sm:w-auto px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Estudar Agora
                </button>
              </div>

              {/* Option 2: Realizar o planejamento */}
              <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between items-center text-center space-y-3 ${
                darkMode ? "bg-[#16223f]/50 border-[#25365e]" : "bg-gray-50 border-gray-100"
              }`}>
                <div>
                  <span className={`block text-xs font-bold ${activeTheme.textPrimary}`}>
                    Realizar o planejamento do Ciclo
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Organize suas metas horárias e configure a distribuição de carga horária.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const id = selectedCycleForModal.id;
                    setSelectedCycleForModal(null);
                    onSelectCiclo(id, "planejamento");
                  }}
                  className={`w-full sm:w-auto px-5 py-2 border font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    darkMode ? "bg-transparent border-[#2c3d64] hover:bg-[#16223f] text-white" : "bg-white border-gray-300 hover:bg-gray-100 text-gray-800"
                  }`}
                >
                  Planejar
                </button>
              </div>

              {/* Option 3: Limpar todas as informações */}
              <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between items-center text-center space-y-3 ${
                darkMode ? "bg-[#16223f]/50 border-amber-500/30" : "bg-amber-50/50 border-amber-200"
              }`}>
                <div>
                  <span className={`block text-xs font-bold text-amber-500`}>
                    Limpar dados deste ciclo
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Zera todas as sessões, horas e tópicos estudados anteriormente sem excluir o ciclo.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCycleToClean(selectedCycleForModal);
                    setSelectedCycleForModal(null);
                  }}
                  className="w-full sm:w-auto px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Limpar Ciclo
                </button>
              </div>

              {/* Option 4: Encerrar Ciclo para estatísticas */}
              <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between items-center text-center space-y-3 ${
                darkMode ? "bg-[#16223f]/50 border-[#25365e]" : "bg-gray-50 border-gray-100"
              }`}>
                <div>
                  <span className={`block text-xs font-bold ${activeTheme.textPrimary}`}>
                    Encerrar o ciclo
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Encerrando um ciclo de estudos completo, você o guarda para alimentar o seu histórico.
                  </p>
                </div>
                <button
                  onClick={() => {
                    alert("Parabéns pelo esforço! Este ciclo foi arquivado com sucesso no seu histórico de estatísticas.");
                    setSelectedCycleForModal(null);
                  }}
                  className={`w-full sm:w-auto px-5 py-2 border font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    darkMode ? "bg-transparent border-[#2c3d64] hover:bg-[#16223f] text-white" : "bg-white border-gray-300 hover:bg-gray-100 text-gray-800"
                  }`}
                >
                  Encerrar
                </button>
              </div>

              {/* Option 5: Apagar completamente */}
              <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between items-center text-center space-y-3 sm:col-span-2 ${
                darkMode ? "bg-[#16223f]/50 border-red-500/20" : "bg-red-50/50 border-red-100"
              }`}>
                <div>
                  <span className={`block text-xs font-bold text-red-400`}>
                    Apagar este ciclo completamente
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Cuidado: apaga o ciclo permanentemente. Recomendamos limpar ou encerrar o ciclo em vez de apagar.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCycleToDelete(selectedCycleForModal);
                    setSelectedCycleForModal(null);
                  }}
                  className={`w-full sm:w-auto px-5 py-2 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer`}
                >
                  Apagar Definitivamente
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: CONFIRMAR LIMPEZA DE CICLO */}
      {cycleToClean && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-3 sm:p-4">
          <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-2xl sm:rounded-3xl border animate-fade-in shadow-2xl ${
            darkMode ? "bg-[#0f1b35] border-[#1e2d4d] text-white" : "bg-white border-gray-200 text-gray-800"
          }`}>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-wider mb-2 text-amber-500 flex items-center gap-1.5">
              <RefreshCw className="w-5 h-5 text-amber-500 shrink-0" />
              Limpar Informações do Ciclo
            </h3>
            
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Deseja realmente limpar todas as informações cadastradas no ciclo <strong className={darkMode ? "text-white" : "text-gray-900"}>{cycleToClean.orgao}</strong> ({cycleToClean.cargoDesejado})?
              <br /><br />
              Esta ação efetuará a exclusão completa e irrestrita de todas as informações do ciclo de estudos (Edital, Matérias, Resumo, Metas, Planejamento, Horas de Estudo, Discursivas e Simulados), zerando tudo para que possa preencher do zero.
            </p>
            
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCycleToClean(null)}
                className={`flex-1 py-2.5 sm:py-3 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer ${
                  darkMode ? "border-[#25365e] hover:bg-[#16223f]" : "border-gray-200 hover:bg-gray-100"
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = cycleToClean.id;
                  setCycleToClean(null);
                  onLimparCiclo(id);
                }}
                className="flex-1 py-2.5 sm:py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Sim, Limpar Dados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: CONFIRMAR EXCLUSÃO DE CICLO */}
      {cycleToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-3 sm:p-4">
          <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-2xl sm:rounded-3xl border animate-fade-in shadow-2xl ${
            darkMode ? "bg-[#0f1b35] border-[#1e2d4d] text-white" : "bg-white border-gray-200 text-gray-800"
          }`}>
            <h3 className="text-lg font-black uppercase tracking-wider mb-2 text-red-500 flex items-center gap-1.5">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Confirmar Exclusão
            </h3>
            
            {ciclos.length <= 1 ? (
              <>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  Você deve manter pelo menos 1 ciclo de estudos cadastrado no sistema. Não é possível excluir este ciclo.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCycleToDelete(null)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  Deseja realmente apagar o ciclo do concurso <strong className={darkMode ? "text-white" : "text-gray-900"}>{cycleToDelete.orgao}</strong> ({cycleToDelete.cargoDesejado}) permanentemente? 
                  Todos os dados de sessões, horas e progresso deste concurso serão excluídos de forma definitiva.
                </p>
                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCycleToDelete(null)}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer ${
                      darkMode ? "border-[#25365e] hover:bg-[#16223f]" : "border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const id = cycleToDelete.id;
                      setCycleToDelete(null);
                      onExcluirCiclo(id);
                    }}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Sim, Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
