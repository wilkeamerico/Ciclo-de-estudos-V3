import React, { useState } from 'react';
import { 
  Plus, 
  Eye, 
  Download, 
  Trash2, 
  Calendar, 
  BookOpen, 
  Sparkles,
  Award,
  FileSpreadsheet,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Target,
  BarChart3,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Flame,
  CheckCircle
} from 'lucide-react';
import { ExamResult, StudyStatus, TopicStudyMaterial } from '../../types';
import { exportSimuladosToCSV, exportSingleExamToCSV } from '../../utils/csvExport';
import { SimuladoDetailModal } from './SimuladoDetailModal';
import { QuestionReview } from './QuestionReview';
import { StudyPlanner } from './StudyPlanner';

interface ExamHistoryProps {
  history: ExamResult[];
  onSelectExam?: (exam: ExamResult) => void;
  onDeleteExam: (id: string) => void;
  onStartNew: () => void;
  onUpdateWeaknessStatus?: (examId: string, index: number, newStatus: StudyStatus) => void;
  onGenerateStudyTopic?: (topic: string, discipline: string, errorContext?: string) => void;
  activeTopicStudy?: TopicStudyMaterial | null;
  isLoadingStudyMaterial?: boolean;
  onCloseTopicStudy?: () => void;
  targetScore?: number;
  darkMode?: boolean;
}

