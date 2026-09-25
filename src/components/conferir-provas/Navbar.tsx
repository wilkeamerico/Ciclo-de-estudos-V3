import React from 'react';
import { 
  FileText, 
  BarChart3, 
  History, 
  BookOpen, 
  Sparkles, 
  ArrowLeft, 
  Target 
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'upload' | 'performance' | 'history';
  setActiveTab: (tab: 'dashboard' | 'upload' | 'performance' | 'history') => void;
  hasResult: boolean;
  examTitle?: string;
  darkMode?: boolean;
  onVoltarParaCiclos?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasResult,
  examTitle,
  darkMode = false,
  onVoltarParaCiclos,
}) => {
  return (
    <header className={`sticky top-0 z-40 backdrop-blur border-b transition-colors ${
      darkMode ? "bg-[#0b1329]/95 border-[#1e2d4d]" : "bg-white/95 border-slate-200"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand and back button */}
          <div className="flex items-center space-x-3">
            {onVoltarParaCiclos && (
              <button
                type="button"
                onClick={onVoltarParaCiclos}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  darkMode
                    ? "bg-[#101d3b] border-[#1e2d4d] text-gray-300 hover:text-white hover:bg-[#162750]"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
                title="Voltar aos Meus Concursos"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h1 className={`text-sm font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                  DASHBOARD DE SIMULADOS & PROVAS
                </h1>
                <span className={`text-[10px] block ${darkMode ? "text-gray-400" : "text-slate-500"}`}>
                  {examTitle ? examTitle : "Cruzamento Inteligente de Provas com o Edital"}
                </span>
              </div>
            </div>
          </div>

          {/* Principal Tabs */}
          <nav className={`hidden md:flex items-center p-1 rounded-xl border ${
            darkMode ? "bg-[#101d3b] border-[#1e2d4d]" : "bg-slate-100 border-slate-200"
          }`}>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? darkMode
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-indigo-700 shadow-sm'
                  : darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard Geral</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? darkMode
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-indigo-700 shadow-sm'
                  : darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Anexar Prova / Novo Simulado</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('performance')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'performance'
                  ? darkMode
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-indigo-700 shadow-sm'
                  : darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Diagnóstico IA</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? darkMode
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-indigo-700 shadow-sm'
                  : darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico</span>
            </button>
          </nav>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 border-t border-slate-200 dark:border-[#1e2d4d] no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-600 bg-slate-100 dark:bg-[#101d3b] dark:text-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
              activeTab === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-600 bg-slate-100 dark:bg-[#101d3b] dark:text-gray-300'
            }`}
          >
            Anexar Prova
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
              activeTab === 'performance' ? 'bg-indigo-600 text-white' : 'text-slate-600 bg-slate-100 dark:bg-[#101d3b] dark:text-gray-300'
            }`}
          >
            Diagnóstico IA
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
              activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-600 bg-slate-100 dark:bg-[#101d3b] dark:text-gray-300'
            }`}
          >
            Histórico
          </button>
        </div>
      </div>
    </header>
  );
};
