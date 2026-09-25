import React, { useState } from "react";
import { BookOpen, Moon, Sun, RefreshCw, Trophy, Settings, Calendar, Award, FileText, LayoutDashboard, User, LogOut, Trash2, FileCheck, Target, BarChart3 } from "lucide-react";

interface HeaderProps {
  orgao: string;
  currentCycle: number;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSyncAll: () => void;
  isSyncing: boolean;
  onVoltarPainel?: () => void;
  showVoltarButton?: boolean;
  onLimparCiclo?: () => void;
  user: any;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export default function Header({
  orgao,
  currentCycle,
  darkMode,
  setDarkMode,
  activeTab,
  setActiveTab,
  onSyncAll,
  isSyncing,
  onVoltarPainel,
  showVoltarButton,
  onLimparCiclo,
  user,
  onLogout,
  onDeleteAccount,
}: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "resumo", label: "Resumo", icon: FileCheck },
    { id: "edital", label: "Edital", icon: FileText },
    { id: "planejamento", label: "Planejamento de Estudos", icon: Calendar },
    { id: "estudar", label: "Estudar", icon: BookOpen },
    { id: "relatorio", label: "Relatório de Desempenho", icon: BarChart3 },
    { id: "discursiva", label: "Discursiva", icon: Award },
    { id: "simulado", label: "Simulado", icon: Target },
  ];


  return (
    <header className={`border-b transition-colors duration-200 ${
      darkMode ? "bg-[#0b1329] border-[#1e2942] text-white" : "bg-white border-gray-200 text-gray-800"
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* Top bar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 shrink-0">
              <RefreshCw className={`w-5 h-5 sm:w-6 sm:h-6 ${isSyncing ? "animate-spin" : ""}`} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight font-sans truncate">Ciclos de Estudo</h1>
              <p className={`text-[10px] sm:text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} truncate`}>
                Organização e Acompanhamento Inteligente de Concursos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
            {/* Back to Painel button (TROCAR DE CICLO) */}
            {showVoltarButton && onVoltarPainel && (
              <button
                onClick={onVoltarPainel}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                  darkMode
                    ? "bg-[#16223f] border-[#25365e] text-blue-400 hover:bg-[#1a2c53] hover:scale-105"
                    : "bg-white border-gray-200 hover:bg-gray-50 text-blue-700 shadow-sm hover:scale-105"
                }`}
              >
                <span>← TROCAR DE CICLO</span>
              </button>
            )}

            {/* Limpar Ciclo button */}
            {onLimparCiclo && (
              <button
                onClick={onLimparCiclo}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer border ${
                  darkMode
                    ? "bg-[#16223f] border-amber-500/40 text-amber-400 hover:bg-amber-500/20 hover:border-amber-400"
                    : "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                }`}
                title="Limpar todas as sessões, questões e dados deste ciclo mantendo o ciclo ativo na página"
                id="btn-limpar-ciclo"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Ciclo</span>
              </button>
            )}

            {/* Active cycle indicator */}
            <div className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold ${
              darkMode ? "bg-[#16223f] text-blue-400 border border-blue-900/45" : "bg-blue-50 text-blue-700 border border-blue-100"
            }`}>
              <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>CICLO {currentCycle}º</span>
            </div>

            <div className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold max-w-[180px] sm:max-w-xs truncate ${
              darkMode ? "bg-[#16223f] text-emerald-400 border border-emerald-900/45" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
            }`}>
              <span className="truncate">ATIVO: {(orgao || "").toUpperCase()}</span>
            </div>

            {/* Sync button */}
            <button
              onClick={onSyncAll}
              disabled={isSyncing}
              className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-extrabold transition-all cursor-pointer border ${
                darkMode
                  ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-400/30 shadow-lg shadow-blue-600/30 active:scale-95"
                  : "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm active:scale-95"
              } disabled:opacity-50`}
              title="Sincronizar todo o conteúdo e recarregar os gráficos em tempo real"
              id="btn-sincronizar-tudo"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="hidden xs:inline sm:inline">{isSyncing ? "Sincronizando..." : "Sincronizar Tudo"}</span>
              <span className="inline xs:hidden sm:hidden">{isSyncing ? "..." : "Sincronizar"}</span>
            </button>

            {/* Theme switcher */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-1.5 sm:p-2 rounded-lg border transition-colors ${
                darkMode
                  ? "bg-[#16223f] border-[#20315a] text-amber-400 hover:bg-[#1e2f56]"
                  : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200"
              }`}
              title={darkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
              id="btn-toggle-tema"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Profile Badge */}
            <div className={`hidden sm:flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold border ${
              darkMode
                ? "bg-[#16223f] border-[#20315a] text-gray-200"
                : "bg-gray-50 border-gray-200 text-gray-700"
            }`}>
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-600/25 flex items-center justify-center text-blue-400 font-black text-[9px] sm:text-[10px] shrink-0">
                {(user?.displayName || "U").substring(0, 2).toUpperCase()}
              </div>
              <span className="max-w-[100px] truncate">{user?.displayName || "Estudante"}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto no-scrollbar py-1 scroll-smooth">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? darkMode
                      ? "bg-[#1a2b4c] text-blue-400 border-b-2 border-blue-500 shadow-md"
                      : "bg-blue-50 text-blue-700 border-b-2 border-blue-600 font-semibold"
                    : darkMode
                    ? "text-gray-400 hover:bg-[#111e3b] hover:text-gray-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
                id={`tab-${tab.id}`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
