import React, { useState, useMemo } from 'react';
import { 
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  BookOpen,
  LineChart as LineChartIcon,
  AlertTriangle,
  Flame,
  Target,
  FileSpreadsheet,
  Plus,
  Eye,
  CheckCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Trash2,
  Brain,
  HelpCircle,
  RotateCcw,
  Zap,
  Check
} from 'lucide-react';
import { ExamResult, Edital, StudyStatus, TopicStudyMaterial } from '../../types';
import { exportSimuladosToCSV } from '../../utils/csvExport';
import { SimuladoDetailModal } from './SimuladoDetailModal';
import { QuestionReview } from './QuestionReview';
import { StudyPlanner } from './StudyPlanner';

interface SimuladoDashboardViewProps {
  history: ExamResult[];
  edital?: Edital;
  targetScore?: number;
  onOpenUploadModal: () => void;
  onDeleteExam: (id: string) => void;
  onUpdateWeaknessStatus?: (examId: string, index: number, newStatus: StudyStatus) => void;
  onGenerateStudyTopic?: (topic: string, discipline: string, errorContext?: string) => void;
  activeTopicStudy?: TopicStudyMaterial | null;
  isLoadingStudyMaterial?: boolean;
  onCloseTopicStudy?: () => void;
  darkMode?: boolean;
}

