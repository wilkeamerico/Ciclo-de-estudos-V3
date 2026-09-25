import React, { useState, useMemo } from "react";
import { 
  ResponsiveContainer, BarChart, Bar, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  LineChart, Line, AreaChart, Area
} from "recharts";
import { StudyState, Disciplina, StudySession } from "../types";
import { formatarMinutosParaHHMMSS, formatarDataDDMMAAAA } from "../utils/studyHelpers";
import { 
  BarChart3, Calendar, Clock, Target, TrendingUp, AlertTriangle, 
  CheckCircle2, Filter, Layers, ArrowUpRight, ArrowDownRight, 
  Award, Sparkles, HelpCircle, ChevronLeft, ChevronRight, FileText,
  Download, PieChart, RefreshCw
} from "lucide-react";

interface RelatorioDesempenhoViewProps {
  state: StudyState;
  darkMode: boolean;
  onNavigateTab?: (tab: string) => void;
}

export default function RelatorioDesempenhoView({ state, darkMode, onNavigateTab }: RelatorioDesempenhoViewProps) {
  const { edital, metas, sessions = [], currentCycle } = state;

  // Flattened list of disciplines
  const disciplinas = useMemo(() => {
    const list: { disc: Disciplina; catNome: string }[] = [];
    edital.categorias.forEach((cat) => {
      cat.disciplinas.forEach((d) => {
        list.push({ disc: d, catNome: cat.nome });
      });
    });
    return list;
  }, [edital]);

  // Extract all available months from study sessions and current date
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    
    // Always include current month
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    monthSet.add(currentMonthKey);

    // Add months from recorded sessions
    sessions.forEach((s) => {
      if (s.data) {
        // Handle YYYY-MM-DD or DD/MM/YYYY
        let yearMonth = "";
        if (s.data.includes("-")) {
          const parts = s.data.split("-");
          if (parts.length >= 2) {
            yearMonth = `${parts[0]}-${parts[1].padStart(2, "0")}`;
          }
        } else if (s.data.includes("/")) {
          const parts = s.data.split("/");
          if (parts.length === 3) {
            yearMonth = `${parts[2]}-${parts[1].padStart(2, "0")}`;
          }
        }
        if (yearMonth) {
          monthSet.add(yearMonth);
        }
      }
    });

    return Array.from(monthSet).sort().reverse();
  }, [sessions]);

  // State: selected month (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // State: filter by category (TODAS, BÁSICOS, ESPECÍFICOS)
  const [selectedCategory, setSelectedCategory] = useState<"TODAS" | "BÁSICOS" | "ESPECÍFICOS">("TODAS");

  // State: Chart metric display mode (horas ou minutos)
  const [viewMetric, setViewMetric] = useState<"horas" | "percentual">("horas");

  // Format month name for display (ex: "Setembro de 2026")
  const formattedMonthName = useMemo(() => {
    const [year, month] = selectedMonth.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = date.toLocaleDateString("pt-BR", { month: "long" });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
  }, [selectedMonth]);

  // Navigate month
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 2, 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month, 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  // Sessions filtered by selected month
  const monthlySessions = useMemo(() => {
    return sessions.filter((s) => {
      if (!s.data) return false;
      let sessionMonthKey = "";
      if (s.data.includes("-")) {
        const parts = s.data.split("-");
        if (parts.length >= 2) {
          sessionMonthKey = `${parts[0]}-${parts[1].padStart(2, "0")}`;
        }
      } else if (s.data.includes("/")) {
        const parts = s.data.split("/");
        if (parts.length === 3) {
          sessionMonthKey = `${parts[2]}-${parts[1].padStart(2, "0")}`;
        }
      }
      return sessionMonthKey === selectedMonth;
    });
  }, [sessions, selectedMonth]);

  // Total cycle hours for proportional distribution
  const totalCicloHoras = useMemo(() => {
    return disciplinas.reduce((acc, { disc }) => acc + (disc.horasPorCiclo || 1.0), 0);
  }, [disciplinas]);

  // Weekly study hours goal calculated from metas.horasDisponiveis
  const weeklyTarget = useMemo(() => {
    if (!metas?.horasDisponiveis) return 20;
    const totalWeekly = Object.values(metas.horasDisponiveis).reduce((acc, val) => acc + (val || 0), 0);
    return totalWeekly > 0 ? totalWeekly : 20;
  }, [metas]);

  // Monthly planned hours calculation per discipline
  const comparisonData = useMemo(() => {
    const monthlyTargetTotal = weeklyTarget * 4.33; // average weeks in a month

    return disciplinas
      .filter(({ catNome }) => {
        if (selectedCategory === "BÁSICOS") return catNome.toUpperCase().includes("BÁSIC");
        if (selectedCategory === "ESPECÍFICOS") return catNome.toUpperCase().includes("ESPECÍF");
        return true;
      })
      .map(({ disc, catNome }) => {
        // 1. Calculate Real Study Time (minutes and hours) in this month
        const discSessions = monthlySessions.filter((s) => s.disciplinaId === disc.id || s.disciplinaNome === disc.nome);
        const realMinutes = discSessions.reduce((acc, s) => acc + (s.duracaoMinutos || 0), 0);
        const realHours = parseFloat((realMinutes / 60).toFixed(2));

        // 2. Questions in this month
        const acertos = discSessions.reduce((acc, s) => acc + (s.questoesAcertos || 0), 0);
        const erros = discSessions.reduce((acc, s) => acc + (s.questoesErros || 0), 0);
        const totalQuestoes = acertos + erros;
        const aproveitamento = totalQuestoes > 0 ? Math.round((acertos / totalQuestoes) * 100) : 0;

        // 3. Calculate Planned Study Time in this month
        // Proportional to its weight/hours in the cycle relative to monthly study goal
        const discCicloHoras = disc.horasPorCiclo || 1.0;
        const discRatio = totalCicloHoras > 0 ? discCicloHoras / totalCicloHoras : 1 / (disciplinas.length || 1);
        
        let plannedHours = 0;
        if (disc.horasTotais && disc.horasTotais > 0) {
          // If total plan is set, divide evenly across ~3 months
          plannedHours = parseFloat(Math.max(1, (disc.horasTotais / 3)).toFixed(2));
        } else {
          plannedHours = parseFloat((monthlyTargetTotal * discRatio).toFixed(2));
        }
        
        // Ensure at least a reasonable planned benchmark (e.g. at least 1h)
        if (plannedHours <= 0) plannedHours = discCicloHoras * 4;

        // 4. Variance / Saldo & % Fulfillment
        const saldoHours = parseFloat((realHours - plannedHours).toFixed(2));
        const percentFulfillment = plannedHours > 0 ? Math.round((realHours / plannedHours) * 100) : 0;

        let status: "superada" | "em_dia" | "atencao" | "critico" = "critico";
        if (percentFulfillment >= 100) status = "superada";
        else if (percentFulfillment >= 75) status = "em_dia";
        else if (percentFulfillment >= 40) status = "atencao";
        else status = "critico";

        return {
          id: disc.id,
          nome: disc.nome,
          catNome,
          cor: disc.cor || "#3b82f6",
          peso: disc.peso || 1,
          questoesEdital: disc.questoes || 10,
          realMinutes,
          realHours,
          plannedHours,
          saldoHours,
          percentFulfillment,
          acertos,
          erros,
          totalQuestoes,
          aproveitamento,
          status,
          sessionsCount: discSessions.length
        };
      });
  }, [disciplinas, selectedCategory, monthlySessions, weeklyTarget, totalCicloHoras]);

  // Overall Monthly Totals
  const monthlyMetrics = useMemo(() => {
    const totalRealHours = comparisonData.reduce((acc, d) => acc + d.realHours, 0);
    const totalPlannedHours = comparisonData.reduce((acc, d) => acc + d.plannedHours, 0);
    const totalRealMinutes = comparisonData.reduce((acc, d) => acc + d.realMinutes, 0);
    const totalSessions = comparisonData.reduce((acc, d) => acc + d.sessionsCount, 0);
    const totalQuestoes = comparisonData.reduce((acc, d) => acc + d.totalQuestoes, 0);
    const totalAcertos = comparisonData.reduce((acc, d) => acc + d.acertos, 0);

    const overallFulfillment = totalPlannedHours > 0 ? Math.round((totalRealHours / totalPlannedHours) * 100) : 0;
    const overallAccuracy = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;
    const overallSaldo = parseFloat((totalRealHours - totalPlannedHours).toFixed(2));

    // Best discipline and most lagging discipline
    const sortedByFulfillment = [...comparisonData].sort((a, b) => b.percentFulfillment - a.percentFulfillment);
    const topDiscipline = sortedByFulfillment.length > 0 ? sortedByFulfillment[0] : null;
    const laggingDiscipline = sortedByFulfillment.length > 0 ? sortedByFulfillment[sortedByFulfillment.length - 1] : null;

    return {
      totalRealHours: parseFloat(totalRealHours.toFixed(1)),
      totalPlannedHours: parseFloat(totalPlannedHours.toFixed(1)),
      totalRealMinutes,
      totalSessions,
      totalQuestoes,
      totalAcertos,
      overallFulfillment,
      overallAccuracy,
      overallSaldo,
      topDiscipline,
      laggingDiscipline
    };
  }, [comparisonData]);

  // Custom Tooltip for the Recharts Bar Chart
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md text-xs font-sans max-w-xs ${
          darkMode ? "bg-[#0b1328]/95 border-blue-500/40 text-white" : "bg-white/95 border-gray-200 text-gray-900 shadow-xl"
        }`}>
          <div className="flex items-center space-x-2 border-b border-gray-100/10 pb-2 mb-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: data.cor }} />
            <span className="font-extrabold text-sm truncate">{data.nome}</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-400 font-medium">Tempo Planejado:</span>
              <span className="font-mono font-bold text-indigo-400">{data.plannedHours}h</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-400 font-medium">Tempo Real Estudado:</span>
              <span className="font-mono font-bold text-emerald-400">{data.realHours}h ({data.realMinutes}m)</span>
            </div>
            <div className="flex justify-between items-center gap-4 pt-1 border-t border-gray-100/10">
              <span className="text-gray-400 font-medium">Saldo (Desvio):</span>
              <span className={`font-mono font-bold ${data.saldoHours >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {data.saldoHours >= 0 ? `+${data.saldoHours}h` : `${data.saldoHours}h`}
              </span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-400 font-medium">Cumprimento da Meta:</span>
              <span className={`font-mono font-extrabold ${
                data.percentFulfillment >= 100 ? "text-emerald-400" : data.percentFulfillment >= 75 ? "text-blue-400" : "text-amber-400"
              }`}>
                {data.percentFulfillment}%
              </span>
            </div>
            {data.totalQuestoes > 0 && (
              <div className="flex justify-between items-center gap-4 pt-1 border-t border-gray-100/10 text-[11px]">
                <span className="text-gray-400 font-medium">Questões:</span>
                <span className="font-bold text-blue-300">
                  {data.totalQuestoes} feitas ({data.aproveitamento}% acerto)
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      {/* HEADER BAR & CONTROLS */}
      <div className={`p-6 rounded-3xl border transition-all ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Description */}
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-blue-600/15 text-blue-500 shrink-0">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className={`text-xl font-extrabold tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Relatório de Desempenho
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  Tempo Real vs Planejado
                </span>
              </div>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
                Comparativo mensal detalhado de horas planejadas versus horas reais executadas por matéria.
              </p>
            </div>
          </div>

          {/* Month Selector & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Navigator */}
            <div className={`flex items-center rounded-2xl border p-1 ${
              darkMode ? "bg-[#14203e] border-[#25365e]" : "bg-gray-50 border-gray-200"
            }`}>
              <button
                onClick={handlePrevMonth}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  darkMode ? "text-gray-300 hover:bg-white/10 hover:text-white" : "text-gray-600 hover:bg-white hover:text-gray-900 shadow-xs"
                }`}
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="px-3 text-xs font-extrabold font-mono tracking-wide text-center min-w-[150px]">
                <span className={darkMode ? "text-blue-300" : "text-blue-700"}>{formattedMonthName}</span>
              </div>

              <button
                onClick={handleNextMonth}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  darkMode ? "text-gray-300 hover:bg-white/10 hover:text-white" : "text-gray-600 hover:bg-white hover:text-gray-900 shadow-xs"
                }`}
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                darkMode ? "bg-[#14203e] border-[#25365e] text-white" : "bg-white border-gray-200 text-gray-800 shadow-xs"
              }`}
            >
              <option value="TODAS">Todas as Áreas</option>
              <option value="BÁSICOS">Conhecimentos Básicos</option>
              <option value="ESPECÍFICOS">Conhecimentos Específicos</option>
            </select>
          </div>

        </div>
      </div>

      {/* KPI METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Tempo Planejado no Mês */}
        <div className={`p-5 rounded-3xl border transition-all ${
          darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 block mb-1">
                META PLANEJADA (MÊS)
              </span>
              <h3 className={`text-2xl font-mono font-black ${darkMode ? "text-white" : "text-gray-900"}`}>
                {monthlyMetrics.totalPlannedHours}h
              </h3>
            </div>
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 shrink-0">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-[11px] mt-3 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Baseado no ciclo ativo e meta semanal de <strong>{weeklyTarget}h/sem</strong>.
          </p>
        </div>

        {/* Card 2: Tempo Real Estudado no Mês */}
        <div className={`p-5 rounded-3xl border transition-all ${
          darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block mb-1">
                TEMPO REAL ESTUDADO
              </span>
              <h3 className={`text-2xl font-mono font-black ${
                monthlyMetrics.overallFulfillment >= 100 ? "text-emerald-400" : darkMode ? "text-emerald-300" : "text-emerald-600"
              }`}>
                {monthlyMetrics.totalRealHours}h
              </h3>
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-3 text-[11px]">
            <span className={`font-bold font-mono px-2 py-0.5 rounded-md ${
              monthlyMetrics.overallSaldo >= 0 
                ? "bg-emerald-500/15 text-emerald-400" 
                : "bg-rose-500/15 text-rose-400"
            }`}>
              {monthlyMetrics.overallSaldo >= 0 ? `+${monthlyMetrics.overallSaldo}h saldo` : `${monthlyMetrics.overallSaldo}h deficit`}
            </span>
            <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
              em {monthlyMetrics.totalSessions} sessões
            </span>
          </div>
        </div>

        {/* Card 3: Taxa de Cumprimento Geral */}
        <div className={`p-5 rounded-3xl border transition-all ${
          darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 block mb-1">
                CUMPRIMENTO DA META
              </span>
              <h3 className={`text-2xl font-mono font-black ${
                monthlyMetrics.overallFulfillment >= 100 
                  ? "text-emerald-400" 
                  : monthlyMetrics.overallFulfillment >= 75 
                  ? "text-blue-400" 
                  : "text-amber-400"
              }`}>
                {monthlyMetrics.overallFulfillment}%
              </h3>
            </div>
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="w-full bg-gray-200/50 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden mt-3.5">
            <div
              className={`h-full transition-all duration-1000 rounded-full ${
                monthlyMetrics.overallFulfillment >= 100 
                  ? "bg-emerald-500" 
                  : monthlyMetrics.overallFulfillment >= 75 
                  ? "bg-blue-500" 
                  : "bg-amber-500"
              }`}
              style={{ width: `${Math.min(monthlyMetrics.overallFulfillment, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 4: Questões & Produtividade no Mês */}
        <div className={`p-5 rounded-3xl border transition-all ${
          darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block mb-1">
                QUESTÕES RESOLVIDAS
              </span>
              <h3 className={`text-2xl font-mono font-black ${darkMode ? "text-white" : "text-gray-900"}`}>
                {monthlyMetrics.totalQuestoes} <span className="text-xs font-normal text-gray-400">questões</span>
              </h3>
            </div>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-[11px] mt-3 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Aproveitamento mensal: <strong className="text-emerald-400">{monthlyMetrics.overallAccuracy}% de acertos</strong>.
          </p>
        </div>

      </div>

      {/* MAIN CHART CARD: RECHARTS DUAL BAR COMPARISON */}
      <div className={`p-6 rounded-3xl border transition-all ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100/10">
          <div>
            <h3 className={`text-base font-extrabold uppercase tracking-wider ${darkMode ? "text-white" : "text-gray-900"}`}>
              Comparativo por Disciplina: Tempo Real vs Planejado
            </h3>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
              Valores calculados em horas para <strong>{formattedMonthName}</strong>.
            </p>
          </div>

          {/* Custom Legend description */}
          <div className="flex items-center space-x-4 text-xs font-bold">
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-indigo-500 shadow-sm" />
              <span className={darkMode ? "text-gray-300" : "text-gray-700"}>Tempo Planejado</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 shadow-sm" />
              <span className={darkMode ? "text-gray-300" : "text-gray-700"}>Tempo Real Estudado</span>
            </div>
          </div>
        </div>

        {/* Recharts Bar Chart Container */}
        {comparisonData.length > 0 ? (
          <div className="w-full h-[400px] sm:h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
                barGap={8}
                barCategoryGap="20%"
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={darkMode ? "#1e2d4d" : "#e2e8f0"} 
                  vertical={false} 
                />
                
                <XAxis 
                  dataKey="nome" 
                  stroke={darkMode ? "#94a3b8" : "#64748b"}
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                
                <YAxis 
                  stroke={darkMode ? "#94a3b8" : "#64748b"}
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}h`}
                />
                
                <Tooltip content={<CustomBarTooltip />} />

                {/* Bar 1: Planned Time */}
                <Bar 
                  dataKey="plannedHours" 
                  name="Tempo Planejado (h)" 
                  fill="#6366f1" 
                  radius={[6, 6, 0, 0]} 
                />

                {/* Bar 2: Real Study Time */}
                <Bar 
                  dataKey="realHours" 
                  name="Tempo Real Estudado (h)" 
                  fill="#10b981" 
                  radius={[6, 6, 0, 0]} 
                >
                  {comparisonData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.realHours >= entry.plannedHours ? "#10b981" : "#3b82f6"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed rounded-2xl border-gray-200 dark:border-gray-800">
            <Clock className="w-12 h-12 text-gray-400 mx-auto opacity-40 mb-3" />
            <p className={`text-sm font-semibold ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Nenhuma disciplina encontrada para os filtros selecionados.
            </p>
          </div>
        )}
      </div>

      {/* DETAILED ANALYTICAL TABLE */}
      <div className={`p-6 rounded-3xl border transition-all ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b border-gray-100/10">
          <div>
            <h3 className={`text-base font-extrabold uppercase tracking-wider ${darkMode ? "text-white" : "text-gray-900"}`}>
              Tabela Analítica de Cumprimento por Matéria
            </h3>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
              Detalhamento de horas planejadas, executadas, percentuais e saldo líquido.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b text-[10px] font-extrabold uppercase tracking-wider ${
                darkMode ? "border-gray-800 text-gray-400 bg-black/20" : "border-gray-200 text-gray-600 bg-gray-50"
              }`}>
                <th className="py-3.5 px-3">DISCIPLINA</th>
                <th className="py-3.5 px-3">ÁREA</th>
                <th className="py-3.5 px-3 text-center">PLANEJADO</th>
                <th className="py-3.5 px-3 text-center">REALIZADO</th>
                <th className="py-3.5 px-3 text-center">SALDO (DESVIO)</th>
                <th className="py-3.5 px-3">PROGRESSO DA META</th>
                <th className="py-3.5 px-3 text-center">QUESTÕES (ACERTO)</th>
                <th className="py-3.5 px-3 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/10">
              {comparisonData.map((d, idx) => (
                <tr 
                  key={d.id ? `rep-${d.id}` : `rep-idx-${idx}`}
                  className={`transition-colors hover:bg-blue-500/5 ${
                    darkMode ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {/* Disciplina */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.cor }} />
                      <span className="font-bold text-xs">{d.nome}</span>
                    </div>
                  </td>

                  {/* Categoria */}
                  <td className="py-3.5 px-3 text-gray-400 font-medium text-[11px]">
                    {d.catNome}
                  </td>

                  {/* Planejado */}
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-indigo-400">
                    {d.plannedHours}h
                  </td>

                  {/* Realizado */}
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-400">
                    {d.realHours}h
                  </td>

                  {/* Saldo */}
                  <td className="py-3.5 px-3 text-center font-mono font-bold">
                    <span className={d.saldoHours >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      {d.saldoHours >= 0 ? `+${d.saldoHours}h` : `${d.saldoHours}h`}
                    </span>
                  </td>

                  {/* Barra de Progresso */}
                  <td className="py-3.5 px-3 min-w-[160px]">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200/50 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            d.percentFulfillment >= 100 
                              ? "bg-emerald-500" 
                              : d.percentFulfillment >= 75 
                              ? "bg-blue-500" 
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(d.percentFulfillment, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-[11px] w-10 text-right">
                        {d.percentFulfillment}%
                      </span>
                    </div>
                  </td>

                  {/* Questões */}
                  <td className="py-3.5 px-3 text-center font-mono">
                    {d.totalQuestoes > 0 ? (
                      <span>
                        <strong className={darkMode ? "text-white" : "text-gray-800"}>{d.totalQuestoes}q</strong>
                        {" "}(<span className="text-emerald-400">{d.aproveitamento}%</span>)
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-3 text-right">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider inline-block ${
                      d.status === "superada"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : d.status === "em_dia"
                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                        : d.status === "atencao"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                    }`}>
                      {d.status === "superada" 
                        ? "Meta Superada" 
                        : d.status === "em_dia" 
                        ? "Em Dia" 
                        : d.status === "atencao" 
                        ? "Abaixo da Meta" 
                        : "Sem Estudo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SMART PEDAGOGICAL DIAGNOSIS & REVIEWS */}
      <div className={`p-6 rounded-3xl border transition-all ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
      }`}>
        <div className="flex items-center space-x-2.5 mb-4">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className={`text-base font-extrabold uppercase tracking-wider ${darkMode ? "text-white" : "text-gray-900"}`}>
            Diagnóstico Pedagógico do Mês
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className={`p-4 rounded-2xl border ${
            darkMode ? "bg-[#14203e]/40 border-emerald-900/30 text-emerald-300" : "bg-emerald-50/60 border-emerald-200 text-emerald-800"
          }`}>
            <h4 className="font-bold flex items-center gap-1.5 mb-1 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Destaques Positivos do Período
            </h4>
            <p className="leading-relaxed">
              {monthlyMetrics.topDiscipline && monthlyMetrics.topDiscipline.realHours > 0
                ? `A matéria com maior dedicação foi "${monthlyMetrics.topDiscipline.nome}", atingindo ${monthlyMetrics.topDiscipline.percentFulfillment}% da meta com ${monthlyMetrics.topDiscipline.realHours}h registradas.`
                : "Inicie o registro das suas sessões de estudo nos blocos para computar os destaques deste mês."}
            </p>
          </div>

          <div className={`p-4 rounded-2xl border ${
            darkMode ? "bg-[#14203e]/40 border-amber-900/30 text-amber-300" : "bg-amber-50/60 border-amber-200 text-amber-800"
          }`}>
            <h4 className="font-bold flex items-center gap-1.5 mb-1 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              Pontos de Atenção e Compensação
            </h4>
            <p className="leading-relaxed">
              {monthlyMetrics.laggingDiscipline && monthlyMetrics.laggingDiscipline.percentFulfillment < 100
                ? `A disciplina "${monthlyMetrics.laggingDiscipline.nome}" está com ${monthlyMetrics.laggingDiscipline.percentFulfillment}% da meta (${Math.abs(monthlyMetrics.laggingDiscipline.saldoHours)}h abaixo do planejado). Priorize seus blocos no próximo ciclo!`
                : "Excelente ritmo! Todas as disciplinas atingiram ou superaram a meta mensal planejada."}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