export const ExamHistory: React.FC<ExamHistoryProps> = ({
  history,
  onSelectExam,
  onDeleteExam,
  onStartNew,
  onUpdateWeaknessStatus,
  onGenerateStudyTopic,
  activeTopicStudy,
  isLoadingStudyMaterial,
  onCloseTopicStudy,
  targetScore = 85,
  darkMode = true,
}) => {
  // Set of expanded exam IDs for inline accordion view
  const [expandedExamIds, setExpandedExamIds] = useState<Set<string>>(new Set());
  // Active subtab for each expanded exam ('performance' | 'questions' | 'study')
  const [expandedTabs, setExpandedTabs] = useState<Record<string, 'performance' | 'questions' | 'study'>>({});

  // Fullscreen modal state
  const [selectedExamForModal, setSelectedExamForModal] = useState<ExamResult | null>(null);
  const [initialModalTab, setInitialModalTab] = useState<'performance' | 'questions' | 'study'>('performance');

  const cardBg = darkMode ? "bg-[#101d3b] border-[#1e2d4d]" : "bg-white border-slate-200";
  const innerBg = darkMode ? "bg-[#0b1329] border-[#1a2b4c]" : "bg-slate-50 border-slate-200";
  const textPrimary = darkMode ? "text-white" : "text-slate-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-slate-500";

  const toggleExpand = (examId: string) => {
    setExpandedExamIds((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) {
        next.delete(examId);
      } else {
        next.add(examId);
        // Initialize tab if not set
        if (!expandedTabs[examId]) {
          setExpandedTabs((t) => ({ ...t, [examId]: 'performance' }));
        }
      }
      return next;
    });
  };

  const setTabForExam = (examId: string, tab: 'performance' | 'questions' | 'study') => {
    setExpandedTabs((prev) => ({ ...prev, [examId]: tab }));
  };

  const handleExportAllCSV = () => {
    exportSimuladosToCSV(history, 'Historico_Simulados_Concurso');
  };

  const handleOpenModal = (exam: ExamResult, tab: 'performance' | 'questions' | 'study' = 'performance') => {
    setSelectedExamForModal(exam);
    setInitialModalTab(tab);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      
      {/* Top Header */}
      <div className={`rounded-2xl border p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cardBg}`}>
        <div>
          <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>
            HISTÓRICO DE SIMULADOS
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${textSecondary}`}>
            Registro de todas as provas realizadas. Clique em <strong>"Ver Detalhes"</strong> em qualquer prova para expandir o detalhamento completo da tabela diretamente na tela.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleExportAllCSV}
              className={`inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                darkMode 
                  ? "bg-[#15254d] border-[#233863] text-gray-200 hover:bg-[#1b2f60] hover:text-white"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              }`}
              title="Exportar todos os simulados para planilha CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Todos (.CSV)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onStartNew}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition flex items-center space-x-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Novo Simulado</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {history.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center space-y-4 ${cardBg}`}>
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className={`text-base font-bold ${textPrimary}`}>
              Nenhum simulado registrado no histórico ainda
            </h4>
            <p className={`text-xs max-w-sm mx-auto ${textSecondary}`}>
              Clique em "+ Lançar Novo Simulado" para corrigir sua primeira prova ou importar seu cartão-resposta.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartNew}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
          >
            Lançar Novo Simulado
          </button>
        </div>
      ) : (
        /* ========================================================================= */
        /* TABELA / LISTA DE HISTÓRICO EXPANSÍVEL (HISTÓRICO DE SIMULADOS) */
        /* ========================================================================= */
        <div className={`rounded-2xl border shadow-xs overflow-hidden ${cardBg}`}>
          
          {/* Table Column Headers */}
          <div className={`grid grid-cols-12 px-4 sm:px-6 py-4 border-b text-[11px] font-black uppercase tracking-wider ${
            darkMode ? "border-[#1e2d4d] bg-[#0c1630] text-gray-400" : "border-slate-200 bg-slate-100 text-slate-600"
          }`}>
            <div className="col-span-5 sm:col-span-5 flex items-center space-x-2">
              <span>DATA DO SIMULADO / PROVA</span>
            </div>
            <div className="col-span-4 sm:col-span-4">PONTUAÇÃO & APROVEITAMENTO</div>
            <div className="col-span-3 sm:col-span-3 text-right pr-2">DETALHES</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100 dark:divide-[#1e2d4d]">
            {history.map((exam, idx) => {
              const isExpanded = expandedExamIds.has(exam.id);
              const activeSubTab = expandedTabs[exam.id] || 'performance';
              const rawTitle = exam.examTitle || `SIMULADO ${String(idx + 1).padStart(2, '0')}`;
              
              // Extract organ and cargo from title
              let mainName = rawTitle;
              let subtitle = 'Concurso Público';

              if (rawTitle.includes(' - ')) {
                const parts = rawTitle.split(' - ');
                mainName = parts[0]?.trim() || rawTitle;
                subtitle = parts.slice(1).join(' - ').trim();
              }

              // Extract date (e.g. 18/08)
              let dateStr = '';
              if (exam.createdAt || exam.date) {
                try {
                  const d = new Date(exam.createdAt || exam.date || '');
                  dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                } catch {
                  dateStr = '';
                }
              }

              const displayDateSubtitle = dateStr ? `${dateStr} • ${subtitle}` : subtitle;

              const totalCorrect = exam.summary.totalCorrect;
              const totalQuestions = exam.summary.totalQuestions;
              const accuracy = exam.summary.scorePercentage;
              
              const pointsEarned = exam.disciplines && exam.disciplines.length > 0
                ? exam.disciplines.reduce((acc, d) => acc + (d.correctCount * (d.weight || 1)), 0)
                : totalCorrect;

              const pointsMax = exam.disciplines && exam.disciplines.length > 0
                ? exam.disciplines.reduce((acc, d) => acc + (d.totalQuestions * (d.weight || 1)), 0)
                : totalQuestions;

              // Color of percentage badge
              let badgeClass = "bg-amber-950/40 border border-amber-500/30 text-amber-400";
              if (accuracy >= 70) {
                badgeClass = "bg-emerald-950/40 border border-emerald-500/30 text-emerald-400";
              } else if (accuracy < 40) {
                badgeClass = "bg-red-950/40 border border-red-500/30 text-red-400";
              }

              const resultDisciplines = Array.from(new Set(exam.questions.map((q) => q.discipline))).filter(Boolean);

              return (
                <div key={exam.id} className="transition-colors">
                  {/* Primary Row Header */}
                  <div 
                    className={`grid grid-cols-12 items-center px-4 sm:px-6 py-4.5 transition cursor-pointer ${
                      isExpanded 
                        ? darkMode ? "bg-[#152449] border-b border-indigo-500/30" : "bg-indigo-50/60 border-b border-indigo-100"
                        : "hover:bg-indigo-500/5"
                    }`}
                    onClick={() => toggleExpand(exam.id)}
                  >
                    {/* Column 1: DATA DO SIMULADO */}
                    <div className="col-span-5 sm:col-span-5 pr-2 flex items-center space-x-2.5">
                      <div className={`p-1.5 rounded-lg border transition ${
                        isExpanded 
                          ? "bg-indigo-600 border-indigo-500 text-white" 
                          : darkMode ? "bg-[#101d3b] border-[#1e2d4d] text-gray-400" : "bg-white border-slate-200 text-slate-500"
                      }`}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-black text-blue-400 tracking-tight truncate">
                          {mainName}
                        </h3>
                        <p className={`text-xs mt-0.5 font-medium truncate ${textSecondary}`}>
                          {displayDateSubtitle}
                        </p>
                      </div>
                    </div>

                    {/* Column 2: PONTUAÇÃO TIRADA */}
                    <div className="col-span-4 sm:col-span-4">
                      <div className="flex items-baseline space-x-1.5">
                        <span className={`text-lg sm:text-xl font-black ${textPrimary}`}>
                          {pointsEarned.toFixed(0)} / {pointsMax}
                        </span>
                        <span className={`text-xs sm:text-sm font-bold ${textSecondary}`}>
                          pts
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${badgeClass}`}>
                          {accuracy.toFixed(1)}% de aproveitamento
                        </span>
                        <span className={`text-[11px] hidden sm:inline ${textSecondary}`}>
                          ({totalCorrect}/{totalQuestions} acertos)
                        </span>
                      </div>
                    </div>

                    {/* Column 3: DETALHES (Botão Ver Detalhes) */}
                    <div className="col-span-3 sm:col-span-3 flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleExpand(exam.id)}
                        className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs ${
                          isExpanded
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : darkMode
                            ? "border-[#233863] bg-[#122044] text-blue-400 hover:bg-[#1a2e60] hover:text-white hover:border-blue-500"
                            : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        }`}
                        title={isExpanded ? "Recolher detalhes da tabela" : "Expandir e visualizar a tabela detalhada completa"}
                      >
                        <Eye className="w-4 h-4" />
                        <span>{isExpanded ? "Recolher" : "Ver Detalhes"}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Deseja realmente excluir o simulado "${rawTitle}"?`)) {
                            onDeleteExam(exam.id);
                          }
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                        title="Excluir Simulado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* EXPANDED TABLE CONTENT DIRECTLY INLINE (NO POPUPS OBSTRUCTING) */}
                  {/* ========================================================================= */}
                  {isExpanded && (
                    <div className={`p-4 sm:p-6 md:p-7 space-y-6 border-b border-indigo-500/20 animate-fade-in ${
                      darkMode ? "bg-[#091024]" : "bg-slate-50/80"
                    }`}>
                      
                      {/* Top Action & Sub-navigation Bar */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#1e2d4d]">
                        
                        {/* Sub-Tabs: 1. Desempenho / 2. Caderno / 3. Plano */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setTabForExam(exam.id, 'performance')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              activeSubTab === 'performance'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                : darkMode
                                ? 'bg-[#101d3b] text-gray-300 hover:text-white border border-[#1e2d4d]'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <BarChart3 className="w-4 h-4" />
                            <span>1. Desempenho & Matérias</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTabForExam(exam.id, 'questions')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              activeSubTab === 'questions'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                : darkMode
                                ? 'bg-[#101d3b] text-gray-300 hover:text-white border border-[#1e2d4d]'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>2. Caderno Corrigido ({exam.questions?.length || 0} questões)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTabForExam(exam.id, 'study')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              activeSubTab === 'study'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                : darkMode
                                ? 'bg-[#101d3b] text-gray-300 hover:text-white border border-[#1e2d4d]'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <Calendar className="w-4 h-4" />
                            <span>3. Plano de Estudos ({exam.criticalWeaknesses?.length || 0} gaps)</span>
                          </button>
                        </div>

                        {/* Top Right Utilities */}
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => exportSingleExamToCSV(exam)}
                            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              darkMode ? "bg-[#101d3b] border-[#1e2d4d] text-gray-300 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                            title="Exportar dados deste simulado para CSV"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>CSV</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenModal(exam, activeSubTab)}
                            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              darkMode 
                                ? "bg-[#101d3b] border-[#1e2d4d] text-blue-400 hover:text-white hover:bg-[#1a2d59]" 
                                : "bg-white border-slate-200 text-blue-700 hover:bg-blue-50"
                            }`}
                            title="Abrir em janela cheia / modal"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Tela Cheia</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleExpand(exam.id)}
                            className={`inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              darkMode ? "bg-[#101d3b] border-[#1e2d4d] text-gray-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900"
                            }`}
                            title="Recolher tabela deste simulado"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Recolher</span>
                          </button>
                        </div>
                      </div>

                      {/* ======================================================= */}
                      {/* SUBTAB 1: DESEMPENHO & NOTAS POR MATÉRIA */}
                      {/* ======================================================= */}
                      {activeSubTab === 'performance' && (
                        <div className="space-y-6 animate-fade-in">
                          
                          {/* 4 Summary KPIs */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                            {/* Card 1: Pontuação Total */}
                            <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between ${innerBg}`}>
                              <span className={`text-[11px] font-bold uppercase tracking-wider ${textSecondary}`}>
                                PONTUAÇÃO TOTAL
                              </span>
                              <div className="mt-2 flex items-baseline space-x-1.5">
                                <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                                  {pointsEarned.toFixed(1)}
                                </span>
                                <span className={`text-sm sm:text-base font-bold ${textSecondary}`}>
                                  / {pointsMax} pts
                                </span>
                              </div>
                            </div>

                            {/* Card 2: Aproveitamento */}
                            <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between ${innerBg}`}>
                              <span className={`text-[11px] font-bold uppercase tracking-wider ${textSecondary}`}>
                                APROVEITAMENTO
                              </span>
                              <div className="mt-2">
                                <span className={`text-2xl sm:text-3xl font-black ${
                                  accuracy >= targetScore ? "text-emerald-400" : accuracy >= 50 ? "text-amber-400" : "text-red-400"
                                }`}>
                                  {accuracy.toFixed(1)}%
                                </span>
                              </div>
                            </div>

                            {/* Card 3: Acertos no Edital */}
                            <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between ${innerBg}`}>
                              <span className={`text-[11px] font-bold uppercase tracking-wider ${textSecondary}`}>
                                ACERTOS NO EDITAL
                              </span>
                              <div className="mt-2 flex items-baseline space-x-1.5">
                                <span className="text-2xl sm:text-3xl font-black text-blue-400">
                                  {totalCorrect}
                                </span>
                                <span className={`text-sm sm:text-base font-bold ${textSecondary}`}>
                                  / {totalQuestions} qts
                                </span>
                              </div>
                              <div className="mt-1 text-[11px] text-red-400 font-medium">
                                {exam.summary.totalWrong || 0} erros • {exam.summary.totalBlank || 0} em branco
                              </div>
                            </div>

                            {/* Card 4: Meta Definida */}
                            <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between ${innerBg}`}>
                              <span className={`text-[11px] font-bold uppercase tracking-wider ${textSecondary}`}>
                                META DEFINIDA
                              </span>
                              <div className="mt-2 flex items-baseline space-x-1.5">
                                <span className="text-2xl sm:text-3xl font-black text-purple-400">
                                  {targetScore}%
                                </span>
                                <span className={`text-xs font-bold ${textSecondary}`}>
                                  meta
                                </span>
                              </div>
                              <div className="mt-1 text-[11px] font-medium text-indigo-400">
                                {accuracy >= targetScore ? "★ Meta superada!" : `Faltam ${(targetScore - accuracy).toFixed(1)}%`}
                              </div>
                            </div>
                          </div>

                          {/* Section: Disciplines Breakdown Table */}
                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <h3 className={`text-sm sm:text-base font-black tracking-wide uppercase ${textPrimary}`}>
                                PONTUAÇÃO & DESEMPENHO POR MATÉRIA (CONFORME EDITAL):
                              </h3>
                              <span className={`text-[11px] italic ${textSecondary}`}>
                                * Desempenho = Acertos / Total de Questões da Matéria no Edital
                              </span>
                            </div>

                            <div className={`rounded-2xl border overflow-hidden shadow-xs ${innerBg}`}>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                                      darkMode ? "border-[#1e2d4d] bg-[#0c1630] text-gray-400" : "border-slate-200 bg-slate-100 text-slate-600"
                                    }`}>
                                      <th className="py-3.5 px-4 sm:px-6">MATÉRIA / DISCIPLINA</th>
                                      <th className="py-3.5 px-4 text-center">ACERTOS / TOTAL EDITAL</th>
                                      <th className="py-3.5 px-4 text-center">ERROS</th>
                                      <th className="py-3.5 px-4 text-center">PONTUAÇÃO</th>
                                      <th className="py-3.5 px-4 sm:px-6 text-right">% APROVEITAMENTO</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-[#1e2d4d] text-xs">
                                    {(exam.disciplines || []).map((d, index) => {
                                      const weight = d.weight || 1;
                                      const discAcc = d.accuracyPercentage;
                                      const discPointsEarned = (d.correctCount * weight).toFixed(0);
                                      const discPointsMax = (d.totalQuestions * weight).toFixed(0);

                                      let badgeText = 'REGULAR';
                                      let badgeColor = darkMode 
                                        ? 'bg-amber-950/40 border-amber-500/30 text-amber-300' 
                                        : 'bg-amber-50 border-amber-200 text-amber-700';
                                      let barColor = 'bg-amber-500';

                                      if (discAcc >= 75) {
                                        badgeText = '★ ÓTIMO';
                                        badgeColor = darkMode 
                                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                                          : 'bg-emerald-50 border-emerald-200 text-emerald-700';
                                        barColor = 'bg-emerald-500';
                                      } else if (discAcc < 50) {
                                        badgeText = '▼ BAIXO';
                                        badgeColor = darkMode 
                                          ? 'bg-red-950/40 border-red-500/30 text-red-300' 
                                          : 'bg-red-50 border-red-200 text-red-700';
                                        barColor = 'bg-red-500';
                                      }

                                      return (
                                        <tr key={index} className={`transition hover:bg-indigo-500/5 ${darkMode ? "text-gray-200" : "text-slate-800"}`}>
                                          <td className="py-4 px-4 sm:px-6">
                                            <span className="font-bold block text-sm sm:text-base">
                                              {d.discipline}
                                            </span>
                                            <span className={`text-[11px] ${textSecondary}`}>
                                              Peso {weight}x no edital
                                            </span>
                                          </td>

                                          <td className="py-4 px-4 text-center">
                                            <span className="font-black text-sm">
                                              {d.correctCount}
                                            </span>
                                            <span className={`text-xs ${textSecondary}`}>
                                              {" "}/ {d.totalQuestions}
                                            </span>
                                          </td>

                                          <td className="py-4 px-4 text-center">
                                            <span className="font-bold text-red-400 text-sm">
                                              {d.wrongCount}
                                            </span>
                                          </td>

                                          <td className="py-4 px-4 text-center">
                                            <span className="font-black text-emerald-400 text-sm">
                                              {discPointsEarned}
                                            </span>
                                            <span className={`text-xs ${textSecondary}`}>
                                              {" "}/ {discPointsMax} pts
                                            </span>
                                          </td>

                                          <td className="py-4 px-4 sm:px-6 text-right">
                                            <div className="flex flex-col items-end space-y-1.5">
                                              <div className="flex items-center space-x-2">
                                                <span className="font-black text-sm sm:text-base">
                                                  {discAcc.toFixed(0)}%
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                                                  {badgeText}
                                                </span>
                                              </div>
                                              <div className="w-28 sm:w-36 h-2 rounded-full bg-slate-200 dark:bg-[#1a2b4c] overflow-hidden">
                                                <div 
                                                  className={`h-full rounded-full ${barColor}`} 
                                                  style={{ width: `${Math.min(100, Math.max(5, discAcc))}%` }}
                                                />
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>

                          {/* Critical Weaknesses Banner */}
                          {(exam.criticalWeaknesses || []).length > 0 && (
                            <div className={`p-5 rounded-2xl border space-y-4 ${
                              darkMode ? "bg-[#0b1329] border-red-500/20" : "bg-red-50/50 border-red-200"
                            }`}>
                              <div className="flex items-center space-x-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                                <AlertTriangle className="w-4 h-4" />
                                <span>GAPS DE APRENDIZADO & TÓPICOS CRÍTICOS IDENTIFICADOS NESTE SIMULADO</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {exam.criticalWeaknesses.map((w, wIdx) => (
                                  <div key={wIdx} className={`p-3.5 rounded-xl border flex flex-col justify-between ${innerBg}`}>
                                    <div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-blue-400">{w.discipline}</span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-950/40 text-red-400 border border-red-500/30">
                                          {w.missedQuestionsCount} erro{w.missedQuestionsCount > 1 ? 's' : ''}
                                        </span>
                                      </div>
                                      <h4 className={`text-sm font-bold mt-1 ${textPrimary}`}>{w.topic}</h4>
                                      <p className={`text-xs mt-1 leading-relaxed ${textSecondary}`}>{w.suggestedAction}</p>
                                    </div>
                                    {onGenerateStudyTopic && (
                                      <button
                                        type="button"
                                        onClick={() => onGenerateStudyTopic(w.topic, w.discipline)}
                                        className="mt-3 inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer"
                                      >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Gerar Material de Estudo IA</span>
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      )}

                      {/* ======================================================= */}
                      {/* SUBTAB 2: CADERNO DE QUESTÕES CORRIGIDO */}
                      {/* ======================================================= */}
                      {activeSubTab === 'questions' && (
                        <div className="animate-fade-in">
                          <QuestionReview
                            questions={exam.questions || []}
                            disciplines={resultDisciplines}
                            onGenerateStudyTopic={onGenerateStudyTopic || (() => {})}
                            darkMode={darkMode}
                          />
                        </div>
                      )}

                      {/* ======================================================= */}
                      {/* SUBTAB 3: PLANO DE ESTUDOS */}
                      {/* ======================================================= */}
                      {activeSubTab === 'study' && (
                        <div className="animate-fade-in">
                          <StudyPlanner
                            studyPlan={exam.studyPlan || {
                              estimatedStudyHoursNeeded: 10,
                              suggestedSchedule: [],
                              weeklyRevisionFocus: []
                            }}
                            criticalWeaknesses={exam.criticalWeaknesses || []}
                            onUpdateWeaknessStatus={(wIndex, newStatus) => {
                              if (onUpdateWeaknessStatus) {
                                onUpdateWeaknessStatus(exam.id, wIndex, newStatus);
                              }
                            }}
                            activeTopicStudy={activeTopicStudy || null}
                            isLoadingStudyMaterial={isLoadingStudyMaterial || false}
                            onGenerateStudyTopic={onGenerateStudyTopic || (() => {})}
                            onCloseTopicStudy={onCloseTopicStudy || (() => {})}
                            darkMode={darkMode}
                          />
                        </div>
                      )}

                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DETALHAMENTO DO SIMULADO (FULLSCREEN SUPPORTED) */}
      {/* ========================================================================= */}
      <SimuladoDetailModal
        exam={selectedExamForModal}
        isOpen={selectedExamForModal !== null}
        onClose={() => setSelectedExamForModal(null)}
        onDelete={onDeleteExam}
        onUpdateWeaknessStatus={onUpdateWeaknessStatus}
        onGenerateStudyTopic={onGenerateStudyTopic}
        activeTopicStudy={activeTopicStudy}
        isLoadingStudyMaterial={isLoadingStudyMaterial}
        onCloseTopicStudy={onCloseTopicStudy}
        initialTab={initialModalTab}
        targetScore={targetScore}
        darkMode={darkMode}
      />

    </div>
  );
};
