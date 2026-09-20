import React from 'react';
import { 
  FileText, 
  BarChart3, 
  CheckCircle2, 
  Calendar, 
  History, 
  BookOpen,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'upload' | 'performance' | 'questions' | 'study' | 'history';
  setActiveTab: (tab: 'upload' | 'performance' | 'questions' | 'study' | 'history') => void;
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

            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`font-bold tracking-tight text-base sm:text-lg ${
                  darkMode ? "text-white" : "text-slate-900"
                }`}>
                  Corretor & Simulado IA
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-3 h-3 mr-1 text-indigo-400" />
                  Gemini AI
                </span>
              </div>
              <p className={`text-xs hidden sm:block ${darkMode ? "text-gray-400" : "text-slate-500"}`}>
                {examTitle ? `Prova: ${examTitle}` : 'Caderno • Edital & Pesos • Gabarito • Acompanhamento'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop) */}
          <nav className={`hidden md:flex items-center space-x-1 p-1 rounded-xl border ${
            darkMode ? "bg-[#0e172e] border-[#1a2b4c]" : "bg-slate-100 border-slate-200"
          }`}>
            <button
              id="nav-tab-upload"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? darkMode
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-indigo-700 shadow-sm'
                  : darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>1. Upload & Respostas</span>
            </button>

            <button
              id="nav-tab-performance"
              onClick={() => hasResult && setActiveTab('performance')}
              disabled={!hasResult}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !hasResult
                  ? 'text-gray-500 opacity-50 cursor-not-allowed'
                  : activeTab === 'performance'
                  ? darkMode
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-indigo-700 shadow-sm'
                  : darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>2. Desempenho & Gráficos</span>
            </button>

            <button
              id="nav-tab-questions"
              onClick={() => hasResult && setActiveTab('questions')}
              disabled={!hasResult}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !hasResult
                  ? 'text-gray-500 opacity-50 cursor-not-allowed'
                  : activeTab === 'questions'
                  ? darkMode
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-indigo-700 shadow-sm'
                  : darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>3. Caderno Corrigido</span>
            </button>

            <button
              id="nav-tab-study"
              onClick={() => hasResult && setActiveTab('study')}
              disabled={!hasResult}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !hasResult
                  ? 'text-gray-500 opacity-50 cursor-not-allowed'
                  : activeTab === 'study'
                  ? darkMode
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-indigo-700 shadow-sm'
                  : darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>4. Plano de Estudos</span>
            </button>

            <button
              id="nav-tab-history"
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? darkMode
                    ? 'bg-indigo-600 text-white shadow-md'
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
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-600 bg-slate-100 dark:bg-[#101d3b] dark:text-gray-300'
            }`}
          >
            1. Upload & Respostas
          </button>
          <button
            onClick={() => hasResult && setActiveTab('performance')}
            disabled={!hasResult}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
              !hasResult
                ? 'opacity-50 cursor-not-allowed text-gray-400 bg-slate-100 dark:bg-[#101d3b]'
                : activeTab === 'performance'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 bg-slate-100 dark:bg-[#101d3b] dark:text-gray-300'
            }`}
          >
            2. Desempenho
          </button>
          <button
            onClick={() => hasResult && setActiveTab('questions')}
            disabled={!hasResult}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
              !hasResult
                ? 'opacity-50 cursor-not-allowed text-gray-400 bg-slate-100 dark:bg-[#101d3b]'
                : activeTab === 'questions'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 bg-slate-100 dark:bg-[#101d3b] dark:text-gray-300'
            }`}
          >
            3. Questões
          </button>
          <button
            onClick={() => hasResult && setActiveTab('study')}
            disabled={!hasResult}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
              !hasResult
                ? 'opacity-50 cursor-not-allowed text-gray-400 bg-slate-100 dark:bg-[#101d3b]'
                : activeTab === 'study'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 bg-slate-100 dark:bg-[#101d3b] dark:text-gray-300'
            }`}
          >
            4. Estudos
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
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
