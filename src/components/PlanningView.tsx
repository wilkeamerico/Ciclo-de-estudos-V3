import React, { useState, useMemo, useEffect } from "react";
import { StudyState, Metas, Disciplina } from "../types";
import { 
  Calendar, Clock, Target, CheckCircle2, Award, Zap, Flame, TrendingUp, 
  Sparkles, Hourglass, Activity, CheckCircle, ArrowRight, Settings, 
  RefreshCw, Save, Plus, Trash2, ChevronLeft, ChevronRight, Smile, 
  AlertCircle, Info, Layers, BookOpen, Sliders, CalendarDays, ListChecks
} from "lucide-react";
import { calcularSomaPontos, calcularPesoPercentual, calcularResumoMetas } from "../utils/studyHelpers";

interface PlanningViewProps {
  state: StudyState;
  updateState: (newState: StudyState) => void;
  darkMode: boolean;
}

export default function PlanningView({ state, updateState, darkMode }: PlanningViewProps) {
  const { edital, metas } = state;

  // --- LOCAL STATES FOR WEEKLY GOALS & PERIOD ---
  const [horasDisponiveis, setHorasDisponiveis] = useState<{ [key: string]: number }>(() => ({
    ...metas.horasDisponiveis
  }));
  const [dataInicial, setDataInicial] = useState(metas.dataInicial);
  const [dataFinal, setDataFinal] = useState(metas.dataFinal);
  const [diasImprodutivos, setDiasImprodutivos] = useState<string[]>(() => [...metas.diasImprodutivos]);
  const [newImprodutivoDate, setNewImprodutivoDate] = useState("");

  // Month navigation for Study Calendar
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<number>(() => {
    return new Date(metas.dataInicial + "T00:00:00").getMonth();
  });
  const [currentCalendarYear, setCurrentCalendarYear] = useState<number>(() => {
    return new Date(metas.dataInicial + "T00:00:00").getFullYear();
  });

  const weekdayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const monthNames = [
    "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
  ];

  // --- CÁLCULO DO PROGRESSO DA META DIÁRIA DE HOJE ---
  const todayProgress = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const todayISO = `${y}-${m}-${d}`;
    const dayOfWeekIndex = now.getDay();
    const dayName = weekdayNames[dayOfWeekIndex];

    const normalizeDateStr = (dateStr: string) => {
      if (!dateStr) return "";
      if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }
      return dateStr.split("T")[0];
    };

    const override = metas.calendarOverrides ? metas.calendarOverrides[todayISO] : undefined;
    const isImprodutivo = (metas.diasImprodutivos || []).includes(todayISO);
    const horasPadrao = Number(horasDisponiveis[dayOfWeekIndex.toString()] ?? 0);

    let metaHorasHoje = 0;
    let isDiaFolga = false;

    if (override !== undefined) {
      if (!override.productive) {
        isDiaFolga = true;
        metaHorasHoje = 0;
      } else {
        metaHorasHoje = Number(override.hours || horasPadrao);
      }
    } else if (isImprodutivo) {
      isDiaFolga = true;
      metaHorasHoje = 0;
    } else {
      metaHorasHoje = horasPadrao;
      isDiaFolga = horasPadrao === 0;
    }

    const sessionsHoje = (state.sessions || []).filter((s) => {
      return normalizeDateStr(s.data) === todayISO;
    });

    const totalMinutosHoje = sessionsHoje.reduce((acc, s) => acc + (s.duracaoMinutos || 0), 0);
    const totalHorasHoje = totalMinutosHoje / 60;
    const totalQuestoesAcertosHoje = sessionsHoje.reduce((acc, s) => acc + (s.questoesAcertos || 0), 0);
    const totalQuestoesErrosHoje = sessionsHoje.reduce((acc, s) => acc + (s.questoesErros || 0), 0);
    const totalQuestoesHoje = totalQuestoesAcertosHoje + totalQuestoesErrosHoje;
    const taxaAcertoHoje = totalQuestoesHoje > 0 ? Math.round((totalQuestoesAcertosHoje / totalQuestoesHoje) * 100) : null;

    const horasFormatadasHoje = Math.floor(totalMinutosHoje / 60);
    const minutosRestantesHoje = totalMinutosHoje % 60;
    const tempoEstudadoFormatado = horasFormatadasHoje > 0 
      ? `${horasFormatadasHoje}h ${minutosRestantesHoje > 0 ? `${minutosRestantesHoje}min` : ""}`.trim()
      : `${minutosRestantesHoje}min`;

    let percentage = 0;
    let restanteMinutos = 0;

    if (metaHorasHoje > 0) {
      const metaMinutos = metaHorasHoje * 60;
      percentage = Math.min(100, Math.round((totalMinutosHoje / metaMinutos) * 100));
      restanteMinutos = Math.max(0, metaMinutos - totalMinutosHoje);
    } else {
      percentage = totalMinutosHoje > 0 ? 100 : 0;
      restanteMinutos = 0;
    }

    const restanteHoras = Math.floor(restanteMinutos / 60);
    const restanteMins = restanteMinutos % 60;
    const tempoRestanteFormatado = restanteMinutos > 0
      ? `${restanteHoras > 0 ? `${restanteHoras}h ` : ""}${restanteMins}min restantes`
      : metaHorasHoje > 0 
      ? "Meta diária batida! 🎉"
      : isDiaFolga 
      ? "Dia de Descanso" 
      : "Sem meta definida";

    return {
      todayISO,
      dayName,
      formattedDate: `${d}/${m}/${y}`,
      metaHorasHoje,
      isDiaFolga,
      sessionsCount: sessionsHoje.length,
      totalMinutosHoje,
      totalHorasHoje,
      tempoEstudadoFormatado,
      percentage,
      realPercentage: metaHorasHoje > 0 ? Math.round((totalMinutosHoje / (metaHorasHoje * 60)) * 100) : 100,
      restanteMinutos,
      tempoRestanteFormatado,
      totalQuestoesHoje,
      totalQuestoesAcertosHoje,
      totalQuestoesErrosHoje,
      taxaAcertoHoje,
    };
  }, [metas, horasDisponiveis, state.sessions]);

  // Recalculates resume in real-time
  const resume = useMemo(() => {
    const currentMetas: Metas = {
      horasDisponiveis,
      dataInicial,
      dataFinal,
      diasImprodutivos,
      calendarOverrides: metas.calendarOverrides
    };
    return calcularResumoMetas(currentMetas);
  }, [horasDisponiveis, dataInicial, dataFinal, diasImprodutivos, metas.calendarOverrides]);

  const metaHorasTotal = resume.metaHorasTotal;
  const somaPontos = useMemo(() => calcularSomaPontos(edital), [edital]);

  // Real-time calculations for preparation stats
  const preparationStats = useMemo(() => {
    const { calendarOverrides } = metas;
    
    const obterDatas = (inicioStr: string, fimStr: string) => {
      const datas: string[] = [];
      const inicio = new Date(inicioStr + "T00:00:00");
      const fim = new Date(fimStr + "T00:00:00");
      if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return [];
      const atual = new Date(inicio);
      while (atual <= fim) {
        const ano = atual.getFullYear();
        const mes = String(atual.getMonth() + 1).padStart(2, "0");
        const dia = String(atual.getDate()).padStart(2, "0");
        datas.push(`${ano}-${mes}-${dia}`);
        atual.setDate(atual.getDate() + 1);
      }
      return datas;
    };

    const datas = obterDatas(dataInicial, dataFinal);
    const totalDias = datas.length;
    let diasImprodutivosCount = 0;
    let folgasSemanaisCount = 0;
    let horasTotaisLiquidas = 0;

    datas.forEach((dateStr) => {
      const dataObj = new Date(dateStr + "T00:00:00");
      const diaSemana = dataObj.getDay().toString();

      const override = calendarOverrides[dateStr];
      const isImprodutivo = diasImprodutivos.includes(dateStr);

      if (isImprodutivo) {
        diasImprodutivosCount++;
      } else if (override) {
        if (override.productive) {
          horasTotaisLiquidas += override.hours;
        } else {
          folgasSemanaisCount++;
        }
      } else {
        const horasPadrao = horasDisponiveis[diaSemana] || 0;
        if (horasPadrao > 0) {
          horasTotaisLiquidas += horasPadrao;
        } else {
          folgasSemanaisCount++;
        }
      }
    });

    return {
      totalDias,
      diasImprodutivosCount,
      folgasSemanaisCount,
      horasTotaisLiquidas
    };
  }, [dataInicial, dataFinal, diasImprodutivos, horasDisponiveis, metas]);

  // --- LOCAL DISCIPLINES LIST FOR PLANNING GRADE ---
  const [localDisciplinas, setLocalDisciplinas] = useState<Disciplina[]>([]);

  const somatoriaHorasPorCiclo = useMemo(() => {
    return localDisciplinas.reduce((acc, d) => acc + (d.horasPorCiclo || 0), 0);
  }, [localDisciplinas]);

  const qtdeTotalCiclos = useMemo(() => {
    if (somatoriaHorasPorCiclo <= 0) return 0;
    return Math.ceil(preparationStats.horasTotaisLiquidas / somatoriaHorasPorCiclo);
  }, [preparationStats.horasTotaisLiquidas, somatoriaHorasPorCiclo]);

  // Load and calculate local disciplines
  useEffect(() => {
    const list: Disciplina[] = [];
    edital.categorias.forEach((cat) => {
      cat.disciplinas.forEach((d) => {
        const pesoPercentual = calcularPesoPercentual(d, somaPontos);
        const horasTotaisCalculadas = Math.round(metaHorasTotal * (pesoPercentual / 100));

        const horasTotais = d.horasTotais || horasTotaisCalculadas;
        const divisorSugerido = horasTotais > 0 ? parseFloat((metaHorasTotal / horasTotais).toFixed(2)) : 1.5;
        const horasPorCiclo = d.horasPorCiclo || (divisorSugerido > 0 && divisorSugerido < 4 ? divisorSugerido : 1.5);
        const ciclosTotais = Math.max(1, Math.round(horasTotais / horasPorCiclo));

        list.push({
          ...d,
          horasTotais,
          horasPorCiclo: parseFloat(horasPorCiclo.toFixed(2)),
          ciclosTotais
        });
      });
    });
    setLocalDisciplinas(list);
  }, [edital, somaPontos, metaHorasTotal]);

  const handleUpdateLocalField = (
    discId: string,
    field: "horasTotais" | "horasPorCiclo",
    val: number
  ) => {
    setLocalDisciplinas((prev) =>
      prev.map((d) => {
        if (d.id === discId) {
          const updated = { ...d, [field]: val };
          const hTotais = field === "horasTotais" ? val : (d.horasTotais || 0);
          const hCiclo = field === "horasPorCiclo" ? val : (d.horasPorCiclo || 1.5);
          updated.ciclosTotais = hCiclo > 0 ? Math.max(1, Math.round(hTotais / hCiclo)) : 1;
          return updated;
        }
        return d;
      })
    );
  };

  // --- SAVE ALL (PERIOD, GOALS, CALENDAR & DISCIPLINES GRADE) ---
  const handleSaveAll = () => {
    const updatedMetas: Metas = {
      horasDisponiveis,
      dataInicial,
      dataFinal,
      diasImprodutivos,
      calendarOverrides: metas.calendarOverrides
    };

    const updatedCategorias = edital.categorias.map((cat) => {
      return {
        ...cat,
        disciplinas: cat.disciplinas.map((d) => {
          const localMatch = localDisciplinas.find((ld) => ld.id === d.id);
          if (localMatch) {
            return {
              ...d,
              horasTotais: localMatch.horasTotais,
              horasPorCiclo: localMatch.horasPorCiclo,
              ciclosTotais: localMatch.ciclosTotais
            };
          }
          return d;
        })
      };
    });

    updateState({
      ...state,
      metas: updatedMetas,
      edital: {
        ...edital,
        categorias: updatedCategorias
      }
    });

    alert("✅ Planejamento de Estudos sincronizado e salvo com sucesso!");
  };

  // --- UNPRODUCTIVE DATES HANDLERS ---
  const handleAddImprodutivoDate = () => {
    if (!newImprodutivoDate) return;
    if (!diasImprodutivos.includes(newImprodutivoDate)) {
      const updated = [...diasImprodutivos, newImprodutivoDate].sort();
      setDiasImprodutivos(updated);
      
      updateState({
        ...state,
        metas: {
          ...metas,
          diasImprodutivos: updated
        }
      });
    }
    setNewImprodutivoDate("");
  };

  const handleDeleteImprodutivoDate = (dateStr: string) => {
    const updated = diasImprodutivos.filter((d) => d !== dateStr);
    setDiasImprodutivos(updated);
    
    updateState({
      ...state,
      metas: {
        ...metas,
        diasImprodutivos: updated
      }
    });
  };

  // --- CALENDAR MONTH NAVIGATION ---
  const handlePrevMonth = () => {
    if (currentCalendarMonth === 0) {
      setCurrentCalendarMonth(11);
      setCurrentCalendarYear(currentCalendarYear - 1);
    } else {
      setCurrentCalendarMonth(currentCalendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentCalendarMonth === 11) {
      setCurrentCalendarMonth(0);
      setCurrentCalendarYear(currentCalendarYear + 1);
    } else {
      setCurrentCalendarMonth(currentCalendarMonth + 1);
    }
  };

  const calendarDaysGrid = useMemo(() => {
    const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1);
    const startOffset = firstDay.getDay();
    const totalDaysInMonth = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const mStr = String(currentCalendarMonth + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateStr = `${currentCalendarYear}-${mStr}-${dStr}`;
      days.push({ dayNum: d, dateStr });
    }

    return days;
  }, [currentCalendarMonth, currentCalendarYear]);

  const handleToggleDay = (dateStr: string) => {
    const isInPeriod = dateStr >= dataInicial && dateStr <= dataFinal;
    if (!isInPeriod) return;

    const currentOverride = metas.calendarOverrides[dateStr];
    let newOverrides = { ...metas.calendarOverrides };

    if (currentOverride) {
      newOverrides[dateStr] = {
        productive: !currentOverride.productive,
        hours: !currentOverride.productive ? (horasDisponiveis[new Date(dateStr + "T00:00:00").getDay().toString()] || 3) : 0
      };
    } else {
      const isImprodutivo = diasImprodutivos.includes(dateStr);
      if (isImprodutivo) {
        newOverrides[dateStr] = {
          productive: true,
          hours: horasDisponiveis[new Date(dateStr + "T00:00:00").getDay().toString()] || 3
        };
      } else {
        newOverrides[dateStr] = {
          productive: false,
          hours: 0
        };
      }
    }

    updateState({
      ...state,
      metas: {
        ...metas,
        calendarOverrides: newOverrides
      }
    });
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      {/* CABEÇALHO UNIFICADO DO PLANEJAMENTO DE ESTUDOS */}
      <div className={`p-6 sm:p-7 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d] text-white" : "bg-white border-gray-200 text-gray-900"
      }`}>
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-400/20">
                Módulo Integrado
              </span>
              <span className="text-xs font-semibold text-gray-400">
                Metas, Calendário & Distribuição de Horas
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
              Planejamento de Estudos
            </h2>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5 max-w-2xl`}>
              Defina sua rotina semanal de estudos, gerencie o período e feriados no calendário, e distribua as horas líquidas entre as disciplinas do edital.
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveAll}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer shrink-0"
          id="btn-salvar-planejamento-estudos"
        >
          <Save className="w-4 h-4" />
          <span>Salvar & Sincronizar Tudo</span>
        </button>
      </div>

      {/* SEÇÃO 1: COMPONENTE DE PROGRESSO CIRCULAR DA META DIÁRIA DE HOJE */}
      <div className={`p-6 sm:p-7 rounded-2xl border transition-all shadow-lg ${
        todayProgress.realPercentage >= 100 && todayProgress.metaHorasHoje > 0
          ? darkMode 
            ? "bg-gradient-to-br from-[#0c231e] via-[#0f1b35] to-[#121c2e] border-emerald-500/40 shadow-emerald-950/20" 
            : "bg-gradient-to-br from-emerald-50/70 via-white to-blue-50/50 border-emerald-200 shadow-sm"
          : darkMode 
          ? "bg-[#0f1b35] border-[#1e2d4d]" 
          : "bg-white border-gray-200 shadow-sm"
      }`}>
        
        {/* Cabeçalho do Card de Progresso Diário */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-100/10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                todayProgress.realPercentage >= 100 && todayProgress.metaHorasHoje > 0
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400/40"
                  : todayProgress.isDiaFolga
                  ? "bg-purple-500/20 text-purple-400 border border-purple-400/40"
                  : todayProgress.totalMinutosHoje > 0
                  ? "bg-blue-500/20 text-blue-400 border border-blue-400/40"
                  : "bg-amber-500/20 text-amber-400 border border-amber-400/40"
              }`}>
                {todayProgress.realPercentage >= 100 && todayProgress.metaHorasHoje > 0
                  ? `🏆 Meta Cumprida (${todayProgress.realPercentage}%)`
                  : todayProgress.isDiaFolga && todayProgress.totalMinutosHoje === 0
                  ? "🌴 Dia de Folga"
                  : todayProgress.isDiaFolga && todayProgress.totalMinutosHoje > 0
                  ? `✨ Estudo Extra (${todayProgress.tempoEstudadoFormatado})`
                  : todayProgress.totalMinutosHoje > 0
                  ? `⏳ Em Andamento (${todayProgress.percentage}%)`
                  : "🚀 Não Iniciado"}
              </span>
              <span className="text-xs font-semibold text-gray-400">
                {todayProgress.dayName}, {todayProgress.formattedDate}
              </span>
            </div>
            <h3 className={`text-lg sm:text-xl font-black flex items-center gap-2 mt-1 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              <Target className="w-5 h-5 text-blue-500" />
              Progresso da Meta Diária de Hoje
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
              darkMode ? "bg-white/5 border-white/10 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"
            }`}>
              Meta do Dia: <strong className="text-blue-500">{todayProgress.metaHorasHoje}h</strong>
            </span>
          </div>
        </div>

        {/* Corpo com Gráfico Circular e Métricas */}
        <div className="pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Gráfico Circular SVG */}
          <div className="md:col-span-4 flex flex-col items-center justify-center relative select-none">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                <defs>
                  <linearGradient id="circleProgressGradPlan" x1="0%" y1="0%" x2="100%" y2="100%">
                    {todayProgress.realPercentage >= 100 ? (
                      <>
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </>
                    ) : todayProgress.percentage >= 50 ? (
                      <>
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </>
                    ) : (
                      <>
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </>
                    )}
                  </linearGradient>
                </defs>

                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  fill="transparent"
                  stroke={darkMode ? "#1e293b" : "#e2e8f0"}
                  strokeWidth="10"
                  strokeLinecap="round"
                />

                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  fill="transparent"
                  stroke="url(#circleProgressGradPlan)"
                  strokeWidth="10"
                  strokeDasharray={339.292}
                  strokeDashoffset={339.292 - (todayProgress.percentage / 100) * 339.292}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                {todayProgress.realPercentage >= 100 && todayProgress.metaHorasHoje > 0 ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce mb-0.5" />
                    <span className={`text-xl font-black leading-none ${darkMode ? "text-emerald-300" : "text-emerald-600"}`}>
                      {todayProgress.realPercentage}%
                    </span>
                    <span className="text-[9px] font-bold text-emerald-400/90 uppercase tracking-wider mt-1">
                      Concluído
                    </span>
                  </>
                ) : todayProgress.isDiaFolga && todayProgress.totalMinutosHoje === 0 ? (
                  <>
                    <Smile className="w-8 h-8 text-purple-400 mb-0.5" />
                    <span className={`text-base font-black leading-tight ${darkMode ? "text-purple-300" : "text-purple-600"}`}>
                      Folga
                    </span>
                    <span className="text-[9px] font-semibold text-gray-400 mt-0.5">
                      Descanso
                    </span>
                  </>
                ) : (
                  <>
                    <span className={`text-2xl font-black tracking-tight leading-none ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                      {todayProgress.percentage}%
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 mt-1">
                      {todayProgress.tempoEstudadoFormatado}
                    </span>
                    <span className="text-[9px] font-semibold text-blue-400">
                      de {todayProgress.metaHorasHoje}h meta
                    </span>
                  </>
                )}
              </div>
            </div>

            <p className="text-[11px] font-medium text-gray-400 text-center mt-2.5">
              {todayProgress.realPercentage >= 100 && todayProgress.metaHorasHoje > 0
                ? "Parabéns! Meta de hoje atingida com êxito!"
                : todayProgress.percentage >= 50
                ? "Mais da metade concluída! Mantenha o foco!"
                : todayProgress.totalMinutosHoje > 0
                ? "Estudo em andamento. Continue firme!"
                : todayProgress.isDiaFolga
                ? "Dia planejado para descanso ou revisões livres."
                : "Inicie suas sessões para preencher a meta de hoje."}
            </p>
          </div>

          {/* Grid de 4 Métricas Detalhadas do Dia */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Métrica 1: Tempo Estudado Hoje */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
              darkMode ? "bg-[#16223f]/60 border-blue-900/40" : "bg-gray-50/80 border-gray-200"
            }`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                  Estudado Hoje
                </span>
                <span className={`text-lg font-black block mt-0.5 ${
                  todayProgress.totalMinutosHoje > 0 ? "text-blue-400" : darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                  {todayProgress.tempoEstudadoFormatado}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {todayProgress.totalMinutosHoje} minutos contabilizados
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* Métrica 2: Meta Programada */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
              darkMode ? "bg-[#16223f]/60 border-blue-900/40" : "bg-gray-50/80 border-gray-200"
            }`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                  Meta Programada
                </span>
                <span className="text-lg font-black block mt-0.5 text-indigo-400">
                  {todayProgress.metaHorasHoje > 0 ? `${todayProgress.metaHorasHoje}h 00min` : "Dia Livre / Folga"}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  Planejamento de {todayProgress.dayName}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Target className="w-5 h-5" />
              </div>
            </div>

            {/* Métrica 3: Horas Restantes */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
              darkMode ? "bg-[#16223f]/60 border-blue-900/40" : "bg-gray-50/80 border-gray-200"
            }`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                  Restante para a Meta
                </span>
                <span className={`text-lg font-black block mt-0.5 ${
                  todayProgress.restanteMinutos === 0 && todayProgress.metaHorasHoje > 0
                    ? "text-emerald-400"
                    : todayProgress.restanteMinutos > 0
                    ? "text-amber-400"
                    : "text-gray-400"
                }`}>
                  {todayProgress.tempoRestanteFormatado}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {todayProgress.restanteMinutos > 0 
                    ? `${todayProgress.restanteMinutos} min restantes hoje` 
                    : "Sem pendências diárias"}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl ${
                todayProgress.restanteMinutos === 0 && todayProgress.metaHorasHoje > 0
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}>
                {todayProgress.restanteMinutos === 0 && todayProgress.metaHorasHoje > 0 ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Hourglass className="w-5 h-5" />
                )}
              </div>
            </div>

            {/* Métrica 4: Sessões e Questões de Hoje */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
              darkMode ? "bg-[#16223f]/60 border-blue-900/40" : "bg-gray-50/80 border-gray-200"
            }`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                  Atividade de Hoje
                </span>
                <span className="text-lg font-black block mt-0.5 text-emerald-400">
                  {todayProgress.sessionsCount} {todayProgress.sessionsCount === 1 ? "sessão" : "sessões"}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {todayProgress.totalQuestoesHoje > 0 
                    ? `${todayProgress.totalQuestoesHoje} questões (${todayProgress.totalQuestoesAcertosHoje} acertos • ${todayProgress.taxaAcertoHoje}%)`
                    : "Nenhuma questão hoje"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Flame className="w-5 h-5" />
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* SEÇÃO 2: HORAS DIÁRIAS, PERÍODO & RESUMO GERAL DA PREPARAÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* CARD 1: CONFIGURAÇÃO DE HORAS POR DIA DA SEMANA */}
        <div className={`lg:col-span-4 p-6 rounded-2xl border transition-colors flex flex-col justify-between ${
          darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
        }`}>
          <div>
            <div className="border-b border-gray-100/10 pb-3 mb-4 flex justify-between items-center">
              <div>
                <h3 className={`text-base font-bold uppercase tracking-wider flex items-center gap-2 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                  <Sliders className="w-4 h-4 text-blue-500" />
                  Horas Diárias
                </h3>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
                  Meta padrão por dia da semana
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {weekdayNames.map((name, index) => {
                const dayKey = index.toString();
                const val = horasDisponiveis[dayKey] ?? 0;
                return (
                  <div key={dayKey} className={`flex items-center justify-between p-2 rounded-xl border ${
                    darkMode ? "bg-[#16223f] border-[#25365e]" : "bg-gray-50 border-gray-200"
                  }`}>
                    <span className="text-xs font-semibold pl-2">{name}</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={val}
                        onChange={(e) => {
                          const num = Math.max(0, parseInt(e.target.value) || 0);
                          setHorasDisponiveis({ ...horasDisponiveis, [dayKey]: num });
                        }}
                        className={`w-16 text-center py-1 rounded border text-xs font-bold outline-none ${
                          darkMode 
                            ? "bg-[#0f1b35] border-[#20315a] text-white focus:border-blue-500" 
                            : "bg-white border-gray-300 text-gray-800 focus:border-blue-600"
                        }`}
                      />
                      <span className={`text-xs font-bold pr-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100/10">
            <span className={`text-xs block text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Defina 0h nos dias de descanso semanal programado.
            </span>
          </div>
        </div>

        {/* CARD 2: PERÍODO DO CONCURSO & RESUMO DA CARGA HORÁRIA */}
        <div className={`lg:col-span-8 p-6 rounded-2xl border transition-colors flex flex-col justify-between ${
          darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
        }`}>
          <div>
            <div className="border-b border-gray-100/10 pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className={`text-base font-bold uppercase tracking-wider flex items-center gap-2 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                  <CalendarDays className="w-4 h-4 text-blue-500" />
                  Período do Cronograma & Contagem Regressiva
                </h3>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
                  Defina o início e o dia limite da sua preparação para cálculo instantâneo de prazos, folgas e carga horária líquida
                </p>
              </div>

              {resume.diasRestantesAteFim > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-400 text-xs font-bold shrink-0">
                  <Hourglass className="w-3.5 h-3.5 animate-pulse" />
                  <span>Faltam {resume.diasRestantesAteFim} dias</span>
                </div>
              )}
            </div>

            {/* INPUTS DE DATA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                  Data Inicial (Início dos Estudos)
                </label>
                <input
                  type="date"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-sm font-semibold outline-none transition-all ${
                    darkMode 
                      ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500" 
                      : "bg-gray-50 border-gray-300 text-gray-800 focus:border-blue-600"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                  Data Final (Dia Marcado / Prova)
                </label>
                <input
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-sm font-semibold outline-none transition-all ${
                    darkMode 
                      ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500" 
                      : "bg-gray-50 border-gray-300 text-gray-800 focus:border-blue-600"
                  }`}
                />
              </div>
            </div>

            {/* BANNER DE DESTAQUE: TEMPO ATÉ O DIA MARCADO (DATA FINAL) */}
            <div className={`p-4 rounded-xl border mb-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              darkMode 
                ? "bg-gradient-to-r from-[#112248] via-[#162a56] to-[#0f1b35] border-blue-500/30" 
                : "bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white border-blue-200"
            }`}>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                    Tempo até o Dia Marcado
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className={`text-xl font-black ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {resume.diasRestantesAteFim > 0 
                        ? `${resume.diasRestantesAteFim} dias restantes` 
                        : resume.diasRestantesAteFim === 0 
                        ? "Hoje é a data final!" 
                        : "Data final concluída"}
                    </span>
                    {resume.diasRestantesAteFim > 0 && (
                      <span className="text-xs font-semibold text-gray-400">
                        (~{Math.floor(resume.diasRestantesAteFim / 7)} sem e {resume.diasRestantesAteFim % 7} dias)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-200/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Período Completo
                </span>
                <span className={`text-xs font-black ${darkMode ? "text-blue-300" : "text-blue-700"}`}>
                  {dataInicial.split("-").reverse().join("/")} até {dataFinal.split("-").reverse().join("/")}
                </span>
              </div>
            </div>

            {/* GRID COM AS 6 MÉTRICAS DETALHADAS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              
              {/* 1: Dias Totais */}
              <div className={`p-3 rounded-xl border ${
                darkMode ? "bg-[#16223f] border-[#20325d]" : "bg-gray-50 border-gray-200"
              }`}>
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Dias Totais
                </span>
                <span className="text-lg font-black text-blue-400 block mt-0.5">
                  {resume.totalDias ?? 0} <span className="text-xs font-normal">dias</span>
                </span>
                <span className="text-[9px] text-gray-400 font-medium">
                  Duração total
                </span>
              </div>

              {/* 2: Dias Produtivos */}
              <div className={`p-3 rounded-xl border ${
                darkMode ? "bg-[#16223f] border-[#20325d]" : "bg-emerald-50/50 border-emerald-200"
              }`}>
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-emerald-800"}`}>
                  Dias Estudo
                </span>
                <span className="text-lg font-black text-emerald-400 block mt-0.5">
                  {resume.diasProdutivos ?? 0} <span className="text-xs font-normal">dias</span>
                </span>
                <span className="text-[9px] text-gray-400 font-medium">
                  Dias úteis de estudo
                </span>
              </div>

              {/* 3: Improdutivos */}
              <div className={`p-3 rounded-xl border ${
                darkMode ? "bg-[#16223f] border-[#20325d]" : "bg-rose-50/50 border-rose-200"
              }`}>
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-rose-800"}`}>
                  Improdutivos
                </span>
                <span className="text-lg font-black text-rose-400 block mt-0.5">
                  {resume.diasImprodutivosCount ?? 0} <span className="text-xs font-normal">dias</span>
                </span>
                <span className="text-[9px] text-gray-400 font-medium">
                  Feriados cadastrados
                </span>
              </div>

              {/* 4: Folgas Semanais */}
              <div className={`p-3 rounded-xl border ${
                darkMode ? "bg-[#16223f] border-[#20325d]" : "bg-amber-50/50 border-amber-200"
              }`}>
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-amber-800"}`}>
                  Folgas Seman.
                </span>
                <span className="text-lg font-black text-amber-400 block mt-0.5">
                  {resume.folgasSemanaisCount ?? 0} <span className="text-xs font-normal">dias</span>
                </span>
                <span className="text-[9px] text-gray-400 font-medium">
                  Descanso programado
                </span>
              </div>

              {/* 5: Horas Totais */}
              <div className={`p-3 rounded-xl border ${
                darkMode ? "bg-[#16223f] border-[#20325d]" : "bg-emerald-50 border-emerald-200 text-emerald-900"
              }`}>
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-emerald-800"}`}>
                  Horas Totais
                </span>
                <span className="text-lg font-black text-emerald-500 block mt-0.5">
                  {resume.metaHorasTotal ?? 0} <span className="text-xs font-normal">h</span>
                </span>
                <span className="text-[9px] text-gray-400 font-medium">
                  Carga líquida total
                </span>
              </div>

              {/* 6: Carga Semanal */}
              <div className={`p-3 rounded-xl border ${
                darkMode ? "bg-[#16223f] border-[#20325d]" : "bg-indigo-50/50 border-indigo-200"
              }`}>
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-indigo-800"}`}>
                  Carga Semanal
                </span>
                <span className="text-lg font-black text-indigo-400 block mt-0.5">
                  {resume.cargaHorariaSemanal ?? 0} <span className="text-xs font-normal">h</span>
                </span>
                <span className="text-[9px] text-gray-400 font-medium">
                  Meta por semana
                </span>
              </div>

            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-gray-100/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              {resume.diasProdutivos > 0 ? (
                <>Média necessária: <strong className="text-blue-500">{(resume.metaHorasTotal / resume.diasProdutivos).toFixed(1)}h</strong> por dia de estudo.</>
              ) : (
                "Configure ao menos 1 dia produtivo para calcular a média diária."
              )}
            </span>

            <button
              onClick={handleSaveAll}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Período & Metas</span>
            </button>
          </div>
        </div>

      </div>

      {/* SEÇÃO 3: CALENDÁRIO INTERATIVO DE EXCEÇÕES & DIAS IMPRODUTIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* CALENDÁRIO INTERATIVO */}
        <div className={`lg:col-span-8 p-6 rounded-2xl border transition-colors ${
          darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100/10">
            <div>
              <h3 className={`text-base font-bold uppercase tracking-wider ${darkMode ? "text-white" : "text-gray-900"}`}>
                Calendário de Estudos
              </h3>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
                Clique em qualquer dia do período para alternar entre dia produtivo ou folga
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevMonth}
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  darkMode ? "bg-[#16223f] border-[#25365e] hover:bg-[#1a2c53]" : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                }`}
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs font-black px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                {monthNames[currentCalendarMonth]} {currentCalendarYear}
              </span>

              <button
                onClick={handleNextMonth}
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  darkMode ? "bg-[#16223f] border-[#25365e] hover:bg-[#1a2c53]" : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                }`}
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* GRID DO CALENDÁRIO */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
            {weekdayNames.map((w, idx) => (
              <div key={idx} className={`py-1 text-[10px] font-black uppercase tracking-wider ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}>
                {w.substring(0, 3)}
              </div>
            ))}

            {calendarDaysGrid.map((dayObj, index) => {
              if (!dayObj) {
                return <div key={`empty-${index}`} className="h-14 sm:h-16 rounded-xl opacity-0" />;
              }

              const { dayNum, dateStr } = dayObj;
              const isInPeriod = dateStr >= dataInicial && dateStr <= dataFinal;
              const isToday = dateStr === todayProgress.todayISO;
              
              const dayOfWeek = new Date(dateStr + "T00:00:00").getDay().toString();
              const horasPadrao = horasDisponiveis[dayOfWeek] ?? 0;
              const isImprodutivo = diasImprodutivos.includes(dateStr);
              const override = metas.calendarOverrides ? metas.calendarOverrides[dateStr] : undefined;

              let isProductive = false;
              let hours = 0;

              if (override !== undefined) {
                isProductive = override.productive;
                hours = override.hours;
              } else if (isImprodutivo) {
                isProductive = false;
                hours = 0;
              } else {
                isProductive = horasPadrao > 0;
                hours = horasPadrao;
              }

              return (
                <div
                  key={dateStr}
                  onClick={() => isInPeriod && handleToggleDay(dateStr)}
                  className={`h-14 sm:h-16 p-1.5 rounded-xl border flex flex-col justify-between transition-all select-none ${
                    !isInPeriod
                      ? darkMode ? "bg-[#0a1224]/40 border-transparent opacity-25" : "bg-gray-100/50 border-transparent opacity-30"
                      : isProductive
                      ? darkMode 
                        ? "bg-[#112347] border-blue-500/40 text-white hover:border-blue-400 cursor-pointer" 
                        : "bg-blue-50/80 border-blue-200 text-blue-950 hover:bg-blue-100/80 cursor-pointer"
                      : darkMode
                      ? "bg-[#21122a] border-purple-500/30 text-purple-200 hover:border-purple-400 cursor-pointer"
                      : "bg-purple-50/80 border-purple-200 text-purple-950 hover:bg-purple-100/80 cursor-pointer"
                  } ${isToday ? "ring-2 ring-blue-500 shadow-md" : ""}`}
                  title={isInPeriod ? `${dateStr}: ${isProductive ? `${hours}h de estudo` : "Folga/Descanso"}` : "Fora do período"}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] font-black ${isToday ? "text-blue-500" : ""}`}>
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </div>

                  <div className="text-center">
                    {isInPeriod && (
                      <span className={`text-[9px] font-bold block ${
                        isProductive 
                          ? darkMode ? "text-blue-300" : "text-blue-700"
                          : darkMode ? "text-purple-300" : "text-purple-700"
                      }`}>
                        {isProductive ? `${hours}h` : "Folga"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legenda do Calendário */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 mt-4 border-t border-gray-100/10 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-md bg-blue-500" />
              <span className={darkMode ? "text-gray-300" : "text-gray-600"}>Dia Produtivo</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-md bg-purple-500" />
              <span className={darkMode ? "text-gray-300" : "text-gray-600"}>Folga / Descanso</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-md border-2 border-blue-500" />
              <span className={darkMode ? "text-gray-300" : "text-gray-600"}>Hoje</span>
            </div>
          </div>
        </div>

        {/* DIAS IMPRODUTIVOS / FERIADOS ESPECÍFICOS */}
        <div className={`lg:col-span-4 p-6 rounded-2xl border transition-colors flex flex-col justify-between ${
          darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
        }`}>
          <div>
            <div className="border-b border-gray-100/10 pb-3 mb-4">
              <h3 className={`text-base font-bold uppercase tracking-wider ${darkMode ? "text-white" : "text-gray-900"}`}>
                Dias Improdutivos
              </h3>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
                Cadastre feriados ou compromissos para descontar da carga líquida
              </p>
            </div>

            {/* Campo para adicionar nova data improdutiva */}
            <div className="flex space-x-2 mb-4">
              <input
                type="date"
                value={newImprodutivoDate}
                onChange={(e) => setNewImprodutivoDate(e.target.value)}
                className={`flex-1 p-2 rounded-xl border text-xs font-semibold outline-none ${
                  darkMode 
                    ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500" 
                    : "bg-gray-50 border-gray-300 text-gray-800 focus:border-blue-600"
                }`}
              />
              <button
                onClick={handleAddImprodutivoDate}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>

            {/* Lista com as datas improdutivas cadastradas */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {diasImprodutivos.map((dateStr) => {
                const parts = dateStr.split("-");
                const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
                return (
                  <div
                    key={dateStr}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs font-semibold ${
                      darkMode ? "bg-[#16223f] border-[#25365e] text-rose-300" : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}
                  >
                    <span>{formatted}</span>
                    <button
                      onClick={() => handleDeleteImprodutivoDate(dateStr)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"
                      title="Remover data improdutiva"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {diasImprodutivos.length === 0 && (
                <div className={`text-center py-6 text-xs italic ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                  Nenhum dia improdutivo cadastrado.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100/10 text-center">
            <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Total de {diasImprodutivos.length} {diasImprodutivos.length === 1 ? "dia" : "dias"} cadastrados
            </span>
          </div>
        </div>

      </div>

      {/* SEÇÃO 4: GRADE DE DISTRIBUIÇÃO DE CARGA HORÁRIA POR DISCIPLINA & BLOCOS */}
      <div className={`p-6 sm:p-7 rounded-2xl border transition-colors space-y-6 ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d] text-white" : "bg-white border-gray-200 shadow-sm text-gray-800"
      }`}>
        <div className="border-b border-gray-100/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-400/20">
                Grade Proporcional
              </span>
              <span className="text-xs font-semibold text-gray-400">
                Distribuição Automática por Peso
              </span>
            </div>
            <h3 className={`text-lg font-black tracking-tight mt-0.5 flex items-center gap-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              <ListChecks className="w-5 h-5 text-blue-500" />
              Grade de Distribuição de Carga Horária
            </h3>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
              Defina a quantidade de horas totais por disciplina e o tamanho de cada bloco de estudo no ciclo
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Meta Geral: {metaHorasTotal}h Líquidas
            </span>
            <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              {qtdeTotalCiclos} Ciclos Totais
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-[10px] uppercase font-bold tracking-wider border-b border-gray-100/10 ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}>
                <th className="py-3 px-3">Disciplina / Bloco</th>
                <th className="py-3 px-3 text-center">Peso de Pontos (%)</th>
                <th className="py-3 px-3 text-center">Disciplina - Em Horas</th>
                <th className="py-3 px-3 text-center">Horas por Ciclo (Bloco)</th>
                <th className="py-3 px-3 text-center">Ciclos Totais (Dashboard)</th>
              </tr>
            </thead>
            <tbody>
              {localDisciplinas.map((d) => {
                const pesoPercentual = calcularPesoPercentual(d, somaPontos);
                
                return (
                  <tr
                    key={d.id}
                    className={`border-b border-gray-100/5 transition-colors ${
                      darkMode ? "hover:bg-[#152345]/35" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.cor }} />
                        <span className="font-bold text-xs">{d.nome}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center text-xs font-semibold text-gray-400">
                      {pesoPercentual.toFixed(1)}%
                    </td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={d.horasTotais || 0}
                        onChange={(e) =>
                          handleUpdateLocalField(d.id, "horasTotais", Math.max(1, parseInt(e.target.value) || 0))
                        }
                        className={`w-20 text-center py-1.5 rounded-xl border text-xs font-bold outline-none ${
                          darkMode
                            ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                            : "bg-white border-gray-200 text-gray-800 focus:border-blue-600"
                        }`}
                      />
                    </td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="6"
                        value={d.horasPorCiclo || 1.5}
                        onChange={(e) =>
                          handleUpdateLocalField(d.id, "horasPorCiclo", Math.max(0.5, parseFloat(e.target.value) || 0))
                        }
                        className={`w-20 text-center py-1.5 rounded-xl border text-xs font-bold outline-none ${
                          darkMode
                            ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                            : "bg-white border-gray-200 text-gray-800 focus:border-blue-600"
                        }`}
                      />
                    </td>

                    <td className="py-3 px-3 text-center text-xs font-black text-amber-500">
                      {d.ciclosTotais} ciclos
                    </td>
                  </tr>
                );
              })}

              {localDisciplinas.length === 0 && (
                <tr>
                  <td colSpan={5} className={`text-center py-8 text-xs italic ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Nenhuma disciplina cadastrada na aba Edital para realizar o planejamento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Botão de sincronização */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-gray-100/10">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>O salvamento atualiza automaticamente os ciclos do Dashboard e os cronômetros da tela Estudar.</span>
          </div>

          <button
            onClick={handleSaveAll}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer w-full sm:w-auto"
            id="btn-salvar-planejamento-grade"
          >
            <Save className="w-4 h-4" />
            <span>Salvar & Sincronizar Planejamento</span>
          </button>
        </div>

      </div>

    </div>
  );
}
