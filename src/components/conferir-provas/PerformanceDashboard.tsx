import React, { useState } from 'react';
import { 
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
  HelpCircle
} from 'lucide-react';
import { ExamResult } from '../../types';

interface PerformanceDashboardProps {
  result: ExamResult;
  history?: ExamResult[];
  targetScore?: number;
  onGoToQuestions: () => void;
  onGoToStudy: () => void;
  darkMode?: boolean;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  result,
  history = [],
  targetScore = 85,
  onGoToQuestions,
  onGoToStudy,
  darkMode = false,
}) => {
  const { summary, disciplines } = result;

  // Build combined chronological dataset for the Evolution Line Chart
  const allExams = React.useMemo(() => {
    // Deduplicate by ID
    const map = new Map<string, ExamResult>();
    history.forEach((h) => map.set(h.id, h));
    map.set(result.id, result);

    const list = Array.from(map.values());
    // Sort ascending by creation date
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date || 0).getTime();
      const timeB = new Date(b.createdAt || b.date || 0).getTime();
      return timeA - timeB;
    });
    return list;
  }, [history, result]);

  // Format data points for the evolution line chart
  const evolutionData = React.useMemo(() => {
    return allExams.map((exam, idx) => {
      const rawTitle = exam.examTitle || `SIMULADO ${String(idx + 1).padStart(2, '0')}`;
      let shortName = rawTitle;
      if (shortName.includes(' - ')) {
        shortName = shortName.split(' - ')[0];
      }
      if (shortName.length > 15) {
        shortName = `SIMULADO ${String(idx + 1).padStart(2, '0')}`;
      }

      let dateFormatted = '';
      if (exam.createdAt || exam.date) {
        try {
          const d = new Date(exam.createdAt || exam.date || '');
          dateFormatted = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        } catch {
          dateFormatted = '';
        }
      }

      const label = dateFormatted ? `${shortName} (${dateFormatted})` : shortName;

      return {
        id: exam.id,
        label,
        simuladoNome: rawTitle,
        dataStr: dateFormatted,
        aproveitamento: Number(exam.summary.scorePercentage.toFixed(1)),
        meta: targetScore,
        acertos: `${exam.summary.totalCorrect}/${exam.summary.totalQuestions}`,
        pontos: exam.summary.weightedScore !== undefined ? exam.summary.weightedScore.toFixed(1) : exam.summary.totalCorrect,
      };
    });
  }, [allExams, targetScore]);

  // Max value for Y-axis calculation
  const maxScoreFound = Math.max(...evolutionData.map((d) => d.aproveitamento), targetScore, 100);
  const yAxisMax = Math.ceil(maxScoreFound / 20) * 20 + 20;

  // Radar chart data: Discipline names & accuracy %
  const radarData = disciplines.map((d) => ({
    subject: d.discipline.length > 14 ? d.discipline.substring(0, 12) + '...' : d.discipline,
    fullSubject: d.discipline,
    acuracia: Math.round(d.accuracyPercentage),
    peso: d.weight,
  }));

  const cardBg = darkMode ? "bg-[#101d3b] border-[#1e2d4d]" : "bg-white border-slate-200";
  const innerBg = darkMode ? "bg-[#0b1329] border-[#1a2b4c]" : "bg-slate-50 border-slate-200";
  const textPrimary = darkMode ? "text-white" : "text-slate-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-slate-500";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fade-in">
      
      {/* Top Header with title and quick actions */}
      <div className={`rounded-2xl border p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${cardBg}`}>
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">
            Diagnóstico Geral de Desempenho
          </span>
          <h2 className={`text-xl font-bold mt-0.5 ${textPrimary}`}>
            {result.examTitle || 'Análise da Prova'}
          </h2>
          <p className={`text-xs mt-1 ${textSecondary}`}>
            Calculado com base nas respostas assinaladas e nos critérios do edital escaneado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onGoToQuestions}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              darkMode
                ? "bg-[#15254d] border-[#233863] text-gray-200 hover:bg-[#1b2f60]"
                : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Ver Caderno Corrigido</span>
          </button>
          <button
            type="button"
            onClick={onGoToStudy}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Acessar Plano de Estudos</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Score % Card */}
        <div className={`rounded-2xl border p-5 shadow-xs space-y-2 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wide ${textSecondary}`}>
              Nota Geral / Acurácia
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-3xl font-black ${
              summary.scorePercentage >= 70 ? 'text-emerald-500' : summary.scorePercentage >= 50 ? 'text-amber-500' : 'text-red-500'
            }`}>
              {summary.scorePercentage.toFixed(1)}%
            </span>
            {summary.weightedScore !== undefined && (
              <span className={`text-xs ${textSecondary}`}>
                (Ponderada: {summary.weightedScore.toFixed(1)})
              </span>
            )}
          </div>
          <p className={`text-xs ${textSecondary}`}>
            {summary.totalCorrect} acertos de {summary.totalQuestions} questões
          </p>
        </div>

        {/* Cutoff Score Card */}
        <div className={`rounded-2xl border p-5 shadow-xs space-y-2 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wide ${textSecondary}`}>
              Corte Estimado (Edital)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-3xl font-black ${textPrimary}`}>
              {summary.estimatedCutoffScore ?? 75}%
            </span>
            <span className={`text-xs font-medium ${
              summary.scorePercentage >= (summary.estimatedCutoffScore ?? 75) ? 'text-emerald-500' : 'text-amber-500'
            }`}>
              {summary.scorePercentage >= (summary.estimatedCutoffScore ?? 75) ? 'Acima do corte' : 'Abaixo do corte'}
            </span>
          </div>
          <p className={`text-xs ${textSecondary}`}>
            Média histórica de competitividade
          </p>
        </div>

        {/* Correct / Wrong Balance */}
        <div className={`rounded-2xl border p-5 shadow-xs space-y-2 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wide ${textSecondary}`}>
              Distribuição de Respostas
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center space-x-3 text-xs pt-1">
            <div className="flex items-center space-x-1 text-emerald-500 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{summary.totalCorrect} Acertos</span>
            </div>
            <div className="flex items-center space-x-1 text-red-500 font-bold">
              <XCircle className="w-3.5 h-3.5" />
              <span>{summary.totalWrong} Erros</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-gray-400">
            <div className="flex items-center space-x-1">
              <MinusCircle className="w-3 h-3" />
              <span>{summary.totalBlank} Em branco</span>
            </div>
            <div className="flex items-center space-x-1 text-amber-500">
              <Award className="w-3 h-3" />
              <span>{summary.totalAnnulled} Anuladas</span>
            </div>
          </div>
        </div>

        {/* Classification Tier Card */}
        <div className={`rounded-2xl border p-5 shadow-xs space-y-2 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wide ${textSecondary}`}>
              Nível Competitivo
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-1">
            <span className={`inline-block text-xs font-extrabold px-3 py-1 rounded-lg border ${
              darkMode ? "bg-purple-950/40 border-purple-500/30 text-purple-300" : "bg-purple-50 border-purple-200 text-purple-700"
            }`}>
              {summary.performanceTier}
            </span>
          </div>
          <p className={`text-xs ${textSecondary}`}>
            Baseado na densidade e peso das matérias.
          </p>
        </div>

      </div>

      {/* General Diagnostic Banner */}
      <div className={`rounded-2xl p-6 shadow-xs border ${
        darkMode ? "bg-[#101d3b] border-indigo-500/30" : "bg-indigo-50/70 border-indigo-100"
      }`}>
        <div className="flex items-start space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className={`text-sm font-bold ${darkMode ? "text-indigo-300" : "text-indigo-950"}`}>
              Diagnóstico Pedagógico do Mentor IA
            </h3>
            <p className={`text-xs leading-relaxed ${darkMode ? "text-gray-300" : "text-slate-700"}`}>
              {summary.generalDiagnosis}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NOVO: GRÁFICO EVOLUÇÃO DOS ACERTOS - SIMULADO (CONFORME IMAGEM DO ANEXO) */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border p-6 shadow-xs flex flex-col space-y-4 ${cardBg}`}>
        
        {/* Header with Title, Subtitle and Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-100 dark:border-[#1e2d4d]">
          <div>
            <h3 className={`text-base sm:text-lg font-black flex items-center space-x-2 tracking-tight ${textPrimary}`}>
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span>GRÁFICO EVOLUÇÃO DOS ACERTOS - SIMULADO</span>
            </h3>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Evolução da pontuação percentual (%) do usuário ao longo do tempo (Meta Definida: <strong className="text-amber-400">{targetScore}%</strong>)
            </p>
          </div>

          {/* Toggle pill button */}
          <div className="flex items-center space-x-1 p-1 rounded-xl bg-blue-950/40 border border-blue-500/30 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>Linha (Evolução)</span>
            </button>
          </div>
        </div>

        {/* Evolution Line Chart Container */}
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={evolutionData}
              margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={darkMode ? "#1e2d4d" : "#e2e8f0"} 
                vertical={true}
              />
              <XAxis 
                dataKey="label" 
                tick={{ fill: darkMode ? '#94a3b8' : '#475569', fontSize: 11, fontWeight: 700 }}
                axisLine={{ stroke: darkMode ? '#1e2d4d' : '#cbd5e1' }}
                tickLine={{ stroke: darkMode ? '#1e2d4d' : '#cbd5e1' }}
                dy={10}
              />
              <YAxis 
                domain={[0, yAxisMax]} 
                ticks={[0, 40, 80, 120, 155]}
                tick={{ fill: darkMode ? '#94a3b8' : '#475569', fontSize: 11, fontWeight: 600 }}
                axisLine={{ stroke: darkMode ? '#1e2d4d' : '#cbd5e1' }}
                tickLine={{ stroke: darkMode ? '#1e2d4d' : '#cbd5e1' }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: darkMode ? '#0b1329' : '#ffffff',
                  borderColor: darkMode ? '#1e2d4d' : '#e2e8f0',
                  color: darkMode ? '#ffffff' : '#000000',
                  borderRadius: '1rem',
                  padding: '12px 16px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  fontSize: '12px',
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'aproveitamento') return [`${value}%`, '% Aproveitamento'];
                  return [value, name];
                }}
                labelFormatter={(label: string) => `Simulado: ${label}`}
              />

              {/* Meta Horizontal Dashed Line */}
              <ReferenceLine 
                y={targetScore} 
                stroke="#f59e0b" 
                strokeDasharray="4 4" 
                strokeWidth={2}
                label={{
                  value: `Meta (${targetScore}%)`,
                  position: 'bottom',
                  fill: '#f59e0b',
                  fontSize: 12,
                  fontWeight: 'bold',
                  dy: 5,
                }}
              />

              {/* Single smooth evolution line */}
              <Line
                type="monotone"
                dataKey="aproveitamento"
                name="% Aproveitamento"
                stroke="#3b82f6"
                strokeWidth={3.5}
                dot={{ r: 6, fill: '#ffffff', stroke: '#2563eb', strokeWidth: 3 }}
                activeDot={{ r: 8, fill: '#ffffff', stroke: '#1d4ed8', strokeWidth: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Footnote */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-500/20 inline-block" />
              <span className={`font-semibold ${textPrimary}`}>% Aproveitamento</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-amber-500 inline-block" />
              <span className="font-semibold text-amber-500">Meta Estabelecida ({targetScore}%)</span>
            </div>
          </div>
          {evolutionData.length <= 1 && (
            <span className={`text-[11px] italic ${textSecondary}`}>
              * Realize novos simulados para traçar a curva contínua de evolução.
            </span>
          )}
        </div>

      </div>

      {/* Radar Chart & Discipline Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Radar Chart (6 cols): Equilibrium & Accuracy per Discipline */}
        <div className={`lg:col-span-6 rounded-2xl border p-6 shadow-xs flex flex-col ${cardBg}`}>
          <div className="border-b pb-3 mb-4 border-slate-100 dark:border-[#1e2d4d]">
            <h3 className={`text-base font-bold ${textPrimary}`}>
              Equilíbrio e Acurácia por Disciplina
            </h3>
            <p className={`text-xs ${textSecondary}`}>
              Acurácia percentual por matéria de acordo com as regras do edital.
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke={darkMode ? "#1e2d4d" : "#e2e8f0"} />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: darkMode ? '#94a3b8' : '#475569', fontSize: 11, fontWeight: 600 }} 
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: darkMode ? '#64748b' : '#94a3b8', fontSize: 10 }}
                />
                <Radar
                  name="Acurácia (%)"
                  dataKey="acuracia"
                  stroke="#4f46e5"
                  fill="#6366f1"
                  fillOpacity={0.45}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: darkMode ? '#0b1329' : '#ffffff',
                    borderColor: darkMode ? '#1e2d4d' : '#e2e8f0',
                    color: darkMode ? '#ffffff' : '#000000',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Acurácia']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Disciplines Breakdown Table (6 cols) */}
        <div className={`lg:col-span-6 rounded-2xl border p-6 shadow-xs flex flex-col justify-between ${cardBg}`}>
          <div>
            <div className="border-b pb-3 mb-4 border-slate-100 dark:border-[#1e2d4d]">
              <h3 className={`text-base font-bold ${textPrimary}`}>
                Desempenho por Matéria
              </h3>
              <p className={`text-xs ${textSecondary}`}>
                Aproveitamento detalhado por matéria no simulado atual.
              </p>
            </div>

            <div className="space-y-3">
              {disciplines.map((d, index) => {
                const accuracy = d.accuracyPercentage;
                return (
                  <div key={index} className={`p-3.5 rounded-xl border ${innerBg} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-xs font-bold ${textPrimary}`}>
                          {d.discipline}
                        </span>
                        <span className={`text-[10px] block ${textSecondary}`}>
                          Peso {d.weight || 1} • {d.correctCount}/{d.totalQuestions} acertos
                        </span>
                      </div>
                      <span className={`text-xs font-black ${
                        accuracy >= 70 ? 'text-emerald-500' : accuracy >= 50 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {accuracy.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-[#1a2b4c] overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          accuracy >= 70 ? 'bg-emerald-500' : accuracy >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, accuracy))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 dark:border-[#1e2d4d] flex justify-end">
            <button
              type="button"
              onClick={onGoToStudy}
              className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
            >
              <span>Ver plano de ação para matérias críticas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
