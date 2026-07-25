import React, { useState, useMemo, useRef } from "react";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie } from "recharts";
import { StudyState, SimuladoItem, SimuladoMateriaNota } from "../types";
import { Sparkles, Upload, CheckCircle2, Target, BarChart2, Plus, Eye, X, Check, FileCheck, RotateCcw, FileText, AlertCircle, Award } from "lucide-react";
import { formatarDataDDMM, fileToBase64 } from "../utils/studyHelpers";

interface SimuladoViewProps {
  state: StudyState;
  updateState: (newState: StudyState) => void;
  darkMode: boolean;
}

export default function SimuladoView({ state, updateState, darkMode }: SimuladoViewProps) {
  const { edital, simulados } = state;

  const [activeTab, setActiveTab] = useState<"historico" | "gabarito">("historico");

  // Initial target meta % (default 80%)
  const metaAproveitamento = simulados?.metaAproveitamento || 80;

  // Registered history of mock tests for the current cycle
  const listHistorico: SimuladoItem[] = useMemo(() => {
    return simulados?.historico || [];
  }, [simulados]);

  // Modal details view target
  const [selectedSimuladoDetalhes, setSelectedSimuladoDetalhes] = useState<SimuladoItem | null>(null);

  // --- IA SCANNER STATES (GABARITO TAB) ---
  const [editalText, setEditalText] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResultMsg, setScanResultMsg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- META BOX STATE ---
  const [metaInput, setMetaInput] = useState(metaAproveitamento);

  // --- NEW SIMULADO ENTRY FORM & ANSWER SHEET GRID (GABARITO TAB) ---
  const [novoSimuladoNome, setNovoSimuladoNome] = useState(`SIMULADO 0${listHistorico.length + 1}`);
  const [novoSimuladoData, setNovoSimuladoData] = useState(() => new Date().toISOString().split("T")[0]);
  const [penalidadeErroInput, setPenalidadeErroInput] = useState<number>(0.0); // 0 (Múltipla escolha sem penalidade) ou 1.0 (Cebraspe)
  const [tipoQuestoes, setTipoQuestoes] = useState<"multipla" | "certo_errado">("multipla");
  const [quickPasteUser, setQuickPasteUser] = useState("");
  const [quickPasteGabarito, setQuickPasteGabarito] = useState("");

  // Disciplines list based on edital registered subjects
  const disciplinasCadastradas = useMemo(() => {
    return edital.categorias.flatMap(c => c.disciplinas.map(d => ({
      ...d,
      categoriaNome: c.nome
    })));
  }, [edital]);

  // Generate question items mapping each question index to a discipline
  const questionsList = useMemo(() => {
    const qArr: Array<{
      qIndex: number;
      disciplineId: string;
      disciplineName: string;
      categoryName: string;
      peso: number;
    }> = [];

    let count = 1;
    disciplinasCadastradas.forEach(d => {
      const qCount = d.questoes || 10;
      for (let i = 0; i < qCount; i++) {
        qArr.push({
          qIndex: count++,
          disciplineId: d.id,
          disciplineName: d.nome,
          categoryName: d.categoriaNome || (d.nome.toLowerCase().includes("específic") ? "Conhecimentos Específicos" : "Conhecimentos Básicos"),
          peso: d.peso || 1
        });
      }
    });

    return qArr;
  }, [disciplinasCadastradas]);

  // Answer Grid state: respostasUsuario & gabaritoCorreto
  const [respostasUsuario, setRespostasUsuario] = useState<{ [qIndex: number]: string }>({});
  const [gabaritoCorreto, setGabaritoCorreto] = useState<{ [qIndex: number]: string }>({});

  // Reset grid
  const handleLimparGabarito = () => {
    setRespostasUsuario({});
    setGabaritoCorreto({});
    setQuickPasteUser("");
    setQuickPasteGabarito("");
  };

  // Quick fill sequence parser
  const handleApplyQuickPaste = (target: "usuario" | "gabarito", sequenceStr: string) => {
    const tokens = sequenceStr.toUpperCase().replace(/[^A-E]/g, "").split("");
    const newMap: { [qIndex: number]: string } = {};
    tokens.forEach((char, idx) => {
      if (idx < questionsList.length) {
        newMap[idx + 1] = char;
      }
    });

    if (target === "usuario") {
      setRespostasUsuario(prev => ({ ...prev, ...newMap }));
    } else {
      setGabaritoCorreto(prev => ({ ...prev, ...newMap }));
    }
  };

  // Live Answer Sheet totals calculation (matching image.png)
  const gridCalculations = useMemo(() => {
    let countCertas = 0;
    let countErradas = 0;
    let pontuacaoBasica = 0;
    let pontuacaoEspecifica = 0;

    // Per subject breakdown
    const subjectStatsMap: {
      [discId: string]: { acertos: number; erros: number; anuladas: number; total: number; peso: number; discNome: string }
    } = {};

    disciplinasCadastradas.forEach(d => {
      subjectStatsMap[d.id] = { acertos: 0, erros: 0, anuladas: 0, total: d.questoes || 10, peso: d.peso || 1, discNome: d.nome };
    });

    questionsList.forEach(q => {
      const respUser = respostasUsuario[q.qIndex] || "";
      const gab = gabaritoCorreto[q.qIndex] || "";

      if (respUser && gab) {
        const isBasica = q.categoryName.toLowerCase().includes("básic") || q.categoryName.toLowerCase().includes("gerai");
        if (respUser === gab) {
          countCertas += 1;
          if (subjectStatsMap[q.disciplineId]) subjectStatsMap[q.disciplineId].acertos += 1;
          if (isBasica) {
            pontuacaoBasica += q.peso;
          } else {
            pontuacaoEspecifica += q.peso;
          }
        } else {
          countErradas += 1;
          if (subjectStatsMap[q.disciplineId]) subjectStatsMap[q.disciplineId].erros += 1;
          if (isBasica) {
            pontuacaoBasica -= (q.peso * penalidadeErroInput);
          } else {
            pontuacaoEspecifica -= (q.peso * penalidadeErroInput);
          }
        }
      }
    });

    // Clamp scores at 0 if non-negative
    const finalBasica = Math.max(0, parseFloat(pontuacaoBasica.toFixed(2)));
    const finalEspecifica = Math.max(0, parseFloat(pontuacaoEspecifica.toFixed(2)));
    const pontuacaoConquistada = parseFloat((finalBasica + finalEspecifica).toFixed(2));

    return {
      countCertas,
      countErradas,
      totalQuestoes: questionsList.length,
      pontuacaoBasica: finalBasica,
      pontuacaoEspecifica: finalEspecifica,
      pontuacaoConquistada,
      subjectStatsMap
    };
  }, [questionsList, respostasUsuario, gabaritoCorreto, penalidadeErroInput, disciplinasCadastradas]);

  // Save Meta handler
  const handleSaveMeta = () => {
    updateState({
      ...state,
      simulados: {
        historico: listHistorico,
        metaAproveitamento: metaInput,
        criteriosPorCargo: simulados?.criteriosPorCargo || {}
      }
    });
    alert(`Meta de aproveitamento atualizada para ${metaInput}% com sucesso!`);
  };

  // Save New Simulado Handler
  const handleSalvarSimulado = () => {
    if (!novoSimuladoNome.trim()) {
      alert("Por favor, informe o nome do simulado!");
      return;
    }

    if (gridCalculations.countCertas === 0 && gridCalculations.countErradas === 0) {
      if (!confirm("O gabarito ainda não foi totalmente preenchido. Deseja registrar assim mesmo?")) {
        return;
      }
    }

    let totalPtsMax = 0;
    const detalhesMaterias: SimuladoMateriaNota[] = disciplinasCadastradas.map(d => {
      const stats = gridCalculations.subjectStatsMap[d.id] || { acertos: 0, erros: 0, anuladas: 0, total: d.questoes || 10, peso: d.peso || 1 };
      const qCount = d.questoes || 10;
      const peso = d.peso || 1;
      const maxPtsDisc = qCount * peso;
      totalPtsMax += maxPtsDisc;

      const ptsBrutos = (stats.acertos * peso) - (stats.erros * peso * penalidadeErroInput);
      const ptsFinal = Math.max(0, ptsBrutos);
      const aproveit = maxPtsDisc > 0 ? (ptsFinal / maxPtsDisc) * 100 : 0;

      return {
        disciplinaId: d.id,
        disciplinaNome: d.nome,
        questoesRespondidas: qCount,
        acertos: stats.acertos,
        erros: stats.erros,
        anuladas: stats.anuladas,
        peso,
        pontuacao: parseFloat(ptsFinal.toFixed(1)),
        pontuacaoMaxima: maxPtsDisc,
        aproveitamento: parseFloat(aproveit.toFixed(1))
      };
    });

    const aproveitamentoGeral = totalPtsMax > 0 ? (gridCalculations.pontuacaoConquistada / totalPtsMax) * 100 : 0;

    const novoItem: SimuladoItem = {
      id: "sim_" + Date.now(),
      nome: novoSimuladoNome,
      data: novoSimuladoData,
      cargo: edital.cargo || "Geral",
      orgao: edital.orgao || "Concurso",
      pontuacaoTotal: gridCalculations.pontuacaoConquistada,
      pontuacaoMaximaTotal: totalPtsMax,
      aproveitamentoGeral: parseFloat(aproveitamentoGeral.toFixed(1)),
      totalAcertos: gridCalculations.countCertas,
      totalQuestoes: gridCalculations.totalQuestoes,
      detalhesMaterias
    };

    const novoHistorico = [...listHistorico, novoItem];

    updateState({
      ...state,
      simulados: {
        historico: novoHistorico,
        metaAproveitamento: metaInput,
        criteriosPorCargo: simulados?.criteriosPorCargo || {}
      }
    });

    alert(`Simulado "${novoSimuladoNome}" registrado com sucesso no Histórico!\nPontuação Conquistada: ${gridCalculations.pontuacaoConquistada} / ${totalPtsMax} pts (${aproveitamentoGeral.toFixed(1)}%).`);

    // ZERO / RESET THE ANSWER GRID FOR NEW FILLING
    handleLimparGabarito();
    setNovoSimuladoNome(`SIMULADO 0${novoHistorico.length + 1}`);
    setActiveTab("historico");
  };

  // Handle Manual IA File / Text Scanner
  const handleEscanearEditalIA = async () => {
    if (!editalText.trim() && !selectedFile) {
      alert("Por favor, selecione um arquivo de edital (PDF/TXT) ou cole o texto das disciplinas e critérios do concurso!");
      return;
    }

    setIsScanning(true);
    setScanResultMsg(null);

    try {
      let pdfBase64: string | undefined = undefined;
      let pdfMimeType: string | undefined = undefined;

      if (selectedFile) {
        pdfBase64 = await fileToBase64(selectedFile);
        pdfMimeType = selectedFile.type || "application/pdf";
      }

      const response = await fetch("/api/scan-edital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: editalText,
          pdfBase64,
          pdfMimeType,
          cargoDesejado: edital.cargo || "Geral"
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao conectar com a IA para escanear o edital.");
      }

      const scannedData = await response.json();

      if (scannedData.categorias && scannedData.categorias.length > 0) {
        // Update edital state with extracted disciplines and criteria
        updateState({
          ...state,
          edital: {
            ...state.edital,
            banca: scannedData.banca || state.edital.banca,
            orgao: scannedData.orgao || state.edital.orgao,
            cargo: scannedData.cargo || state.edital.cargo,
            categorias: scannedData.categorias
          }
        });
      }

      // Detect penalidade / style
      if (scannedData.banca?.toLowerCase().includes("cebraspe") || scannedData.banca?.toLowerCase().includes("cespe")) {
        setPenalidadeErroInput(1.0);
        setTipoQuestoes("certo_errado");
      }

      setScanResultMsg(`✅ Edital escaneado com sucesso! Disciplinas, número de questões e pesos extraídos do edital para o cargo "${scannedData.cargo || edital.cargo}".`);
    } catch (err: any) {
      console.error(err);
      const isFailedToFetch = err?.message?.includes("Failed to fetch") || err?.toString()?.includes("Failed to fetch");
      const msg = isFailedToFetch
        ? "Erro de conexão ao enviar para o servidor de IA. Se estiver usando PDF grande, tente colar o texto das disciplinas ou anexar um PDF menor."
        : (err?.message || "Erro ao processar o edital com a IA.");
      setScanResultMsg(`Erro: ${msg}`);
    } finally {
      setIsScanning(false);
    }
  };

  // --- STATS COMPUTATION FOR HISTÓRICO DASHBOARD ---
  const statsCalculated = useMemo(() => {
    if (listHistorico.length === 0) {
      return {
        mediaGeral: 0,
        melhorDesempenho: 0,
        melhorSimuladoNome: "N/A",
        totalAcertos: 0,
        totalQuestoes: 0,
        deltaMedia: "+0.0%"
      };
    }

    const somaAproveitamentos = listHistorico.reduce((acc, s) => acc + s.aproveitamentoGeral, 0);
    const mediaGeral = parseFloat((somaAproveitamentos / listHistorico.length).toFixed(1));

    let melhor = listHistorico[0];
    listHistorico.forEach((s) => {
      if (s.aproveitamentoGeral > melhor.aproveitamentoGeral) {
        melhor = s;
      }
    });

    const ultimoSimulado = listHistorico[listHistorico.length - 1];

    return {
      mediaGeral,
      melhorDesempenho: melhor.aproveitamentoGeral,
      melhorSimuladoNome: melhor.nome,
      totalAcertos: ultimoSimulado.totalAcertos,
      totalQuestoes: ultimoSimulado.totalQuestoes,
      deltaMedia: "▲ 2,1%"
    };
  }, [listHistorico]);

  // Overall Subject Performance Matrix for Horizontal Bar & Status Table
  const subjectPerformanceMatrix = useMemo(() => {
    const map: { [discNome: string]: { totalPts: number; totalMax: number; count: number; totalAcertos: number } } = {};

    listHistorico.forEach((sim) => {
      sim.detalhesMaterias.forEach((m) => {
        if (!map[m.disciplinaNome]) {
          map[m.disciplinaNome] = { totalPts: 0, totalMax: 0, count: 0, totalAcertos: 0 };
        }
        map[m.disciplinaNome].totalPts += m.pontuacao;
        map[m.disciplinaNome].totalMax += m.pontuacaoMaxima;
        map[m.disciplinaNome].totalAcertos += m.acertos;
        map[m.disciplinaNome].count += 1;
      });
    });

    const rows = Object.keys(map).map((nome) => {
      const item = map[nome];
      const mediaAproveit = item.totalMax > 0 ? (item.totalPts / item.totalMax) * 100 : 0;
      const notaFormatted = parseFloat(mediaAproveit.toFixed(1));

      let status: "ÓTIMO" | "REVISAR" | "ATENÇÃO" = "ÓTIMO";
      if (notaFormatted < metaAproveitamento - 10) {
        status = "ATENÇÃO";
      } else if (notaFormatted < metaAproveitamento) {
        status = "REVISAR";
      }

      return {
        materia: nome,
        nota: notaFormatted,
        totalAcertos: item.totalAcertos,
        status
      };
    });

    return rows;
  }, [listHistorico, metaAproveitamento]);

  // Donut chart distribution data
  const donutData = useMemo(() => {
    const colors = ["#00a896", "#f4a261", "#2a9d8f", "#e76f51", "#457b9d", "#6a0572"];
    return subjectPerformanceMatrix.map((item, idx) => ({
      name: item.materia,
      value: item.totalAcertos,
      percentage: ((item.totalAcertos / (statsCalculated.totalAcertos || 1)) * 100).toFixed(1),
      fill: colors[idx % colors.length]
    }));
  }, [subjectPerformanceMatrix, statsCalculated.totalAcertos]);

  // Weakest & Strongest subject
  const materiaMaisFraca = useMemo(() => {
    if (subjectPerformanceMatrix.length === 0) return null;
    return [...subjectPerformanceMatrix].sort((a, b) => a.nota - b.nota)[0];
  }, [subjectPerformanceMatrix]);

  const materiaDestaque = useMemo(() => {
    if (subjectPerformanceMatrix.length === 0) return null;
    return [...subjectPerformanceMatrix].sort((a, b) => b.nota - a.nota)[0];
  }, [subjectPerformanceMatrix]);

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      {/* HEADER GUIA SIMULADO E SELETOR DE ABAS (# HISTÓRICO # / # GABARITO #) */}
      <div className={`p-6 rounded-3xl border transition-all ${
        darkMode ? "bg-[#0c1833] border-[#1d2d52] text-white" : "bg-white border-gray-200 text-gray-900 shadow-sm"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                GUIA SIMULADO
              </span>
              <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                • {edital.orgao || "Concurso"} - {edital.cargo || "Cargo Desejado"}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-1 font-sans">
              Simulados & Acompanhamento de Desempenho
            </h2>
          </div>

          {/* Abas # HISTÓRICO # e # GABARITO # */}
          <div className="flex items-center p-1 rounded-2xl bg-black/20 dark:bg-white/5 border border-white/10">
            <button
              onClick={() => setActiveTab("historico")}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "historico"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : darkMode
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span># HISTÓRICO #</span>
            </button>

            <button
              onClick={() => setActiveTab("gabarito")}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "gabarito"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : darkMode
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span># GABARITO #</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: # HISTÓRICO # (PAINEL DINÂMICO CONFORME REFERÊNCIA VISUAL IMAGE.JPG) */}
      {/* ========================================================================= */}
      {activeTab === "historico" && (
        <div className="space-y-6">
          
          {/* HEADER PAINEL DE DESEMPENHO (ESTILO NAV BRASIL / MODELO PROFISSIONAL) */}
          <div className={`p-6 rounded-3xl border transition-all ${
            darkMode 
              ? "bg-gradient-to-br from-[#0c1833] via-[#0e1d3e] to-[#091226] border-[#1d2f59] text-white shadow-xl" 
              : "bg-white border-gray-200 text-gray-900 shadow-sm"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 mb-5 border-gray-500/20">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    PAINEL DE DESEMPENHO – {edital.orgao || "Concurso"} ({new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    AO VIVO
                  </span>
                </div>
                <p className={`text-xs mt-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Preparação para {edital.cargo || "Cargo Desejado"}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  ATUALIZADO
                </span>
                <span className="text-xs font-semibold font-mono text-emerald-400">
                  {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* TOP KPI CARDS (3 COLUNAS) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card 1: MÉDIA GERAL */}
              <div className={`p-5 rounded-2xl border transition-all ${
                darkMode ? "bg-[#112147]/60 border-[#22408a]/50" : "bg-gray-50 border-gray-200"
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    MÉDIA GERAL
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    ★ MÉDIA
                  </span>
                </div>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="text-3xl font-black font-sans text-emerald-400">
                    {statsCalculated.mediaGeral.toString().replace('.', ',')}%
                  </span>
                  <span className="text-xs font-bold text-emerald-400 flex items-center">
                    {statsCalculated.deltaMedia}
                  </span>
                </div>
                <div className="w-full bg-emerald-950/40 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, statsCalculated.mediaGeral)}%` }}></div>
                </div>
              </div>

              {/* Card 2: MELHOR DESEMPENHO */}
              <div className={`p-5 rounded-2xl border transition-all ${
                darkMode ? "bg-[#112147]/60 border-[#22408a]/50" : "bg-gray-50 border-gray-200"
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    MELHOR DESEMPENHO
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                    🏆 TOP
                  </span>
                </div>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="text-3xl font-black font-sans text-blue-400">
                    {statsCalculated.melhorDesempenho}%
                  </span>
                  <span className="text-xs font-semibold text-gray-400">
                    {statsCalculated.melhorSimuladoNome}
                  </span>
                </div>
                <div className="w-full bg-blue-950/40 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-blue-400 h-full rounded-full" style={{ width: `${Math.min(100, statsCalculated.melhorDesempenho)}%` }}></div>
                </div>
              </div>

              {/* Card 3: TOTAL DE ACERTOS */}
              <div className={`p-5 rounded-2xl border transition-all ${
                darkMode ? "bg-[#112147]/60 border-[#22408a]/50" : "bg-gray-50 border-gray-200"
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    TOTAL DE ACERTOS
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                    📊 {statsCalculated.totalAcertos}/{statsCalculated.totalQuestoes}
                  </span>
                </div>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="text-3xl font-black font-sans text-amber-400">
                    {statsCalculated.totalAcertos}/{statsCalculated.totalQuestoes}
                  </span>
                  <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>questões</span>
                </div>
                <div className="w-full bg-amber-950/40 h-1.5 rounded-full mt-3 overflow-hidden flex">
                  <div className="bg-amber-400 h-full rounded-l-full" style={{ width: `${(statsCalculated.totalAcertos / (statsCalculated.totalQuestoes || 1)) * 100}%` }}></div>
                </div>
              </div>

            </div>
          </div>

          {/* GRÁFICO 1: EVOLUÇÃO DOS ACERTOS (GRÁFICO DE BARRAS/LINHAS COM LINHA DE META) */}
          <div className={`p-6 rounded-3xl border transition-all ${
            darkMode ? "bg-[#0c1833] border-[#1d2f59] text-white" : "bg-white border-gray-200 text-gray-900 shadow-sm"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <BarChart2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  EVOLUÇÃO DOS ACERTOS
                </h3>
              </div>
              <span className={`text-[10px] ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Barras e % de aproveitamento (Linha de Meta: <strong className="text-amber-400">{metaAproveitamento}%</strong>)
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={listHistorico.map(s => ({
                    name: s.nome,
                    Aproveitamento: s.aproveitamentoGeral,
                    Acertos: s.totalAcertos,
                    Questoes: s.totalQuestoes
                  }))}
                  margin={{ top: 20, right: 20, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e2d4d" : "#e2e8f0"} />
                  <XAxis dataKey="name" tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis domain={[0, 100]} tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 10 }} tickFormatter={(val) => `${val}%`} />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, "Aproveitamento"]}
                    contentStyle={{
                      backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                      borderColor: darkMode ? "#334155" : "#cbd5e1",
                      borderRadius: "12px"
                    }}
                  />
                  <Bar dataKey="Aproveitamento" fill="#00a896" radius={[8, 8, 0, 0]}>
                    {listHistorico.map((entry, index) => (
                      <Cell key={`cell-sim-${index}`} fill={entry.aproveitamentoGeral >= metaAproveitamento ? "#00a896" : "#f4a261"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PAINEL INFERIOR DUPLO (ESQUERDA: DESEMPENHO POR MATÉRIA + TABELA DE STATUS | DIREITA: ROSCA DE DISTRIBUIÇÃO) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COLUNA DA ESQUERDA: DESEMPENHO POR MATÉRIA */}
            <div className={`p-6 rounded-3xl border transition-all space-y-6 ${
              darkMode ? "bg-[#0c1833] border-[#1d2f59] text-white" : "bg-white border-gray-200 text-gray-900 shadow-sm"
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center space-x-2">
                  <span>DESEMPENHO POR MATÉRIA</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  BARRAS
                </span>
              </div>

              {/* Lista de Barras Horizontais */}
              <div className="space-y-3">
                {subjectPerformanceMatrix.map((sub, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{sub.materia}</span>
                      <span className="text-emerald-400 font-mono font-bold">{sub.nota}%</span>
                    </div>
                    <div className="w-full bg-gray-800/40 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          sub.nota >= metaAproveitamento ? "bg-emerald-400" : sub.nota >= metaAproveitamento - 10 ? "bg-amber-400" : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.min(100, sub.nota)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-gray-500/20 flex justify-between text-xs font-bold">
                  <span>Total Geral</span>
                  <span className="text-emerald-400 font-mono font-bold">{statsCalculated.mediaGeral}%</span>
                </div>
                <div className="text-[10px] text-gray-400 italic">
                  • Meta {metaAproveitamento}% de Aproveitamento
                </div>
              </div>

              {/* TABELA DE MATÉRIAS | NOTA | STATUS */}
              <div className="overflow-x-auto rounded-2xl border border-gray-500/20">
                <table className="w-full text-left text-xs">
                  <thead className={`uppercase text-[10px] font-black tracking-wider ${
                    darkMode ? "bg-[#112147] text-gray-300" : "bg-gray-100 text-gray-700"
                  }`}>
                    <tr>
                      <th className="p-3">Matéria</th>
                      <th className="p-3">Nota</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-500/20 font-medium">
                    {subjectPerformanceMatrix.map((sub, i) => (
                      <tr key={i} className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50"}>
                        <td className="p-3 font-semibold">{sub.materia}</td>
                        <td className="p-3 font-mono font-bold">{sub.nota}%</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            sub.status === "ÓTIMO"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : sub.status === "REVISAR"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* COLUNA DA DIREITA: DISTRIBUIÇÃO DOS ACERTOS DINÂMICO (ROSCA / DONUT CHART) */}
            <div className={`p-6 rounded-3xl border transition-all space-y-6 ${
              darkMode ? "bg-[#0c1833] border-[#1d2f59] text-white" : "bg-white border-gray-200 text-gray-900 shadow-sm"
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center space-x-2">
                  <span>DISTRIBUIÇÃO DOS ACERTOS</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  DONUT
                </span>
              </div>

              {/* Gráfico Donut com contador total no centro */}
              <div className="relative h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-pie-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                {/* overlay central */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">TOTAL</span>
                  <span className="text-2xl font-black font-sans text-emerald-400">{statsCalculated.totalAcertos}</span>
                  <span className="text-[9px] text-gray-400">acertos</span>
                </div>
              </div>

              {/* Legenda detalhada de matérias */}
              <div className="space-y-2">
                {donutData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.fill }}></span>
                      <span className="font-semibold text-gray-300">{item.name}</span>
                    </div>
                    <div className="font-mono text-right">
                      <span className="font-bold text-white mr-2">{item.value}</span>
                      <span className="text-gray-400 text-[10px]">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Caixa de Fórmula em destaque */}
              <div className={`p-3 rounded-xl border text-center font-mono text-xs ${
                darkMode ? "bg-[#112147]/80 border-[#22408a]/50 text-gray-300" : "bg-gray-100 border-gray-200 text-gray-700"
              }`}>
                =SOMA({donutData.map(d => d.value).join(';')}) = <strong>{statsCalculated.totalAcertos}</strong> | MÉDIA <strong>{statsCalculated.mediaGeral}%</strong>
              </div>
            </div>

          </div>

          {/* RESUMO EXECUTIVO (CARD INFERIOR ESCURO DE RECOMENDAÇÕES E PRÓXIMOS PASSOS) */}
          <div className="p-6 rounded-3xl border bg-[#081024] border-[#1d2f59] text-white shadow-xl space-y-4">
            <div className="flex items-center space-x-2 text-rose-400">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-xs font-black uppercase tracking-wider">RESUMO EXECUTIVO</h3>
            </div>

            <p className="text-sm leading-relaxed font-medium text-gray-200">
              <strong className="text-emerald-400">{listHistorico.length} simulados realizados.</strong> Média geral: <strong className="text-emerald-400">{statsCalculated.mediaGeral}%</strong>. Próximos passos: {materiaMaisFraca ? `revisar ${materiaMaisFraca.materia.toLowerCase()} (nota atual: ${materiaMaisFraca.nota}%).` : "manter rotina de questões."} Foco total até a prova.
            </p>

            {/* Badges de ação rápida */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-800">
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-gray-800 text-gray-300 border border-gray-700">
                • Meta {metaAproveitamento}%
              </span>
              {materiaMaisFraca && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ▲ Revisar {materiaMaisFraca.materia} ({materiaMaisFraca.nota}%)
                </span>
              )}
              {materiaDestaque && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ★ Destaque {materiaDestaque.materia} ({materiaDestaque.nota}%)
                </span>
              )}
            </div>
          </div>

          {/* TABELA DE HISTÓRICO DOS SIMULADOS */}
          <div className={`p-6 rounded-3xl border transition-all space-y-4 ${
            darkMode ? "bg-[#0c1833] border-[#1d2f59] text-white" : "bg-white border-gray-200 text-gray-900 shadow-sm"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-sans">
                  HISTÓRICO DE SIMULADOS
                </h3>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Registro de todas as provas realizadas e suas pontuações detalhadas
                </p>
              </div>

              <button
                onClick={() => setActiveTab("gabarito")}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Lançar Novo Simulado</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-500/20">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-black tracking-wider ${
                  darkMode ? "bg-[#112147] text-gray-300" : "bg-gray-100 text-gray-700"
                }`}>
                  <tr>
                    <th className="p-4">DATA DO SIMULADO</th>
                    <th className="p-4">PONTUAÇÃO TIRADA</th>
                    <th className="p-4 text-center">DETALHES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-500/20 font-medium">
                  {listHistorico.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-gray-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                        <p className="font-semibold text-sm">Nenhum simulado cadastrado ainda para este ciclo.</p>
                        <p className="text-xs text-gray-500 mt-1">Acesse a aba <strong className="text-blue-400"># GABARITO #</strong> para preencher e registrar os resultados do seu primeiro simulado.</p>
                      </td>
                    </tr>
                  ) : (
                    listHistorico.map((sim) => (
                      <tr key={sim.id} className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50"}>
                        <td className="p-4">
                          <div className="font-bold text-sm text-blue-400">{sim.nome}</div>
                          <div className="text-[11px] text-gray-400">{formatarDataDDMM(sim.data)} • {sim.orgao}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-mono font-bold text-sm">
                            {sim.pontuacaoTotal} / {sim.pontuacaoMaximaTotal} pts
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sim.aproveitamentoGeral >= metaAproveitamento ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                            }`}>
                              {sim.aproveitamentoGeral}% de aproveitamento
                            </span>
                            <span className="text-[11px] text-gray-400">({sim.totalAcertos}/{sim.totalQuestoes} acertos)</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setSelectedSimuladoDetalhes(sim)}
                            className="px-3 py-1.5 rounded-xl border border-blue-500/40 hover:bg-blue-600/20 text-blue-400 font-bold text-xs transition-all cursor-pointer inline-flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Detalhes</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: # GABARITO # (ESCANEAR EDITAL IA, CAIXA META, CARTÃO RESPOSTA & GABARITO) */}
      {/* ========================================================================= */}
      {activeTab === "gabarito" && (
        <div className="space-y-6">
          
          {/* SEÇÃO 1: ESCANEAR EDITAL POR IA DE FORMA MANUAL (ANEXANDO ARQUIVO OU TEXTO) */}
          <div className={`p-6 rounded-3xl border transition-all space-y-4 ${
            darkMode ? "bg-[#0c1833] border-[#1d2f59] text-white" : "bg-white border-gray-200 text-gray-900 shadow-sm"
          }`}>
            <div className="flex items-center space-x-2 text-blue-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-base font-bold font-sans">
                Escanear Edital por IA (Extrair Critérios, Pesos e Eliminação do Concurso)
              </h3>
            </div>

            <p className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Anexe o arquivo PDF/TXT do edital ou cole o texto do concurso para o cargo <strong className="text-blue-400">{edital.cargo || "Selecionado"}</strong>. A IA irá extrair a quantidade exata de questões por matéria, pesos, regras de eliminação e penalidades.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dropzone/Upload de Arquivo */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  darkMode ? "bg-[#112147]/50 border-blue-500/40 hover:border-blue-400 hover:bg-[#112147]" : "bg-gray-50 border-blue-300 hover:border-blue-500 hover:bg-gray-100"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  accept=".pdf,.txt,.doc,.docx"
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-blue-400 mb-2" />
                <span className="text-xs font-bold text-blue-400">
                  {selectedFile ? selectedFile.name : "Anexar arquivo do edital (PDF ou TXT)"}
                </span>
                <span className="text-[10px] text-gray-400 mt-1">
                  Clique ou arraste o arquivo do edital do concurso
                </span>
              </div>

              {/* Textarea de texto do edital */}
              <textarea
                value={editalText}
                onChange={(e) => setEditalText(e.target.value)}
                placeholder="Ou cole aqui o texto com os critérios de pontuação e quadro de provas..."
                className={`w-full p-4 rounded-2xl border text-xs h-32 outline-none transition-colors ${
                  darkMode ? "bg-[#112147] border-[#22408a] text-white focus:border-blue-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-600"
                }`}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={handleEscanearEditalIA}
                disabled={isScanning}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
                <span>{isScanning ? "Escaneando Edital com IA..." : "Escanear Critérios do Edital por IA"}</span>
              </button>

              {scanResultMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{scanResultMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 2: CAIXA META DE ACERTOS */}
          <div className={`p-6 rounded-3xl border transition-all space-y-4 ${
            darkMode ? "bg-[#0c1833] border-[#1d2f59] text-white" : "bg-white border-gray-200 text-gray-900 shadow-sm"
          }`}>
            <div className="flex items-center space-x-2 text-amber-400">
              <Target className="w-5 h-5" />
              <h3 className="text-base font-bold font-sans">
                META (Meta de Aproveitamento em Simulados)
              </h3>
            </div>

            <p className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Estabeleça a meta de aproveitamento (%) que você deseja atingir em cada simulado. Essa meta rege a linha indicadora no gráfico de evolução e mapeia o status das matérias no Histórico.
            </p>

            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="flex-1 w-full">
                <label className={`block text-xs font-bold mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Definir Meta de Acerto (%):
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={metaInput}
                  onChange={(e) => setMetaInput(parseFloat(e.target.value) || 80)}
                  className={`w-full p-3 rounded-xl border text-sm font-bold font-mono outline-none ${
                    darkMode ? "bg-[#112147] border-[#22408a] text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <button
                onClick={handleSaveMeta}
                className="w-full sm:w-auto self-end px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-amber-600/20"
              >
                Salvar Meta
              </button>
            </div>
          </div>

          {/* SEÇÃO 3: FORMULÁRIO E CARTÃO RESPOSTA & GABARITO (CONFORME MODELO DA IMAGEM ATTACHED IMAGE.PNG) */}
          <div className={`p-6 rounded-3xl border transition-all space-y-6 ${
            darkMode ? "bg-[#0c1833] border-[#1d2f59] text-white" : "bg-white border-gray-200 text-gray-900 shadow-sm"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-gray-500/20">
              <div>
                <h3 className="text-lg font-bold font-sans flex items-center gap-2">
                  <span>Preenchimento do Gabarito & Respostas do Simulado</span>
                </h3>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Preencha as alternativas marcadas pelo candidato e o gabarito oficial para conferência e cálculo automatizado.
                </p>
              </div>

              {/* Botões de Estilo de Prova e Limpar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center p-1 rounded-xl bg-black/20 dark:bg-white/5 border border-white/10">
                  <button
                    onClick={() => setTipoQuestoes("multipla")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      tipoQuestoes === "multipla" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Múltipla Escolha (A-E)
                  </button>
                  <button
                    onClick={() => {
                      setTipoQuestoes("certo_errado");
                      setPenalidadeErroInput(1.0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      tipoQuestoes === "certo_errado" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Certo / Errado (C/E)
                  </button>
                </div>

                <button
                  onClick={handleLimparGabarito}
                  className="px-3 py-1.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 font-bold text-xs flex items-center space-x-1 cursor-pointer"
                  title="Limpar todos os campos do gabarito"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Zerar Cartão</span>
                </button>
              </div>
            </div>

            {/* Cabeçalho do Simulado (Nome, Data e Penalidade) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">Nome do Simulado:</label>
                <input
                  type="text"
                  value={novoSimuladoNome}
                  onChange={(e) => setNovoSimuladoNome(e.target.value)}
                  placeholder="Ex: SIMULADO 04 - CEBRASPE"
                  className={`w-full p-3 rounded-xl border text-xs font-bold outline-none ${
                    darkMode ? "bg-[#112147] border-[#22408a] text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Data da Prova:</label>
                <input
                  type="date"
                  value={novoSimuladoData}
                  onChange={(e) => setNovoSimuladoData(e.target.value)}
                  className={`w-full p-3 rounded-xl border text-xs font-bold outline-none ${
                    darkMode ? "bg-[#112147] border-[#22408a] text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Critério de Penalidade (Edital):</label>
                <select
                  value={penalidadeErroInput}
                  onChange={(e) => setPenalidadeErroInput(parseFloat(e.target.value))}
                  className={`w-full p-3 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                    darkMode ? "bg-[#112147] border-[#22408a] text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                  }`}
                >
                  <option value={0.0}>Sem Penalidade (Apenas soma acertos)</option>
                  <option value={1.0}>1 Erro anula 1 Certo (Cebraspe - 1,0 pt)</option>
                  <option value={0.5}>0,5 Ponto deduzido por Erro</option>
                  <option value={0.25}>0,25 Ponto deduzido por Erro</option>
                </select>
              </div>
            </div>

            {/* BARRA DE PREENCHIMENTO RÁPIDO / COLAR SEQUÊNCIA */}
            <div className={`p-4 rounded-2xl border space-y-3 ${
              darkMode ? "bg-[#112147]/60 border-[#22408a]/50" : "bg-gray-50 border-gray-200"
            }`}>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block">
                Preenchimento Rápido (Opcional - Cole a Sequência):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={quickPasteUser}
                    onChange={(e) => setQuickPasteUser(e.target.value)}
                    placeholder="Respostas do Aluno ex: ABCDEACE..."
                    className={`flex-1 p-2 rounded-lg border text-xs font-mono font-bold uppercase ${
                      darkMode ? "bg-[#0c1833] border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                  <button
                    onClick={() => handleApplyQuickPaste("usuario", quickPasteUser)}
                    className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                  >
                    Preencher Marcadas
                  </button>
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={quickPasteGabarito}
                    onChange={(e) => setQuickPasteGabarito(e.target.value)}
                    placeholder="Gabarito Oficial ex: ABCDEACE..."
                    className={`flex-1 p-2 rounded-lg border text-xs font-mono font-bold uppercase ${
                      darkMode ? "bg-[#0c1833] border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                  <button
                    onClick={() => handleApplyQuickPaste("gabarito", quickPasteGabarito)}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                  >
                    Preencher Gabarito
                  </button>
                </div>
              </div>
            </div>

            {/* TABELA DE GABARITO & RESPOSTAS (EXATAMENTE COMO NO PROMPT E NA IMAGEM IMAGE.PNG) */}
            <div className="overflow-x-auto rounded-2xl border border-gray-500/30">
              <table className="w-full text-center text-xs">
                <thead>
                  {/* Linha de Subcabeçalho Superior: RESPONDIDAS | GABARITO */}
                  <tr className={`uppercase text-[10px] font-black tracking-wider border-b border-gray-500/30 ${
                    darkMode ? "bg-[#081024] text-gray-300" : "bg-gray-200 text-gray-800"
                  }`}>
                    <th className="p-3 border-r border-gray-500/30 text-left">QUESTÃO</th>
                    <th className="p-3 border-r border-gray-500/30" colSpan={1}>
                      RESPONDIDAS (MARCADA PELO USUÁRIO)
                    </th>
                    <th className="p-3 border-r border-gray-500/30" colSpan={1}>
                      GABARITO (ALTERNATIVA CORRETA)
                    </th>
                    <th className="p-3">SITUAÇÃO</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-500/20 font-medium">
                  {questionsList.map((q) => {
                    const markedVal = respostasUsuario[q.qIndex] || "";
                    const gabaritoVal = gabaritoCorreto[q.qIndex] || "";

                    let situacaoText = "--";
                    let situacaoClass = "bg-gray-500/20 text-gray-400 border-gray-500/30";

                    if (markedVal && gabaritoVal) {
                      if (markedVal === gabaritoVal) {
                        situacaoText = "CERTO";
                        situacaoClass = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
                      } else {
                        situacaoText = "ERRADO";
                        situacaoClass = "bg-rose-500/20 text-rose-400 border-rose-500/30";
                      }
                    }

                    const options = tipoQuestoes === "multipla" ? ["A", "B", "C", "D", "E"] : ["C", "E"];

                    return (
                      <tr key={q.qIndex} className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50"}>
                        {/* Numeração da Questão e Disciplina */}
                        <td className="p-3 text-left border-r border-gray-500/20 font-bold">
                          <div className="flex items-center space-x-2">
                            <span className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-mono text-xs border border-blue-500/30">
                              {q.qIndex < 10 ? `0${q.qIndex}` : q.qIndex}
                            </span>
                            <div>
                              <div className="text-xs">{q.disciplineName}</div>
                              <div className="text-[9px] text-gray-400 font-normal">{q.categoryName} • Peso {q.peso}</div>
                            </div>
                          </div>
                        </td>

                        {/* ALTERNATIVA MARCADA PELO USUÁRIO */}
                        <td className="p-2 border-r border-gray-500/20">
                          <div className="flex items-center justify-center space-x-1.5">
                            {options.map((opt) => (
                              <button
                                key={`user-q${q.qIndex}-${opt}`}
                                onClick={() => setRespostasUsuario({ ...respostasUsuario, [q.qIndex]: opt })}
                                className={`w-8 h-8 rounded-lg font-bold text-xs transition-all cursor-pointer border ${
                                  markedVal === opt
                                    ? "bg-blue-600 text-white border-blue-400 shadow-md scale-105"
                                    : darkMode
                                    ? "bg-[#112147] border-gray-700 text-gray-300 hover:border-gray-500"
                                    : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </td>

                        {/* ALTERNATIVA CORRETA (GABARITO) */}
                        <td className="p-2 border-r border-gray-500/20">
                          <div className="flex items-center justify-center space-x-1.5">
                            {options.map((opt) => (
                              <button
                                key={`gab-q${q.qIndex}-${opt}`}
                                onClick={() => setGabaritoCorreto({ ...gabaritoCorreto, [q.qIndex]: opt })}
                                className={`w-8 h-8 rounded-lg font-bold text-xs transition-all cursor-pointer border ${
                                  gabaritoVal === opt
                                    ? "bg-emerald-600 text-white border-emerald-400 shadow-md scale-105"
                                    : darkMode
                                    ? "bg-[#112147] border-gray-700 text-gray-300 hover:border-gray-500"
                                    : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </td>

                        {/* SITUAÇÃO */}
                        <td className="p-2">
                          <span className={`px-3 py-1 rounded-lg text-xs font-extrabold uppercase border ${situacaoClass}`}>
                            {situacaoText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* QUADRO INFERIOR DE TOTALIZADORES (EXATAMENTE IGUAL AO MODELO DAS IMAGENS IMAGE.PNG) */}
            <div className={`p-6 rounded-3xl border ${
              darkMode ? "bg-[#081024] border-[#1d2f59] text-white" : "bg-gray-100 border-gray-300 text-gray-900"
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                
                {/* Coluna 1: Totais de Acertos e Erros */}
                <div className="space-y-3 font-bold text-xs sm:text-sm">
                  <div className="flex justify-between items-center border-b pb-2 border-gray-500/20">
                    <span className="uppercase text-gray-400">TOTAL - CERTAS</span>
                    <span className="text-emerald-400 font-mono text-base font-black px-3 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {gridCalculations.countCertas}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b pb-2 border-gray-500/20">
                    <span className="uppercase text-gray-400">TOTAL - ERRADAS</span>
                    <span className="text-rose-400 font-mono text-base font-black px-3 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                      {gridCalculations.countErradas}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="uppercase text-gray-300">TOTAL QUESTÕES</span>
                    <span className="font-mono text-base font-black text-blue-400 px-3 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                      {gridCalculations.totalQuestoes}
                    </span>
                  </div>
                </div>

                {/* Coluna 2: Pontuações por Critério de Edital */}
                <div className="space-y-3 font-bold text-xs sm:text-sm border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-gray-500/20">
                  <div className="flex justify-between items-center border-b pb-2 border-gray-500/20">
                    <span className="uppercase text-gray-400">PONTUAÇÃO BÁSICA</span>
                    <span className="font-mono text-base font-black text-amber-400">
                      {gridCalculations.pontuacaoBasica.toFixed(1)} pts
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b pb-2 border-gray-500/20">
                    <span className="uppercase text-gray-400">PONTUAÇÃO ESPECÍFICAS</span>
                    <span className="font-mono text-base font-black text-blue-400">
                      {gridCalculations.pontuacaoEspecifica.toFixed(1)} pts
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="uppercase text-emerald-400">PONTUAÇÃO CONQUISTADA</span>
                    <span className="font-mono text-lg font-black text-emerald-400 px-3 py-1 rounded bg-emerald-500/20 border border-emerald-500/30">
                      {gridCalculations.pontuacaoConquistada.toFixed(1)} pts
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* BOTÃO FINAL: CALCULAR E LANÇAR NO HISTÓRICO */}
            <div className="pt-4 border-t border-gray-500/20 flex justify-end">
              <button
                onClick={handleSalvarSimulado}
                className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xl shadow-emerald-600/30 flex items-center space-x-2"
              >
                <Check className="w-5 h-5" />
                <span>Calcular & Lançar no Histórico</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* MODAL DETALHES DO SIMULADO */}
      {selectedSimuladoDetalhes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`relative w-full max-w-2xl p-6 rounded-3xl border shadow-2xl ${
            darkMode ? "bg-[#0c1833] border-[#1d2f59] text-white" : "bg-white border-gray-300 text-gray-900"
          }`}>
            <button
              onClick={() => setSelectedSimuladoDetalhes(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div className="border-b pb-3 border-gray-500/20">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  DETALHAMENTO DO SIMULADO
                </span>
                <h3 className="text-xl font-black font-sans">{selectedSimuladoDetalhes.nome}</h3>
                <p className="text-xs text-gray-400">{formatarDataDDMM(selectedSimuladoDetalhes.data)} • {selectedSimuladoDetalhes.orgao}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className={`p-3 rounded-xl border ${darkMode ? "bg-[#112147]" : "bg-gray-50"}`}>
                  <span className="text-[10px] text-gray-400 block font-bold">PONTUAÇÃO TOTAL</span>
                  <span className="text-base font-black font-mono text-emerald-400">
                    {selectedSimuladoDetalhes.pontuacaoTotal} / {selectedSimuladoDetalhes.pontuacaoMaximaTotal} pts
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${darkMode ? "bg-[#112147]" : "bg-gray-50"}`}>
                  <span className="text-[10px] text-gray-400 block font-bold">APROVEITAMENTO</span>
                  <span className="text-base font-black font-mono text-blue-400">
                    {selectedSimuladoDetalhes.aproveitamentoGeral}%
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${darkMode ? "bg-[#112147]" : "bg-gray-50"}`}>
                  <span className="text-[10px] text-gray-400 block font-bold">ACERTOS</span>
                  <span className="text-base font-black font-mono text-amber-400">
                    {selectedSimuladoDetalhes.totalAcertos}/{selectedSimuladoDetalhes.totalQuestoes}
                  </span>
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider pt-2">Pontuação Detalhada por Matéria:</h4>
              <div className="overflow-x-auto rounded-xl border border-gray-500/20">
                <table className="w-full text-left text-xs">
                  <thead className={`uppercase text-[9px] font-black tracking-wider ${
                    darkMode ? "bg-[#112147] text-gray-300" : "bg-gray-100 text-gray-700"
                  }`}>
                    <tr>
                      <th className="p-3">Matéria</th>
                      <th className="p-3">Acertos</th>
                      <th className="p-3">Erros</th>
                      <th className="p-3">Pontuação</th>
                      <th className="p-3">% Aproveit.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-500/20 font-medium">
                    {selectedSimuladoDetalhes.detalhesMaterias.map((d, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-semibold">{d.disciplinaNome}</td>
                        <td className="p-3 font-mono text-emerald-400">{d.acertos}</td>
                        <td className="p-3 font-mono text-rose-400">{d.erros}</td>
                        <td className="p-3 font-mono font-bold">{d.pontuacao} / {d.pontuacaoMaxima} pts</td>
                        <td className="p-3 font-mono font-bold text-blue-400">{d.aproveitamento}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  onClick={() => setSelectedSimuladoDetalhes(null)}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
