import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Target, 
  Lightbulb, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  BookOpen,
  Sparkles,
  Zap,
  CheckCircle,
  HelpCircle,
  X
} from 'lucide-react';
import { 
  StudyPlan, 
  CriticalWeakness, 
  StudyStatus, 
  TopicStudyMaterial 
} from '../../types';

interface StudyPlannerProps {
  studyPlan: StudyPlan;
  criticalWeaknesses: CriticalWeakness[];
  onUpdateWeaknessStatus: (index: number, newStatus: StudyStatus) => void;
  activeTopicStudy: TopicStudyMaterial | null;
  isLoadingStudyMaterial: boolean;
  onGenerateStudyTopic: (topic: string, discipline: string) => void;
  onCloseTopicStudy: () => void;
  darkMode?: boolean;
}

export const StudyPlanner: React.FC<StudyPlannerProps> = ({
  studyPlan,
  criticalWeaknesses,
  onUpdateWeaknessStatus,
  activeTopicStudy,
  isLoadingStudyMaterial,
  onGenerateStudyTopic,
  onCloseTopicStudy,
  darkMode = false,
}) => {
  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  const cardBg = darkMode ? "bg-[#101d3b] border-[#1e2d4d]" : "bg-white border-slate-200";
  const innerBg = darkMode ? "bg-[#0b1329] border-[#1a2b4c]" : "bg-slate-50 border-slate-200";
  const textPrimary = darkMode ? "text-white" : "text-slate-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-slate-500";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fade-in">
      
      {/* Strategy Top Banner */}
      <div className={`rounded-2xl border p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 ${cardBg}`}>
        <div className="space-y-2 max-w-3xl">
          <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-md border border-indigo-500/30">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Plano de Estudos e Ciclos Pós-Simulado</span>
          </span>
          <h2 className={`text-xl font-bold ${textPrimary}`}>
            Estratégia Personalizada de Alto Rendimento
          </h2>
          <p className={`text-xs leading-relaxed ${darkMode ? "text-gray-300" : "text-slate-600"}`}>
            {studyPlan.overallStrategy}
          </p>
        </div>

        <div className="flex sm:flex-col gap-3 shrink-0">
          <div className={`p-4 rounded-xl border text-center space-y-1 ${innerBg}`}>
            <div className="flex items-center justify-center space-x-1 text-indigo-400 text-xs font-semibold">
              <Clock className="w-4 h-4" />
              <span>Carga Diária Sugerida</span>
            </div>
            <span className={`text-2xl font-black ${textPrimary}`}>
              {studyPlan.recommendedDailyHours ?? 3.5}h / dia
            </span>
          </div>
        </div>
      </div>

      {/* Critical Weaknesses Section */}
      <div className={`rounded-2xl border p-6 shadow-xs space-y-6 ${cardBg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 border-slate-100 dark:border-[#1e2d4d]">
          <div>
            <h3 className={`text-lg font-bold flex items-center space-x-2 ${textPrimary}`}>
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span>Gaps Críticos Identificados no Simulado</span>
            </h3>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Tópicos de maior incidência em que você perdeu pontos e que devem ser sanados no próximo ciclo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {criticalWeaknesses.map((weakness, idx) => {
            const isCritica = weakness.priority === 'CRÍTICA';
            const isAlta = weakness.priority === 'ALTA';
            const status = weakness.status || 'A_REVISAR';

            return (
              <div 
                key={idx} 
                className={`p-4.5 rounded-xl border space-y-3 flex flex-col justify-between ${
                  isCritica 
                    ? darkMode ? 'bg-red-950/20 border-red-500/30' : 'bg-red-50/40 border-red-200' 
                    : isAlta 
                    ? darkMode ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50/40 border-amber-200' 
                    : innerBg
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                      isCritica
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : isAlta
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                    }`}>
                      Prioridade {weakness.priority}
                    </span>
                    <span className={`text-xs ${textSecondary}`}>
                      {weakness.missedCount} {weakness.missedCount === 1 ? 'erro' : 'erros'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-indigo-400 block">
                      {weakness.discipline}
                    </span>
                    <h4 className={`text-sm font-bold mt-0.5 ${textPrimary}`}>
                      {weakness.topic}
                    </h4>
                  </div>

                  <p className={`text-xs leading-relaxed ${darkMode ? "text-gray-300" : "text-slate-600"}`}>
                    {weakness.actionGuide}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-[#1e2d4d] flex items-center justify-between gap-2">
                  {/* Status Toggle */}
                  <select
                    value={status}
                    onChange={(e) => onUpdateWeaknessStatus(idx, e.target.value as StudyStatus)}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${
                      status === 'DOMINADO'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : status === 'EM_ANDAMENTO'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : darkMode ? 'bg-[#15254d] text-gray-300 border-[#233863]' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <option value="A_REVISAR">A Revisar</option>
                    <option value="EM_ANDAMENTO">Em Andamento</option>
                    <option value="DOMINADO">Dominado</option>
                  </select>

                  {/* Open Study Material */}
                  <button
                    type="button"
                    onClick={() => onGenerateStudyTopic(weakness.topic, weakness.discipline)}
                    className="p-1.5 px-2.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Revisar com IA</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4-Week Study Cycles (Cronograma Semanal) */}
      <div className={`rounded-2xl border p-6 shadow-xs space-y-6 ${cardBg}`}>
        <div className="border-b pb-4 border-slate-100 dark:border-[#1e2d4d]">
          <h3 className={`text-lg font-bold flex items-center space-x-2 ${textPrimary}`}>
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>Cronograma Semanal Sugerido (4 Semanas)</span>
          </h3>
          <p className={`text-xs mt-1 ${textSecondary}`}>
            Organização modular e progressiva para consolidação dos pontos fracos e manutenção dos fortes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {studyPlan.weeklyCycles.map((cycle) => (
            <div 
              key={cycle.week} 
              className={`rounded-xl border p-5 space-y-4 ${innerBg}`}
            >
              <div className="flex items-start justify-between border-b pb-3 border-slate-100 dark:border-[#1e2d4d]">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                    Semana 0{cycle.week}
                  </span>
                  <h4 className={`text-base font-bold mt-0.5 ${textPrimary}`}>
                    {cycle.title}
                  </h4>
                </div>
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                  S{cycle.week}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-indigo-400 uppercase">
                  Foco Primário:
                </span>
                <p className={`text-xs font-semibold ${textPrimary}`}>
                  {cycle.primaryFocus}
                </p>
              </div>

              {cycle.disciplinesToReview && cycle.disciplinesToReview.length > 0 && (
                <div className="space-y-1.5">
                  <span className={`text-[11px] font-bold uppercase ${textSecondary}`}>
                    Disciplinas em Pauta:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {cycle.disciplinesToReview.map((disc, dIdx) => (
                      <span 
                        key={dIdx} 
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                          darkMode ? "bg-[#15254d] text-gray-300 border-[#233863]" : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        {disc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <span className={`text-[11px] font-bold uppercase ${textSecondary}`}>
                  Passos de Ação:
                </span>
                <ul className="space-y-1 text-xs">
                  {cycle.actionSteps.map((step, sIdx) => (
                    <li key={sIdx} className="flex items-start space-x-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span className={darkMode ? "text-gray-300" : "text-slate-700"}>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {cycle.milestoneGoal && (
                <div className={`p-2.5 rounded-lg border text-xs flex items-center space-x-2 ${
                  darkMode ? "bg-indigo-950/20 border-indigo-500/30 text-indigo-300" : "bg-indigo-50/70 border-indigo-100 text-indigo-900"
                }`}>
                  <Target className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span><strong>Meta da Semana:</strong> {cycle.milestoneGoal}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Smart Tips Section */}
      <div className={`rounded-2xl border p-6 shadow-xs space-y-4 ${cardBg}`}>
        <div className="border-b pb-3 border-slate-100 dark:border-[#1e2d4d]">
          <h3 className={`text-base font-bold flex items-center space-x-2 ${textPrimary}`}>
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <span>Orientações & Dicas Táticas do Mentor IA</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {studyPlan.smartTips.map((tip, idx) => (
            <div 
              key={idx} 
              className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1 ${innerBg}`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Diretriz #{idx + 1}</span>
              </div>
              <p className={darkMode ? "text-gray-300" : "text-slate-700"}>{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Topic Study / Flashcards & Quiz Modal */}
      {(activeTopicStudy || isLoadingStudyMaterial) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border ${
            darkMode ? "bg-[#101d3b] border-[#1e2d4d]" : "bg-white border-slate-100"
          }`}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#1e2d4d]">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-400">
                  Revisão Acelerada com IA
                </span>
                <h3 className={`text-base font-bold ${textPrimary}`}>
                  {activeTopicStudy ? `${activeTopicStudy.topic} • ${activeTopicStudy.discipline}` : 'Gerando Material Didático...'}
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseTopicStudy}
                className="text-slate-400 hover:text-white text-xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            {isLoadingStudyMaterial ? (
              <div className="p-12 text-center space-y-3 flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center animate-spin">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <h4 className={`text-sm font-bold ${textPrimary}`}>
                  A IA está elaborando flashcards, pegadinhas e mini-treino...
                </h4>
                <p className={`text-xs ${textSecondary}`}>
                  Sintetizando os conceitos mais cobrados pelas bancas examinadoras.
                </p>
              </div>
            ) : activeTopicStudy ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Flash Summary */}
                <div className={`p-4 rounded-xl border space-y-1.5 text-xs ${
                  darkMode ? "bg-indigo-950/20 border-indigo-500/30 text-gray-200" : "bg-indigo-50/70 border-indigo-100 text-slate-800"
                }`}>
                  <h4 className="font-bold text-indigo-400 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Resumo Flash do Assunto</span>
                  </h4>
                  <p className="leading-relaxed">{activeTopicStudy.flashSummary}</p>
                </div>

                {/* Mnemonics if available */}
                {activeTopicStudy.mnemonics && activeTopicStudy.mnemonics.length > 0 && (
                  <div className={`p-4 rounded-xl border space-y-1.5 text-xs ${
                    darkMode ? "bg-emerald-950/20 border-emerald-500/30 text-gray-200" : "bg-emerald-50/70 border-emerald-100 text-slate-800"
                  }`}>
                    <h4 className="font-bold text-emerald-400 flex items-center space-x-1.5">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span>Mnemônicos & Regras de Ouro</span>
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      {activeTopicStudy.mnemonics.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Common Traps */}
                {activeTopicStudy.commonTraps && activeTopicStudy.commonTraps.length > 0 && (
                  <div className={`p-4 rounded-xl border space-y-1.5 text-xs ${
                    darkMode ? "bg-amber-950/20 border-amber-500/30 text-gray-200" : "bg-amber-50/70 border-amber-100 text-slate-800"
                  }`}>
                    <h4 className="font-bold text-amber-400 flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span>Pegadinhas Clássicas das Bancas</span>
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      {activeTopicStudy.commonTraps.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Interactive Flashcard */}
                {activeTopicStudy.flashcards && activeTopicStudy.flashcards.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-bold flex items-center space-x-1.5 text-sm ${textPrimary}`}>
                        <BookOpen className="w-4 h-4 text-indigo-400" />
                        <span>Flashcard Interativo ({activeFlashcardIndex + 1}/{activeTopicStudy.flashcards.length})</span>
                      </h4>
                      <span className={`text-[11px] ${textSecondary}`}>Clique no cartão para virar</span>
                    </div>

                    <div
                      onClick={() => setIsFlipped(!isFlipped)}
                      className={`h-44 w-full rounded-2xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between select-none relative overflow-hidden border-2 ${
                        darkMode ? "bg-[#0b1329] border-indigo-500/30" : "bg-white border-indigo-100"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                        {isFlipped ? 'RESPOSTA COMENTADA' : 'PERGUNTA / DESAFIO'}
                      </span>

                      <div className="flex-1 flex items-center justify-center text-center p-2">
                        <p className={`text-sm font-semibold leading-relaxed ${textPrimary}`}>
                          {isFlipped 
                            ? activeTopicStudy.flashcards[activeFlashcardIndex].back 
                            : activeTopicStudy.flashcards[activeFlashcardIndex].front}
                        </p>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-gray-400 border-t border-slate-100 dark:border-[#1e2d4d] pt-2">
                        <span>Clique para alternar frente / verso</span>
                        <RotateCcw className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Flashcard Navigation */}
                    <div className="flex justify-between items-center pt-1">
                      <button
                        type="button"
                        disabled={activeFlashcardIndex === 0}
                        onClick={() => {
                          setIsFlipped(false);
                          setActiveFlashcardIndex((prev) => Math.max(0, prev - 1));
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40 cursor-pointer ${
                          darkMode ? "border-[#1e2d4d] text-gray-300 hover:bg-[#15254d]" : "border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        &larr; Anterior
                      </button>
                      <button
                        type="button"
                        disabled={activeFlashcardIndex === activeTopicStudy.flashcards.length - 1}
                        onClick={() => {
                          setIsFlipped(false);
                          setActiveFlashcardIndex((prev) => Math.min(activeTopicStudy.flashcards.length - 1, prev + 1));
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40 cursor-pointer ${
                          darkMode ? "border-[#1e2d4d] text-gray-300 hover:bg-[#15254d]" : "border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Próximo &rarr;
                      </button>
                    </div>
                  </div>
                )}

                {/* Practice Questions */}
                {activeTopicStudy.practiceQuestions && activeTopicStudy.practiceQuestions.length > 0 && (
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-[#1e2d4d]">
                    <h4 className={`font-bold flex items-center space-x-1.5 text-sm ${textPrimary}`}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Mini Treino de Fixação (Inéditas)</span>
                    </h4>

                    {activeTopicStudy.practiceQuestions.map((q, qIdx) => {
                      const selectedOpt = quizAnswers[qIdx];
                      const isAnswered = selectedOpt !== undefined;
                      const isCorrect = isAnswered && selectedOpt === q.correctOptionIndex;

                      return (
                        <div key={qIdx} className={`p-4 rounded-xl border space-y-3 ${innerBg}`}>
                          <p className={`font-semibold text-xs ${textPrimary}`}>
                            {qIdx + 1}. {q.statement}
                          </p>

                          <div className="space-y-1.5">
                            {q.options.map((opt, optIdx) => {
                              const isOptSelected = selectedOpt === optIdx;
                              const isThisCorrect = optIdx === q.correctOptionIndex;

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))}
                                  className={`w-full text-left p-2.5 rounded-lg border text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                                    !isAnswered
                                      ? darkMode 
                                        ? "bg-[#101d3b] border-[#1e2d4d] hover:border-indigo-500 text-gray-200" 
                                        : "bg-white border-slate-200 hover:border-indigo-300 text-slate-800"
                                      : isThisCorrect
                                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                                      : isOptSelected
                                      ? "bg-red-500/20 border-red-500 text-red-300"
                                      : darkMode 
                                      ? "bg-[#101d3b] border-[#1e2d4d] opacity-50 text-gray-400" 
                                      : "bg-white border-slate-200 opacity-50 text-slate-500"
                                  }`}
                                >
                                  <span>{opt}</span>
                                  {isAnswered && isThisCorrect && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {isAnswered && (
                            <div className={`p-3 rounded-lg text-xs border ${
                              isCorrect 
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" 
                                : "bg-slate-500/10 text-gray-300 border-slate-500/30"
                            }`}>
                              <strong className="block mb-1">
                                {isCorrect ? '✅ Resposta Correta!' : 'Gabarito Comentado:'}
                              </strong>
                              <p>{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-[#1e2d4d] flex justify-end">
              <button
                type="button"
                onClick={onCloseTopicStudy}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition cursor-pointer"
              >
                Concluir Revisão
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
