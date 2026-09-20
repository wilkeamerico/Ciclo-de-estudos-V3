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
  FileSpreadsheet
} from 'lucide-react';
import { ExamResult } from '../../types';
import { exportSimuladosToCSV } from '../../utils/csvExport';
import { SimuladoDetailModal } from './SimuladoDetailModal';

interface ExamHistoryProps {
  history: ExamResult[];
  onSelectExam: (exam: ExamResult) => void;
  onDeleteExam: (id: string) => void;
  onStartNew: () => void;
  targetScore?: number;
  darkMode?: boolean;
}

export const ExamHistory: React.FC<ExamHistoryProps> = ({
  history,
  onSelectExam,
  onDeleteExam,
  onStartNew,
  targetScore = 85,
  darkMode = true,
}) => {
  // Modal state for "Ver Detalhes"
  const [selectedExamForModal, setSelectedExamForModal] = useState<ExamResult | null>(null);

  const cardBg = darkMode ? "bg-[#101d3b] border-[#1e2d4d]" : "bg-white border-slate-200";
  const innerBg = darkMode ? "bg-[#0b1329] border-[#1a2b4c]" : "bg-slate-50 border-slate-200";
  const textPrimary = darkMode ? "text-white" : "text-slate-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-slate-500";

  const handleExportAllCSV = () => {
    exportSimuladosToCSV(history, 'Historico_Simulados_Concurso');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      
      {/* Top Header matching Image 2 */}
      <div className={`rounded-2xl border p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cardBg}`}>
        <div>
          <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>
            HISTÓRICO DE SIMULADOS
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${textSecondary}`}>
            Registro de todas as provas realizadas e suas pontuações detalhadas
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
              <span>Exportar (.CSV)</span>
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
        /* TABELA / LISTA DE HISTÓRICO CONFORME IMAGEM DO ANEXO (HISTÓRICO DE SIMULADOS) */
        /* ========================================================================= */
        <div className={`rounded-2xl border shadow-xs overflow-hidden ${cardBg}`}>
          
          {/* Table Column Headers */}
          <div className={`grid grid-cols-12 px-6 py-4 border-b text-[11px] font-black uppercase tracking-wider ${
            darkMode ? "border-[#1e2d4d] bg-[#0c1630] text-gray-400" : "border-slate-200 bg-slate-100 text-slate-600"
          }`}>
            <div className="col-span-5 sm:col-span-5">DATA DO SIMULADO</div>
            <div className="col-span-4 sm:col-span-4">PONTUAÇÃO TIRADA</div>
            <div className="col-span-3 sm:col-span-3 text-right pr-2">DETALHES</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100 dark:divide-[#1e2d4d]">
            {history.map((exam, idx) => {
              const rawTitle = exam.examTitle || `SIMULADO ${String(idx + 1).padStart(2, '0')}`;
              
              // Extract organ from title
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
                  dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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

              return (
                <div 
                  key={exam.id}
                  className={`grid grid-cols-12 items-center px-6 py-5 transition hover:bg-indigo-500/5`}
                >
                  {/* Column 1: DATA DO SIMULADO */}
                  <div className="col-span-5 sm:col-span-5 pr-2">
                    <h3 className="text-sm sm:text-base font-black text-blue-400 tracking-tight">
                      {mainName}
                    </h3>
                    <p className={`text-xs mt-0.5 font-medium truncate ${textSecondary}`}>
                      {displayDateSubtitle}
                    </p>
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
                  <div className="col-span-3 sm:col-span-3 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedExamForModal(exam)}
                      className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        darkMode
                          ? "border-[#233863] bg-[#122044] text-blue-400 hover:bg-[#1a2e60] hover:text-white hover:border-blue-500"
                          : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }`}
                      title="Ver Detalhamento do Simulado"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Ver Detalhes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteExam(exam.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                      title="Excluir Simulado"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DETALHAMENTO DO SIMULADO (CONFORME IMAGEM DO ANEXO) */}
      {/* ========================================================================= */}
      <SimuladoDetailModal
        exam={selectedExamForModal}
        isOpen={selectedExamForModal !== null}
        onClose={() => setSelectedExamForModal(null)}
        onDelete={onDeleteExam}
        onGoToQuestions={(exam) => {
          onSelectExam(exam);
        }}
        targetScore={targetScore}
        darkMode={darkMode}
      />

    </div>
  );
};
