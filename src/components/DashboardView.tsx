import React, { useState, useMemo } from "react";
import { 
  ResponsiveContainer, BarChart, Bar, Cell, LabelList, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, 
  PieChart, Pie 
} from "recharts";
import { StudyState, Disciplina, StudySession } from "../types";
import { calcularSomaPontos, calcularPesoPercentual, formatarDataDDMM, formatarDataDDMMAAAA } from "../utils/studyHelpers";
import { 
  Trophy, CheckCircle, AlertTriangle, Play, HelpCircle, RefreshCw, 
  BarChart2, ArrowLeft, Calendar, Target, Clock, BookOpen, Layers, 
  CheckCircle2, TrendingUp, Flame, Award, FileText, ArrowUpRight,
  Bell, BellRing, AlertCircle, CalendarClock, Timer, ChevronDown, ChevronUp,
  Sparkles, Hourglass, ShieldAlert, Zap
} from "lucide-react";

interface DashboardViewProps {
  state: StudyState;
  darkMode: boolean;
  onNavigateTab?: (tab: string) => void;
  onSyncAll?: () => void;
  isSyncing?: boolean;
}

export default function DashboardView({ state, darkMode, onNavigateTab, onSyncAll, isSyncing }: DashboardViewProps) {
  const { edital, metas, sessions, currentCycle } = state;

  // Identifica o bloco atualmente em estudo
  const activeBlockId = useMemo(() => {
    const safeOrgao = (edital.orgao || "default").replace(/\s+/g, "_");
    const safeCargo = (edital.cargo || "default").replace(/\s+/g, "_");
    const key = `study_disc_${safeOrgao}_${safeCargo}_c${currentCycle}`;
    const saved = localStorage.getItem(key);
    return saved || "";
  }, [edital.orgao, edital.cargo, currentCycle]);

  // Filtros internos seguros com persistência em localStorage para evitar resets ao alternar guias
  const [questionsArea, setQuestionsArea] = useState<"todas" | "basicos" | "especificos">("todas");
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("todas");
  const [selectedDrillDownDisciplineId, setSelectedDrillDownDisciplineId] = useState<string | null>(null);
  
  const [dayRangeLimit, setDayRangeLimitState] = useState<number>(() => {
    const saved = localStorage.getItem("dashboard_dayRangeLimit");
    return saved !== null ? parseInt(saved, 10) : 30;
  });
  const [rangeAnchor, setRangeAnchorState] = useState<"inicio" | "recentes">(
    () => (localStorage.getItem("dashboard_rangeAnchor") as "inicio" | "recentes") || "inicio"
  );

  const setDayRangeLimit = (val: number) => {
    setDayRangeLimitState(val);
    localStorage.setItem("dashboard_dayRangeLimit", String(val));
  };

  const setRangeAnchor = (val: "inicio" | "recentes") => {
    setRangeAnchorState(val);
    localStorage.setItem("dashboard_rangeAnchor", val);
  };

  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem("dashboard_notification_open");
    return saved !== null ? saved === "true" : true;
  });

  const toggleNotificationOpen = () => {
    setIsNotificationOpen((prev) => {
      const next = !prev;
      localStorage.setItem("dashboard_notification_open", String(next));
      return next;
    });
  };

  const handleCategoryChange = (area: "todas" | "basicos" | "especificos") => {
    setQuestionsArea(area);
    setSelectedDisciplineId("todas");
  };

  // Helper local para formatar minutos em Xh Ym
  const formatarMinutos = (minutos: number) => {
    const hrs = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    return `${hrs}h ${mins}m`;
  };

  // Calcula estatísticas gerais de forma robusta e persistente
  const totalPontos = useMemo(() => calcularSomaPontos(edital), [edital]);

  const disciplinasLista = useMemo(() => {
    const list: { disc: Disciplina; catNome: string }[] = [];
    edital.categorias.forEach((cat) => {
      cat.disciplinas.forEach((disc) => {
        list.push({ disc, catNome: cat.nome });
      });
    });
    return list;
  }, [edital]);

  const filteredDisciplinasDropdown = useMemo(() => {
    return disciplinasLista.filter(({ catNome }) => {
      if (questionsArea === "basicos") return catNome.includes("BÁSICOS");
      if (questionsArea === "especificos") return catNome.includes("ESPECÍFICOS");
      return true;
    });
  }, [disciplinasLista, questionsArea]);

  // Horas estudadas totais gerais (Acumuladas de todos os ciclos)
  const totalMinutosEstudados = useMemo(() => {
    return sessions.reduce((acc, s) => acc + (s.duracaoMinutos || 0), 0);
  }, [sessions]);
  const totalHorasEstudadas = (totalMinutosEstudados / 60).toFixed(1);

  // Total de horas estudadas no ciclo atual
  const totalHorasEstudadasNoCiclo = useMemo(() => {
    const mins = sessions
      .filter((s) => s.ciclo === currentCycle)
      .reduce((acc, s) => acc + (s.duracaoMinutos || 0), 0);
    return (mins / 60).toFixed(1);
  }, [sessions, currentCycle]);

  // Total de horas planejadas para um ciclo de estudos completo (soma da Grade do Planejamento)
  const totalHorasPlanejadasNoCiclo = useMemo(() => {
    const hrs = disciplinasLista.reduce((acc, d) => acc + (d.disc.horasPorCiclo || 1.0), 0);
    return hrs.toFixed(1);
  }, [disciplinasLista]);

  // Total de ciclos de estudos da preparação (arredondar para cima)
  const somatoriaHorasPorCiclo = useMemo(() => {
    return disciplinasLista.reduce((acc, d) => acc + (d.disc.horasPorCiclo || 0), 0);
  }, [disciplinasLista]);

  const metaHorasTotal = useMemo(() => {
    const datas = obterDatasPeriodo(metas.dataInicial, metas.dataFinal);
    let horas = 0;
    datas.forEach((dStr) => {
      if (metas.diasImprodutivos.includes(dStr)) return;
      const override = metas.calendarOverrides[dStr];
      if (override) {
        if (override.productive) horas += override.hours;
      } else {
        const diaSemana = new Date(dStr + "T00:00:00").getDay().toString();
        horas += metas.horasDisponiveis[diaSemana] || 0;
      }
    });
    return horas || 1;
  }, [metas]);

  const totalCiclosPreparacao = useMemo(() => {
    if (somatoriaHorasPorCiclo <= 0) return 1;
    return Math.ceil(metaHorasTotal / somatoriaHorasPorCiclo);
  }, [metaHorasTotal, somatoriaHorasPorCiclo]);

  // Total de questões resolvidas (sincronizado 1:1 com SESSÕES REGISTRADAS)
  const questoesStats = useMemo(() => {
    let acertos = 0;
    let erros = 0;

    sessions.forEach((s) => {
      acertos += s.questoesAcertos || 0;
      erros += s.questoesErros || 0;
    });

    const total = acertos + erros;
    const taxaAcerto = total > 0 ? ((acertos / total) * 100).toFixed(1) : "0.0";
    return { acertos, erros, total, taxaAcerto };
  }, [sessions]);

  // Progresso do Ciclo Atual
  const progressoPorcentagem = useMemo(() => {
    const estudadoMins = sessions
      .filter((s) => s.ciclo === currentCycle)
      .reduce((acc, s) => acc + (s.duracaoMinutos || 0), 0);
    const planejadoMins = disciplinasLista.reduce((acc, d) => acc + (d.disc.horasPorCiclo || 1.0), 0) * 60;
    if (planejadoMins === 0) return 0;
    const perc = (estudadoMins / planejadoMins) * 100;
    return Math.min(Math.max(perc, 0), 100);
  }, [sessions, currentCycle, disciplinasLista]);

  // Dados para o Gráfico em Rosca (Donut Ring Chart)
  const donutSegmentsData = useMemo(() => {
    if (disciplinasLista.length === 0) {
      return [{ name: "Sem disciplinas", value: 1, cor: "#94a3b8" }];
    }
    return disciplinasLista.map(({ disc }) => {
      const minsInCycle = sessions
        .filter((s) => s.ciclo === currentCycle && s.disciplinaId === disc.id)
        .reduce((acc, s) => acc + (s.duracaoMinutos || 0), 0);
      const valHours = minsInCycle > 0 ? parseFloat((minsInCycle / 60).toFixed(2)) : (disc.horasPorCiclo || 1.0);
      return {
        id: disc.id,
        name: disc.nome,
        value: valHours,
        cor: disc.cor || "#3b82f6"
      };
    });
  }, [disciplinasLista, sessions, currentCycle]);

  // Metas semanais
  const metaHorasSemanal = useMemo(() => {
    if (!metas.horasDisponiveis) return 0;
    return Object.values(metas.horasDisponiveis).reduce((acc, h) => acc + (Number(h) || 0), 0);
  }, [metas]);

  const diasParaAProva = useMemo(() => {
    if (!metas.dataProvas) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataP = new Date(metas.dataProvas + "T00:00:00");
    if (isNaN(dataP.getTime())) return null;
    const diffTime = dataP.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [metas.dataProvas]);

  // Sistema de Notificações e Alerta de Proximidade da Data Final do Planejamento
  const deadlineNotification = useMemo(() => {
    if (!metas.dataFinal) {
      return {
        status: "unconfigured" as const,
        badge: "DATA FINAL NÃO DEFINIDA",
        title: "Defina a Data Final do seu Planejamento",
        description: "Configure a data final nas Metas ou Planejamento para habilitar os alertas automáticos de proximidade, contagem inteligente e ritmo diário sugerido.",
        diasRestantes: null,
        diasTotais: 0,
        diasDecorridos: 0,
        percentualTempo: 0,
        horasRestantesNecessarias: Math.max(0, metaHorasTotal - parseFloat(totalHorasEstudadas)),
        ritmoDiarioSugerido: 0,
        urgencyLevel: "info" as const,
      };
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataF = new Date(metas.dataFinal + "T00:00:00");
    if (isNaN(dataF.getTime())) {
      return {
        status: "unconfigured" as const,
        badge: "DATA FINAL INVÁLIDA",
        title: "Formato de Data Inválido",
        description: "A data final configurada no planejamento precisa ser preenchida em um formato válido.",
        diasRestantes: null,
        diasTotais: 0,
        diasDecorridos: 0,
        percentualTempo: 0,
        horasRestantesNecessarias: Math.max(0, metaHorasTotal - parseFloat(totalHorasEstudadas)),
        ritmoDiarioSugerido: 0,
        urgencyLevel: "info" as const,
      };
    }

    const diffTime = dataF.getTime() - hoje.getTime();
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Data inicial
    let dIni = metas.dataInicial ? new Date(metas.dataInicial + "T00:00:00") : new Date(hoje);
    if (isNaN(dIni.getTime())) dIni = new Date(hoje);

    const totalPeriodoTime = Math.max(1, dataF.getTime() - dIni.getTime());
    const diasTotais = Math.max(1, Math.ceil(totalPeriodoTime / (1000 * 60 * 60 * 24)));
    
    const decorridoTime = Math.max(0, hoje.getTime() - dIni.getTime());
    const diasDecorridos = Math.min(diasTotais, Math.ceil(decorridoTime / (1000 * 60 * 60 * 24)));
    const percentualTempo = Math.min(100, Math.max(0, Math.round((diasDecorridos / diasTotais) * 100)));

    const horasTotaisPlanejadas = metaHorasTotal;
    const horasJaEstudadas = parseFloat(totalHorasEstudadas) || 0;
    const horasRestantes = Math.max(0, parseFloat((horasTotaisPlanejadas - horasJaEstudadas).toFixed(1)));
    const ritmoDiario = diasRestantes > 0 ? parseFloat((horasRestantes / diasRestantes).toFixed(1)) : 0;

    if (diasRestantes < 0) {
      const diasExpirados = Math.abs(diasRestantes);
      return {
        status: "expired" as const,
        badge: "PRAZO DO CICLO CONCLUÍDO",
        title: `Planejamento Encerrado há ${diasExpirados} dia${diasExpirados > 1 ? "s" : ""}`,
        description: `A data limite planejada era ${formatarDataDDMMAAAA(metas.dataFinal)}. Você pode estender a data final na guia de Planejamento ou arquivar o ciclo para iniciar o próximo.`,
        diasRestantes,
        diasTotais,
        diasDecorridos,
        percentualTempo: 100,
        horasRestantesNecessarias: horasRestantes,
        ritmoDiarioSugerido: 0,
        urgencyLevel: "expired" as const,
      };
    }

    if (diasRestantes === 0) {
      return {
        status: "today" as const,
        badge: "ÚLTIMO DIA DO PLANEJAMENTO",
        title: "🚨 Atenção: Hoje é a data final configurada no seu planejamento!",
        description: "Hoje é o último dia do ciclo de estudos planejado. Aproveite para fazer o fechamento das disciplinas, revisar pontos críticos e realizar simulados.",
        diasRestantes: 0,
        diasTotais,
        diasDecorridos: diasTotais,
        percentualTempo: 100,
        horasRestantesNecessarias: horasRestantes,
        ritmoDiarioSugerido: horasRestantes,
        urgencyLevel: "critical" as const,
      };
    }

    if (diasRestantes <= 7) {
      const isLessThan7 = diasRestantes < 7;
      return {
        status: "critical" as const,
        badge: diasRestantes === 0 
          ? "ÚLTIMO DIA DO CICLO" 
          : isLessThan7 
          ? `ALERTA CRÍTICO • ${diasRestantes} DIA${diasRestantes > 1 ? "S" : ""} RESTANTE${diasRestantes > 1 ? "S" : ""}`
          : `RETA FINAL • ${diasRestantes} DIAS RESTANTES`,
        title: diasRestantes === 0
          ? "🚨 Atenção: Hoje é o último dia do cronograma configurado!"
          : isLessThan7
          ? `🚨 Atenção: Faltam menos de 7 dias (${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}) para a data final do planejamento!`
          : `⚡ Alerta de Reta Final: Faltam 7 dias para a data final do ciclo!`,
        description: `Você está na reta final do seu ciclo (limite em ${formatarDataDDMMAAAA(metas.dataFinal)}). Faltam ${horasRestantes}h de estudo planejadas. Recomendamos ritmo intensivo de ${ritmoDiario}h/dia com foco em resolução de questões, revisão de tópicos prioritários e consolidação de erros.`,
        diasRestantes,
        diasTotais,
        diasDecorridos,
        percentualTempo,
        horasRestantesNecessarias: horasRestantes,
        ritmoDiarioSugerido: ritmoDiario,
        urgencyLevel: "critical" as const,
      };
    }

    if (diasRestantes <= 15) {
      return {
        status: "warning" as const,
        badge: `ALERTA DE PROXIMIDADE • ${diasRestantes} DIAS RESTANTES`,
        title: `⚠️ Atenção: Menos de 15 dias para o encerramento planejado!`,
        description: `Restam ${diasRestantes} dias até o prazo final (${formatarDataDDMMAAAA(metas.dataFinal)}). Mantenha o ritmo de estudo em torno de ${ritmoDiario}h/dia para fechar todas as ${horasRestantes}h pendentes.`,
        diasRestantes,
        diasTotais,
        diasDecorridos,
        percentualTempo,
        horasRestantesNecessarias: horasRestantes,
        ritmoDiarioSugerido: ritmoDiario,
        urgencyLevel: "warning" as const,
      };
    }

    if (diasRestantes <= 30) {
      return {
        status: "moderate" as const,
        badge: `ACOMPANHAMENTO • ${diasRestantes} DIAS RESTANTES`,
        title: `⏳ Cronograma em Andamento: ${diasRestantes} dias até o fechamento planejado`,
        description: `Seu ciclo está programado até ${formatarDataDDMMAAAA(metas.dataFinal)}. O ritmo sugerido é de ${ritmoDiario}h/dia (${(ritmoDiario * 7).toFixed(1)}h/sem) para cobrir integralmente a carga horária estabelecida.`,
        diasRestantes,
        diasTotais,
        diasDecorridos,
        percentualTempo,
        horasRestantesNecessarias: horasRestantes,
        ritmoDiarioSugerido: ritmoDiario,
        urgencyLevel: "moderate" as const,
      };
    }

    return {
      status: "normal" as const,
      badge: `CRONOGRAMA NO PRAZO • ${diasRestantes} DIAS`,
      title: `🎯 Cronograma Dentro do Prazo: ${diasRestantes} dias até o encerramento`,
      description: `O término do ciclo está previsto para ${formatarDataDDMMAAAA(metas.dataFinal)}. Com ${ritmoDiario}h/dia de estudo você atingirá com folga as metas do edital.`,
      diasRestantes,
      diasTotais,
      diasDecorridos,
      percentualTempo,
      horasRestantesNecessarias: horasRestantes,
      ritmoDiarioSugerido: ritmoDiario,
      urgencyLevel: "normal" as const,
    };
  }, [metas, metaHorasTotal, totalHorasEstudadas]);

  // Estatísticas detalhadas por disciplina
  const disciplinasDetailedStats = useMemo(() => {
    return disciplinasLista.map(({ disc, catNome }) => {
      const horasPlanejadas = disc.horasPorCiclo || 1.0;
      
      const minsEstudadosNoCiclo = sessions
        .filter(s => s.ciclo === currentCycle && s.disciplinaId === disc.id)
        .reduce((acc, s) => acc + (s.duracaoMinutos || 0), 0);
      const horasEstudadasNoCiclo = parseFloat((minsEstudadosNoCiclo / 60).toFixed(1));

      const minsEstudadosTotal = sessions
        .filter(s => s.disciplinaId === disc.id)
        .reduce((acc, s) => acc + (s.duracaoMinutos || 0), 0);
      const horasEstudadasTotal = parseFloat((minsEstudadosTotal / 60).toFixed(1));

      const progressoBloco = Math.min(100, Math.round((horasEstudadasNoCiclo / horasPlanejadas) * 100));

      return {
        id: disc.id,
        nome: disc.nome,
        categoria: catNome,
        cor: disc.cor || "#3b82f6",
        horasPlanejadas,
        horasEstudadasNoCiclo,
        horasEstudadasTotal,
        progressoBloco
      };
    });
  }, [disciplinasLista, sessions, currentCycle]);

  // Helper para obter datas do período
  function obterDatasPeriodo(ini: string, fim?: string): string[] {
    const arr: string[] = [];
    let dIni = new Date((ini || new Date().toISOString().split("T")[0]) + "T00:00:00");
    if (isNaN(dIni.getTime())) dIni = new Date();
    
    let dFim = fim ? new Date(fim + "T00:00:00") : null;
    if (!dFim || isNaN(dFim.getTime())) {
      dFim = new Date(dIni);
      dFim.setDate(dFim.getDate() + 30);
    }

    const curr = new Date(dIni);
    let count = 0;
    while (curr <= dFim && count < 365) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, "0");
      const d = String(curr.getDate()).padStart(2, "0");
      arr.push(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
      count++;
    }
    return arr;
  }

  // 1. Gráfico: Disciplinas Estudadas (Soma acumulada das horas por matéria)
  const chartDisciplinasEstudadasData = useMemo(() => {
    const map: { [key: string]: { id: string; nome: string; minutos: number; cor: string } } = {};
    
    disciplinasLista.forEach(({ disc }) => {
      map[disc.id] = {
        id: disc.id,
        nome: disc.nome,
        minutos: 0,
        cor: disc.cor || "#3b82f6"
      };
    });

    sessions.forEach((s) => {
      if (map[s.disciplinaId]) {
        map[s.disciplinaId].minutos += s.duracaoMinutos || 0;
      }
    });

    return Object.values(map).map(item => ({
      id: item.id,
      name: item.nome,
      Minutos: item.minutos,
      Horas: parseFloat((item.minutos / 60).toFixed(2)),
      formattedTime: formatarMinutos(item.minutos),
      cor: item.cor
    }));
  }, [disciplinasLista, sessions]);

  // Drill-Down por disciplina
  const drillDownData = useMemo(() => {
    if (!selectedDrillDownDisciplineId) return [];
    
    const matched = disciplinasLista.find(d => d.disc.id === selectedDrillDownDisciplineId);
    if (!matched) return [];
    const disc = matched.disc;

    const cyclesMap: { [cycle: number]: number } = {};
    sessions.forEach(s => {
      if (s.disciplinaId === selectedDrillDownDisciplineId) {
        cyclesMap[s.ciclo] = (cyclesMap[s.ciclo] || 0) + s.duracaoMinutos;
      }
    });

    const maxCycle = Math.max(state.currentCycle, ...sessions.map(s => s.ciclo), 1);
    const data = [];
    for (let c = 1; c <= maxCycle; c++) {
      const mins = cyclesMap[c] || 0;
      data.push({
        name: `Ciclo ${c}`,
        Minutos: mins,
        Horas: parseFloat((mins / 60).toFixed(2)),
        formattedTime: formatarMinutos(mins),
        cor: disc.cor || "#3b82f6"
      });
    }
    return data;
  }, [selectedDrillDownDisciplineId, sessions, state.currentCycle, disciplinasLista]);

  const selectedDisciplineName = useMemo(() => {
    if (!selectedDrillDownDisciplineId) return "";
    return disciplinasLista.find(d => d.disc.id === selectedDrillDownDisciplineId)?.disc.nome || "";
  }, [selectedDrillDownDisciplineId, disciplinasLista]);

  // 2. Gráfico: Produtividade por Ciclo (CICLO XX (DD/MM))
  const chartProdutividadePorCicloData = useMemo(() => {
    const cyclesMap: { [cycle: number]: { estudadoMins: number; dataFinal: string } } = {};
    
    sessions.forEach(s => {
      if (!cyclesMap[s.ciclo]) {
        cyclesMap[s.ciclo] = { estudadoMins: 0, dataFinal: s.data };
      }
      cyclesMap[s.ciclo].estudadoMins += s.duracaoMinutos || 0;
      if (s.data && (!cyclesMap[s.ciclo].dataFinal || s.data > cyclesMap[s.ciclo].dataFinal)) {
        cyclesMap[s.ciclo].dataFinal = s.data;
      }
    });

    const maxCycle = Math.max(state.currentCycle, ...sessions.map(s => s.ciclo), 1);
    const data = [];
    const plannedMins = disciplinasLista.reduce((acc, d) => acc + (d.disc.horasPorCiclo || 1.0), 0) * 60;

    for (let c = 1; c <= maxCycle; c++) {
      const entry = cyclesMap[c];
      const estudadoMins = entry ? entry.estudadoMins : 0;
      const dateLabel = entry?.dataFinal ? ` (${formatarDataDDMM(entry.dataFinal)})` : "";
      data.push({
        name: `CICLO ${c}${dateLabel}`,
        Estudado: parseFloat((estudadoMins / 60).toFixed(2)),
        Planejado: parseFloat((plannedMins / 60).toFixed(2)),
        estudadoMins,
        plannedMins
      });
    }
    return data;
  }, [sessions, state.currentCycle, disciplinasLista]);

  // 3. Gráfico: Produtividade por Dia
  const chartProdutividadePorDiaData = useMemo(() => {
    const map: { [dateStr: string]: { estudadoMins: number; planejadoMins: number } } = {};
    const datas = obterDatasPeriodo(metas.dataInicial, metas.dataFinal);
    
    datas.forEach((dStr) => {
      if (metas.diasImprodutivos.includes(dStr)) {
        map[dStr] = { estudadoMins: 0, planejadoMins: 0 };
        return;
      }
      const override = metas.calendarOverrides[dStr];
      let hours = 0;
      if (override) {
        if (override.productive) hours = override.hours;
      } else {
        const diaSemana = new Date(dStr + "T00:00:00").getDay().toString();
        hours = metas.horasDisponiveis[diaSemana] || 0;
      }
      map[dStr] = { estudadoMins: 0, planejadoMins: hours * 60 };
    });

    const todayStr = new Date().toISOString().split("T")[0];
    if (!map[todayStr]) {
      map[todayStr] = { estudadoMins: 0, planejadoMins: 0 };
    }

    sessions.forEach((s) => {
      const dataStr = s.data || todayStr;
      if (!map[dataStr]) {
        map[dataStr] = { estudadoMins: 0, planejadoMins: 0 };
      }
      map[dataStr].estudadoMins += s.duracaoMinutos || 0;
    });

    let sortedDates = Object.keys(map).sort();
    
    if (sortedDates.length === 0) {
      return [
        { name: formatarDataDDMM(todayStr), Estudado: 0, Planejado: 0, estudadoMins: 0, planejadoMins: 0 }
      ];
    }

    if (dayRangeLimit > 0 && sortedDates.length > dayRangeLimit) {
      if (rangeAnchor === "recentes") {
        sortedDates = sortedDates.slice(-dayRangeLimit);
      } else {
        sortedDates = sortedDates.slice(0, dayRangeLimit);
      }
    }

    return sortedDates.map((dStr) => {
      const estudadoMins = map[dStr].estudadoMins;
      const planejadoMins = map[dStr].planejadoMins;
      return {
        name: formatarDataDDMM(dStr),
        Estudado: parseFloat((estudadoMins / 60).toFixed(2)),
        Planejado: parseFloat((planejadoMins / 60).toFixed(2)),
        estudadoMins,
        planejadoMins
      };
    });
  }, [sessions, metas, dayRangeLimit, rangeAnchor]);

  // 4. Gráfico: Desempenho - Questões resolvidas
  const chartQuestoesData = useMemo(() => {
    const map: { [dateStr: string]: { acertos: number; erros: number } } = {};

    const allowedDisciplineIds = new Set(
      disciplinasLista
        .filter(({ disc, catNome }) => {
          if (questionsArea === "basicos" && !catNome.includes("BÁSICOS")) return false;
          if (questionsArea === "especificos" && !catNome.includes("ESPECÍFICOS")) return false;
          if (selectedDisciplineId !== "todas" && disc.id !== selectedDisciplineId) return false;
          return true;
        })
        .map(({ disc }) => disc.id)
    );

    const toStandardDateKey = (dStr: string): string => {
      if (!dStr) return new Date().toISOString().split("T")[0];
      if (dStr.includes("T")) dStr = dStr.split("T")[0];
      if (dStr.includes("/")) {
        const pts = dStr.split("/");
        if (pts.length === 3) {
          const dia = pts[0].padStart(2, "0");
          const mes = pts[1].padStart(2, "0");
          const ano = pts[2].length === 2 ? `20${pts[2]}` : pts[2];
          return `${ano}-${mes}-${dia}`;
        }
      }
      if (dStr.includes("-")) {
        const pts = dStr.split("-");
        if (pts.length === 3) {
          const ano = pts[0].length === 4 ? pts[0] : pts[2];
          const mes = pts[1].padStart(2, "0");
          const dia = (pts[0].length === 4 ? pts[2] : pts[0]).padStart(2, "0");
          return `${ano}-${mes}-${dia}`;
        }
      }
      return dStr;
    };

    // Popula dados diretamente das sessões registradas
    sessions.forEach((s) => {
      if (s.disciplinaId && allowedDisciplineIds.has(s.disciplinaId)) {
        if ((s.questoesAcertos || 0) > 0 || (s.questoesErros || 0) > 0) {
          const key = toStandardDateKey(s.data);
          if (!map[key]) map[key] = { acertos: 0, erros: 0 };
          map[key].acertos += s.questoesAcertos || 0;
          map[key].erros += s.questoesErros || 0;
        }
      }
    });

    const datasOrdenadas = Object.keys(map).sort();

    if (datasOrdenadas.length === 0) {
      const todayStr = new Date().toISOString().split("T")[0];
      return [
        { name: formatarDataDDMM(todayStr), Acertos: 0, Erros: 0, Total: 0, Aproveitamento: 0 }
      ];
    }

    return datasOrdenadas.map((dStr) => {
      const acertos = map[dStr].acertos;
      const erros = map[dStr].erros;
      const total = acertos + erros;
      return {
        name: formatarDataDDMM(dStr),
        dataCompleta: formatarDataDDMMAAAA(dStr),
        Acertos: acertos,
        Erros: erros,
        Total: total,
        Aproveitamento: total > 0 ? parseFloat(((acertos / total) * 100).toFixed(1)) : 0
      };
    });
  }, [sessions, edital, disciplinasLista, questionsArea, selectedDisciplineId]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in font-sans">
      
      {/* BANNER DE SINCRONIZAÇÃO EM TEMPO REAL DAS GUIAS */}
      <div className={`p-4 sm:p-6 rounded-2xl border transition-all ${
        darkMode 
          ? "bg-gradient-to-r from-[#0a1936] via-[#0f244a] to-[#122a5c] border-[#22408a] text-white shadow-xl" 
          : "bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md border-transparent"
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 w-full lg:w-auto">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Sincronização em Tempo Real
              </span>
              <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <Flame className="w-3 h-3" /> Ciclo nº {currentCycle}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span>{edital.orgao || "Concurso Público"}</span>
              <span className="text-blue-400 font-normal">|</span>
              <span className="text-gray-200 text-base sm:text-lg font-bold">{edital.cargo || "Cargo Alvo"}</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-blue-200/80 font-medium flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1">
              <span>Banca: <strong className="text-white">{edital.banca || "Definida"}</strong></span>
              <span>•</span>
              <span>Data da Prova: <strong className="text-white">{metas.dataProvas ? formatarDataDDMM(metas.dataProvas) : "A definir"}</strong></span>
              <span>•</span>
              <span>Período: <strong className="text-white">{metas.dataInicial ? formatarDataDDMM(metas.dataInicial) : "Início"} até {metas.dataFinal ? formatarDataDDMM(metas.dataFinal) : "Fim"}</strong></span>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
            {diasParaAProva !== null && (
              <div className="p-2.5 sm:p-3 px-3 sm:px-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
                <span className="block text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-blue-300">Contagem Regressiva</span>
                <span className={`text-base sm:text-xl font-black ${diasParaAProva <= 30 ? "text-amber-400" : "text-white"}`}>
                  {diasParaAProva > 0 ? `${diasParaAProva} dias` : diasParaAProva === 0 ? "Dia da Prova!" : "Prova Realizada"}
                </span>
              </div>
            )}

            {/* Prazo do Planejamento (Data Final) */}
            <div 
              onClick={toggleNotificationOpen}
              className={`p-2.5 sm:p-3 px-3 sm:px-4 rounded-xl backdrop-blur-md border text-center cursor-pointer transition-all hover:scale-105 ${
                deadlineNotification.urgencyLevel === "critical"
                  ? "bg-rose-500/25 border-rose-400/60 text-rose-200 ring-2 ring-rose-500/40"
                  : deadlineNotification.urgencyLevel === "warning"
                  ? "bg-amber-500/25 border-amber-400/60 text-amber-200 ring-1 ring-amber-400/40"
                  : "bg-white/10 border-white/15 text-white"
              }`}
              title="Clique para expandir/recolher os detalhes da notificação de prazo do ciclo"
            >
              <span className="block text-[8px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 text-blue-200">
                <Bell className={`w-2.5 h-2.5 ${deadlineNotification.urgencyLevel === "critical" ? "text-rose-300 animate-bounce" : "text-blue-300"}`} /> 
                Prazo do Ciclo
              </span>
              <span className={`text-base sm:text-xl font-black ${
                deadlineNotification.urgencyLevel === "critical" 
                  ? "text-rose-300 font-black" 
                  : deadlineNotification.urgencyLevel === "warning" 
                  ? "text-amber-300 font-black" 
                  : "text-white"
              }`}>
                {deadlineNotification.diasRestantes !== null 
                  ? deadlineNotification.diasRestantes > 0 
                    ? `${deadlineNotification.diasRestantes} dias` 
                    : deadlineNotification.diasRestantes === 0 
                    ? "Hoje!" 
                    : "Encerrado"
                  : "Definir"}
              </span>
            </div>

            <div className="p-2.5 sm:p-3 px-3 sm:px-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <span className="block text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-blue-300">Meta Semanal</span>
              <span className="text-base sm:text-xl font-black text-emerald-300">
                {metaHorasSemanal}h / sem
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SISTEMA DE NOTIFICAÇÕES VISUAL: ALERTA DE PROXIMIDADE DA DATA FINAL DO CICLO */}
      <div className={`rounded-2xl border transition-all duration-300 shadow-xl overflow-hidden ${
        deadlineNotification.urgencyLevel === "critical"
          ? darkMode 
            ? "bg-gradient-to-r from-[#2a0b16] via-[#1f0f20] to-[#171433] border-rose-500/50 shadow-rose-950/40" 
            : "bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 border-rose-300 text-rose-950 shadow-rose-100"
          : deadlineNotification.urgencyLevel === "warning"
          ? darkMode 
            ? "bg-gradient-to-r from-[#261608] via-[#1e1710] to-[#121c2e] border-amber-500/50 shadow-amber-950/40" 
            : "bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border-amber-300 text-amber-950 shadow-amber-100"
          : deadlineNotification.urgencyLevel === "expired"
          ? darkMode
            ? "bg-gradient-to-r from-[#210c2e] via-[#1a112c] to-[#101429] border-purple-500/40"
            : "bg-gradient-to-r from-purple-50 via-slate-50 to-indigo-50 border-purple-300 text-purple-950"
          : darkMode
          ? "bg-gradient-to-r from-[#0c1a3b] via-[#0f244a] to-[#132d5e] border-blue-500/30 shadow-blue-950/30"
          : "bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border-blue-200 text-slate-900"
      }`}>
        
        {/* Cabeçalho do Alerta de Proximidade */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl shrink-0 relative flex items-center justify-center ${
              deadlineNotification.urgencyLevel === "critical"
                ? "bg-rose-600 text-white shadow-lg shadow-rose-600/40"
                : deadlineNotification.urgencyLevel === "warning"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                : deadlineNotification.urgencyLevel === "expired"
                ? "bg-purple-600 text-white"
                : "bg-blue-600 text-white"
            }`}>
              {/* Ícone de alerta pulsante com efeito ping quando faltarem menos de 7 dias */}
              {deadlineNotification.urgencyLevel === "critical" && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border border-white"></span>
                </span>
              )}
              
              {deadlineNotification.urgencyLevel === "critical" ? (
                <ShieldAlert className="w-5 h-5 animate-pulse text-rose-100" />
              ) : deadlineNotification.urgencyLevel === "warning" ? (
                <AlertTriangle className="w-5 h-5" />
              ) : deadlineNotification.urgencyLevel === "expired" ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <CalendarClock className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  deadlineNotification.urgencyLevel === "critical"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-400/40 animate-pulse"
                    : deadlineNotification.urgencyLevel === "warning"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-400/40"
                    : deadlineNotification.urgencyLevel === "expired"
                    ? "bg-purple-500/20 text-purple-400 border border-purple-400/40"
                    : "bg-blue-500/20 text-blue-400 border border-blue-400/40"
                }`}>
                  {deadlineNotification.urgencyLevel === "critical" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  )}
                  {deadlineNotification.badge}
                </span>
                <span className="text-[10px] font-semibold text-gray-400">
                  Notificação do Planejamento
                </span>
              </div>
              <h3 className={`text-sm sm:text-base font-extrabold tracking-tight mt-0.5 ${
                darkMode ? "text-white" : "text-gray-900"
              }`}>
                {deadlineNotification.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center">
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab("planejamento")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  darkMode 
                    ? "bg-white/10 hover:bg-white/20 text-white border border-white/20" 
                    : "bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 shadow-sm"
                }`}
              >
                <span>Ajustar Ciclo</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            
            <button
              onClick={toggleNotificationOpen}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                darkMode ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-200 text-gray-700"
              }`}
              title={isNotificationOpen ? "Recolher detalhes" : "Expandir detalhes"}
            >
              {isNotificationOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Corpo Expansível da Notificação */}
        {isNotificationOpen && (
          <div className="p-4 sm:p-5 space-y-4 animate-fade-in">
            <p className={`text-xs sm:text-sm leading-relaxed ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              {deadlineNotification.description}
            </p>

            {/* Box Explicativo de Reta Final quando faltarem menos de 7 dias */}
            {deadlineNotification.diasRestantes !== null && deadlineNotification.diasRestantes <= 7 && deadlineNotification.diasRestantes >= 0 && (
              <div className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                darkMode
                  ? "bg-rose-950/30 border-rose-500/40 text-rose-200"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}>
                <div className="p-2 rounded-lg bg-rose-600/20 text-rose-400 shrink-0 mt-0.5 relative">
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="font-extrabold flex items-center gap-2">
                    <span>
                      {deadlineNotification.diasRestantes === 0 
                        ? "🚨 O Ciclo Planejado Termina Hoje!" 
                        : `🚨 Alerta de Proximidade: Restam apenas ${deadlineNotification.diasRestantes} dia${deadlineNotification.diasRestantes > 1 ? "s" : ""} para o término do planejamento!`}
                    </span>
                  </div>
                  <p className="opacity-90 leading-relaxed">
                    A data final cadastrada é <strong>{formatarDataDDMMAAAA(metas.dataFinal)}</strong>. Você ainda tem <strong>{deadlineNotification.horasRestantesNecessarias}h</strong> de carga horária planejada. Para otimizar seu rendimento nesta reta final:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pt-1 opacity-90 text-[11px] sm:text-xs">
                    <li><strong>Revisão Ativa:</strong> Foque nos tópicos com maior taxa de erro e leia resumos de pontos-chave.</li>
                    <li><strong>Questões & Simulados:</strong> Resolva baterias de questões cronometradas para fixar os padrões da banca.</li>
                    <li><strong>Ritmo Diário:</strong> Cumpra a média sugerida de <strong>{deadlineNotification.ritmoDiarioSugerido}h/dia</strong> para cobrir 100% da meta planejada.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Grid de 4 Indicadores Estratégicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Card 1: Data Final */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                darkMode ? "bg-black/20 border-white/10 text-white" : "bg-white/80 border-gray-200 text-gray-900"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Data Final</span>
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <div className="mt-2">
                  <span className="text-base sm:text-lg font-black block leading-tight">
                    {metas.dataFinal ? formatarDataDDMMAAAA(metas.dataFinal) : "Não configurada"}
                  </span>
                  <span className={`text-[10px] font-bold ${
                    deadlineNotification.urgencyLevel === "critical" ? "text-rose-400" : "text-blue-400"
                  }`}>
                    {deadlineNotification.diasRestantes !== null
                      ? deadlineNotification.diasRestantes >= 0
                        ? `${deadlineNotification.diasRestantes} dias restantes`
                        : "Período expirado"
                      : "Aguardando definição"}
                  </span>
                </div>
              </div>

              {/* Card 2: Linha do Tempo e Dias Decorridos */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                darkMode ? "bg-black/20 border-white/10 text-white" : "bg-white/80 border-gray-200 text-gray-900"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Tempo Decorrido</span>
                  <Timer className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Dia {deadlineNotification.diasDecorridos} de {deadlineNotification.diasTotais}</span>
                    <span className="text-amber-400">{deadlineNotification.percentualTempo}%</span>
                  </div>
                  <div className="w-full bg-gray-700/30 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        deadlineNotification.urgencyLevel === "critical"
                          ? "bg-rose-500"
                          : deadlineNotification.urgencyLevel === "warning"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${deadlineNotification.percentualTempo}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Ritmo Diário Recomendado */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                darkMode ? "bg-black/20 border-white/10 text-white" : "bg-white/80 border-gray-200 text-gray-900"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Ritmo Sugerido</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2">
                  <span className="text-base sm:text-lg font-black block leading-tight text-emerald-400">
                    {deadlineNotification.ritmoDiarioSugerido > 0 ? `${deadlineNotification.ritmoDiarioSugerido}h / dia` : "Concluído"}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400">
                    {(deadlineNotification.ritmoDiarioSugerido * 7).toFixed(1)}h / semana recomendada
                  </span>
                </div>
              </div>

              {/* Card 4: Horas Pendentes */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                darkMode ? "bg-black/20 border-white/10 text-white" : "bg-white/80 border-gray-200 text-gray-900"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Carga Pendente</span>
                  <Clock className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="mt-2">
                  <span className="text-base sm:text-lg font-black block leading-tight text-indigo-300">
                    {deadlineNotification.horasRestantesNecessarias}h restantes
                  </span>
                  <span className="text-[10px] font-medium text-gray-400">
                    de {metaHorasTotal}h totais planejadas
                  </span>
                </div>
              </div>

            </div>

            {/* Barra de Ações Rápidas */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 text-xs">
              <div className="flex items-center gap-2 text-gray-400 text-[11px]">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>O sistema recalcula automaticamente o ritmo diário conforme suas sessões registradas.</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onNavigateTab && (
                  <>
                    <button
                      onClick={() => onNavigateTab("estudar")}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer shadow-md"
                    >
                      Iniciar Estudo Agora
                    </button>
                    <button
                      onClick={() => onNavigateTab("planejamento")}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer border ${
                        darkMode ? "bg-white/5 border-white/15 text-gray-300 hover:bg-white/10" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      Ver Planejamento de Estudos
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* SEÇÃO PRINCIPAL: GRÁFICO EM ROSCA & PAINEL DE METAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Card: Progresso do Ciclo Atual (Gráfico em Rosca / Donut Chart) */}
        <div className={`lg:col-span-5 p-6 rounded-2xl border flex flex-col items-center justify-between transition-all ${
          darkMode 
            ? "bg-gradient-to-br from-[#0c1a3b] via-[#0f1b35] to-[#12285a] border-[#22408a] shadow-lg" 
            : "bg-gradient-to-br from-white to-blue-50/20 border-gray-200 shadow-sm"
        }`}>
          <div className="w-full text-center">
            <h3 className={`text-base font-bold uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Progresso do Ciclo Atual
            </h3>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
              {totalHorasEstudadasNoCiclo}h estudadas de {totalHorasPlanejadasNoCiclo}h planejadas
            </p>
          </div>

          {/* Nomes/Badges das Disciplinas Destacados ACIMA do Gráfico */}
          <div className="w-full mt-4 flex flex-wrap items-center justify-center gap-1.5 max-h-[90px] overflow-y-auto px-1">
            {disciplinasLista.map(({ disc }, idx) => {
              const isStudyingNow = disc.id === activeBlockId;

              return (
                <span
                  key={disc.id || `badge-disc-${idx}`}
                  onClick={() => setSelectedDrillDownDisciplineId(disc.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border cursor-pointer transition-transform hover:scale-105 shrink-0 ${
                    isStudyingNow ? "ring-2 ring-amber-400 bg-amber-500/20 text-amber-300 font-black animate-pulse" : ""
                  }`}
                  style={{
                    backgroundColor: isStudyingNow ? undefined : `${disc.cor || "#3b82f6"}20`,
                    borderColor: isStudyingNow ? "#f59e0b" : `${disc.cor || "#3b82f6"}60`,
                    color: isStudyingNow ? (darkMode ? "#fef08a" : "#854d0e") : (darkMode ? "#ffffff" : "#1e293b")
                  }}
                  title={isStudyingNow ? "ESTUDANDO AGORA NESTE MOMENTO" : `Filtrar ciclos de ${disc.nome}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: disc.cor || "#3b82f6" }} />
                  {isStudyingNow && <span className="text-amber-400 font-black">➔</span>}
                  {disc.nome}
                </span>
              );
            })}
          </div>

          {/* Gráfico em Rosca (Donut Chart) */}
          <div className="relative w-[230px] h-[230px] my-2 flex items-center justify-center select-none">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutSegmentsData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={95}
                  paddingAngle={3}
                  startAngle={90}
                  endAngle={-270}
                >
                  {donutSegmentsData.map((entry, idx) => (
                    <Cell key={`cell-donut-${idx}`} fill={entry.cor} stroke={darkMode ? "#0c1a3b" : "#ffffff"} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number, name: string) => [`${val.toFixed(1)}h`, name]}
                  contentStyle={{
                    backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                    borderColor: darkMode ? "#334155" : "#e2e8f0",
                    color: darkMode ? "#f8fafc" : "#0f172a",
                    fontSize: "11px",
                    borderRadius: "8px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centro do Gráfico em Rosca */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className={`text-2xl font-black tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>
                CICLO {currentCycle}
              </span>
              <span className="text-sm font-extrabold text-blue-500 font-mono">
                {progressoPorcentagem.toFixed(1)}%
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Progresso Geral
              </span>
            </div>
          </div>

          <div className="w-full flex justify-between items-center px-2 mt-1">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${darkMode ? "bg-blue-900/40 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
              {progressoPorcentagem.toFixed(1)}% concluído
            </span>
            <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Total de {totalCiclosPreparacao} ciclos previstos
            </span>
          </div>
        </div>

        {/* Painel de Metas e Estatísticas Rápidas */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Card: Tempo Total de Estudos (Acumulado de todos os ciclos) */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between transition-all text-center ${
            darkMode 
              ? "bg-gradient-to-br from-[#0c1a3b] to-[#12285a] border-[#22408a] shadow-lg" 
              : "bg-gradient-to-br from-[#e0efff] to-[#f4f9ff] border-blue-200 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.12)]"
          }`}>
            <div className="flex flex-col items-center py-2">
              <span className={`text-4xl font-extrabold tracking-tight ${darkMode ? "text-sky-400" : "text-blue-600"}`}>
                {totalHorasEstudadas}h
              </span>
              <p className={`text-[11px] font-bold uppercase tracking-wider mt-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                Tempo Total de Estudos
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-300/20 dark:border-blue-900/40 text-[11px] text-gray-500 dark:text-gray-400">
              Soma total acumulada de todos os ciclos até o momento.
            </div>
          </div>

          {/* Card: Taxa Geral de Acertos */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between transition-all text-center ${
            darkMode 
              ? "bg-gradient-to-br from-[#0c1a3b] to-[#12285a] border-[#22408a] shadow-lg" 
              : "bg-gradient-to-br from-[#e0efff] to-[#f4f9ff] border-blue-200 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.12)]"
          }`}>
            <div className="flex flex-col items-center py-2">
              <span className={`text-4xl font-extrabold tracking-tight ${questoesStats.acertos >= questoesStats.erros ? "text-emerald-500" : "text-amber-500"}`}>
                {questoesStats.taxaAcerto}%
              </span>
              <p className={`text-[11px] font-bold uppercase tracking-wider mt-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                Taxa Geral de Acertos
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-300/20 dark:border-blue-900/40 flex justify-around text-[11px]">
              <span className={darkMode ? "text-emerald-400" : "text-emerald-600"}>
                <strong>{questoesStats.acertos}</strong> Acertos
              </span>
              <span className="text-gray-400">|</span>
              <span className={darkMode ? "text-red-400" : "text-red-600"}>
                <strong>{questoesStats.erros}</strong> Erros
              </span>
            </div>
          </div>

          {/* Card: Soma de Horas Dedicadas por Disciplina */}
          <div className={`p-6 rounded-2xl border sm:col-span-2 transition-all ${
            darkMode 
              ? "bg-gradient-to-br from-[#0c1a3b] via-[#0f1b35] to-[#12285a] border-[#22408a] shadow-lg" 
              : "bg-gradient-to-br from-white to-blue-50/10 border-gray-200 shadow-sm"
          }`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Soma de Horas Dedicadas por Disciplina
            </h4>
            <div className="space-y-3">
              {chartDisciplinasEstudadasData.map((d, idx) => (
                <div key={d.id ? `chart-disc-${d.id}` : `chart-disc-${idx}`} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className={darkMode ? "text-gray-200" : "text-gray-800"}>{d.name}</span>
                    <span className={darkMode ? "text-gray-400" : "text-gray-500"}>{d.Horas}h</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200/20 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((d.Horas / (parseFloat(totalHorasEstudadas) || 1)) * 100, 100)}%`,
                        backgroundColor: d.cor
                      }}
                    />
                  </div>
                </div>
              ))}
              {chartDisciplinasEstudadasData.length === 0 && (
                <p className={`text-xs text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Nenhuma disciplina cadastrada para listar.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* SEÇÃO 2: MATÉRIAS DO PLANEJAMENTO X ESTUDO REAL */}
      <div className="grid grid-cols-1 gap-8">
        <div className={`p-6 rounded-2xl border transition-all ${
          darkMode 
            ? "bg-gradient-to-br from-[#0c1a3b] via-[#0f1b35] to-[#12285a] border-[#22408a] text-white shadow-lg" 
            : "bg-gradient-to-br from-white to-blue-50/10 border-gray-200 text-gray-800 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-4 border-b border-gray-100/10 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Matérias do Ciclo nº {currentCycle} (Planejamento x Estudo Real)
                </h3>
                <p className={`text-[10px] ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Comparativo de horas planejadas por bloco x tempo efetivamente estudado no ciclo
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[10px] font-extrabold uppercase tracking-wider ${
                  darkMode ? "border-gray-800 text-gray-400" : "border-gray-200 text-gray-500"
                }`}>
                  <th className="py-2.5 px-3">Disciplina</th>
                  <th className="py-2.5 px-3 text-center">Planejado</th>
                  <th className="py-2.5 px-3 text-center">Estudado (Ciclo)</th>
                  <th className="py-2.5 px-3 text-center">Progresso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30 text-xs">
                {disciplinasDetailedStats.map((item, idx) => {
                  const isStudyingNow = item.id === activeBlockId;

                  return (
                    <tr 
                      key={item.id ? `stat-${item.id}` : `stat-${idx}`} 
                      className={`transition-colors ${
                        isStudyingNow 
                          ? "bg-amber-500/10 dark:bg-amber-500/20 border-l-4 border-amber-500 font-semibold" 
                          : "hover:bg-white/5"
                      }`}
                    >
                      <td className="py-3 px-3 font-bold flex items-center space-x-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.cor }} />
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                          <div>
                            <span className="block font-bold">{item.nome}</span>
                            <span className="block text-[9px] font-normal text-gray-400">{item.categoria}</span>
                          </div>
                          {isStudyingNow && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-400 text-black border border-amber-500 shadow-sm animate-pulse flex items-center gap-1 shrink-0 w-fit">
                              ➔ ESTUDANDO AGORA
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-gray-300">
                        {item.horasPlanejadas}h
                      </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">
                      {item.horasEstudadasNoCiclo}h
                    </td>
                    <td className="py-3 px-3 text-center min-w-[140px]">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-200/20 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${item.progressoBloco}%`,
                              backgroundColor: item.progressoBloco >= 100 ? "#10b981" : item.cor
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold font-mono text-gray-300">{item.progressoBloco}%</span>
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

      {/* SEÇÃO 3: GRÁFICOS ANALÍTICOS */}
      <div className={`p-6 rounded-2xl border transition-all ${
        darkMode 
          ? "bg-gradient-to-br from-[#0c1a3b] via-[#0f1b35] to-[#12285a] border-[#22408a] text-white shadow-lg" 
          : "bg-gradient-to-br from-white via-[#fcfdfe] to-[#f4f9ff] border-gray-200 text-gray-800 shadow-sm"
      }`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-100/10 pb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-500" />
              Gráficos de Produtividade & Desempenho
            </h3>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
              Análise em tempo real do seu rendimento nos estudos
            </p>
          </div>
        </div>

        {/* 4 Gráficos Analíticos com Eixo de Tempo (DD/MM) em Grid 2x2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Gráfico 1: Disciplinas Estudadas ou Ciclos (Drill-Down) */}
          <div className={`space-y-3 p-5 rounded-xl border transition-all ${
            darkMode 
              ? "bg-[#112147]/50 border-[#22408a]/40 shadow-sm" 
              : "bg-gradient-to-br from-[#f8fafc] to-white border-blue-100/40 shadow-[0_2px_12px_-3px_rgba(59,130,246,0.03)]"
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <h4 className={`text-sm font-bold tracking-wide flex items-center gap-1.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  <span>{selectedDrillDownDisciplineId ? selectedDisciplineName : "Disciplinas Estudadas"}</span>
                </h4>
                <p className={`text-[10px] ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {selectedDrillDownDisciplineId ? "Ciclos estudados por tempo usado" : "Sincronizado com a guia ESTUDAR - SEQUENCIA DE BLOCOS DO CICLO"}
                </p>
              </div>
              {selectedDrillDownDisciplineId && (
                <button
                  onClick={() => setSelectedDrillDownDisciplineId(null)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                    darkMode
                      ? "bg-[#16223f] border-[#1e2d4d] text-blue-400 hover:bg-[#1a2b4c]"
                      : "bg-gray-100 border-gray-200 text-blue-600 hover:bg-gray-200"
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar para Geral
                </button>
              )}
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {selectedDrillDownDisciplineId ? (
                  <BarChart data={drillDownData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                    <XAxis dataKey="name" tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 10 }} />
                    <YAxis tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 10 }} tickFormatter={(val) => `${val}h`} />
                    <Tooltip
                      formatter={(value: any) => [`${value}h`, "Tempo Estudado"]}
                      contentStyle={{
                        backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                        borderColor: darkMode ? "#334155" : "#e2e8f0",
                        color: darkMode ? "#f8fafc" : "#0f172a"
                      }}
                    />
                    <Bar dataKey="Horas" radius={[4, 4, 0, 0]}>
                      {drillDownData.map((entry, idx) => (
                        <Cell key={`cell-drill-${idx}`} fill={entry.cor} />
                      ))}
                      <LabelList
                        dataKey="Minutos"
                        formatter={(val: number) => formatarMinutos(val)}
                        position="top"
                        style={{ fontSize: 9, fill: darkMode ? '#cbd5e1' : '#475569', fontWeight: 'bold' }}
                      />
                    </Bar>
                  </BarChart>
                ) : (
                  <BarChart data={chartDisciplinasEstudadasData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                    <XAxis dataKey="name" tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 10 }} />
                    <YAxis tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 10 }} tickFormatter={(val) => `${val}h`} />
                    <Tooltip
                      formatter={(value: any) => [`${value}h`, "Tempo Estudado"]}
                      contentStyle={{
                        backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                        borderColor: darkMode ? "#334155" : "#e2e8f0",
                        color: darkMode ? "#f8fafc" : "#0f172a"
                      }}
                    />
                    <Bar
                      dataKey="Horas"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => {
                        if (data && data.id) {
                          setSelectedDrillDownDisciplineId(data.id);
                        }
                      }}
                    >
                      {chartDisciplinasEstudadasData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.cor} />
                      ))}
                      <LabelList
                        dataKey="Minutos"
                        formatter={(val: number) => formatarMinutos(val)}
                        position="top"
                        style={{ fontSize: 9, fill: darkMode ? '#cbd5e1' : '#475569', fontWeight: 'bold' }}
                      />
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Produtividade por Ciclo */}
          <div className={`space-y-3 p-5 rounded-xl border transition-all ${
            darkMode 
              ? "bg-[#112147]/50 border-[#22408a]/40 shadow-sm" 
              : "bg-gradient-to-br from-[#f8fafc] to-white border-blue-100/40 shadow-[0_2px_12px_-3px_rgba(59,130,246,0.03)]"
          }`}>
            <h4 className={`text-sm font-bold tracking-wide flex items-center gap-1.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              <span>Produtividade por Ciclo</span>
            </h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartProdutividadePorCicloData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                  <XAxis dataKey="name" tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 10 }} tickFormatter={(val) => `${val}h`} />
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value}h`, name]}
                    contentStyle={{
                      backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                      borderColor: darkMode ? "#334155" : "#e2e8f0",
                      color: darkMode ? "#f8fafc" : "#0f172a"
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="Estudado"
                    name="Estudado"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, stroke: "#10b981", strokeWidth: 2, fill: "#ffffff" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Planejado"
                    name="Planejado"
                    stroke="#f97316"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4, stroke: "#f97316", strokeWidth: 2, fill: "#ffffff" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 3: Produtividade por Dia */}
          <div className={`space-y-3 p-5 rounded-xl border transition-all ${
            darkMode 
              ? "bg-[#112147]/50 border-[#22408a]/40 shadow-sm" 
              : "bg-gradient-to-br from-[#f8fafc] to-white border-blue-100/40 shadow-[0_2px_12px_-3px_rgba(59,130,246,0.03)]"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100/10">
              <div>
                <h4 className={`text-sm font-bold tracking-wide flex items-center gap-1.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  <span>Produtividade por Dia</span>
                  {dayRangeLimit === 0 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Ciclo Completo (Até a Meta)
                    </span>
                  )}
                </h4>
                <p className={`text-[10px] ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Horas estudadas x planejadas {metas.dataInicial && metas.dataFinal ? `(${formatarDataDDMM(metas.dataInicial)} até ${formatarDataDDMM(metas.dataFinal)})` : "ao longo do ciclo"}
                </p>
              </div>

              {/* Botões rápidos para atalho de dias */}
              <div className="flex flex-wrap items-center gap-1 bg-black/10 dark:bg-white/5 p-1 rounded-lg">
                <span className={`text-[9px] font-extrabold uppercase px-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Período:
                </span>
                {[7, 15, 30, 60, 90, 0].map((days) => (
                  <button
                    key={days}
                    onClick={() => setDayRangeLimit(days)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      dayRangeLimit === days
                        ? "bg-blue-600 text-white shadow-sm"
                        : darkMode
                        ? "text-gray-400 hover:text-white hover:bg-white/10"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {days === 0 ? "Até a Meta" : `${days}d`}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider interativo e âncora de data para ajuste da faixa de dias */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 py-1">
              <div className="flex items-center space-x-2 shrink-0">
                <span className={`text-[10px] font-semibold ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Exibir a partir de:
                </span>
                <div className="flex items-center p-0.5 rounded-lg bg-black/10 dark:bg-white/5 border border-white/10">
                  <button
                    onClick={() => setRangeAnchor("inicio")}
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                      rangeAnchor === "inicio"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Exibe o intervalo a partir da Data Inicial do ciclo"
                  >
                    Data Inicial ({metas.dataInicial ? formatarDataDDMM(metas.dataInicial) : "Início"})
                  </button>
                  <button
                    onClick={() => setRangeAnchor("recentes")}
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                      rangeAnchor === "recentes"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Exibe o intervalo com os dias mais recentes"
                  >
                    Mais Recentes
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3 flex-1 min-w-[200px]">
                <span className={`text-[10px] font-semibold shrink-0 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Amplitude: <strong className="text-blue-500">{dayRangeLimit === 0 ? "Todo o Ciclo" : `${dayRangeLimit} dias (${rangeAnchor === "inicio" ? "a partir do início" : "recente"})`}</strong>
                </span>
                <input
                  type="range"
                  min="5"
                  max="180"
                  step="5"
                  value={dayRangeLimit === 0 ? 180 : dayRangeLimit}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setDayRangeLimit(val >= 180 ? 0 : val);
                  }}
                  className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  title="Arraste para ajustar a quantidade de dias exibidos no gráfico"
                />
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartProdutividadePorDiaData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                  <XAxis dataKey="name" tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 10 }} tickFormatter={(val) => `${val}h`} />
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value}h`, name]}
                    contentStyle={{
                      backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                      borderColor: darkMode ? "#334155" : "#e2e8f0",
                      color: darkMode ? "#f8fafc" : "#0f172a"
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="Estudado"
                    name="Estudado"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, stroke: "#10b981", strokeWidth: 2, fill: "#ffffff" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Planejado"
                    name="Planejado"
                    stroke="#f97316"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4, stroke: "#f97316", strokeWidth: 2, fill: "#ffffff" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 4: Desempenho - Questões Resolvidas */}
          <div className={`space-y-3 p-5 rounded-xl border transition-all ${
            darkMode 
              ? "bg-[#112147]/50 border-[#22408a]/40 shadow-sm" 
              : "bg-gradient-to-br from-[#f8fafc] to-white border-blue-100/40 shadow-[0_2px_12px_-3px_rgba(59,130,246,0.03)]"
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-1">
              <div>
                <h4 className={`text-sm font-bold tracking-wide flex items-center gap-1.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  <span>Desempenho - Questões resolvidas</span>
                </h4>
                <p className={`text-[10px] ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Evolução do seu índice de acertos e erros
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1 bg-gray-200/15 p-0.5 rounded-lg">
                  <button
                    onClick={() => handleCategoryChange("todas")}
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      questionsArea === "todas"
                        ? "bg-blue-600 text-white shadow-sm"
                        : darkMode
                        ? "text-gray-300 hover:text-white"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => handleCategoryChange("basicos")}
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      questionsArea === "basicos"
                        ? "bg-blue-600 text-white shadow-sm"
                        : darkMode
                        ? "text-gray-300 hover:text-white"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Básicas
                  </button>
                  <button
                    onClick={() => handleCategoryChange("especificos")}
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      questionsArea === "especificos"
                        ? "bg-blue-600 text-white shadow-sm"
                        : darkMode
                        ? "text-gray-300 hover:text-white"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Específicas
                  </button>
                </div>

                <select
                  value={selectedDisciplineId}
                  onChange={(e) => setSelectedDisciplineId(e.target.value)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border outline-none cursor-pointer transition-all ${
                    darkMode
                      ? "bg-[#0f1b35] border-[#1e2d4d] text-gray-200 focus:border-blue-500"
                      : "bg-white border-gray-200 text-gray-700 focus:border-blue-500"
                  }`}
                >
                  <option key="todas" value="todas">TODAS AS MATÉRIAS / BLOCOS</option>
                  {filteredDisciplinasDropdown.map(({ disc }, idx) => (
                    <option key={disc.id || `disc-opt-${idx}`} value={disc.id}>
                      BLOCO {idx + 1} - {(disc.nome || "").toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartQuestoesData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                  <XAxis dataKey="name" tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                      borderColor: darkMode ? "#334155" : "#e2e8f0",
                      color: darkMode ? "#f8fafc" : "#0f172a"
                    }}
                  />
                  <Legend textAnchor="middle" wrapperStyle={{ fontSize: 10 }} />
                  <Line yAxisId="left" type="monotone" dataKey="Acertos" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="left" type="monotone" dataKey="Erros" stroke="#f87171" strokeWidth={1.5} dot={{ r: 2 }} />
                  <Line yAxisId="left" type="monotone" dataKey="Total" name="Total Feitas" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                  <Line yAxisId="right" type="monotone" dataKey="Aproveitamento" name="Aprov %" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
