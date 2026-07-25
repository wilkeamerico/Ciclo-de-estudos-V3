import React, { useState, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, Cell, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from "recharts";
import { StudyState, Disciplina, StudySession } from "../types";
import { calcularSomaPontos, calcularPesoPercentual, formatarDataDDMM } from "../utils/studyHelpers";
import { Trophy, CheckCircle, AlertTriangle, Play, HelpCircle, RefreshCw, BarChart2, ArrowLeft } from "lucide-react";

// Helper function to generate SVG path for a slice of the annular sector
function getArcPath(cx: number, cy: number, rInner: number, rOuter: number, startAngle: number, endAngle: number): string {
  const rad = Math.PI / 180;
  const xOuterStart = cx + rOuter * Math.cos(startAngle * rad);
  const yOuterStart = cy - rOuter * Math.sin(startAngle * rad);
  const xOuterEnd = cx + rOuter * Math.cos(endAngle * rad);
  const yOuterEnd = cy - rOuter * Math.sin(endAngle * rad);
  
  const xInnerStart = cx + rInner * Math.cos(startAngle * rad);
  const yInnerStart = cy - rInner * Math.sin(startAngle * rad);
  const xInnerEnd = cx + rInner * Math.cos(endAngle * rad);
  const yInnerEnd = cy - rInner * Math.sin(endAngle * rad);

  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;

  return [
    `M ${xOuterStart} ${yOuterStart}`,
    `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${xOuterEnd} ${yOuterEnd}`,
    `L ${xInnerEnd} ${yInnerEnd}`,
    `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${xInnerStart} ${yInnerStart}`,
    "Z"
  ].join(" ");
}

interface DashboardViewProps {
  state: StudyState;
  darkMode: boolean;
}

export default function DashboardView({ state, darkMode }: DashboardViewProps) {
  const { edital, metas, sessions, currentCycle } = state;

  // Filtros internos seguros para evitar quebras de UI ao clicar em subcampos
  const [questionsArea, setQuestionsArea] = useState<"todas" | "basicos" | "especificos">("todas");
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("todas");
  const [selectedDrillDownDisciplineId, setSelectedDrillDownDisciplineId] = useState<string | null>(null);
  const [dayRangeLimit, setDayRangeLimit] = useState<number>(30);
  const [rangeAnchor, setRangeAnchor] = useState<"inicio" | "recentes">("inicio");

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

  // Horas estudadas totais gerais
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

  // Total de horas planejadas para um ciclo de estudos completo (soma de horas por ciclo das disciplinas)
  const totalHorasPlanejadasNoCiclo = useMemo(() => {
    const hrs = disciplinasLista.reduce((acc, d) => acc + (d.disc.horasPorCiclo || 1.0), 0);
    return hrs.toFixed(1);
  }, [disciplinasLista]);

  // Total de questões resolvidas (acertos / erros / acertos %)
  const questoesStats = useMemo(() => {
    let acertos = 0;
    let erros = 0;
    
    // Soma das sessões de estudo
    sessions.forEach((s) => {
      acertos += s.questoesAcertos || 0;
      erros += s.questoesErros || 0;
    });

    // Soma dos registros diretos nos tópicos do edital
    edital.categorias.forEach((cat) => {
      cat.disciplinas.forEach((disc) => {
        disc.assuntos.forEach((ass) => {
          ass.registros.forEach((reg) => {
            acertos += reg.acertos || 0;
            erros += reg.erros || 0;
          });
        });
      });
    });

    const total = acertos + erros;
    const taxaAcerto = total > 0 ? ((acertos / total) * 100).toFixed(1) : "0.0";
    return { acertos, erros, total, taxaAcerto };
  }, [sessions, edital]);

  // Metas totais de horas (com base nas metas cadastradas)
  const metaHorasTotal = useMemo(() => {
    // Calculado a partir das datas e folgas do Calendário
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
    return horas || 1; // Evita divisão por zero
  }, [metas]);

  // Progresso do Ciclo Atual para o Velocímetro (baseado no total de horas estudadas no ciclo atual vs planejado por ciclo)
  const progressoPorcentagem = useMemo(() => {
    const estudadoMins = sessions
      .filter((s) => s.ciclo === currentCycle)
      .reduce((acc, s) => acc + (s.duracaoMinutos || 0), 0);
    const planejadoMins = disciplinasLista.reduce((acc, d) => acc + (d.disc.horasPorCiclo || 1.0), 0) * 60;
    if (planejadoMins === 0) return 0;
    const perc = (estudadoMins / planejadoMins) * 100;
    return Math.min(Math.max(perc, 0), 100); // Garante entre 0% e 100%
  }, [sessions, currentCycle, disciplinasLista]);

  // Helper para obter datas do período
  function obterDatasPeriodo(ini: string, fim: string): string[] {
    const arr: string[] = [];
    const dIni = new Date(ini + "T00:00:00");
    const dFim = new Date(fim + "T00:00:00");
    if (isNaN(dIni.getTime()) || isNaN(dFim.getTime())) return [];
    const curr = new Date(dIni);
    while (curr <= dFim) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, "0");
      const d = String(curr.getDate()).padStart(2, "0");
      arr.push(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
    }
    return arr;
  }

  // --- PREPARAÇÃO DOS DADOS PARA GRÁFICOS ---

  // 1. Gráfico: Disciplinas Estudadas (Soma das horas de estudo por matéria)
  const chartDisciplinasEstudadasData = useMemo(() => {
    const map: { [key: string]: { id: string; nome: string; minutos: number; cor: string } } = {};
    
    // Inicializa com as disciplinas cadastradas no edital para mostrar todas
    disciplinasLista.forEach(({ disc }) => {
      map[disc.id] = {
        id: disc.id,
        nome: disc.nome,
        minutos: 0,
        cor: disc.cor || "#3b82f6"
      };
    });

    // Agrega as sessões de estudo
    sessions.forEach((s) => {
      if (map[s.disciplinaId]) {
        map[s.disciplinaId].minutos += s.duracaoMinutos;
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

  // Dados para o Gráfico de Ciclos de Estudos feitos para a disciplina selecionada (Drill-Down)
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

  // 2. Gráfico: Produtividade por Ciclo (Estudado x Planejado por Ciclo)
  const chartProdutividadePorCicloData = useMemo(() => {
    const cyclesMap: { [cycle: number]: { estudadoMins: number; dataInicial: string } } = {};
    
    sessions.forEach(s => {
      if (!cyclesMap[s.ciclo]) {
        cyclesMap[s.ciclo] = { estudadoMins: 0, dataInicial: s.data };
      }
      cyclesMap[s.ciclo].estudadoMins += s.duracaoMinutos;
      if (s.data && (!cyclesMap[s.ciclo].dataInicial || s.data < cyclesMap[s.ciclo].dataInicial)) {
        cyclesMap[s.ciclo].dataInicial = s.data;
      }
    });

    const maxCycle = Math.max(state.currentCycle, ...sessions.map(s => s.ciclo), 1);
    const data = [];
    const plannedMins = disciplinasLista.reduce((acc, d) => acc + (d.disc.horasPorCiclo || 1.0), 0) * 60;

    for (let c = 1; c <= maxCycle; c++) {
      const entry = cyclesMap[c];
      const estudadoMins = entry ? entry.estudadoMins : 0;
      const dateLabel = entry?.dataInicial ? ` (${formatarDataDDMM(entry.dataInicial)})` : "";
      data.push({
        name: `Ciclo ${c}${dateLabel}`,
        Estudado: parseFloat((estudadoMins / 60).toFixed(2)),
        Planejado: parseFloat((plannedMins / 60).toFixed(2)),
        estudadoMins,
        plannedMins
      });
    }
    return data;
  }, [sessions, state.currentCycle, disciplinasLista]);

  // 3. Gráfico: Produtividade por Dia (Estudado x Planejado por Dia)
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

    sessions.forEach((s) => {
      const dataStr = s.data || "2026-07-10";
      if (!map[dataStr]) {
        map[dataStr] = { estudadoMins: 0, planejadoMins: 0 };
      }
      map[dataStr].estudadoMins += s.duracaoMinutos;
    });

    let sortedDates = Object.keys(map).sort();
    
    if (sortedDates.length === 0) {
      return [
        { name: "10/07", Estudado: 0, Planejado: 0 },
        { name: "11/07", Estudado: 0, Planejado: 0 }
      ];
    }

    if (dayRangeLimit > 0 && sortedDates.length > dayRangeLimit) {
      if (rangeAnchor === "recentes") {
        sortedDates = sortedDates.slice(-dayRangeLimit);
      } else {
        // Default "inicio": always starts from metas.dataInicial so initial date is visible below 90d
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

  // 4. Gráfico: Desempenho - Questões resolvidas (Filtro por área e por disciplina)
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

    sessions.forEach((s) => {
      if (allowedDisciplineIds.has(s.disciplinaId)) {
        const dataStr = s.data || "2026-07-10";
        if (!map[dataStr]) map[dataStr] = { acertos: 0, erros: 0 };
        map[dataStr].acertos += s.questoesAcertos || 0;
        map[dataStr].erros += s.questoesErros || 0;
      }
    });

    edital.categorias.forEach((cat) => {
      const isBasicos = cat.nome.includes("BÁSICOS");
      const isEspecificos = cat.nome.includes("ESPECÍFICOS");
      if (questionsArea === "basicos" && !isBasicos) return;
      if (questionsArea === "especificos" && !isEspecificos) return;

      cat.disciplinas.forEach((disc) => {
        if (selectedDisciplineId !== "todas" && disc.id !== selectedDisciplineId) return;

        disc.assuntos.forEach((ass) => {
          ass.registros.forEach((reg) => {
            let key = reg.data;
            if (reg.data.includes("/")) {
              const pts = reg.data.split("/");
              if (pts.length === 3) {
                key = `${pts[2]}-${pts[1]}-${pts[0]}`;
              }
            }
            if (!map[key]) map[key] = { acertos: 0, erros: 0 };
            map[key].acertos += reg.acertos || 0;
            map[key].erros += reg.erros || 0;
          });
        });
      });
    });

    const datasOrdenadas = Object.keys(map).sort();

    if (datasOrdenadas.length === 0) {
      return [
        { name: "10/07", Acertos: 0, Erros: 0 },
        { name: "11/07", Acertos: 0, Erros: 0 }
      ];
    }

    return datasOrdenadas.map((dStr) => {
      const acertos = map[dStr].acertos;
      const erros = map[dStr].erros;
      const total = acertos + erros;
      return {
        name: formatarDataDDMM(dStr),
        Acertos: acertos,
        Erros: erros,
        Aproveitamento: total > 0 ? parseFloat(((acertos / total) * 100).toFixed(1)) : 0
      };
    });
  }, [sessions, edital, disciplinasLista, questionsArea, selectedDisciplineId]);

  // --- SEGMETAÇÃO DO VELOCÍMETRO POR DISCIPLINAS DO CICLO ---
  const gaugeSegments = useMemo(() => {
    const n = disciplinasLista.length || 1;
    const segmentAngle = 180 / n;
    
    return disciplinasLista.map(({ disc }, index) => {
      const startAngle = 180 - index * segmentAngle;
      const endAngle = 180 - (index + 1) * segmentAngle;
      return {
        id: disc.id,
        nome: disc.nome,
        cor: disc.cor || "#3b82f6",
        startAngle,
        endAngle,
        path: getArcPath(150, 130, 85, 115, startAngle, endAngle)
      };
    });
  }, [disciplinasLista]);

  const gaugeLabels = useMemo(() => {
    return gaugeSegments.map((seg) => {
      const midAngle = (seg.startAngle + seg.endAngle) / 2;
      const rad = midAngle * Math.PI / 180;
      const x = 150 + 100 * Math.cos(rad);
      const y = 130 - 100 * Math.sin(rad);
      const firstWord = seg.nome.split(" ")[0] || "Bloco";
      return {
        x,
        y,
        text: firstWord.substring(0, 10),
        fullName: seg.nome
      };
    });
  }, [gaugeSegments]);

  // --- CÁLCULO DAS COORDENADAS DO PONTEIRO DO VELOCÍMETRO ---
  const needleCoords = useMemo(() => {
    const cx = 150;
    const cy = 130;
    const radius = 95;
    const angle = 180 - (progressoPorcentagem * 1.8);
    const rad = (angle * Math.PI) / 180;
    const x = cx + radius * Math.cos(rad);
    const y = cy - radius * Math.sin(rad);
    return { cx, cy, x, y };
  }, [progressoPorcentagem]);

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      {/* SEÇÃO PRINCIPAL: VELOCÍMETRO & PAINEL DE METAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Velocímetro Polido (Conforme velocímetro.jpg) */}
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
              {totalHorasEstudadasNoCiclo}h estudadas de {totalHorasPlanejadasNoCiclo}h planejadas no ciclo
            </p>
          </div>

          {/* SVG do Velocímetro de Semicírculo */}
          <div className="relative w-[300px] h-[160px] mt-6 select-none flex justify-center">
            <svg width="300" height="150" viewBox="0 0 300 150" className="overflow-visible">
              <defs>
                {/* Gradiantes */}
                <linearGradient id="gauge-blue" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>

              {/* Arcos do velocímetro segmentados por matéria/bloco */}
              {gaugeSegments.map((seg, idx) => (
                <path
                  key={seg.id || idx}
                  d={seg.path}
                  fill={seg.cor}
                  className="opacity-95 hover:opacity-100 transition-opacity cursor-pointer animate-fade-in"
                  onClick={() => setSelectedDrillDownDisciplineId(seg.id)}
                />
              ))}

              {/* Rótulos de matérias/blocos nos Arcos */}
              {gaugeLabels.map((lbl, idx) => (
                <text
                  key={idx}
                  x={lbl.x}
                  y={lbl.y}
                  fill={darkMode ? "#ffffff" : "#1e293b"}
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {lbl.text}
                </text>
              ))}

              {/* Borda interna para efeito circular */}
              <path d="M 65 130 A 85 85 0 0 1 235 130 L 245 130 A 95 95 0 0 0 55 130 Z" fill={darkMode ? "#0f1b35" : "#ffffff"} />

              {/* Sombra e Ponteiro (Needle) */}
              <line
                x1={needleCoords.cx}
                y1={needleCoords.cy}
                x2={needleCoords.x}
                y2={needleCoords.y}
                stroke={darkMode ? "#38bdf8" : "#0f172a"}
                strokeWidth="4"
                strokeLinecap="round"
              />
              <line
                x1={needleCoords.cx}
                y1={needleCoords.cy}
                x2={needleCoords.x}
                y2={needleCoords.y}
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {/* Pino central circular com indicador numérico abaixo */}
              <circle cx={needleCoords.cx} cy={needleCoords.cy} r="8" fill={darkMode ? "#1e293b" : "#e2e8f0"} stroke="#ef4444" strokeWidth="2" />
            </svg>

            {/* No centro da base do velocímetro fica somente o numeral representando o ciclo atualmente */}
            <div className="absolute bottom-1 flex flex-col items-center justify-center">
              <span className={`text-4xl font-extrabold tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>
                {currentCycle}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                CICLO ATUAL
              </span>
            </div>
          </div>

          <div className="w-full flex justify-between items-center px-4 mt-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${darkMode ? "bg-blue-900/40 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
              {progressoPorcentagem.toFixed(1)}% do ciclo completo
            </span>
            <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              {disciplinasLista.length} disciplinas ativas
            </span>
          </div>
        </div>

        {/* Painel de Metas e Estatísticas Rápidas (Bento Grid) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Card: Total de Horas Estudadas */}
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
              Soma total de <strong className={darkMode ? "text-white" : "text-gray-800"}>{sessions.length}</strong> blocos de estudos finalizados.
            </div>
          </div>

          {/* Card: Desempenho em Questões */}
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

          {/* Card: Disciplinas com mais Estudos */}
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
                <div key={idx} className="space-y-1">
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

      {/* FILTROS E SEÇÃO DE GRÁFICOS ANALÍTICOS */}
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
                  {selectedDrillDownDisciplineId ? "Ciclos estudados por tempo usado" : "Clique em uma disciplina para ver os ciclos"}
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
              
              {/* Filter buttons and dropdown located inside this card header */}
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
                  <option value="todas">TODAS AS MATÉRIAS</option>
                  {filteredDisciplinasDropdown.map(({ disc }) => (
                    <option key={disc.id} value={disc.id}>
                      {disc.nome.toUpperCase()}
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
