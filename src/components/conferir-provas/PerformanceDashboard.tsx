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
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  ReferenceLine,
  Legend
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
  HelpCircle,
  AlertTriangle,
  Flame,
  Target,
  FileSpreadsheet,
  Plus,
  Eye,
  CheckCircle
} from 'lucide-react';
import { ExamResult, Edital, StudyStatus } from '../../types';
import { exportSimuladosToCSV } from '../../utils/csvExport';

interface PerformanceDashboardProps {
  result?: ExamResult | null;
  history: ExamResult[];
  edital?: Edital;
  targetScore?: number;
  onSelectExam?: (exam: ExamResult) => void;
  onStartNew?: () => void;
  darkMode?: boolean;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  result,
  history = [],
  edital,
  targetScore = 85,
  onSelectExam,
  onStartNew,
  darkMode = false,
}) => {
  const [chartMode, setChartMode] = useState<'area' | 'line'>('area');
  const [showAccumulatedAvg, setShowAccumulatedAvg] = useState<boolean>(true);
  const [showTargetReference, setShowTargetReference] = useState<boolean>(true);

  // Combine all exams (history + active result if not already included)
  const allExams = useMemo(() => {
    const map = new Map<string, ExamResult>();
    history.forEach((h) => map.set(h.id, h));
    if (result) {
      map.set(result.id, result);
    }
    const list = Array.from(map.values());
    list.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || '').getTime() || 0;
      const dateB = new Date(b.createdAt || b.date || '').getTime() || 0;
      return dateA - dateB;
    });
    return list;
  }, [history, result]);

  // If no exams exist yet
  if (allExams.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className={`rounded-2xl border p-12 text-center space-y-4 ${
          darkMode ? "bg-[#101d3b] border-[#1e2d4d]" : "bg-white border-slate-200"
        }`}>
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center mx-auto">
            <LineChartIcon className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className={`text-lg font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
              Nenhum simulado registrado para cálculo do desempenho acumulado
            </h3>
            <p className={`text-xs max-w-md mx-auto ${darkMode ? "text-gray-400" : "text-slate-500"}`}>
              Lance o seu primeiro simulado com gabarito ou respostas para gerar os gráficos de evolução, acurácia acumulada por matéria e matriz de priorização do edital.
            </p>
          </div>
          {onStartNew && (
            <button
              type="button"
              onClick={onStartNew}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-blue-600/30"
            >
              Lançar Primeiro Simulado
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 1. CÁLCULO DAS MÉTRICAS ACUMULADAS
  // ==========================================
  const totalSimulados = allExams.length;
  const totalQuestoesAcumulado = allExams.reduce((acc, h) => acc + (h.summary.totalQuestions || 0), 0);
  const totalAcertosAcumulado = allExams.reduce((acc, h) => acc + (h.summary.totalCorrect || 0), 0);
  const totalErrosAcumulado = allExams.reduce((acc, h) => acc + (h.summary.totalWrong || 0), 0);
  const totalBrancoAcumulado = allExams.reduce((acc, h) => acc + (h.summary.totalBlank || 0), 0);

  // Média acumulada ponderada pelo total de questões feitas
  const mediaAcumuladaScore = totalQuestoesAcumulado > 0 
    ? (totalAcertosAcumulado / totalQuestoesAcumulado) * 100 
    : 0;

  // Média aritmética simples dos simulados
  const mediaAritmeticaScore = totalSimulados > 0
    ? allExams.reduce((acc, h) => acc + (h.summary.scorePercentage || 0), 0) / totalSimulados
    : 0;

  const melhorSimuladoScore = Math.max(...allExams.map((h) => h.summary.scorePercentage || 0));
  const ultimoSimulado = allExams[allExams.length - 1];
  const primeiroSimulado = allExams[0];
  const evolucaoDelta = ultimoSimulado.summary.scorePercentage - primeiroSimulado.summary.scorePercentage;

  // ==========================================
  // 2. DATASET DO GRÁFICO DE EVOLUÇÃO
  // ==========================================
  let runningCorrect = 0;
  let runningQuestions = 0;

  const evolutionChartData = allExams.map((exam, index) => {
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

    const previousExam = index > 0 ? allExams[index - 1] : null;
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

  // ==========================================
  // 3. ACURÁCIA & EQUILÍBRIO ACUMULADO POR MATÉRIA
  // ==========================================
  const disciplineAggMap = new Map<string, {
    discipline: string;
    totalQuestions: number;
    correctCount: number;
    wrongCount: number;
    blankCount: number;
    weight: number;
  }>();

  allExams.forEach((exam) => {
    if (exam.disciplines && exam.disciplines.length > 0) {
      exam.disciplines.forEach((d) => {
        const key = d.discipline.trim();
        const existing = disciplineAggMap.get(key) || {
          discipline: key,
          totalQuestions: 0,
          correctCount: 0,
          wrongCount: 0,
          blankCount: 0,
          weight: d.weight || 1,
        };

        existing.totalQuestions += d.totalQuestions || 0;
        existing.correctCount += d.correctCount || 0;
        existing.wrongCount += d.wrongCount || 0;
        existing.blankCount += d.blankCount || 0;
        existing.weight = Math.max(existing.weight, d.weight || 1);

        disciplineAggMap.set(key, existing);
      });
    } else if (exam.questions && exam.questions.length > 0) {
      // Fallback: infer from questions
      exam.questions.forEach((q) => {
        const key = q.discipline ? q.discipline.trim() : 'Geral';
        const existing = disciplineAggMap.get(key) || {
          discipline: key,
          totalQuestions: 0,
          correctCount: 0,
          wrongCount: 0,
          blankCount: 0,
          weight: 1,
        };

        existing.totalQuestions += 1;
        if (q.status === 'CORRECT') existing.correctCount += 1;
        else if (q.status === 'WRONG') existing.wrongCount += 1;
        else existing.blankCount += 1;

        disciplineAggMap.set(key, existing);
      });
    }
  });

  const accumulatedDisciplines = Array.from(disciplineAggMap.values()).map((d) => {
    const accuracy = d.totalQuestions > 0 ? (d.correctCount / d.totalQuestions) * 100 : 0;
    const pointsEarned = d.correctCount * d.weight;
    const pointsMax = d.totalQuestions * d.weight;

    return {
      ...d,
      accuracyPercentage: accuracy,
      pointsEarned,
      pointsMax,
    };
  });

  // Sort disciplines by accuracy ascending (weakest first)
  accumulatedDisciplines.sort((a, b) => a.accuracyPercentage - b.accuracyPercentage);

  // Radar data for discipline balance
  const radarData = accumulatedDisciplines.map((d) => ({
    subject: d.discipline.length > 18 ? d.discipline.substring(0, 16) + '...' : d.discipline,
    fullSubject: d.discipline,
    Acuracia: Number(d.accuracyPercentage.toFixed(1)),
    Meta: targetScore,
  }));

  // ==========================================
  // 4. DIAGNÓSTICO GERAL REFORMULADO & MATRIZ DE PRIORIZAÇÃO DO EDITAL
  // ==========================================
  // Extract all topics and errors from exams
  interface TopicGap {
    topic: string;
    discipline: string;
    errorCount: number;
    examsCount: number;
    editalWeight: number;
    action: string;
    severity: 'URGENTE' | 'ALTA' | 'MEDIA' | 'ESTAVEL';
    priorityScore: number;
  }

  const topicGapsMap = new Map<string, {
    topic: string;
    discipline: string;
    errorCount: number;
    examIds: Set<string>;
    action: string;
  }>();

  // Aggregate weaknesses from all exams
  allExams.forEach((exam) => {
    (exam.criticalWeaknesses || []).forEach((w) => {
      const topicKey = `${w.discipline}:::${w.topic}`.toLowerCase();
      const existing = topicGapsMap.get(topicKey) || {
        topic: w.topic,
        discipline: w.discipline,
        errorCount: 0,
        examIds: new Set<string>(),
        action: w.suggestedAction || "Revisar teoria e resolver bateria de 20 questões",
      };

      existing.errorCount += (w.missedQuestionsCount || 1);
      existing.examIds.add(exam.id);
      if (w.suggestedAction) existing.action = w.suggestedAction;

      topicGapsMap.set(topicKey, existing);
    });

    // Also scan questions marked as WRONG
    (exam.questions || []).filter((q) => q.status === 'WRONG').forEach((q) => {
      const topicName = q.topic || 'Conceitos Fundamentais';
      const discName = q.discipline || 'Geral';
      const topicKey = `${discName}:::${topicName}`.toLowerCase();

      const existing = topicGapsMap.get(topicKey) || {
        topic: topicName,
        discipline: discName,
        errorCount: 0,
        examIds: new Set<string>(),
        action: `Revisar pegadinhas e regras de ${topicName}`,
      };

      existing.errorCount += 1;
      existing.examIds.add(exam.id);
      topicGapsMap.set(topicKey, existing);
    });
  });

  // Extract Edital syllabus topics and weights if available
  const editalDisciplinesMap = new Map<string, { weight: number; topics: string[] }>();
  if (edital && edital.categorias) {
    edital.categorias.forEach((cat) => {
      (cat.disciplinas || []).forEach((d) => {
        const dName = d.nome.toLowerCase().trim();
        editalDisciplinesMap.set(dName, {
          weight: d.peso || 1,
          topics: (d.assuntos || []).map((a) => a.nome),
        });
      });
    });
  }

  // Combine and score each topic gap against Edital
  const topicPriorities: TopicGap[] = Array.from(topicGapsMap.values()).map((gap) => {
    // Find matching edital discipline weight
    let matchedWeight = 1;
    for (const [dName, info] of editalDisciplinesMap.entries()) {
      if (gap.discipline.toLowerCase().includes(dName) || dName.includes(gap.discipline.toLowerCase())) {
        matchedWeight = info.weight;
        break;
      }
    }

    // Find discipline accuracy
    const discAcc = accumulatedDisciplines.find(
      (d) => d.discipline.toLowerCase() === gap.discipline.toLowerCase()
    )?.accuracyPercentage || 60;

    // Priority Score Formula: (Erros * Peso) + (100 - Acurácia da Disciplina) * 0.15
    const priorityScore = (gap.errorCount * matchedWeight * 1.5) + ((100 - discAcc) * 0.15);

    let severity: 'URGENTE' | 'ALTA' | 'MEDIA' | 'ESTAVEL' = 'MEDIA';
    if (priorityScore >= 4.5 || (matchedWeight >= 2 && gap.errorCount >= 2)) {
      severity = 'URGENTE';
    } else if (priorityScore >= 2.5 || gap.errorCount >= 2) {
      severity = 'ALTA';
    } else if (gap.errorCount === 1 && discAcc >= 75) {
      severity = 'ESTAVEL';
    }

    return {
      topic: gap.topic,
      discipline: gap.discipline,
      errorCount: gap.errorCount,
      examsCount: gap.examIds.size,
      editalWeight: matchedWeight,
      action: gap.action,
      severity,
      priorityScore,
    };
  });

  // Sort priorities (highest score first)
  topicPriorities.sort((a, b) => b.priorityScore - a.priorityScore);

  // Overall Pedagogical Synthesis text
  const urgentCount = topicPriorities.filter((t) => t.severity === 'URGENTE').length;
  const highCount = topicPriorities.filter((t) => t.severity === 'ALTA').length;
  const weakestDisciplines = accumulatedDisciplines.filter((d) => d.accuracyPercentage < 65);

  const cardBg = darkMode ? "bg-[#101d3b] border-[#1e2d4d]" : "bg-white border-slate-200";
  const innerCardBg = darkMode ? "bg-[#0b1329] border-[#1a2b4c]" : "bg-slate-50 border-slate-200";
  const textPrimary = darkMode ? "text-white" : "text-slate-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-slate-500";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-7 animate-fade-in">
      
      {/* Top Header Banner */}
      <div className={`rounded-2xl border p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${cardBg}`}>
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-950/60 border border-indigo-500/40 text-indigo-400 mb-2">
            <Target className="w-3.5 h-3.5" />
            <span>PAINEL CONSOLIDADO DE DESEMPENHO</span>
          </div>
          <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}>
            HISTÓRICO ACUMULADO & EVOLUÇÃO
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${textSecondary}`}>
            Média acumulada calculada com base em {totalSimulados} simulado{totalSimulados > 1 ? 's' : ''} ({totalQuestoesAcumulado} questões totais respondidas)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => exportSimuladosToCSV(allExams, 'Desempenho_Acumulado_Simulados')}
            className={`inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              darkMode 
                ? "bg-[#15254d] border-[#233863] text-gray-200 hover:bg-[#1b2f60] hover:text-white"
                : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar Histórico (.CSV)</span>
          </button>

          {onStartNew && (
            <button
              type="button"
              onClick={onStartNew}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center space-x-2 cursor-pointer shadow-md shadow-blue-600/30 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Lançar Novo Simulado</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 CARDS: MÉTRICAS ACUMULADAS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Card 1: Média Acumulada de Aproveitamento */}
        <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between ${cardBg}`}>
          <span className={`text-[11px] font-bold uppercase tracking-wider ${textSecondary}`}>
            MÉDIA ACUMULADA (% ACERTOS)
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl sm:text-3xl font-black ${
              mediaAcumuladaScore >= targetScore 
                ? "text-emerald-400" 
                : mediaAcumuladaScore >= 60 
                ? "text-amber-400" 
                : "text-red-400"
            }`}>
              {mediaAcumuladaScore.toFixed(1)}%
            </span>
            <span className={`text-xs font-bold ${textSecondary}`}>
              (meta: {targetScore}%)
            </span>
          </div>
          <div className="mt-2 text-[11px] font-medium flex items-center space-x-1.5 text-indigo-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Média ponderada ({totalQuestoesAcumulado} qts)</span>
          </div>
        </div>

        {/* Card 2: Total de Simulados Feitos */}
        <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between ${cardBg}`}>
          <span className={`text-[11px] font-bold uppercase tracking-wider ${textSecondary}`}>
            TOTAL DE SIMULADOS
          </span>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-black text-blue-400">
              {totalSimulados}
            </span>
            <span className={`text-xs font-bold ${textSecondary}`}>
              provas realizadas
            </span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-emerald-400">
            Melhor prova: {melhorSimuladoScore.toFixed(1)}%
          </div>
        </div>

        {/* Card 3: Acertos Acumulados */}
        <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between ${cardBg}`}>
          <span className={`text-[11px] font-bold uppercase tracking-wider ${textSecondary}`}>
            ACERTOS ACUMULADOS
          </span>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">
              {totalAcertosAcumulado}
            </span>
            <span className={`text-sm sm:text-base font-bold ${textSecondary}`}>
              / {totalQuestoesAcumulado}
            </span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-red-400">
            {totalErrosAcumulado} erros • {totalBrancoAcumulado} em branco
          </div>
        </div>

        {/* Card 4: Evolução / Tendência */}
        <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between ${cardBg}`}>
          <span className={`text-[11px] font-bold uppercase tracking-wider ${textSecondary}`}>
            EVOLUÇÃO (1º AO ÚLTIMO)
          </span>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className={`text-2xl sm:text-3xl font-black ${
              evolucaoDelta >= 0 ? "text-emerald-400" : "text-red-400"
            }`}>
              {evolucaoDelta >= 0 ? `+${evolucaoDelta.toFixed(1)}%` : `${evolucaoDelta.toFixed(1)}%`}
            </span>
            <span className={`text-xs font-bold ${textSecondary}`}>
              variação
            </span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-purple-400 truncate">
            Último: {ultimoSimulado.summary.scorePercentage.toFixed(1)}%
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* CURVA DE EVOLUÇÃO DO APROVEITAMENTO (%) - SIMULADOS (RECHARTS INTERATIVO) */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border p-6 sm:p-7 shadow-xs space-y-5 ${cardBg}`}>
        {/* Header com Título e Controles */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-[#1e2d4d]">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
              <h3 className={`text-base sm:text-lg font-black tracking-tight ${textPrimary}`}>
                CURVA DE EVOLUÇÃO DO APROVEITAMENTO (%) - SIMULADOS
              </h3>
            </div>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Acompanhamento analítico da evolução percentual do aluno ao longo do tempo com média acumulada e faixa de meta
            </p>
          </div>

          {/* Controles de Visualização & Legenda Interativa */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Toggle Tipo de Gráfico */}
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

            {/* Toggle Média Acumulada */}
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
              <span>Média ({mediaAcumuladaScore.toFixed(1)}%)</span>
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

        {/* Faixa Resumo de KPIs do Gráfico */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`p-3 rounded-xl border ${innerCardBg}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Último Simulado</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className={`text-lg sm:text-xl font-black ${
                ultimoSimulado.summary.scorePercentage >= targetScore ? "text-emerald-400" : "text-blue-400"
              }`}>
                {ultimoSimulado.summary.scorePercentage.toFixed(1)}%
              </span>
              <span className={`text-[10px] font-medium ${textSecondary}`}>
                ({ultimoSimulado.summary.totalCorrect}/{ultimoSimulado.summary.totalQuestions})
              </span>
            </div>
          </div>

          <div className={`p-3 rounded-xl border ${innerCardBg}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Média Acumulada</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-emerald-400">
                {mediaAcumuladaScore.toFixed(1)}%
              </span>
              <span className={`text-[10px] font-medium ${textSecondary}`}>
                geral
              </span>
            </div>
          </div>

          <div className={`p-3 rounded-xl border ${innerCardBg}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Maior Desempenho</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-purple-400">
                {melhorSimuladoScore.toFixed(1)}%
              </span>
              <span className={`text-[10px] font-medium ${textSecondary}`}>
                recorde
              </span>
            </div>
          </div>

          <div className={`p-3 rounded-xl border ${innerCardBg}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Variação Total</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className={`text-lg sm:text-xl font-black ${
                evolucaoDelta >= 0 ? "text-emerald-400" : "text-red-400"
              }`}>
                {evolucaoDelta >= 0 ? `+${evolucaoDelta.toFixed(1)}%` : `${evolucaoDelta.toFixed(1)}%`}
              </span>
              <span className={`text-[10px] font-medium ${textSecondary}`}>
                1º ao atual
              </span>
            </div>
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="h-72 sm:h-84 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'area' ? (
              <AreaChart data={evolutionChartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
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

                          {onSelectExam && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-blue-400 font-bold text-center">
                              💡 Clique no ponto para abrir detalhes
                            </div>
                          )}
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
                    y={Number(mediaAcumuladaScore.toFixed(1))} 
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
                    strokeWidth={2.2} 
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
                  fill="url(#scoreAreaGradient)"
                  dot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: darkMode ? "#0b1329" : "#ffffff" }}
                  activeDot={{ 
                    r: 7, 
                    fill: "#60a5fa", 
                    stroke: "#1d4ed8", 
                    strokeWidth: 2,
                    onClick: (_event, payload: any) => {
                      if (payload?.payload?.rawExam && onSelectExam) {
                        onSelectExam(payload.payload.rawExam);
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

                          {onSelectExam && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-blue-400 font-bold text-center">
                              💡 Clique no ponto para abrir detalhes
                            </div>
                          )}
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
                    y={Number(mediaAcumuladaScore.toFixed(1))} 
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
                    onClick: (_event, payload: any) => {
                      if (payload?.payload?.rawExam && onSelectExam) {
                        onSelectExam(payload.payload.rawExam);
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

        {/* Rodapé explicativo da curva */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-[#1e2d4d] text-[11px]">
          <div className="flex items-center space-x-2 text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>Curva de Aproveitamento Real (%)</span>
            <span className="mx-1">•</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span>Média Ponderada Acumulada</span>
            <span className="mx-1">•</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>Meta de Aprovação</span>
          </div>
          <div className={`font-semibold ${darkMode ? "text-gray-400" : "text-slate-500"}`}>
            Total: <strong>{totalSimulados} simulado{totalSimulados > 1 ? 's' : ''}</strong> ({totalQuestoesAcumulado} questões analisadas)
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EQUILÍBRIO E ACURÁCIA POR DISCIPLINA (RADAR + TABELA CONSOLIDADA) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Radar Chart: Equilíbrio Disciplinar */}
        <div className={`lg:col-span-5 rounded-2xl border p-6 sm:p-7 shadow-xs flex flex-col justify-between ${cardBg}`}>
          <div>
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-purple-400" />
              <h3 className={`text-base font-black tracking-tight ${textPrimary}`}>
                EQUILÍBRIO POR DISCIPLINA
              </h3>
            </div>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Acurácia acumulada consolidada em todas as provas
            </p>
          </div>

          <div className="h-64 sm:h-72 w-full my-auto">
            {radarData.length >= 3 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke={darkMode ? "#1e2d4d" : "#e2e8f0"} />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: darkMode ? "#94a3b8" : "#475569", fontSize: 10, fontWeight: 600 }} 
                  />
                  <PolarRadiusAxis 
                    domain={[0, 100]} 
                    angle={30} 
                    stroke={darkMode ? "#334155" : "#cbd5e1"} 
                    tick={{ fontSize: 9 }} 
                  />
                  <Radar 
                    name="Acurácia Acumulada (%)" 
                    dataKey="Acuracia" 
                    stroke="#8b5cf6" 
                    fill="#8b5cf6" 
                    fillOpacity={0.35} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Target className="w-8 h-8 text-indigo-400 mb-2 opacity-60" />
                <p className={`text-xs ${textSecondary}`}>
                  Dados de acurácia consolidada disponíveis na tabela ao lado.
                </p>
              </div>
            )}
          </div>

          <div className="text-[11px] text-center pt-2 border-t border-slate-200 dark:border-[#1e2d4d] text-gray-400">
            Meta desejada no edital: <strong className="text-amber-400">{targetScore}%</strong> em todas as matérias
          </div>
        </div>

        {/* Tabela de Acurácia Acumulada por Disciplina */}
        <div className={`lg:col-span-7 rounded-2xl border p-6 sm:p-7 shadow-xs space-y-4 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-base font-black tracking-tight ${textPrimary}`}>
                ACURÁCIA ACUMULADA POR DISCIPLINA
              </h3>
              <p className={`text-xs mt-0.5 ${textSecondary}`}>
                Total de acertos e aproveitamento médio por matéria
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                  darkMode ? "border-[#1e2d4d] text-gray-400" : "border-slate-200 text-slate-600"
                }`}>
                  <th className="py-2.5 px-3">DISCIPLINA</th>
                  <th className="py-2.5 px-2 text-center">QUESTÕES</th>
                  <th className="py-2.5 px-2 text-center">ACERTOS</th>
                  <th className="py-2.5 px-3 text-right">ACURÁCIA ACUMULADA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1e2d4d] text-xs">
                {accumulatedDisciplines.map((d, index) => {
                  const accuracy = d.accuracyPercentage;
                  let badgeColor = darkMode ? "bg-amber-950/40 text-amber-300 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200";
                  let barColor = "bg-amber-500";
                  let badgeText = "REGULAR";

                  if (accuracy >= 75) {
                    badgeColor = darkMode ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200";
                    barColor = "bg-emerald-500";
                    badgeText = "★ ÓTIMO";
                  } else if (accuracy < 55) {
                    badgeColor = darkMode ? "bg-red-950/40 text-red-300 border-red-500/30" : "bg-red-50 text-red-700 border-red-200";
                    barColor = "bg-red-500";
                    badgeText = "▼ BAIXO";
                  }

                  return (
                    <tr key={index} className="hover:bg-indigo-500/5 transition">
                      <td className="py-3 px-3">
                        <span className="font-bold block text-xs sm:text-sm">
                          {d.discipline}
                        </span>
                        <span className={`text-[10px] ${textSecondary}`}>
                          Peso {d.weight}x no edital
                        </span>
                      </td>

                      <td className="py-3 px-2 text-center font-medium">
                        {d.totalQuestions}
                      </td>

                      <td className="py-3 px-2 text-center">
                        <span className="font-bold text-emerald-400">
                          {d.correctCount}
                        </span>
                        <span className={`text-[11px] ${textSecondary}`}>
                          {" "}({d.wrongCount} err)
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex flex-col items-end space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-black text-xs sm:text-sm">
                              {accuracy.toFixed(0)}%
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                              {badgeText}
                            </span>
                          </div>
                          <div className="w-24 sm:w-32 h-1.5 rounded-full bg-slate-200 dark:bg-[#1a2b4c] overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${barColor}`} 
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

      {/* ========================================================================= */}
      {/* DIAGNÓSTICO GERAL REFORMULADO & MATRIZ DE PRIORIZAÇÃO DO EDITAL */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border p-6 sm:p-7 shadow-xs space-y-6 ${cardBg}`}>
        
        {/* Header Section */}
        <div className="border-b pb-4 border-slate-200 dark:border-[#1e2d4d]">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className={`text-base sm:text-lg font-black tracking-tight ${textPrimary}`}>
              DIAGNÓSTICO PEDAGÓGICO GERAL & MATRIZ DE PRIORIDADE DO EDITAL
            </h3>
          </div>
          <p className={`text-xs mt-1 ${textSecondary}`}>
            Cruzamento de todos os erros e gaps dos simulados com os pesos e tópicos do Conteúdo Programático do Edital
          </p>
        </div>

        {/* Parecer do Mentor IA */}
        <div className={`p-5 rounded-2xl border space-y-3 ${
          darkMode ? "bg-[#0c1630] border-indigo-500/30 text-gray-300" : "bg-indigo-50/70 border-indigo-200 text-slate-700"
        }`}>
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Parecer Consolidado do Mentor IA</span>
          </div>
          <p className="text-xs leading-relaxed">
            Ao analisar o histórico dos seus <strong>{totalSimulados} simulados</strong>, identificamos uma média acumulada de <strong>{mediaAcumuladaScore.toFixed(1)}% de aproveitamento</strong>. 
            {urgentCount > 0 ? (
              <span> Existem <strong>{urgentCount} tópicos críticos de alta prioridade</strong> em matérias de peso relevante do edital que estão drenando sua pontuação geral. Recomendamos priorizar a revisão teórica e resolução direcionada de questões nesses itens antes do próximo simulado.</span>
            ) : (
              <span> O seu desempenho apresenta boa estabilidade nas disciplinas base. Continue com ciclos de manutenção e foco em questões de bancas similares.</span>
            )}
          </p>
          {weakestDisciplines.length > 0 && (
            <div className="text-[11px] font-medium pt-1 flex flex-wrap gap-2 items-center">
              <span className="text-amber-400 font-bold">Disciplinas com maior urgência de reforço:</span>
              {weakestDisciplines.map((d, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  {d.discipline} ({d.accuracyPercentage.toFixed(0)}%)
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tabela da Matriz de Priorização de Estudo do Edital */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${textPrimary}`}>
              TÓPICOS DO CONTEÚDO PROGRAMÁTICO COM PRIORIDADE DE ESTUDO
            </h4>
            <span className={`text-[11px] italic ${textSecondary}`}>
              * Ordenado por impacto na pontuação final
            </span>
          </div>

          {topicPriorities.length === 0 ? (
            <div className={`p-6 rounded-2xl border text-center ${innerCardBg}`}>
              <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className={`text-xs font-semibold ${textPrimary}`}>
                Nenhum gap crítico registrado nos simulados até o momento!
              </p>
              <p className={`text-[11px] mt-1 ${textSecondary}`}>
                Seu rendimento está regular em todos os tópicos avaliados.
              </p>
            </div>
          ) : (
            <div className={`rounded-2xl border overflow-hidden shadow-xs ${innerCardBg}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                      darkMode ? "border-[#1e2d4d] bg-[#0c1630] text-gray-400" : "border-slate-200 bg-slate-100 text-slate-600"
                    }`}>
                      <th className="py-3 px-4">TÓPICO / CONTEÚDO DO EDITAL</th>
                      <th className="py-3 px-3 text-center">PESO EDITAL</th>
                      <th className="py-3 px-3 text-center">INCIDÊNCIA DE ERROS</th>
                      <th className="py-3 px-3 text-center">PRIORIDADE</th>
                      <th className="py-3 px-4">AÇÃO PEDAGÓGICA RECOMENDADA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1e2d4d] text-xs">
                    {topicPriorities.map((gap, index) => {
                      let badgeClass = "bg-amber-950/40 border-amber-500/30 text-amber-300";
                      let badgeIcon = <AlertTriangle className="w-3 h-3 mr-1" />;

                      if (gap.severity === 'URGENTE') {
                        badgeClass = "bg-red-950/50 border-red-500/40 text-red-400 font-black";
                        badgeIcon = <Flame className="w-3 h-3 mr-1 text-red-400" />;
                      } else if (gap.severity === 'ESTAVEL') {
                        badgeClass = "bg-emerald-950/40 border-emerald-500/30 text-emerald-300";
                        badgeIcon = <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />;
                      }

                      return (
                        <tr key={index} className="hover:bg-indigo-500/5 transition">
                          {/* Tópico & Disciplina */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold block text-xs sm:text-sm text-blue-400">
                              {gap.topic}
                            </span>
                            <span className={`text-[11px] block mt-0.5 ${textSecondary}`}>
                              {gap.discipline}
                            </span>
                          </td>

                          {/* Peso no Edital */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-200 dark:bg-[#1a2b4c] text-slate-800 dark:text-gray-200">
                              {gap.editalWeight}x
                            </span>
                          </td>

                          {/* Incidência de Erros */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-bold text-red-400 text-xs sm:text-sm">
                              {gap.errorCount} erro{gap.errorCount > 1 ? 's' : ''}
                            </span>
                            <span className={`text-[10px] block ${textSecondary}`}>
                              em {gap.examsCount} prova{gap.examsCount > 1 ? 's' : ''}
                            </span>
                          </td>

                          {/* Prioridade */}
                          <td className="py-3.5 px-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${badgeClass}`}>
                              {badgeIcon}
                              <span>{gap.severity}</span>
                            </span>
                          </td>

                          {/* Ação Recomendada */}
                          <td className="py-3.5 px-4">
                            <span className={`text-xs ${darkMode ? "text-gray-300" : "text-slate-700"}`}>
                              {gap.action}
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
        </div>

      </div>

    </div>
  );
};
