import React from 'react';
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
  ArrowRight
} from 'lucide-react';
import { ExamResult } from '../../types';
import { exportSingleExamToCSV } from '../../utils/csvExport';

interface SimuladoDetailModalProps {
  exam: ExamResult | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onGoToQuestions?: (exam: ExamResult) => void;
  targetScore?: number;
  darkMode?: boolean;
}

export const SimuladoDetailModal: React.FC<SimuladoDetailModalProps> = ({
  exam,
  isOpen,
  onClose,
  onDelete,
  onGoToQuestions,
  targetScore = 85,
  darkMode = true,
}) => {
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
    ? new Date(exam.createdAt || exam.date || '').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
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

  const modalBg = darkMode ? "bg-[#0b1329] border-[#1e2d4d]" : "bg-white border-slate-200";
  const cardBg = darkMode ? "bg-[#101d3b] border-[#1e2d4d]" : "bg-slate-50 border-slate-200";
  const textPrimary = darkMode ? "text-white" : "text-slate-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-slate-500";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className={`relative w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${modalBg}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className={`p-6 sm:p-7 border-b relative ${darkMode ? "border-[#1e2d4d] bg-[#0c1630]" : "border-slate-200 bg-slate-50"}`}>
          {/* Top green pill badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
              <Target className="w-3.5 h-3.5" />
              <span>DETALHAMENTO DO SIMULADO</span>
            </div>

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

          {/* Big Exam Title */}
          <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${textPrimary}`}>
            {title}
          </h2>

          {/* Subtitle details */}
          <div className={`mt-2 text-xs sm:text-sm font-medium flex flex-wrap items-center gap-y-1 gap-x-2 ${textSecondary}`}>
            <span><strong className={textPrimary}>Data da Prova:</strong> {dateStr}</span>
            <span>•</span>
            <span><strong className={textPrimary}>Órgão:</strong> {orgao}</span>
            <span>•</span>
            <span><strong className={textPrimary}>Cargo:</strong> {cargo}</span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-7 custom-scrollbar">
          
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

                      // Badge rating status
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

                      // Group classification inference (Conhecimentos Básicos vs Específicos)
                      const isBasica = d.discipline.toLowerCase().includes('portugu') || 
                                       d.discipline.toLowerCase().includes('matem') || 
                                       d.discipline.toLowerCase().includes('racioc') ||
                                       d.discipline.toLowerCase().includes('inform') ||
                                       d.discipline.toLowerCase().includes('ingl');
                      const groupLabel = isBasica ? 'Conhecimentos Básicos' : 'Conhecimentos Específicos';

                      return (
                        <tr key={index} className={`transition hover:bg-indigo-500/5 ${darkMode ? "text-gray-200" : "text-slate-800"}`}>
                          
                          {/* Disciplina */}
                          <td className="py-4 px-4 sm:px-6">
                            <span className="font-bold block text-sm sm:text-base">
                              {d.discipline}
                            </span>
                            <span className={`text-[11px] block mt-0.5 ${textSecondary}`}>
                              {groupLabel} • Peso {weight}
                            </span>
                          </td>

                          {/* Acertos / Total */}
                          <td className="py-4 px-4 text-center">
                            <span className="font-bold text-emerald-400 text-sm sm:text-base">
                              {d.correctCount}
                            </span>
                            <span className={`font-semibold ${textSecondary}`}>
                              {" "}/ {d.totalQuestions} qts
                            </span>
                          </td>

                          {/* Erros */}
                          <td className="py-4 px-4 text-center">
                            <span className="font-bold text-red-400 text-sm sm:text-base">
                              {d.wrongCount}
                            </span>
                          </td>

                          {/* Pontuação */}
                          <td className="py-4 px-4 text-center">
                            <span className="font-black text-sm sm:text-base">
                              {pointsEarned} / {pointsMax}
                            </span>
                            <span className={`text-[11px] block ${textSecondary}`}>
                              pts
                            </span>
                          </td>

                          {/* Aproveitamento & Bar */}
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
                  Sumário Executivo & Diagnóstico Pedagógico da Prova
                </h4>
              </div>
              <p className={`text-xs leading-relaxed ${darkMode ? "text-gray-300" : "text-slate-700"}`}>
                {summary.generalDiagnosis}
              </p>
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

            {onGoToQuestions && (
              <button
                type="button"
                onClick={() => {
                  onGoToQuestions(exam);
                  onClose();
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition cursor-pointer"
              >
                <FileEdit className="w-4 h-4" />
                <span>Editar Notas & Acertos</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-[#233863] text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-[#192b52] transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar (.CSV)</span>
            </button>
          </div>

          {/* Right Action: Fechar */}
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
