import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight,
  Filter,
  Search,
  HelpCircle
} from 'lucide-react';
import { QuestionAnalysis } from '../../types';

interface QuestionReviewProps {
  questions: QuestionAnalysis[];
  disciplines: string[];
  onGenerateStudyTopic: (topic: string, discipline: string, errorContext?: string) => void;
  darkMode?: boolean;
}

export const QuestionReview: React.FC<QuestionReviewProps> = ({
  questions,
  disciplines,
  onGenerateStudyTopic,
  darkMode = false,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'BLANK' | 'APPEAL'>('ALL');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter questions logic
  const filteredQuestions = questions.filter((q) => {
    // Status Filter
    if (filterStatus === 'CORRECT' && q.status !== 'CORRECT') return false;
    if (filterStatus === 'WRONG' && q.status !== 'WRONG') return false;
    if (filterStatus === 'BLANK' && q.status !== 'BLANK') return false;
    if (filterStatus === 'APPEAL' && !q.canAppeal) return false;

    // Discipline Filter
    if (selectedDiscipline !== 'ALL' && q.discipline !== selectedDiscipline) return false;

    // Search Query (search in topic, explanation, question number, discipline)
    if (searchQuery.trim()) {
      const qNumStr = q.questionNumber.toString();
      const lower = searchQuery.toLowerCase();
      const matchNum = qNumStr === searchQuery.trim();
      const matchTopic = q.topic.toLowerCase().includes(lower);
      const matchExplanation = q.explanation.toLowerCase().includes(lower);
      const matchDiscipline = q.discipline.toLowerCase().includes(lower);
      return matchNum || matchTopic || matchExplanation || matchDiscipline;
    }

    return true;
  });

  const correctCount = questions.filter((q) => q.status === 'CORRECT').length;
  const wrongCount = questions.filter((q) => q.status === 'WRONG').length;
  const blankCount = questions.filter((q) => q.status === 'BLANK').length;
  const appealCount = questions.filter((q) => q.canAppeal).length;

  const cardBg = darkMode ? "bg-[#101d3b] border-[#1e2d4d]" : "bg-white border-slate-200";
  const innerBg = darkMode ? "bg-[#0b1329] border-[#1a2b4c]" : "bg-slate-50 border-slate-200";
  const textPrimary = darkMode ? "text-white" : "text-slate-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-slate-500";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      
      {/* Top Filter and Controls Bar */}
      <div className={`rounded-2xl border p-5 shadow-xs space-y-4 ${cardBg}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className={`text-xl font-bold ${textPrimary}`}>
              Caderno de Questões Corrigido
            </h2>
            <p className={`text-xs mt-0.5 ${textSecondary}`}>
              Revise item a item, confira o gabarito oficial e acesse fundamentação didática para recursos e estudos.
            </p>
          </div>

          {/* Quick Filter Status Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : darkMode ? 'bg-[#15254d] text-gray-300 hover:bg-[#1b2f60]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas ({questions.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('CORRECT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterStatus === 'CORRECT'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : darkMode ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-950/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Acertos ({correctCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('WRONG')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterStatus === 'WRONG'
                  ? 'bg-red-600 text-white shadow-xs'
                  : darkMode ? 'bg-red-950/30 text-red-300 border border-red-500/30 hover:bg-red-950/50' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              Erros ({wrongCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('BLANK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterStatus === 'BLANK'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : darkMode ? 'bg-[#15254d] text-gray-400 hover:bg-[#1b2f60]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Em Branco ({blankCount})
            </button>

            {appealCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterStatus('APPEAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterStatus === 'APPEAL'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : darkMode ? 'bg-amber-950/30 text-amber-300 border border-amber-500/30 hover:bg-amber-950/50' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                Passíveis de Recurso ({appealCount})
              </button>
            )}
          </div>
        </div>

        {/* Search & Discipline Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-[#1e2d4d]">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por tópico ou número..."
              className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border outline-none ${
                darkMode ? "bg-[#0b1329] border-[#1a2b4c] text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600"
              }`}
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              className={`w-full sm:w-auto px-3 py-1.5 text-xs font-semibold rounded-xl border outline-none cursor-pointer ${
                darkMode ? "bg-[#0b1329] border-[#1a2b4c] text-white" : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
            >
              <option value="ALL">Todas as Disciplinas</option>
              {disciplines.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className={`rounded-2xl border p-12 text-center space-y-3 ${cardBg}`}>
            <HelpCircle className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className={`text-sm font-bold ${textPrimary}`}>
              Nenhuma questão encontrada com os filtros selecionados
            </h4>
            <p className={`text-xs ${textSecondary}`}>
              Experimente limpar o campo de busca ou selecionar outro filtro de status.
            </p>
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isCorrect = q.status === 'CORRECT';
            const isWrong = q.status === 'WRONG';
            const isBlank = q.status === 'BLANK';

            return (
              <div
                key={q.questionNumber}
                className={`rounded-2xl border transition-all p-5 shadow-xs space-y-4 ${
                  isCorrect
                    ? darkMode ? 'bg-[#101d3b] border-emerald-500/40 hover:border-emerald-500/60' : 'bg-white border-emerald-200 hover:border-emerald-300'
                    : isWrong
                    ? darkMode ? 'bg-[#101d3b] border-red-500/40 hover:border-red-500/60' : 'bg-white border-red-200 hover:border-red-300'
                    : cardBg
                }`}
              >
                {/* Question Top Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-slate-100 dark:border-[#1e2d4d]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-mono text-xs font-bold flex items-center justify-center shadow-xs">
                      Q{q.questionNumber < 10 ? `0${q.questionNumber}` : q.questionNumber}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                      darkMode ? "bg-indigo-950/40 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 text-indigo-700 border-indigo-100"
                    }`}>
                      {q.discipline}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-md ${
                      darkMode ? "bg-[#15254d] text-gray-300" : "bg-slate-100 text-slate-700"
                    }`}>
                      {q.topic}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                      darkMode ? "border-[#1e2d4d] text-gray-400" : "border-slate-200 text-slate-500"
                    }`}>
                      Nível: {q.difficulty}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isCorrect && (
                      <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Acertou</span>
                      </span>
                    )}
                    {isWrong && (
                      <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30">
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                        <span>Errou</span>
                      </span>
                    )}
                    {isBlank && (
                      <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-gray-400 bg-slate-500/10 px-3 py-1 rounded-full border border-slate-500/30">
                        <MinusCircle className="w-3.5 h-3.5 text-gray-400" />
                        <span>Em Branco</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Candidate Answer vs Official Key Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    isCorrect 
                      ? darkMode ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200' 
                      : isWrong 
                      ? darkMode ? 'bg-red-950/20 border-red-500/30' : 'bg-red-50/50 border-red-200' 
                      : innerBg
                  }`}>
                    <span className={`font-medium ${textSecondary}`}>Sua resposta marcada:</span>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${
                      isCorrect 
                        ? 'bg-emerald-600 text-white' 
                        : isWrong 
                        ? 'bg-red-600 text-white' 
                        : 'bg-slate-400 text-white'
                    }`}>
                      {q.candidateAnswer || '-'}
                    </span>
                  </div>

                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    darkMode ? "bg-emerald-950/20 border-emerald-500/30" : "bg-emerald-50/50 border-emerald-200"
                  }`}>
                    <span className="text-emerald-400 font-medium">Gabarito Oficial da Banca:</span>
                    <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {q.officialAnswer}
                    </span>
                  </div>
                </div>

                {/* AI Pedagogical Explanation */}
                <div className={`rounded-xl p-4 border space-y-2 ${innerBg}`}>
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Comentário Didático do Professor / IA:</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${darkMode ? "text-gray-300" : "text-slate-700"}`}>
                    {q.explanation}
                  </p>
                  {q.editalReference && (
                    <div className="pt-1 text-[11px] text-gray-400 font-medium">
                      Item no Edital: <span className={textPrimary}>{q.editalReference}</span>
                    </div>
                  )}
                </div>

                {/* Appeal Alert if applicable */}
                {q.canAppeal && (
                  <div className={`rounded-xl p-3.5 text-xs space-y-1 border ${
                    darkMode ? "bg-amber-950/30 border-amber-500/40 text-amber-200" : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}>
                    <div className="flex items-center space-x-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>Questão Passível de Recurso Administrativo</span>
                    </div>
                    <p className={`leading-relaxed ${darkMode ? "text-amber-300" : "text-amber-800"}`}>
                      {q.appealReason || 'Vício formal de redação ou divergência com a doutrina majoritária que fundamenta pedido de anulação ou alteração de gabarito.'}
                    </p>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => onGenerateStudyTopic(q.topic, q.discipline, q.explanation)}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/30 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Revisar e Gerar Flashcards deste Tópico</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
