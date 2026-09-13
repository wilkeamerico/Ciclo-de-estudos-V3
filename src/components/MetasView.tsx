import React, { useState, useMemo } from "react";
import { StudyState, Metas } from "../types";
import { 
  Plus, Trash2, Calendar, ChevronLeft, ChevronRight, Save, Clock, Smile,
  Target, CheckCircle2, Award, Zap, Flame, TrendingUp, Sparkles, Hourglass, 
  Activity, CheckCircle, ArrowRight
} from "lucide-react";
import { calcularResumoMetas } from "../utils/studyHelpers";

interface MetasViewProps {
  state: StudyState;
  updateState: (newState: StudyState) => void;
  darkMode: boolean;
}

export default function MetasView({ state, updateState, darkMode }: MetasViewProps) {
  const { metas } = state;

  // Local state to make adjustments
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

  // Cálculo do progresso da meta diária de HOJE baseado nas sessões registradas no state
  const todayProgress = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const todayISO = `${y}-${m}-${d}`;
    const dayOfWeekIndex = now.getDay();
    const dayName = weekdayNames[dayOfWeekIndex];

    // Helper para normalizar datas de sessões
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

    // Meta de hoje em horas
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

    // Filtra todas as sessões realizadas hoje
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

    // Cálculo percentual e minutos restantes
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

  // Recalculates statistics in real-time
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

  // --- SAVE PERIOD & GOALS ---
  const handleSaveMetas = () => {
    const updatedMetas: Metas = {
      horasDisponiveis,
      dataInicial,
      dataFinal,
      diasImprodutivos,
      calendarOverrides: metas.calendarOverrides
    };

    updateState({
      ...state,
      metas: updatedMetas
    });
    alert("Período de estudos e metas horárias salvas com sucesso!");
  };

  // --- ADD UNPRODUCTIVE SPECIFIC DATE ---
  const handleAddImprodutivoDate = () => {
    if (!newImprodutivoDate) return;
    // Convierte YYYY-MM-DD para YYYY-MM-DD para consistencia
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

  // --- STUDY CALENDAR MATH ---
  const monthNames = [
    "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
  ];

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

  // Build grid of days for the selected calendar month
  const calendarDaysGrid = useMemo(() => {
    // Primeiro dia do mês selecionado
    const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1);
    const startOffset = firstDay.getDay(); // 0 = Domingo, 1 = Segunda, etc.

    // Total de dias no mês
    const totalDaysInMonth = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();

    const days = [];

    // Preenche com dias vazios para alinhar o primeiro dia no grid
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }

    // Preenche os dias reais do mês
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const mStr = String(currentCalendarMonth + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateStr = `${currentCalendarYear}-${mStr}-${dStr}`; // Formato YYYY-MM-DD
      days.push({ dayNum: d, dateStr });
    }

    return days;
  }, [currentCalendarMonth, currentCalendarYear]);

  // Handle click on calendar day to toggle productive vs unproductive (Folga)
  const handleToggleDay = (dateStr: string) => {
    const isInPeriod = dateStr >= dataInicial && dateStr <= dataFinal;
    if (!isInPeriod) return;

    const currentOverride = metas.calendarOverrides[dateStr];
    let newOverrides = { ...metas.calendarOverrides };

    if (currentOverride) {
      // Se já havia override, inverte a produtividade
      newOverrides[dateStr] = {
        productive: !currentOverride.productive,
        hours: !currentOverride.productive ? (horasDisponiveis[new Date(dateStr + "T00:00:00").getDay().toString()] || 3) : 0
      };
    } else {
      // Se não havia override, cria com base no status atual
      const isImprodutivo = diasImprodutivos.includes(dateStr);
      if (isImprodutivo) {
        // Se era improdutivo por feriado, vira produtivo
        newOverrides[dateStr] = {
          productive: true,
          hours: horasDisponiveis[new Date(dateStr + "T00:00:00").getDay().toString()] || 3
        };
      } else {
        // Vira folga
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
      
      {/* COMPONENTE DE PROGRESSO CIRCULAR DA META DIÁRIA DE HOJE */}
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
                  <linearGradient id="circleProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
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

                {/* Trilha de fundo */}
                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  fill="transparent"
                  stroke={darkMode ? "#1e293b" : "#e2e8f0"}
                  strokeWidth="10"
                  strokeLinecap="round"
                />

                {/* Arco de progresso */}
                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  fill="transparent"
                  stroke="url(#circleProgressGrad)"
                  strokeWidth="10"
                  strokeDasharray={339.292}
                  strokeDashoffset={339.292 - (todayProgress.percentage / 100) * 339.292}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Informação Central no Círculo */}
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

            {/* Mensagem motivacional curta abaixo do gráfico */}
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
      
      {/* PRIMEIRA SEÇÃO: HORAS DIÁRIAS & PERÍODO & RESUMO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Card: Horas Disponíveis por Dia */}
        <div className={`lg:col-span-8 p-6 rounded-2xl border transition-colors space-y-6 ${
          darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
        }`}>
          <div>
            <h3 className={`text-base font-bold flex items-center gap-1.5 ${darkMode ? "text-white" : "text-gray-900"}`}>
              <Clock className="w-5 h-5 text-blue-500" />
              Horas Disponíveis por Dia
            </h3>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
              Defina a quantidade de horas líquidas que você pretende estudar em cada dia da semana.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
            {weekdayNames.map((dayName, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${
                  darkMode ? "bg-[#16223f]/50 border-blue-900/40" : "bg-gray-50/50 border-gray-150"
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {dayName.substring(0, 3)}
                </span>
                
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={horasDisponiveis[idx.toString()] || 0}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(24, parseInt(e.target.value) || 0));
                    setHorasDisponiveis({
                      ...horasDisponiveis,
                      [idx.toString()]: val
                    });
                  }}
                  className={`w-12 text-center py-1.5 mt-2 rounded border text-sm font-black outline-none ${
                    darkMode
                      ? "bg-[#0b1329] border-[#25365e] text-white focus:border-blue-500"
                      : "bg-white border-gray-200 text-gray-800 focus:border-blue-600"
                  }`}
                />
                
                <span className={`text-[9px] uppercase font-bold mt-1.5 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                  HORAS
                </span>
              </div>
            ))}
          </div>

          {/* PERÍODO DE ESTUDOS PLANEJADO */}
          <div className="pt-4 border-t border-gray-100/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Data Inicial do Plano
              </label>
              <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                  darkMode
                    ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                    : "bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-600 focus:bg-white"
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Data Final (Data Limite / Prova)
              </label>
              <input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                  darkMode
                    ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                    : "bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-600 focus:bg-white"
                }`}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveMetas}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center space-x-1 shadow-md shadow-blue-500/10 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Período e Metas</span>
            </button>
          </div>

        </div>

        {/* Card: Resumo da Meta & Dias Improdutivos */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-6">
          
          {/* Card: Resumo de Metas */}
          <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${
            darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
          }`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Resumo da Meta Estipulada
            </h4>

            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className={darkMode ? "text-gray-300" : "text-gray-600"}>Dias Produtivos:</span>
                <span className={`font-black ${darkMode ? "text-white" : "text-gray-900"}`}>{resume.diasProdutivos} dias</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className={darkMode ? "text-gray-300" : "text-gray-600"}>Dias de Folga:</span>
                <span className={`font-black ${darkMode ? "text-white" : "text-gray-900"}`}>{resume.diasFolga} dias</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-100/10">
                <span className="font-extrabold text-blue-500">Meta de Horas Total:</span>
                <span className="text-xl font-black text-blue-500">{resume.metaHorasTotal} horas</span>
              </div>
            </div>
          </div>

          {/* Card: Dias Improdutivos / Folgas Específicas */}
          <div className={`p-6 rounded-2xl border flex-1 transition-colors space-y-4 ${
            darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
          }`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Dias Improdutivos / Folgas Específicas
            </h4>

            <div className="flex gap-2">
              <input
                type="date"
                value={newImprodutivoDate}
                onChange={(e) => setNewImprodutivoDate(e.target.value)}
                className={`flex-1 px-3 py-1.5 rounded-lg border text-xs outline-none transition-colors ${
                  darkMode
                    ? "bg-[#16223f] border-[#25365e] text-white"
                    : "bg-gray-50 border-gray-200 text-gray-800"
                }`}
              />
              <button
                onClick={handleAddImprodutivoDate}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>

            <div className="max-h-24 overflow-y-auto space-y-1.5">
              {diasImprodutivos.map((dStr) => (
                <div
                  key={dStr}
                  className={`flex justify-between items-center px-3 py-1.5 rounded-lg text-xs ${
                    darkMode ? "bg-[#14203e]/40" : "bg-gray-50"
                  }`}
                >
                  <span className="font-semibold text-gray-400">
                    {dStr.split("-").reverse().join("/")}
                  </span>
                  <button
                    onClick={() => handleDeleteImprodutivoDate(dStr)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {diasImprodutivos.length === 0 && (
                <p className={`text-[10px] text-center italic py-2 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                  Nenhuma data de folga adicionada.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* SEÇÃO INFERIOR: CALENDÁRIO DE PLANEJAMENTO DE ESTUDOS */}
      <div className={`p-6 rounded-2xl border transition-colors ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d] text-white" : "bg-white border-gray-200 shadow-sm text-gray-800"
      }`}>
        
        {/* Topo do Calendário */}
        <div className="flex justify-between items-center border-b border-gray-100/10 pb-4 mb-6">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Calendário de Planejamento de Estudos
            </h3>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
              Visualização mensal do período. Clique nos dias dentro do planejamento para alternar entre dia produtivo e folga!
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrevMonth}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                darkMode ? "border-[#25365e] bg-[#16223f] text-gray-300 hover:bg-[#1d2d52]" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-xs font-black tracking-wider">
              {monthNames[currentCalendarMonth]} DE {currentCalendarYear}
            </span>

            <button
              onClick={handleNextMonth}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                darkMode ? "border-[#25365e] bg-[#16223f] text-gray-300 hover:bg-[#1d2d52]" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legendas de cores */}
        <div className="flex flex-wrap gap-4 mb-4 text-[10px] uppercase font-bold text-gray-400">
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-blue-500/10 border border-blue-500/20 block" />
            <span>Dia Produtivo (Estudo)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-red-500/10 border border-red-500/20 block" />
            <span>Dia de Folga (Improdutivo)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-gray-200/5 border border-gray-200/10 block" />
            <span>Fora do Período</span>
          </div>
        </div>

        {/* Dias da Semana Cabecalho */}
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100/5 pb-2">
          <span>Dom</span>
          <span>Seg</span>
          <span>Ter</span>
          <span>Qua</span>
          <span>Qui</span>
          <span>Sex</span>
          <span>Sáb</span>
        </div>

        {/* Grid de Dias do Calendário */}
        <div className="grid grid-cols-7 gap-2 mt-2">
          {calendarDaysGrid.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-16 bg-transparent" />;
            }

            const { dayNum, dateStr } = day;
            const isInPeriod = dateStr >= dataInicial && dateStr <= dataFinal;
            
            // Verifica status de produtividade do dia
            const override = metas.calendarOverrides[dateStr];
            const isImprodutivo = diasImprodutivos.includes(dateStr);
            const diaSemana = new Date(dateStr + "T00:00:00").getDay().toString();
            const horasPadrao = horasDisponiveis[diaSemana] || 0;

            let isProductive = false;
            let currentHours = 0;

            if (override) {
              isProductive = override.productive;
              currentHours = override.hours;
            } else if (isImprodutivo) {
              isProductive = false;
              currentHours = 0;
            } else {
              isProductive = horasPadrao > 0;
              currentHours = horasPadrao;
            }

            // Seleção de classes visuais baseada em estado
            let bgClass = darkMode ? "bg-gray-200/5 text-gray-600" : "bg-gray-100 text-gray-300";
            let hoverClass = "";

            if (isInPeriod) {
              hoverClass = "hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer";
              if (isProductive) {
                bgClass = darkMode ? "bg-blue-950/40 border border-blue-500/20 text-blue-400" : "bg-blue-50 border border-blue-200 text-blue-700";
              } else {
                bgClass = darkMode ? "bg-red-950/20 border border-red-500/10 text-red-400" : "bg-red-50 border border-red-200 text-red-600";
              }
            }

            return (
              <div
                key={dateStr}
                onClick={() => handleToggleDay(dateStr)}
                className={`h-16 p-2 rounded-xl flex flex-col justify-between items-start text-xs font-bold relative group select-none ${bgClass} ${hoverClass}`}
                title={isInPeriod ? `${dayNum}: Clique para alternar` : "Data fora do período configurado"}
              >
                <span>{dayNum}</span>
                {isInPeriod && (
                  <span className="text-[9px] opacity-80 mt-auto font-black">
                    {isProductive ? `${currentHours}H` : "FOLGA"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
