import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  FileEdit, 
  Download, 
  Award, 
  Target, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Sparkles,
  BookOpen,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { ExamResult, StudyStatus, TopicStudyMaterial } from '../../types';
import { exportSingleExamToCSV } from '../../utils/csvExport';
import { QuestionReview } from './QuestionReview';
import { StudyPlanner } from './StudyPlanner';

interface SimuladoDetailModalProps {
  exam: ExamResult | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onUpdateWeaknessStatus?: (examId: string, index: number, newStatus: StudyStatus) => void;
  onGenerateStudyTopic?: (topic: string, discipline: string, errorContext?: string) => void;
  activeTopicStudy?: TopicStudyMaterial | null;
  isLoadingStudyMaterial?: boolean;
  onCloseTopicStudy?: () => void;
  initialTab?: 'performance' | 'questions' | 'study';
  targetScore?: number;
  darkMode?: boolean;
}

export const SimuladoDetailModal: React.FC<SimuladoDetailModalProps> = ({
  exam,
  isOpen,
  onClose,
  onDelete,
  onUpdateWeaknessStatus,
  onGenerateStudyTopic,
  activeTopicStudy = null,
  isLoadingStudyMaterial = false,
  onCloseTopicStudy,
  initialTab = 'performance',
  targetScore = 85,
  darkMode = true,
}) => {
  const [activeModalTab, setActiveModalTab] = useState<'performance' | 'questions' | 'study'>(initialTab);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Sync initial tab when opening
  React.useEffect(() => {
    if (isOpen) {
      setActiveModalTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen || !exam) return null;

  const { summary, disciplines = [] } = exam;

  // Extract organ and cargo from title or default
  let orgao = 'Órgão do Concurso';
  let cargo = 'Cargo Analisado';
  const title = exam.examTitle || 'SIMULADO';

  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    orgao = parts[0]?.trim() || orgao;
    cargo = parts.slice(1).join(' - ').trim() || cargo;
  }

  // Format date (e.g. 23/08)
  const dateStr = exam.createdAt || exam.date
    ? new Date(exam.createdAt || exam.date || '').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Hoje';

  // Calculate weighted or raw score
  const totalPointsEarned = disciplines.length > 0
    ? disciplines.reduce((acc, d) => acc + (d.correctCount * (d.weight || 1)), 0)
    : summary.totalCorrect;

  const totalPointsMax = disciplines.length > 0
    ? disciplines.reduce((acc, d) => acc + (d.totalQuestions * (d.weight || 1)), 0)
    : summary.totalQuestions;

  const handleDelete = () => {
    if (window.confirm(`Deseja realmente excluir o simulado "${title}"?`)) {
      if (onDelete) onDelete(exam.id);
      onClose();
    }
  };

  const handleExportCSV = () => {
    exportSingleExamToCSV(exam);
  };

  const resultDisciplines = Array.from(new Set(exam.questions.map((q) => q.discipline))).filter(Boolean);

  const modalBg = darkMode ? "bg-[#0b1329] border-[#1e2d4d]" : "bg-white border-slate-200";
  const cardBg = darkMode ? "bg-[#101d3b] border-[#1e2d4d]" : "bg-slate-50 border-slate-200";
  const textPrimary = darkMode ? "text-white" : "text-slate-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-slate-500";

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto flex items-center justify-center ${isFullScreen ? 'p-0' : 'p-2 sm:p-4 md:p-6'} bg-black/80 backdrop-blur-md animate-fade-in`}>
      <div 
        className={`relative w-full ${isFullScreen ? 'h-full max-w-none rounded-none max-h-screen border-none' : 'max-w-6xl rounded-3xl max-h-[95vh] border'} shadow-2xl overflow-hidden flex flex-col ${modalBg}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className={`p-5 sm:p-6 border-b relative ${darkMode ? "border-[#1e2d4d] bg-[#0c1630]" : "border-slate-200 bg-slate-50"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center space-x-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-950/60 border border-indigo-500/40 text-indigo-400">
                <Target className="w-3.5 h-3.5" />
                <span>DETALHAMENTO DO SIMULADO</span>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                summary.scorePercentage >= 70
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : summary.scorePercentage >= 50
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}>
                {summary.scorePercentage.toFixed(1)}% Aproveitamento
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  darkMode ? "bg-[#101d3b] border-[#1e2d4d] text-gray-300 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
                title="Exportar dados deste simulado para CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  darkMode 
                    ? "bg-[#101d3b] border-[#1e2d4d] text-gray-400 hover:text-white hover:bg-[#192b52]" 
                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
                title={isFullScreen ? "Restaurar tamanho padrão" : "Expandir em tela cheia"}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  darkMode 
                    ? "bg-[#101d3b] border-[#1e2d4d] text-gray-400 hover:text-white hover:bg-[#192b52]" 
                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Big Exam Title */}
          <h2 className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight ${textPrimary}`}>
            {title}
          </h2>

          {/* Subtitle details */}
          <div className={`mt-2 text-xs sm:text-sm font-medium flex flex-wrap items-center gap-y-1 gap-x-2.5 ${textSecondary}`}>
            <span><strong className={textPrimary}>Data da Prova:</strong> {dateStr}</span>
            <span>•</span>
            <span><strong className={textPrimary}>Órgão:</strong> {orgao}</span>
            <span>•</span>
            <span><strong className={textPrimary}>Cargo:</strong> {cargo}</span>
            <span>•</span>
            <span><strong className={textPrimary}>Total:</strong> {summary.totalCorrect}/{summary.totalQuestions} acertos ({totalPointsEarned.toFixed(0)}/{totalPointsMax} pts)</span>
          </div>

          {/* INTERNAL NAVIGATION TABS FOR THIS EXAM */}
          <div className="mt-5 flex items-center space-x-2 border-t pt-3.5 border-slate-200 dark:border-[#1e2d4d] overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveModalTab('performance')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeModalTab === 'performance'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : darkMode
                  ? 'bg-[#101d3b] text-gray-300 hover:text-white hover:bg-[#15254d] border border-[#1e2d4d]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>1. Desempenho & Notas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModalTab('questions')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeModalTab === 'questions'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : darkMode
                  ? 'bg-[#101d3b] text-gray-300 hover:text-white hover:bg-[#15254d] border border-[#1e2d4d]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>2. Caderno Corrigido ({exam.questions?.length || 0} itens)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModalTab('study')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeModalTab === 'study'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : darkMode
                  ? 'bg-[#101d3b] text-gray-300 hover:text-white hover:bg-[#15254d] border border-[#1e2d4d]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>3. Plano de Estudos ({exam.criticalWeaknesses?.length || 0} gaps)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-7 space-y-7 custom-scrollbar">
          
          {/* TAB 1: DESEMPENHO & NOTAS */}
          {activeModalTab === 'performance' && (
            <div className="space-y-6 animate-fade-in">
              {/* 4 Summary Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {/* Card 1: Pontuação Total */}
                <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between ${cardBg}`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${textSecondary}`}>
                    PONTUAÇÃO TOTAL
                  </span>
                  <div className="mt-2 flex items-baseline space-x-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                      {totalPointsEarned.toFixed(1)}
                    </span>
                    <span className={`text-sm sm:text-base font-bold ${textSecondary}`}>
                      / {totalPointsMax} pts
                    </span>
                  </div>
                </div>

                {/* Card 2: Aproveitamento */}
                <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between ${cardBg}`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${textSecondary}`}>
                    APROVEITAMENTO
                  </span>
                  <div className="mt-2">
                    <span className="text-2xl sm:text-3xl font-black text-amber-400">
                      {summary.scorePercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Card 3: Acertos no Edital */}
                <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between ${cardBg}`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${textSecondary}`}>
                    ACERTOS NO EDITAL
                  </span>
                  <div className="mt-2 flex items-baseline space-x-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-blue-400">
                      {summary.totalCorrect}
                    </span>
                    <span className={`text-sm sm:text-base font-bold ${textSecondary}`}>
                      / {summary.totalQuestions} qts
                    </span>
                  </div>
                </div>

                {/* Card 4: Meta Definida */}
                <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between ${cardBg}`}>
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

                <div className={`rounded-2xl border overflow-hidden shadow-xs ${cardBg}`}>
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
                        {disciplines.map((d, index) => {
                          const weight = d.weight || 1;
                          const accuracy = d.accuracyPercentage;
                          const pointsEarned = (d.correctCount * weight).toFixed(0);
                          const pointsMax = (d.totalQuestions * weight).toFixed(0);

                          let badgeText = 'REGULAR';
                          let badgeColor = darkMode 
                            ? 'bg-amber-950/40 border-amber-500/30 text-amber-300' 
                            : 'bg-amber-50 border-amber-200 text-amber-700';
                          let barColor = 'bg-amber-500';

                          if (accuracy >= 75) {
                            badgeText = '★ ÓTIMO';
                            badgeColor = darkMode 
                              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700';
                            barColor = 'bg-emerald-500';
                          } else if (accuracy < 50) {
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
                                <span className={`text-[11px] block mt-0.5 ${textSecondary}`}>
                                  Peso {weight}x • {d.totalQuestions} questões no edital
                                </span>
                              </td>

                              <td className="py-4 px-4 text-center">
                                <span className="font-bold text-emerald-400 text-sm sm:text-base">
                                  {d.correctCount}
                                </span>
                                <span className={`font-semibold ${textSecondary}`}>
                                  {" "}/ {d.totalQuestions} qts
                                </span>
                              </td>

                              <td className="py-4 px-4 text-center">
                                <span className="font-bold text-red-400 text-sm sm:text-base">
                                  {d.wrongCount}
                                </span>
                              </td>

                              <td className="py-4 px-4 text-center">
                                <span className="font-black text-sm sm:text-base">
                                  {pointsEarned} / {pointsMax}
                                </span>
                                <span className={`text-[11px] block ${textSecondary}`}>
                                  pts
                                </span>
                              </td>

                              <td className="py-4 px-4 sm:px-6 text-right">
                                <div className="flex flex-col items-end space-y-1.5">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-black text-sm sm:text-base">
                                      {accuracy.toFixed(0)}%
                                    </span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${badgeColor}`}>
                                      {badgeText}
                                    </span>
                                  </div>
                                  <div className="w-28 sm:w-36 h-2 rounded-full bg-slate-200 dark:bg-[#1a2b4c] overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                                      style={{ width: `${Math.min(100, Math.max(5, accuracy))}%` }}
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

              {/* Sumário Executivo & Diagnóstico Pedagógico do Simulado */}
              {summary.generalDiagnosis && (
                <div className={`rounded-2xl p-5 border shadow-xs space-y-3 ${
                  darkMode ? "bg-[#101d3b] border-indigo-500/30" : "bg-indigo-50/70 border-indigo-200"
                }`}>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <h4 className={`text-xs font-black uppercase tracking-wider ${darkMode ? "text-indigo-300" : "text-indigo-950"}`}>
                      Diagnóstico Pedagógico do Simulado
                    </h4>
                  </div>
                  <p className={`text-xs leading-relaxed ${darkMode ? "text-gray-300" : "text-slate-700"}`}>
                    {summary.generalDiagnosis}
                  </p>
                </div>
              )}

              {/* Action shortcuts */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('questions')}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Acessar Caderno de Questões Corrigido</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('study')}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Ver Plano de Estudos Desta Prova</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CADERNO CORRIGIDO */}
          {activeModalTab === 'questions' && (
            <div className="space-y-4 animate-fade-in">
              <QuestionReview
                questions={exam.questions || []}
                disciplines={resultDisciplines}
                onGenerateStudyTopic={(topic, disc, errCtx) => {
                  if (onGenerateStudyTopic) {
                    onGenerateStudyTopic(topic, disc, errCtx);
                    setActiveModalTab('study');
                  }
                }}
                darkMode={darkMode}
              />
            </div>
          )}

          {/* TAB 3: PLANO DE ESTUDOS */}
          {activeModalTab === 'study' && (
            <div className="space-y-4 animate-fade-in">
              <StudyPlanner
                studyPlan={exam.studyPlan || { overallStrategy: "Plano focado em revisão dos tópicos errados.", weeklyCycles: [], smartTips: [] }}
                criticalWeaknesses={exam.criticalWeaknesses || []}
                onUpdateWeaknessStatus={(index, newStatus) => {
                  if (onUpdateWeaknessStatus) {
                    onUpdateWeaknessStatus(exam.id, index, newStatus);
                  }
                }}
                activeTopicStudy={activeTopicStudy}
                isLoadingStudyMaterial={isLoadingStudyMaterial}
                onGenerateStudyTopic={onGenerateStudyTopic ? (t, d) => onGenerateStudyTopic(t, d) : () => {}}
                onCloseTopicStudy={onCloseTopicStudy || (() => {})}
                darkMode={darkMode}
              />
            </div>
          )}

        </div>

        {/* Footer Action Buttons */}
        <div className={`p-4 sm:p-5 border-t flex flex-wrap items-center justify-between gap-3 ${
          darkMode ? "border-[#1e2d4d] bg-[#0c1630]" : "border-slate-200 bg-slate-50"
        }`}>
          {/* Left Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-red-500/40 text-red-400 hover:bg-red-500/10 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Simulado</span>
              </button>
            )}
          </div>

          {/* Right Action: Fechar */}
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            Concluir & Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

