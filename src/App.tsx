import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import DashboardView from "./components/DashboardView";
import StudyView from "./components/StudyView";
import EditalView from "./components/EditalView";
import MetasView from "./components/MetasView";
import PlanningView from "./components/PlanningView";
import DiscursivaView from "./components/DiscursivaView";
import ResumoView from "./components/ResumoView";
import SimuladoView from "./components/SimuladoView";
import PainelGeral from "./components/PainelGeral";
import { StudyState, CicloEstudo, Edital } from "./types";
import { DEFAULT_STUDY_STATE, EMPTY_STUDY_STATE } from "./utils/defaultData";
import { THEMES, ThemeStyles } from "./utils/themeHelpers";

// Firebase imports
import { auth } from "./utils/firebase";
import { onAuthStateChanged, deleteUser, User, signOut } from "firebase/auth";
import { 
  getCiclosFromFirestore, 
  saveCicloToFirestore, 
  deleteCicloFromFirestore, 
  saveAllCiclosToFirestore 
} from "./utils/firebaseDb";
import AuthPortal from "./components/AuthPortal";
import { RefreshCw } from "lucide-react";

export default function App() {
  // --- AUTHENTICATION STATES ---
  const [user, setUser] = useState<any>({
    uid: "usuario_estudos_alto_rendimento",
    email: "eng.franciscowilke@gmail.com",
    displayName: "Francisco Wilke"
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  // --- MULTI-CYCLE STATES ---
  const [ciclos, setCiclos] = useState<CicloEstudo[]>([]);
  const [activeCicloId, setActiveCicloId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"painel" | "ciclo">("painel");

  // Active theme (one of the 5 options)
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    const saved = localStorage.getItem("ciclo_frontend_theme");
    return saved || "cosmic"; // Default to Cosmo Profundo
  });

  // 2. Syncing state indicator
  const [isSyncing, setIsSyncing] = useState(false);

  // 3. Active Tab Selection within cycle
  const [activeTab, setActiveTab] = useState<"dashboard" | "resumo" | "edital" | "metas" | "planejamento" | "estudar" | "discursiva" | "simulado">("dashboard");

  // 4. Dark/Light Theme support
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("ciclo_dark_mode");
    return saved !== null ? saved === "true" : true; // Default to dark mode
  });

  // --- LISTEN TO AUTHENTICATION STATE ---
  useEffect(() => {
    setIsCheckingAuth(false);
  }, []);

  // --- LOAD CYCLES FROM FIRESTORE WHEN USER LOGS IN ---
  useEffect(() => {
    if (!user) {
      setCiclos([]);
      setActiveCicloId("");
      return;
    }

    const loadUserData = async () => {
      setIsSyncing(true);
      try {
        const firestoreCycles = await getCiclosFromFirestore(user.uid);
        
        if (firestoreCycles.length > 0) {
          // Sort cycles by id or created timestamp if possible
          setCiclos(firestoreCycles);
          
          // Try to restore user-specific active cycle ID
          const savedActiveId = localStorage.getItem(`ACTIVE_CICLO_ID_${user.uid}`);
          const activeExists = firestoreCycles.some((c) => c.id === savedActiveId);
          if (activeExists && savedActiveId) {
            setActiveCicloId(savedActiveId);
          } else {
            setActiveCicloId(firestoreCycles[0].id);
          }
        } else {
          // No cycles on cloud yet. Check if they have legacy localStorage cycles to migrate
          const localSavedList = localStorage.getItem("LISTA_CICLOS_ESTUDO");
          if (localSavedList) {
            try {
              const parsed = JSON.parse(localSavedList);
              if (Array.isArray(parsed) && parsed.length > 0) {
                console.log("Migrando ciclos de estudo locais para a nuvem...");
                const migrated: CicloEstudo[] = parsed.map((c) => ({
                  ...c,
                  userId: user.uid
                }));
                try {
                  await saveAllCiclosToFirestore(user.uid, migrated);
                } catch (e) {
                  console.error("Erro ao persistir migração na nuvem, continuará local:", e);
                }
                setCiclos(migrated);
                setActiveCicloId(migrated[0].id);
                setIsSyncing(false);
                return;
              }
            } catch (e) {
              console.error("Erro na migração de dados locais:", e);
            }
          }

          // Otherwise, bootstrap with a single default cycle
          const defaultCycle: CicloEstudo = {
            id: "ciclo_default_" + Date.now(),
            orgao: DEFAULT_STUDY_STATE.edital.orgao || "PETROBRAS",
            cargoDesejado: DEFAULT_STUDY_STATE.edital.cargo || "Operação",
            nivel: "Superior",
            state: DEFAULT_STUDY_STATE
          };
          try {
            await saveCicloToFirestore(user.uid, defaultCycle);
          } catch (e) {
            console.error("Erro ao salvar ciclo inicial no Firestore, continuará local:", e);
          }
          setCiclos([defaultCycle]);
          setActiveCicloId(defaultCycle.id);
        }
      } catch (err) {
        console.warn("Erro de conexão Firestore. Carregando dados locais persistidos...", err);
        // Fallback to local storage if Firestore fails
        const localSavedList = localStorage.getItem("LISTA_CICLOS_ESTUDO");
        if (localSavedList) {
          try {
            const parsed = JSON.parse(localSavedList);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCiclos(parsed);
              const savedActiveId = localStorage.getItem(`ACTIVE_CICLO_ID_${user.uid}`);
              const activeExists = parsed.some((c: any) => c.id === savedActiveId);
              if (activeExists && savedActiveId) {
                setActiveCicloId(savedActiveId);
              } else {
                setActiveCicloId(parsed[0].id);
              }
              setIsSyncing(false);
              return;
            }
          } catch (e) {
            console.error("Erro na leitura de dados locais:", e);
          }
        }

        // If no local cycles either, bootstrap with a default cycle locally
        const defaultCycle: CicloEstudo = {
          id: "ciclo_default_" + Date.now(),
          orgao: DEFAULT_STUDY_STATE.edital.orgao || "PETROBRAS",
          cargoDesejado: DEFAULT_STUDY_STATE.edital.cargo || "Operação",
          nivel: "Superior",
          state: DEFAULT_STUDY_STATE
        };
        setCiclos([defaultCycle]);
        setActiveCicloId(defaultCycle.id);
      } finally {
        setIsSyncing(false);
      }
    };

    loadUserData();
  }, [user]);

  // Keep theme settings in sync with local storage
  useEffect(() => {
    localStorage.setItem("ciclo_frontend_theme", currentTheme);
    if (currentTheme === "light") {
      setDarkMode(false);
    } else {
      setDarkMode(true);
    }
  }, [currentTheme]);

  // Keep cycles in sync with local storage as a robust offline/iframe fallback
  useEffect(() => {
    if (ciclos.length > 0) {
      localStorage.setItem("LISTA_CICLOS_ESTUDO", JSON.stringify(ciclos));
    }
  }, [ciclos]);

  useEffect(() => {
    localStorage.setItem("ciclo_dark_mode", String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    if (user && activeCicloId) {
      localStorage.setItem(`ACTIVE_CICLO_ID_${user.uid}`, activeCicloId);
    }
  }, [activeCicloId, user]);

  // Active study state for current cycle
  const activeCiclo = ciclos.find((c) => c.id === activeCicloId) || ciclos[0];
  const state = activeCiclo ? activeCiclo.state : DEFAULT_STUDY_STATE;

  // --- ACTION HANDLERS ---

  // Log Out Handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setCiclos([]);
      setActiveCicloId("");
      setViewMode("painel");
    } catch (err) {
      console.error("Erro ao sair da conta:", err);
    }
  };

  // Delete User Account Handler
  const handleExcluirUsuario = async () => {
    const confirmFirst = window.confirm(
      "⚠️ ATENÇÃO: Você tem certeza que deseja excluir sua conta e TODOS os seus ciclos de estudos definitivamente de nossos servidores?"
    );
    if (!confirmFirst) return;

    const confirmSecond = window.confirm(
      "❌ ESTA AÇÃO É TOTALMENTE IRREVERSÍVEL. Todos os seus dados serão apagados para sempre. Digite OK para confirmar."
    );
    if (!confirmSecond) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setIsSyncing(true);
    try {
      // 1. Delete all cycles from Firestore first
      for (const c of ciclos) {
        await deleteCicloFromFirestore(currentUser.uid, c.id);
      }

      // 2. Delete auth user
      await deleteUser(currentUser);
      alert("Sua conta de usuário e todos os seus ciclos de estudos foram excluídos permanentemente.");
      setUser(null);
      setCiclos([]);
      setActiveCicloId("");
      setViewMode("painel");
    } catch (err: any) {
      console.error("Erro ao deletar usuário:", err);
      if (err.code === "auth/requires-recent-login") {
        alert(
          "Segurança reforçada: Para excluir sua conta, você precisa fazer um login recente. Por favor, saia de sua conta, faça login novamente e clique para excluir."
        );
      } else {
        alert("Ocorreu um erro ao excluir a conta: " + (err.message || err));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Update active state and persist
  const handleUpdateState = async (newState: StudyState) => {
    if (!user) return;
    
    const updatedCiclos = ciclos.map((c) => {
      if (c.id === activeCicloId) {
        return {
          ...c,
          orgao: newState.edital.orgao || c.orgao,
          cargoDesejado: newState.edital.cargo || c.cargoDesejado,
          state: newState,
        };
      }
      return c;
    });
    setCiclos(updatedCiclos);

    const activeCycle = updatedCiclos.find((c) => c.id === activeCicloId);
    if (activeCycle) {
      try {
        await saveCicloToFirestore(user.uid, activeCycle);
      } catch (err) {
        console.error("Erro ao salvar atualização no Firestore:", err);
      }
    }
  };

  // Create a new study cycle
  const handleCriarCiclo = async (
    orgao: string,
    cargoDesejado: string,
    nivel: "Médio" | "Técnico" | "Superior",
    scannedEdital?: Edital
  ) => {
    if (!user) return;

    let newStudyState: StudyState;
    if (scannedEdital) {
      newStudyState = JSON.parse(JSON.stringify(EMPTY_STUDY_STATE));
      newStudyState.edital = scannedEdital;
    } else {
      newStudyState = JSON.parse(JSON.stringify(EMPTY_STUDY_STATE));
      newStudyState.edital.orgao = orgao;
      newStudyState.edital.cargo = cargoDesejado;
    }
    newStudyState.sessions = [];
    newStudyState.currentCycle = 1;

    const novoCiclo: CicloEstudo = {
      id: "ciclo_" + Date.now(),
      orgao: (scannedEdital?.orgao || orgao).toUpperCase(),
      cargoDesejado: scannedEdital?.cargo || cargoDesejado,
      nivel,
      state: newStudyState,
    };

    setIsSyncing(true);
    try {
      await saveCicloToFirestore(user.uid, novoCiclo);
    } catch (err) {
      console.error("Erro ao criar ciclo no Firestore, salvo apenas localmente:", err);
    }

    setCiclos((prev) => [...prev, novoCiclo]);
    setActiveCicloId(novoCiclo.id);
    setViewMode("ciclo");
    setActiveTab("edital"); // Go to Edital to configure subjects first
    setIsSyncing(false);
  };

  // Clear all study records/sessions/subjects in a cycle without deleting it
  const handleLimparCiclo = async (targetId?: string) => {
    if (!user) return;
    const cycleIdToClean = targetId || activeCicloId;
    if (!cycleIdToClean) return;

    const targetCycle = ciclos.find((c) => c.id === cycleIdToClean);
    if (!targetCycle) return;

    const resetState: StudyState = {
      edital: {
        banca: targetCycle.state?.edital?.banca || "A Definir",
        orgao: targetCycle.orgao,
        cargo: targetCycle.cargoDesejado,
        categorias: [],
        discursivaInfo: {
          hasDiscursiva: false,
          detalhes: "Ainda não cadastrado",
          criteriosAvaliacao: "Ainda não cadastrado",
        },
      },
      metas: {
        horasDisponiveis: { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
        dataInicial: new Date().toISOString().split("T")[0],
        dataFinal: "",
        diasImprodutivos: [],
        calendarOverrides: {},
      },
      currentCycle: 1,
      sessions: [],
      discursivas: [],
    };

    const cleanedCycle: CicloEstudo = {
      ...targetCycle,
      state: resetState,
    };

    const updatedCiclos = ciclos.map((c) => (c.id === cycleIdToClean ? cleanedCycle : c));
    setCiclos(updatedCiclos);

    try {
      await saveCicloToFirestore(user.uid, cleanedCycle);
      alert(`O ciclo "${targetCycle.orgao}" foi limpo com sucesso! Todas as informações e matérias foram completamente zeradas.`);
    } catch (err) {
      console.error("Erro ao salvar ciclo limpo no Firestore:", err);
    }
  };

  // Exclude a study cycle
  const handleExcluirCiclo = async (id: string) => {
    if (!user) return;
    if (ciclos.length <= 1) {
      alert("Você precisa manter pelo menos um ciclo de estudos ativo.");
      return;
    }

    setIsSyncing(true);
    try {
      await deleteCicloFromFirestore(user.uid, id);
    } catch (err) {
      console.error("Erro ao excluir ciclo no Firestore, removido apenas localmente:", err);
    }

    const updated = ciclos.filter((c) => c.id !== id);
    setCiclos(updated);

    if (activeCicloId === id) {
      setActiveCicloId(updated[0].id);
    }
    setIsSyncing(false);
  };

  // Select a cycle from Painel Geral
  const handleSelectCiclo = (id: string, activeTabSelection?: "dashboard" | "estudar" | "planejamento" | "edital") => {
    setActiveCicloId(id);
    setViewMode("ciclo");
    if (activeTabSelection) {
      setActiveTab(activeTabSelection as any);
    } else {
      setActiveTab("dashboard");
    }
  };

  // Sync everything manual trigger
  const handleSyncAll = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await saveAllCiclosToFirestore(user.uid, ciclos);
      alert("Sincronização concluída! Todos os dados de todos os seus ciclos foram salvos em segurança na nuvem.");
    } catch (err) {
      console.error("Erro de sincronização manual:", err);
      alert("Falha ao sincronizar dados com o servidor de nuvem.");
    } finally {
      setIsSyncing(false);
    }
  };

  // --- RENDER FLOWS ---

  // 1. Loader screen during initial auth state fetch
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#0b1329] flex flex-col justify-center items-center font-sans text-white">
        <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-sm font-semibold tracking-wide text-gray-400">Verificando sessão de usuário...</p>
      </div>
    );
  }

  // 2. Auth Portal screen if not logged in
  if (!user) {
    return <AuthPortal onAuthSuccess={() => {}} />;
  }

  const activeThemeStyles: ThemeStyles = THEMES[currentTheme] || THEMES.cosmic;

  // 3. Main Painel Geral selection screen
  if (viewMode === "painel") {
    return (
      <PainelGeral
        ciclos={ciclos}
        onSelectCiclo={handleSelectCiclo}
        onExcluirCiclo={handleExcluirCiclo}
        onLimparCiclo={handleLimparCiclo}
        onCriarCiclo={handleCriarCiclo}
        currentTheme={currentTheme}
        setCurrentTheme={setCurrentTheme}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        user={user}
        onLogout={handleLogout}
        onDeleteAccount={handleExcluirUsuario}
      />
    );
  }

  // 4. Detailed Cycle dashboard and subviews
  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${activeThemeStyles.bg} ${
      darkMode ? "text-gray-100" : "text-gray-800"
    }`}>
      
      {/* HEADER COMPONENT (Navigation, theme toggles, user profile, sync) */}
      <Header
        orgao={state.edital.orgao}
        currentCycle={state.currentCycle}
        activeTab={activeTab}
        setActiveTab={(tab: any) => setActiveTab(tab)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onSyncAll={handleSyncAll}
        isSyncing={isSyncing}
        showVoltarButton={true}
        onVoltarPainel={() => setViewMode("painel")}
        onLimparCiclo={() => handleLimparCiclo(activeCicloId)}
        user={user}
        onLogout={handleLogout}
        onDeleteAccount={handleExcluirUsuario}
      />

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ACTIVE VIEW CHANGER */}
        {activeTab === "dashboard" && (
          <DashboardView
            state={state}
            darkMode={darkMode}
          />
        )}

        {activeTab === "estudar" && (
          <StudyView
            state={state}
            updateState={handleUpdateState}
            darkMode={darkMode}
          />
        )}

        {activeTab === "edital" && (
          <EditalView
            state={state}
            updateState={handleUpdateState}
            darkMode={darkMode}
          />
        )}

        {activeTab === "metas" && (
          <MetasView
            state={state}
            updateState={handleUpdateState}
            darkMode={darkMode}
          />
        )}

        {activeTab === "planejamento" && (
          <PlanningView
            state={state}
            updateState={handleUpdateState}
            darkMode={darkMode}
          />
        )}

        {activeTab === "discursiva" && (
          <DiscursivaView
            state={state}
            updateState={handleUpdateState}
            darkMode={darkMode}
          />
        )}

        {activeTab === "resumo" && (
          <ResumoView
            state={state}
            updateState={handleUpdateState}
            darkMode={darkMode}
          />
        )}

        {activeTab === "simulado" && (
          <SimuladoView
            state={state}
            updateState={handleUpdateState}
            darkMode={darkMode}
          />
        )}

      </main>

      {/* FOOTER */}
      <footer className={`py-6 border-t text-center text-xs font-semibold ${
        darkMode ? "border-[#1e2d4d] bg-[#090f21] text-gray-500" : "border-gray-200 bg-white text-gray-400"
      }`}>
        <p>Ciclos de Estudo Inteligente © {new Date().getFullYear()} — Planejamento de Alto Rendimento para Concursos Públicos</p>
      </footer>

    </div>
  );
}