export const SimuladoDashboardView: React.FC<SimuladoDashboardViewProps> = ({
  history = [],
  edital,
  targetScore = 85,
  onOpenUploadModal,
  onDeleteExam,
  onUpdateWeaknessStatus,
  onGenerateStudyTopic,
  activeTopicStudy,
  isLoadingStudyMaterial = false,
  onCloseTopicStudy,
  darkMode = true,
}) => {
  // Chart visual modes
  const [chartMode, setChartMode] = useState<'area' | 'line'>('area');
  const [showAccumulatedAvg, setShowAccumulatedAvg] = useState<boolean>(true);
  const [showTargetReference, setShowTargetReference] = useState<boolean>(true);

  // Accordion state for expanded exams
  const [expandedExamIds, setExpandedExamIds] = useState<Set<string>>(new Set());
  const [expandedTabs, setExpandedTabs] = useState<Record<string, 'performance' | 'questions' | 'study'>>({});

  // Fullscreen modal state
  const [selectedExamForModal, setSelectedExamForModal] = useState<ExamResult | null>(null);
  const [initialModalTab, setInitialModalTab] = useState<'performance' | 'questions' | 'study'>('performance');

  // Flashcards state for active study topic modal
  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  // Theme constants
  const cardBg = darkMode ? "bg-[#101d3b] border-[#1e2d4d]" : "bg-white border-slate-200";
  const innerCardBg = darkMode ? "bg-[#0b1329] border-[#1a2b4c]" : "bg-slate-50 border-slate-200";
  const textPrimary = darkMode ? "text-white" : "text-slate-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-slate-500";

  // Sort exams chronologically (oldest to newest for evolution graph)
  const sortedExams = useMemo(() => {
    const list = [...history];
    list.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || '').getTime() || 0;
      const dateB = new Date(b.createdAt || b.date || '').getTime() || 0;
      return dateA - dateB;
    });
    return list;
  }, [history]);

  // Reverse sort (newest first for list/history display)
  const reverseExams = useMemo(() => {
    return [...sortedExams].reverse();
  }, [sortedExams]);

  // --------------------------------------------------------------------------
  // 1. CÁLCULO DAS MÉTRICAS GLOBAIS ACUMULADAS (KPIS)
  // --------------------------------------------------------------------------
  const totalSimulados = sortedExams.length;
  const totalQuestoesAcumulado = sortedExams.reduce((acc, exam) => acc + (exam.summary.totalQuestions || 0), 0);
  const totalAcertosAcumulado = sortedExams.reduce((acc, exam) => acc + (exam.summary.totalCorrect || 0), 0);
  const totalErrosAcumulado = sortedExams.reduce((acc, exam) => acc + (exam.summary.totalWrong || 0), 0);
  const totalBrancosAcumulado = sortedExams.reduce((acc, exam) => acc + (exam.summary.totalBlank || 0), 0);

  // Média Geral Ponderada / Acumulada
  const mediaGeralAcumulada = totalQuestoesAcumulado > 0 
    ? (totalAcertosAcumulado / totalQuestoesAcumulado) * 100 
    : 0;

  const melhorSimuladoScore = sortedExams.length > 0 
    ? Math.max(...sortedExams.map((e) => e.summary.scorePercentage || 0)) 
    : 0;

  const primeiroSimuladoScore = sortedExams.length > 0 
    ? sortedExams[0].summary.scorePercentage || 0 
    : 0;

  const ultimoSimulado = sortedExams.length > 0 
    ? sortedExams[sortedExams.length - 1] 
    : null;

  const ultimoSimuladoScore = ultimoSimulado ? (ultimoSimulado.summary.scorePercentage || 0) : 0;
  const evolucaoTotal = ultimoSimuladoScore - primeiroSimuladoScore;

  // --------------------------------------------------------------------------
  // 2. DATASET PARA O GRÁFICO DE LINHA / EVOLUÇÃO TEMPORAL (RECHARTS)
  // --------------------------------------------------------------------------
  let runningCorrect = 0;
  let runningQuestions = 0;

  const evolutionChartData = sortedExams.map((exam, index) => {
    runningCorrect += exam.summary.totalCorrect || 0;
    runningQuestions += exam.summary.totalQuestions || 0;
    const currentAccumulatedAvg = runningQuestions > 0 ? (runningCorrect / runningQuestions) * 100 : 0;

    let dateLabel = `S${index + 1}`;
    let fullDateStr = `Simulado #${index + 1}`;
    if (exam.createdAt || exam.date) {
      try {
        const d = new Date(exam.createdAt || exam.date || '');
        dateLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        fullDateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch {
        dateLabel = `S${index + 1}`;
      }
    }

    const previousExam = index > 0 ? sortedExams[index - 1] : null;
    const deltaFromPrevious = previousExam 
      ? Number(((exam.summary.scorePercentage || 0) - (previousExam.summary.scorePercentage || 0)).toFixed(1))
      : 0;

    return {
      index: index + 1,
      name: `Simulado ${index + 1}`,
      shortName: `S${index + 1}`,
      date: dateLabel,
      fullDate: fullDateStr,
      score: Number((exam.summary.scorePercentage || 0).toFixed(1)),
      accumulatedAvg: Number(currentAccumulatedAvg.toFixed(1)),
      meta: targetScore,
      deltaFromPrevious,
      title: exam.examTitle || `Simulado ${index + 1}`,
      correct: exam.summary.totalCorrect || 0,
      wrong: exam.summary.totalWrong || 0,
      blank: exam.summary.totalBlank || 0,
      total: exam.summary.totalQuestions || 0,
      performanceTier: exam.summary.performanceTier || "Avaliado",
      rawExam: exam,
    };
  });

  // --------------------------------------------------------------------------
  // 3. SUGESTÕES DE REVISÃO BASEADAS NA MENOR TAXA DE ACERTOS (CRÍTICAS)
  // --------------------------------------------------------------------------
  const revisionSuggestions = useMemo(() => {
    // Aggregation maps
    const topicStatsMap = new Map<string, {
      topic: string;
      discipline: string;
      totalMissed: number;
      totalSeen: number;
      correct: number;
      actionGuide: string;
      latestExamId: string;
    }>();

    // Loop through all exams and questions
    sortedExams.forEach((exam) => {
      // 1. From questions
      (exam.questions || []).forEach((q) => {
        const key = `${q.discipline || 'Geral'}:::${q.topic || 'Conhecimentos Gerais'}`;
        const existing = topicStatsMap.get(key) || {
          topic: q.topic || 'Conhecimentos Gerais',
          discipline: q.discipline || 'Geral',
          totalMissed: 0,
          totalSeen: 0,
          correct: 0,
          actionGuide: q.explanation || 'Revisar conceitos fundamentais e questões da banca.',
          latestExamId: exam.id,
        };

        existing.totalSeen += 1;
        if (q.status === 'WRONG') {
          existing.totalMissed += 1;
        } else if (q.status === 'CORRECT') {
          existing.correct += 1;
        }
        topicStatsMap.set(key, existing);
      });

      // 2. From critical weaknesses
      (exam.criticalWeaknesses || []).forEach((w) => {
        const key = `${w.discipline || 'Geral'}:::${w.topic || 'Conhecimentos Gerais'}`;
        const existing = topicStatsMap.get(key) || {
          topic: w.topic,
          discipline: w.discipline,
          totalMissed: w.missedCount || 1,
          totalSeen: (w.missedCount || 1) + 1,
          correct: 0,
          actionGuide: w.actionGuide || 'Revisar teoria e exercícios deste tópico.',
          latestExamId: exam.id,
        };
        existing.actionGuide = w.actionGuide || existing.actionGuide;
        topicStatsMap.set(key, existing);
      });
    });

    const suggestions = Array.from(topicStatsMap.values()).map((item) => {
      const accuracy = item.totalSeen > 0 ? (item.correct / item.totalSeen) * 100 : 0;
      let priority: 'CRÍTICA' | 'ALTA' | 'MÉDIA' = 'MÉDIA';
      if (accuracy < 50 || item.totalMissed >= 3) {
        priority = 'CRÍTICA';
      } else if (accuracy < 70 || item.totalMissed >= 2) {
        priority = 'ALTA';
      }

      return {
        ...item,
        accuracy: Number(accuracy.toFixed(1)),
        priority,
      };
    });

    // Sort by lowest accuracy first, then highest missed count
    suggestions.sort((a, b) => {
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.totalMissed - a.totalMissed;
    });

    return suggestions;
  }, [sortedExams]);

  // Accordion handlers
  const toggleExpand = (examId: string) => {
    setExpandedExamIds((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) {
        next.delete(examId);
      } else {
        next.add(examId);
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
    exportSimuladosToCSV(history, 'Historico_Completo_Simulados_Concurso');
  };

  const handleOpenModal = (exam: ExamResult, tab: 'performance' | 'questions' | 'study' = 'performance') => {
    setSelectedExamForModal(exam);
    setInitialModalTab(tab);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fade-in">
      
      {/* ========================================================================= */}
      {/* 1. TOP HERO & BOTÕES DE AÇÃO PRINCIPAIS */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border p-6 sm:p-7 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${cardBg}`}>
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Brain className="w-3.5 h-3.5 text-blue-400" />
              <span>Painel Analítico de Simulados</span>
            </span>
            {edital?.orgao && (
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${
                darkMode ? "bg-[#0b1329] border-[#1e2d4d] text-gray-300" : "bg-slate-100 border-slate-200 text-slate-700"
              }`}>
                {edital.orgao} • {edital.cargo || 'Concurso'}
              </span>
            )}
          </div>
          
          <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>
            DASHBOARD GERAL DE SIMULADOS & CRUZAMENTO COM O EDITAL
          </h2>
          
          <p className={`text-xs sm:text-sm ${textSecondary}`}>
            Análise do caderno de provas, gabarito oficial e suas respostas, cruzando os dados com as disciplinas e critérios de corte do edital.
          </p>
        </div>

        {/* Botoes de Ação */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleExportAllCSV}
              className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                darkMode 
                  ? "bg-[#15254d] border-[#233863] text-gray-200 hover:bg-[#1b2f60] hover:text-white" 
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              }`}
              title="Exportar dados consolidados em planilha CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar (.CSV)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenUploadModal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2 cursor-pointer transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Anexar Prova / Novo Simulado</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CARDS DE MÉTRICAS GLOBAIS ACUMULADAS (KPIS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Média Geral Acumulada */}
        <div className={`p-5 rounded-2xl border shadow-xs relative overflow-hidden flex flex-col justify-between ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
              Média Geral Acumulada
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              mediaGeralAcumulada >= targetScore ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
            }`}>
              <Award className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-black ${
                mediaGeralAcumulada >= targetScore ? "text-emerald-400" : "text-blue-400"
              }`}>
                {mediaGeralAcumulada.toFixed(1)}%
              </span>
              <span className={`text-xs font-semibold ${textSecondary}`}>
                Meta: {targetScore}%
              </span>
            </div>

            {/* Barra de progresso vs meta */}
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  mediaGeralAcumulada >= targetScore ? "bg-emerald-500" : "bg-blue-500"
                }`}
                style={{ width: `${Math.min(100, mediaGeralAcumulada)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className={textSecondary}>Total de Questões:</span>
            <span className={`font-bold ${textPrimary}`}>{totalQuestoesAcumulado} questões</span>
          </div>
        </div>

        {/* Card 2: Balanço de Acertos & Erros */}
        <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
              Balanço de Respostas
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 my-2 text-center">
            <div className={`p-2 rounded-xl border ${innerCardBg}`}>
              <span className="text-[10px] block font-bold text-emerald-400">ACERTOS</span>
              <span className={`text-lg font-black ${textPrimary}`}>{totalAcertosAcumulado}</span>
            </div>
            <div className={`p-2 rounded-xl border ${innerCardBg}`}>
              <span className="text-[10px] block font-bold text-red-400">ERROS</span>
              <span className={`text-lg font-black ${textPrimary}`}>{totalErrosAcumulado}</span>
            </div>
            <div className={`p-2 rounded-xl border ${innerCardBg}`}>
              <span className="text-[10px] block font-bold text-amber-400">BRANCO</span>
              <span className={`text-lg font-black ${textPrimary}`}>{totalBrancosAcumulado}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className={textSecondary}>Taxa de Acerto Real:</span>
            <span className="font-bold text-emerald-400">
              {totalQuestoesAcumulado > 0 ? ((totalAcertosAcumulado / totalQuestoesAcumulado) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>

        {/* Card 3: Total de Simulados & Recorde */}
        <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
              Simulados Realizados
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-black ${textPrimary}`}>
                {totalSimulados}
              </span>
              <span className={`text-xs font-medium ${textSecondary}`}>
                provas concluídas
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-2 text-xs">
              <span className={textSecondary}>Melhor Simulado:</span>
              <span className="font-bold text-purple-400">{melhorSimuladoScore.toFixed(1)}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className={textSecondary}>Último Simulado:</span>
            <span className={`font-bold ${ultimoSimuladoScore >= targetScore ? "text-emerald-400" : "text-blue-400"}`}>
              {ultimoSimuladoScore.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 4: Evolução Geral (1º ao Atual) */}
        <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
              Tendência de Evolução
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              evolucaoTotal >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="flex items-baseline space-x-1.5">
              <span className={`text-3xl font-black ${
                evolucaoTotal >= 0 ? "text-emerald-400" : "text-red-400"
              }`}>
                {evolucaoTotal >= 0 ? `+${evolucaoTotal.toFixed(1)}%` : `${evolucaoTotal.toFixed(1)}%`}
              </span>
              <span className={`text-xs font-semibold ${evolucaoTotal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {evolucaoTotal >= 0 ? "avanço" : "oscilação"}
              </span>
            </div>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Comparativo do 1º ({primeiroSimuladoScore.toFixed(1)}%) ao último ({ultimoSimuladoScore.toFixed(1)}%)
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className={textSecondary}>Status do Aluno:</span>
            <span className={`font-bold ${mediaGeralAcumulada >= targetScore ? "text-emerald-400" : "text-amber-400"}`}>
              {mediaGeralAcumulada >= targetScore ? "Competitivo p/ Aprovação" : "Necessita Ajustes"}
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. GRÁFICO DE LINHA INTERATIVO (RECHARTS) - EVOLUÇÃO TEMPORAL */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border p-6 sm:p-7 shadow-xs space-y-5 ${cardBg}`}>
        {/* Header do Gráfico */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-[#1e2d4d]">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <LineChartIcon className="w-4.5 h-4.5" />
              </div>
              <h3 className={`text-base sm:text-lg font-black tracking-tight ${textPrimary}`}>
                CURVA DE EVOLUÇÃO DO APROVEITAMENTO (%) - SIMULADOS
              </h3>
            </div>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Acompanhamento cronológico do desempenho com média geral acumulada e linha de meta do edital
            </p>
          </div>

          {/* Controles de Visualização */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Toggle Tipo */}
            <div className={`p-1 rounded-xl border flex items-center space-x-1 text-xs ${
              darkMode ? "bg-[#0b1329] border-[#1e2d4d]" : "bg-slate-100 border-slate-200"
            }`}>
              <button
                type="button"
                onClick={() => setChartMode('area')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                  chartMode === 'area'
                    ? "bg-blue-600 text-white shadow-xs"
                    : darkMode ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Curva de Área
              </button>
              <button
                type="button"
                onClick={() => setChartMode('line')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                  chartMode === 'line'
                    ? "bg-blue-600 text-white shadow-xs"
                    : darkMode ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Linhas Analíticas
              </button>
            </div>

            {/* Toggle Média */}
            <button
              type="button"
              onClick={() => setShowAccumulatedAvg(!showAccumulatedAvg)}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center space-x-1.5 transition cursor-pointer ${
                showAccumulatedAvg
                  ? darkMode ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" : "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : darkMode ? "bg-slate-900/50 border-slate-800 text-gray-500 opacity-60" : "bg-slate-100 border-slate-200 text-slate-400"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              <span>Média ({mediaGeralAcumulada.toFixed(1)}%)</span>
            </button>

            {/* Toggle Meta */}
            <button
              type="button"
              onClick={() => setShowTargetReference(!showTargetReference)}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center space-x-1.5 transition cursor-pointer ${
                showTargetReference
                  ? darkMode ? "bg-amber-950/40 border-amber-500/40 text-amber-300" : "bg-amber-50 border-amber-300 text-amber-800"
                  : darkMode ? "bg-slate-900/50 border-slate-800 text-gray-500 opacity-60" : "bg-slate-100 border-slate-200 text-slate-400"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span>Meta ({targetScore}%)</span>
            </button>
          </div>
        </div>

        {/* Canvas do Gráfico Recharts */}
        {totalSimulados === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
            <BookOpen className="w-8 h-8 text-gray-400" />
            <p className={`text-xs max-w-sm ${textSecondary}`}>
              Nenhum simulado cadastrado ainda. Clique em "+ Anexar Prova / Novo Simulado" para visualizar o gráfico de evolução.
            </p>
          </div>
        ) : (
          <div className="h-72 sm:h-84 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'area' ? (
                <AreaChart data={evolutionChartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="simuladoScoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={darkMode ? "#1e2d4d" : "#e2e8f0"} 
                    vertical={false} 
                  />
                  <XAxis 
                    dataKey="date" 
                    stroke={darkMode ? "#64748b" : "#94a3b8"} 
                    tick={{ fontSize: 11, fill: darkMode ? "#94a3b8" : "#64748b", fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: darkMode ? "#1e2d4d" : "#e2e8f0" }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    ticks={[0, 20, 40, 60, 80, 100]} 
                    unit="%"
                    stroke={darkMode ? "#64748b" : "#94a3b8"} 
                    tick={{ fontSize: 11, fill: darkMode ? "#94a3b8" : "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: darkMode ? "#1e2d4d" : "#e2e8f0" }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const isAboveMeta = data.score >= targetScore;
                        return (
                          <div className={`p-4 rounded-2xl border shadow-2xl text-xs space-y-3 min-w-[240px] max-w-xs transition-all ${
                            darkMode ? "bg-[#0b1329]/95 border-[#20335e] text-white backdrop-blur-md" : "bg-white/95 border-slate-200 text-slate-900 backdrop-blur-md"
                          }`}>
                            <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                              <div>
                                <div className="font-black text-blue-400 text-xs sm:text-sm line-clamp-1">{data.title}</div>
                                <div className="text-[10px] text-gray-400 font-medium">Data: {data.fullDate || data.date}</div>
                              </div>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border shrink-0 ${
                                isAboveMeta 
                                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40" 
                                  : "bg-amber-950/60 text-amber-300 border-amber-500/40"
                              }`}>
                                {data.score}%
                              </span>
                            </div>

                            {/* Resumo da Pontuação da Prova (Erros, Acertos e Total) */}
                            <div className="space-y-1.5 pt-0.5">
                              <div className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500">
                                Resumo da Pontuação
                              </div>
                              <div className="grid grid-cols-3 gap-1.5 text-center">
                                <div className={`p-1.5 rounded-lg border ${
                                  darkMode ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                                }`}>
                                  <div className="text-[9px] uppercase font-bold">Acertos</div>
                                  <div className="text-xs font-black">{data.correct}</div>
                                </div>
                                <div className={`p-1.5 rounded-lg border ${
                                  darkMode ? "bg-red-950/40 border-red-500/40 text-red-300" : "bg-red-50 border-red-200 text-red-800"
                                }`}>
                                  <div className="text-[9px] uppercase font-bold">Erros</div>
                                  <div className="text-xs font-black">{data.wrong}</div>
                                </div>
                                <div className={`p-1.5 rounded-lg border ${
                                  darkMode ? "bg-indigo-950/40 border-indigo-500/40 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-800"
                                }`}>
                                  <div className="text-[9px] uppercase font-bold">Total</div>
                                  <div className="text-xs font-black">{data.total}</div>
                                </div>
                              </div>
                              {data.blank > 0 && (
                                <div className="flex justify-between text-[11px] text-gray-400 pt-0.5">
                                  <span>Em branco / nulas:</span>
                                  <span className="font-semibold">{data.blank} questões</span>
                                </div>
                              )}
                            </div>

                            {/* Metas e Evolução */}
                            <div className="border-t border-slate-200 dark:border-slate-800 pt-2 space-y-1 text-[11px]">
                              {data.index > 1 && (
                                <div className="flex justify-between">
                                  <span className={textSecondary}>Variação vs. Anterior:</span>
                                  <span className={`font-bold ${data.deltaFromPrevious >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {data.deltaFromPrevious >= 0 ? `+${data.deltaFromPrevious}%` : `${data.deltaFromPrevious}%`}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className={textSecondary}>Média Acumulada:</span>
                                <span className="font-bold text-emerald-400">{data.accumulatedAvg}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className={textSecondary}>Meta do Concurso:</span>
                                <span className="font-bold text-amber-400">{data.meta}%</span>
                              </div>
                            </div>

                            <div className="text-[9px] text-center text-indigo-400/90 font-medium pt-1 border-t border-dashed border-slate-700/50">
                              💡 Clique no ponto para ver a prova completa
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {showTargetReference && (
                    <ReferenceLine 
                      y={targetScore} 
                      stroke="#f59e0b" 
                      strokeDasharray="4 4" 
                      strokeWidth={1.5} 
                    />
                  )}
                  {showAccumulatedAvg && (
                    <ReferenceLine 
                      y={Number(mediaGeralAcumulada.toFixed(1))} 
                      stroke="#10b981" 
                      strokeDasharray="3 3" 
                      strokeWidth={1.5} 
                    />
                  )}
                  {showAccumulatedAvg && (
                    <Line 
                      type="monotone" 
                      dataKey="accumulatedAvg" 
                      name="Média Acumulada (%)"
                      stroke="#10b981" 
                      strokeWidth={2} 
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  )}
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    name="Aproveitamento (%)"
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    fill="url(#simuladoScoreGradient)"
                    dot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: darkMode ? "#0b1329" : "#ffffff" }}
                    activeDot={{ 
                      r: 7, 
                      fill: "#60a5fa", 
                      stroke: "#1d4ed8", 
                      strokeWidth: 2,
                      onClick: (_e, payload: any) => {
                        if (payload?.payload?.rawExam) {
                          handleOpenModal(payload.payload.rawExam, 'performance');
                        }
                      }
                    }}
                  />
                </AreaChart>
              ) : (
                <LineChart data={evolutionChartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={darkMode ? "#1e2d4d" : "#e2e8f0"} 
                    vertical={false} 
                  />
                  <XAxis 
                    dataKey="date" 
                    stroke={darkMode ? "#64748b" : "#94a3b8"} 
                    tick={{ fontSize: 11, fill: darkMode ? "#94a3b8" : "#64748b", fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: darkMode ? "#1e2d4d" : "#e2e8f0" }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    ticks={[0, 20, 40, 60, 80, 100]} 
                    unit="%"
                    stroke={darkMode ? "#64748b" : "#94a3b8"} 
                    tick={{ fontSize: 11, fill: darkMode ? "#94a3b8" : "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: darkMode ? "#1e2d4d" : "#e2e8f0" }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const isAboveMeta = data.score >= targetScore;
                        return (
                          <div className={`p-4 rounded-2xl border shadow-2xl text-xs space-y-3 min-w-[240px] max-w-xs transition-all ${
                            darkMode ? "bg-[#0b1329]/95 border-[#20335e] text-white backdrop-blur-md" : "bg-white/95 border-slate-200 text-slate-900 backdrop-blur-md"
                          }`}>
                            <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                              <div>
                                <div className="font-black text-blue-400 text-xs sm:text-sm line-clamp-1">{data.title}</div>
                                <div className="text-[10px] text-gray-400 font-medium">Data: {data.fullDate || data.date}</div>
                              </div>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border shrink-0 ${
                                isAboveMeta 
                                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40" 
                                  : "bg-amber-950/60 text-amber-300 border-amber-500/40"
                              }`}>
                                {data.score}%
                              </span>
                            </div>

                            {/* Resumo da Pontuação da Prova (Erros, Acertos e Total) */}
                            <div className="space-y-1.5 pt-0.5">
                              <div className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500">
                                Resumo da Pontuação
                              </div>
                              <div className="grid grid-cols-3 gap-1.5 text-center">
                                <div className={`p-1.5 rounded-lg border ${
                                  darkMode ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                                }`}>
                                  <div className="text-[9px] uppercase font-bold">Acertos</div>
                                  <div className="text-xs font-black">{data.correct}</div>
                                </div>
                                <div className={`p-1.5 rounded-lg border ${
                                  darkMode ? "bg-red-950/40 border-red-500/40 text-red-300" : "bg-red-50 border-red-200 text-red-800"
                                }`}>
                                  <div className="text-[9px] uppercase font-bold">Erros</div>
                                  <div className="text-xs font-black">{data.wrong}</div>
                                </div>
                                <div className={`p-1.5 rounded-lg border ${
                                  darkMode ? "bg-indigo-950/40 border-indigo-500/40 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-800"
                                }`}>
                                  <div className="text-[9px] uppercase font-bold">Total</div>
                                  <div className="text-xs font-black">{data.total}</div>
                                </div>
                              </div>
                              {data.blank > 0 && (
                                <div className="flex justify-between text-[11px] text-gray-400 pt-0.5">
                                  <span>Em branco / nulas:</span>
                                  <span className="font-semibold">{data.blank} questões</span>
                                </div>
                              )}
                            </div>

                            {/* Metas e Evolução */}
                            <div className="border-t border-slate-200 dark:border-slate-800 pt-2 space-y-1 text-[11px]">
                              {data.index > 1 && (
                                <div className="flex justify-between">
                                  <span className={textSecondary}>Variação vs. Anterior:</span>
                                  <span className={`font-bold ${data.deltaFromPrevious >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {data.deltaFromPrevious >= 0 ? `+${data.deltaFromPrevious}%` : `${data.deltaFromPrevious}%`}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className={textSecondary}>Média Acumulada:</span>
                                <span className="font-bold text-emerald-400">{data.accumulatedAvg}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className={textSecondary}>Meta do Concurso:</span>
                                <span className="font-bold text-amber-400">{data.meta}%</span>
                              </div>
                            </div>

                            <div className="text-[9px] text-center text-indigo-400/90 font-medium pt-1 border-t border-dashed border-slate-700/50">
                              💡 Clique no ponto para ver a prova completa
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {showTargetReference && (
                    <ReferenceLine 
                      y={targetScore} 
                      stroke="#f59e0b" 
                      strokeDasharray="4 4" 
                      strokeWidth={1.5} 
                    />
                  )}
                  {showAccumulatedAvg && (
                    <ReferenceLine 
                      y={Number(mediaGeralAcumulada.toFixed(1))} 
                      stroke="#10b981" 
                      strokeDasharray="3 3" 
                      strokeWidth={1.5} 
                    />
                  )}
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    name="Aproveitamento (%)"
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: darkMode ? "#0b1329" : "#ffffff" }}
                    activeDot={{ 
                      r: 7, 
                      fill: "#60a5fa",
                      onClick: (_e, payload: any) => {
                        if (payload?.payload?.rawExam) {
                          handleOpenModal(payload.payload.rawExam, 'performance');
                        }
                      }
                    }}
                  />
                  {showAccumulatedAvg && (
                    <Line 
                      type="monotone" 
                      dataKey="accumulatedAvg" 
                      name="Média Acumulada (%)"
                      stroke="#10b981" 
                      strokeWidth={2} 
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. SUGESTÕES DE REVISÕES BASEADAS NA MENOR TAXA DE ACERTOS */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border p-6 sm:p-7 shadow-xs space-y-5 ${cardBg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-200 dark:border-[#1e2d4d]">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
              <h3 className={`text-base sm:text-lg font-black tracking-tight ${textPrimary}`}>
                SUGESTÕES DE REVISÃO INTELIGENTE (MENOR TAXA DE ACERTOS)
              </h3>
            </div>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Tópicos e assuntos com maior índice de erro identificados nos simulados para reforço imediato de conteúdo
            </p>
          </div>

          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 shrink-0">
            {revisionSuggestions.length} tópico{revisionSuggestions.length !== 1 ? 's' : ''} mapeado{revisionSuggestions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {revisionSuggestions.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className={`text-xs font-semibold ${textSecondary}`}>
              Nenhum ponto de fraqueza crítica detectado ou nenhum simulado lançado ainda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {revisionSuggestions.slice(0, 6).map((item, idx) => {
              const priorityClass = item.priority === 'CRÍTICA' 
                ? "bg-red-500/10 text-red-400 border-red-500/30"
                : item.priority === 'ALTA'
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-blue-500/10 text-blue-400 border-blue-500/30";

              return (
                <div 
                  key={`${item.discipline}-${item.topic}-${idx}`}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition hover:border-blue-500/50 ${innerCardBg}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase text-blue-400 truncate">
                        {item.discipline}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase ${priorityClass}`}>
                        {item.priority}
                      </span>
                    </div>

                    <h4 className={`text-sm font-bold leading-snug line-clamp-2 ${textPrimary}`}>
                      {item.topic}
                    </h4>

                    {/* Aproveitamento & Erros */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span className={textSecondary}>Taxa de Acerto:</span>
                      <span className={`font-black ${item.accuracy < 50 ? "text-red-400" : "text-amber-400"}`}>
                        {item.accuracy}% ({item.totalMissed} erro{item.totalMissed > 1 ? 's' : ''})
                      </span>
                    </div>

                    <p className={`text-[11px] leading-relaxed line-clamp-2 ${textSecondary}`}>
                      {item.actionGuide}
                    </p>
                  </div>

                  {/* Botão de Ação: Gerar Revisão & Flashcards com IA */}
                  {onGenerateStudyTopic && (
                    <button
                      type="button"
                      disabled={isLoadingStudyMaterial}
                      onClick={() => onGenerateStudyTopic(item.topic, item.discipline, item.actionGuide)}
                      className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Gerar Revisão & Flashcards</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. HISTÓRICO DETALHADO DOS SIMULADOS & CRUZAMENTO COM O EDITAL */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border p-6 sm:p-7 shadow-xs space-y-6 ${cardBg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-[#1e2d4d]">
          <div>
            <h3 className={`text-lg font-black tracking-tight ${textPrimary}`}>
              REGISTRO DE SIMULADOS ANEXADOS & CRUZAMENTO COM O EDITAL
            </h3>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Clique em <strong>"Ver Detalhes"</strong> para expandir a conferência completa na tela (disciplinas vs edital, caderno corrigido e diagnóstico).
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`text-xs font-bold ${textSecondary}`}>
              Total: <strong className={textPrimary}>{history.length}</strong> prova{history.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-gray-400 mx-auto" />
            <h4 className={`text-base font-bold ${textPrimary}`}>Nenhum simulado cadastrado</h4>
            <p className={`text-xs max-w-sm mx-auto ${textSecondary}`}>
              Anexe o caderno de provas, gabarito e edital para iniciar o acompanhamento do seu desempenho.
            </p>
            <button
              type="button"
              onClick={onOpenUploadModal}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
            >
              + Anexar Primeiro Simulado
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#1e2d4d] border rounded-xl overflow-hidden border-slate-200 dark:border-[#1e2d4d]">
            
            {/* Header da Tabela */}
            <div className={`grid grid-cols-12 px-4 sm:px-6 py-3.5 text-[11px] font-black uppercase tracking-wider ${
              darkMode ? "bg-[#0c1630] text-gray-400" : "bg-slate-100 text-slate-600"
            }`}>
              <div className="col-span-5 sm:col-span-5">SIMULADO / CONCURSO</div>
              <div className="col-span-4 sm:col-span-4">DESEMPENHO & APROVEITAMENTO</div>
              <div className="col-span-3 sm:col-span-3 text-right pr-2">AÇÕES</div>
            </div>

            {/* Linhas dos Simulados */}
            {reverseExams.map((exam, idx) => {
              const isExpanded = expandedExamIds.has(exam.id);
              const activeSubTab = expandedTabs[exam.id] || 'performance';
              const rawTitle = exam.examTitle || `SIMULADO ${String(history.length - idx).padStart(2, '0')}`;
              
              let dateStr = '';
              if (exam.createdAt || exam.date) {
                try {
                  const d = new Date(exam.createdAt || exam.date || '');
                  dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                } catch {
                  dateStr = '';
                }
              }

              const accuracy = exam.summary.scorePercentage || 0;
              let badgeClass = "bg-amber-950/40 border-amber-500/30 text-amber-400";
              if (accuracy >= targetScore) {
                badgeClass = "bg-emerald-950/40 border-emerald-500/30 text-emerald-400";
              } else if (accuracy < 50) {
                badgeClass = "bg-red-950/40 border-red-500/30 text-red-400";
              }

              return (
                <div key={exam.id} className="transition-colors">
                  {/* Linha Principal */}
                  <div 
                    className={`grid grid-cols-12 items-center px-4 sm:px-6 py-4 transition cursor-pointer ${
                      isExpanded 
                        ? darkMode ? "bg-[#152449] border-b border-indigo-500/30" : "bg-indigo-50/60 border-b border-indigo-100"
                        : "hover:bg-indigo-500/5"
                    }`}
                    onClick={() => toggleExpand(exam.id)}
                  >
                    {/* Coluna 1: Nome & Data */}
                    <div className="col-span-5 sm:col-span-5 pr-2 flex items-center space-x-2.5">
                      <div className={`p-1.5 rounded-lg border transition ${
                        isExpanded 
                          ? "bg-indigo-600 border-indigo-500 text-white" 
                          : darkMode ? "bg-[#101d3b] border-[#1e2d4d] text-gray-400" : "bg-white border-slate-200 text-slate-500"
                      }`}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm sm:text-base font-black text-blue-400 tracking-tight truncate">
                          {rawTitle}
                        </h4>
                        <span className={`text-xs block font-medium truncate ${textSecondary}`}>
                          {dateStr || 'Concluído'} • {exam.summary.totalQuestions} questões
                        </span>
                      </div>
                    </div>

                    {/* Coluna 2: Desempenho & Aproveitamento */}
                    <div className="col-span-4 sm:col-span-4 flex items-center space-x-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${badgeClass}`}>
                        {accuracy.toFixed(1)}%
                      </span>
                      <div className="hidden sm:block text-xs font-semibold">
                        <span className="text-emerald-400">{exam.summary.totalCorrect}A</span>
                        <span className="mx-1 text-gray-400">/</span>
                        <span className="text-red-400">{exam.summary.totalWrong}E</span>
                      </div>
                    </div>

                    {/* Coluna 3: Ações */}
                    <div className="col-span-3 sm:col-span-3 flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(exam.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{isExpanded ? 'Recolher' : 'Ver Detalhes'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(exam, 'performance');
                        }}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          darkMode ? "border-[#1e2d4d] hover:bg-[#101d3b] text-gray-300" : "border-slate-200 hover:bg-slate-100 text-slate-600"
                        }`}
                        title="Abrir em Tela Cheia"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Excluir o simulado "${rawTitle}"?`)) {
                            onDeleteExam(exam.id);
                          }
                        }}
                        className={`p-1.5 rounded-lg border transition cursor-pointer text-red-400 hover:text-red-300 ${
                          darkMode ? "border-[#1e2d4d] hover:bg-red-950/30" : "border-slate-200 hover:bg-red-50"
                        }`}
                        title="Excluir Simulado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Detalhes Expansíveis da Prova (Acordeão) */}
                  {isExpanded && (
                    <div className={`p-4 sm:p-6 border-b border-indigo-500/20 space-y-6 ${
                      darkMode ? "bg-[#0c1630]" : "bg-slate-50"
                    }`}>
                      {/* Abas Internas */}
                      <div className="flex flex-wrap items-center gap-2 border-b pb-3 border-slate-200 dark:border-[#1e2d4d]">
                        <button
                          type="button"
                          onClick={() => setTabForExam(exam.id, 'performance')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            activeSubTab === 'performance'
                              ? "bg-blue-600 text-white"
                              : darkMode ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          1. Disciplinas vs Edital
                        </button>
                        <button
                          type="button"
                          onClick={() => setTabForExam(exam.id, 'questions')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            activeSubTab === 'questions'
                              ? "bg-blue-600 text-white"
                              : darkMode ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          2. Caderno Corrigido ({exam.questions?.length || 0} questões)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTabForExam(exam.id, 'study')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            activeSubTab === 'study'
                              ? "bg-blue-600 text-white"
                              : darkMode ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          3. Diagnóstico & Plano
                        </button>
                      </div>

                      {/* Conteúdo da Aba 1: Disciplinas vs Edital */}
                      {activeSubTab === 'performance' && (
                        <div className="space-y-4">
                          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#1e2d4d]">
                            <table className="w-full text-xs text-left">
                              <thead className={`text-[10px] font-black uppercase tracking-wider ${
                                darkMode ? "bg-[#0b1329] text-gray-400" : "bg-slate-200 text-slate-700"
                              }`}>
                                <tr>
                                  <th className="px-4 py-3">Disciplina / Bloco</th>
                                  <th className="px-3 py-3 text-center">Peso</th>
                                  <th className="px-3 py-3 text-center">Acertos</th>
                                  <th className="px-3 py-3 text-center">Erros</th>
                                  <th className="px-3 py-3 text-center">Pontos Obtidos</th>
                                  <th className="px-4 py-3 text-right">Aproveitamento</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-[#1e2d4d]">
                                {(exam.disciplines || []).map((d, dIdx) => {
                                  const discAcc = d.accuracyPercentage || 0;
                                  return (
                                    <tr key={dIdx} className={darkMode ? "hover:bg-[#101d3b]/50" : "hover:bg-slate-100/50"}>
                                      <td className={`px-4 py-3 font-bold ${textPrimary}`}>{d.discipline}</td>
                                      <td className="px-3 py-3 text-center">{d.weight || 1}x</td>
                                      <td className="px-3 py-3 text-center font-bold text-emerald-400">{d.correctCount}</td>
                                      <td className="px-3 py-3 text-center font-bold text-red-400">{d.wrongCount}</td>
                                      <td className="px-3 py-3 text-center font-bold text-blue-400">
                                        {(d.correctCount * (d.weight || 1)).toFixed(1)} / {(d.totalQuestions * (d.weight || 1)).toFixed(1)}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <span className={`font-black ${discAcc >= targetScore ? "text-emerald-400" : "text-amber-400"}`}>
                                          {discAcc.toFixed(1)}%
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Conteúdo da Aba 2: Caderno de Questões */}
                      {activeSubTab === 'questions' && (
                        <QuestionReview
                          questions={exam.questions || []}
                          darkMode={darkMode}
                        />
                      )}

                      {/* Conteúdo da Aba 3: Diagnóstico & Plano */}
                      {activeSubTab === 'study' && (
                        <StudyPlanner
                          studyPlan={exam.studyPlan || {
                            overallStrategy: "Focar na revisão dos tópicos de maior taxa de erro no simulado.",
                            recommendedDailyHours: 3.5,
                            weeklyCycles: [],
                            smartTips: ["Resolver questões diárias dos assuntos com < 60% de aproveitamento."]
                          }}
                          criticalWeaknesses={exam.criticalWeaknesses || []}
                          onUpdateWeaknessStatus={(index, newStatus) => {
                            if (onUpdateWeaknessStatus) {
                              onUpdateWeaknessStatus(exam.id, index, newStatus);
                            }
                          }}
                          activeTopicStudy={activeTopicStudy || null}
                          isLoadingStudyMaterial={isLoadingStudyMaterial}
                          onGenerateStudyTopic={(topic, discipline) => {
                            if (onGenerateStudyTopic) {
                              onGenerateStudyTopic(topic, discipline);
                            }
                          }}
                          onCloseTopicStudy={onCloseTopicStudy || (() => {})}
                          darkMode={darkMode}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. MODAL DE DETALHES EM TELA CHEIA */}
      {/* ========================================================================= */}
      {selectedExamForModal && (
        <SimuladoDetailModal
          exam={selectedExamForModal}
          isOpen={true}
          onClose={() => setSelectedExamForModal(null)}
          onDelete={(id) => {
            onDeleteExam(id);
            setSelectedExamForModal(null);
          }}
          onUpdateWeaknessStatus={onUpdateWeaknessStatus}
          onGenerateStudyTopic={onGenerateStudyTopic}
          activeTopicStudy={activeTopicStudy}
          isLoadingStudyMaterial={isLoadingStudyMaterial}
          onCloseTopicStudy={onCloseTopicStudy}
          initialTab={initialModalTab}
          targetScore={targetScore}
          darkMode={darkMode}
        />
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL DE ESTUDO DO TÓPICO / FLASHCARDS COM IA */}
      {/* ========================================================================= */}
      {activeTopicStudy && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-3xl rounded-2xl border p-6 space-y-6 shadow-2xl relative ${
            darkMode ? "bg-[#0b1329] border-[#1e2d4d] text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-[#1e2d4d]">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-400">
                  {activeTopicStudy.discipline}
                </span>
                <h3 className="text-lg font-black text-blue-400">
                  {activeTopicStudy.topic}
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseTopicStudy}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Resumo Pedagógico */}
            <div className={`p-4 rounded-xl border ${innerCardBg}`}>
              <h4 className="text-xs font-black uppercase text-amber-400 mb-1">
                Resumo Essencial do Tópico:
              </h4>
              <p className="text-xs leading-relaxed text-gray-300">
                {activeTopicStudy.summary}
              </p>
            </div>

            {/* Flashcards */}
            {activeTopicStudy.flashcards && activeTopicStudy.flashcards.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-indigo-400">
                    Flashcards Interativos ({activeFlashcardIndex + 1}/{activeTopicStudy.flashcards.length})
                  </h4>
                  <div className="flex space-x-1">
                    {activeTopicStudy.flashcards.map((_, fIdx) => (
                      <button
                        key={fIdx}
                        type="button"
                        onClick={() => {
                          setActiveFlashcardIndex(fIdx);
                          setIsFlipped(false);
                        }}
                        className={`w-6 h-6 rounded-md text-[10px] font-bold transition cursor-pointer ${
                          activeFlashcardIndex === fIdx
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-800 text-gray-400"
                        }`}
                      >
                        {fIdx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className={`p-6 rounded-2xl border min-h-40 flex flex-col justify-center items-center text-center cursor-pointer transition-all duration-300 transform hover:scale-[1.01] ${
                    isFlipped 
                      ? "bg-indigo-950/50 border-indigo-500/50 text-indigo-200" 
                      : darkMode ? "bg-[#101d3b] border-[#1e2d4d] text-white" : "bg-slate-100 border-slate-300 text-slate-800"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-gray-400 mb-2">
                    {isFlipped ? "RESPOSTA / CONCEITO-CHAVE" : "PERGUNTA (CLIQUE PARA VIRAR)"}
                  </span>
                  <p className="text-sm sm:text-base font-bold leading-relaxed">
                    {isFlipped 
                      ? activeTopicStudy.flashcards[activeFlashcardIndex]?.back 
                      : activeTopicStudy.flashcards[activeFlashcardIndex]?.front
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Quick Quiz */}
            {activeTopicStudy.quickQuiz && activeTopicStudy.quickQuiz.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-[#1e2d4d]">
                <h4 className="text-xs font-black uppercase text-emerald-400">
                  Questões de Fixação Rápida
                </h4>
                <div className="space-y-3">
                  {activeTopicStudy.quickQuiz.map((quiz, qIdx) => {
                    const selected = quizAnswers[qIdx];
                    const isAnswered = selected !== undefined;
                    return (
                      <div key={qIdx} className={`p-4 rounded-xl border ${innerCardBg} space-y-2.5`}>
                        <p className="text-xs font-bold text-gray-200">
                          {qIdx + 1}. {quiz.question}
                        </p>
                        <div className="space-y-1.5">
                          {quiz.options.map((opt, optIdx) => {
                            const isCorrect = optIdx === quiz.correctIndex;
                            const isSelected = selected === optIdx;
                            let btnStyle = darkMode ? "bg-[#101d3b] border-[#1e2d4d] text-gray-300" : "bg-white border-slate-200 text-slate-700";
                            
                            if (isAnswered) {
                              if (isCorrect) {
                                btnStyle = "bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold";
                              } else if (isSelected) {
                                btnStyle = "bg-red-950/60 border-red-500 text-red-300";
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => {
                                  if (!isAnswered) {
                                    setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
                                  }
                                }}
                                className={`w-full text-left p-2.5 rounded-lg border text-xs transition cursor-pointer flex items-center justify-between ${btnStyle}`}
                              >
                                <span>{opt}</span>
                                {isAnswered && isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                              </button>
                            );
                          })}
                        </div>
                        {isAnswered && (
                          <p className="text-[11px] text-gray-400 pt-1 border-t border-slate-800">
                            <strong>Explicação:</strong> {quiz.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
