import React, { useState, useMemo, useRef } from "react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, PieChart, Pie } from "recharts";
import { StudyState, SimuladoItem, SimuladoMateriaNota, CadernoAnalysisResult, CicloEstudo } from "../types";
import { Sparkles, Upload, CheckCircle2, Target, BarChart2, Plus, Eye, X, Check, FileCheck, RotateCcw, FileText, AlertCircle, Award, Edit3, Trash2, Save, TrendingUp, HelpCircle, BookOpen, BrainCircuit, Compass, Zap, ArrowRight, Lightbulb, ListChecks, CheckCircle, Sliders, Layers, UserCheck, Trophy, ArrowLeft } from "lucide-react";
import { formatarDataDDMM, fileToBase64 } from "../utils/studyHelpers";

interface SimuladoViewProps {
  state: StudyState;
  updateState: (newState: StudyState) => void;
  darkMode: boolean;
  ciclos?: CicloEstudo[];
  activeCicloId?: string;
  onSelectCicloId?: (id: string) => void;
  onVoltarParaCiclos?: () => void;
  isPainelGeral?: boolean;
  isAvulso?: boolean;
}

export default function SimuladoView({
  state,
  updateState,
  darkMode,
  ciclos,
  activeCicloId,
  onSelectCicloId,
  onVoltarParaCiclos,
  isPainelGeral,
  isAvulso = false
}: SimuladoViewProps) {
  const { edital, simulados } = state;

  const [activeTab, setActiveTab] = useState<"historico" | "gabarito">("historico");

  // Chart view mode for the evolution chart: "linha" | "barras"
  const [chartViewMode, setChartViewMode] = useState<"linha" | "barras">("linha");

  // Initial target meta % (default 80%)
  const metaAproveitamento = simulados?.metaAproveitamento || 80;

  // Registered history of mock tests for the current cycle
  const listHistorico: SimuladoItem[] = useMemo(() => {
    return simulados?.historico || [];
  }, [simulados]);

  // Modal details view target & editing states
  const [selectedSimuladoDetalhes, setSelectedSimuladoDetalhes] = useState<SimuladoItem | null>(null);
  const [isEditingDetalhes, setIsEditingDetalhes] = useState(false);
  const [editSimuladoNome, setEditSimuladoNome] = useState("");
  const [editSimuladoData, setEditSimuladoData] = useState("");
  const [editMateriasList, setEditMateriasList] = useState<SimuladoMateriaNota[]>([]);

  // --- IA SCANNER STATES (GABARITO TAB) ---
  const [scannerSubTab, setScannerSubTab] = useState<"caderno" | "gabarito" | "candidato" | "edital">("caderno");
  const [editalText, setEditalText] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResultMsg, setScanResultMsg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- GABARITO IA SCANNER BY EMPHASIS (GABARITO DO CADERNO DE PROVAS) ---
  const [enfaseGabarito, setEnfaseGabarito] = useState(edital.cargo || "Ênfase Geral");
  const [gabaritoText, setGabaritoText] = useState("");
  const [isScanningGabarito, setIsScanningGabarito] = useState(false);
  const [scanGabaritoResultMsg, setScanGabaritoResultMsg] = useState<string | null>(null);
  const [selectedGabaritoFile, setSelectedGabaritoFile] = useState<File | null>(null);
  const gabaritoFileInputRef = useRef<HTMLInputElement | null>(null);

  // --- GABARITO PREENCHIDO PELO CANDIDATO IA SCANNER STATES ---
  const [candidatoText, setCandidatoText] = useState("");
  const [isScanningCandidato, setIsScanningCandidato] = useState(false);
  const [scanCandidatoResultMsg, setScanCandidatoResultMsg] = useState<string | null>(null);
  const [selectedCandidatoFile, setSelectedCandidatoFile] = useState<File | null>(null);
  const candidatoFileInputRef = useRef<HTMLInputElement | null>(null);

  // --- CADERNO DE PROVAS IA SCANNER STATES ---
  const [cadernoText, setCadernoText] = useState("");
  const [isScanningCaderno, setIsScanningCaderno] = useState(false);
  const [scanCadernoResultMsg, setScanCadernoResultMsg] = useState<string | null>(null);
  const [selectedCadernoFile, setSelectedCadernoFile] = useState<File | null>(null);
  const cadernoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [cadernoAnalysisResult, setCadernoAnalysisResult] = useState<CadernoAnalysisResult | null>(null);
  const [cadernoFilterIncidencia, setCadernoFilterIncidencia] = useState<"TODAS" | "ALTA" | "MÉDIA" | "BAIXA">("TODAS");
  const [syncEditalSuccessMsg, setSyncEditalSuccessMsg] = useState<string | null>(null);
  const [applyQuestionsSuccessMsg, setApplyQuestionsSuccessMsg] = useState<string | null>(null);

  // --- META BOX STATE ---
  const [metaInput, setMetaInput] = useState(metaAproveitamento);

  // --- NEW SIMULADO ENTRY FORM & ANSWER SHEET GRID (GABARITO TAB) ---
  const [novoSimuladoNome, setNovoSimuladoNome] = useState(`SIMULADO 0${listHistorico.length + 1}`);
  const [novoSimuladoData, setNovoSimuladoData] = useState(() => new Date().toISOString().split("T")[0]);
  const [novoSimuladoOrgao, setNovoSimuladoOrgao] = useState("");
  const [novoSimuladoCargo, setNovoSimuladoCargo] = useState("");
  const [qtdQuestoesAvulso, setQtdQuestoesAvulso] = useState<number>(60);
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

    if (disciplinasCadastradas.length > 0) {
      let count = 1;
      disciplinasCadastradas.forEach(d => {
        const qCount = d.questoes || 10;
        for (let i = 0; i < qCount; i++) {
          qArr.push({
            qIndex: count++,
            disciplineId: d.id,
            disciplineName: d.nome,
            categoryName: d.categoriaNome || ((d.nome || "").toLowerCase().includes("específic") ? "Conhecimentos Específicos" : "Conhecimentos Básicos"),
            peso: d.peso || 1
          });
        }
      });
    } else {
      // Standalone mode when no cycle disciplines are defined
      const totalQ = qtdQuestoesAvulso > 0 ? qtdQuestoesAvulso : 60;
      for (let i = 1; i <= totalQ; i++) {
        qArr.push({
          qIndex: i,
          disciplineId: "disc_avulsa_1",
          disciplineName: novoSimuladoOrgao ? `${novoSimuladoOrgao} - Prova` : "Conhecimentos da Prova",
          categoryName: "Geral",
          peso: 1
        });
      }
    }

    return qArr;
  }, [disciplinasCadastradas, qtdQuestoesAvulso, novoSimuladoOrgao]);

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

    if (disciplinasCadastradas.length > 0) {
      disciplinasCadastradas.forEach(d => {
        subjectStatsMap[d.id] = { acertos: 0, erros: 0, anuladas: 0, total: d.questoes || 10, peso: d.peso || 1, discNome: d.nome };
      });
    } else {
      subjectStatsMap["disc_avulsa_1"] = {
        acertos: 0,
        erros: 0,
        anuladas: 0,
        total: questionsList.length,
        peso: 1,
        discNome: novoSimuladoOrgao ? `${novoSimuladoOrgao} - Prova` : "Conhecimentos da Prova"
      };
    }

    questionsList.forEach(q => {
      const respUser = respostasUsuario[q.qIndex] || "";
      const gab = gabaritoCorreto[q.qIndex] || "";

      if (respUser && gab) {
        const isBasica = (q.categoryName || "").toLowerCase().includes("básic") || (q.categoryName || "").toLowerCase().includes("gerai");
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
  }, [questionsList, respostasUsuario, gabaritoCorreto, penalidadeErroInput, disciplinasCadastradas, novoSimuladoOrgao]);

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

  // Helper to cross-reference and resolve subject details against the Edital definition
  const resolveSimuladoDetalhesWithEdital = (sim: SimuladoItem): SimuladoMateriaNota[] => {
    const editalMap = new Map<string, { id: string; nome: string; questoes: number; peso: number; categoriaNome: string }>();
    disciplinasCadastradas.forEach(d => {
      const info = {
        id: d.id,
        nome: d.nome,
        questoes: d.questoes || 10,
        peso: d.peso || 1,
        categoriaNome: d.categoriaNome || "Conhecimentos"
      };
      editalMap.set(d.id, info);
      editalMap.set(d.nome.trim().toLowerCase(), info);
    });

    if (sim.detalhesMaterias && sim.detalhesMaterias.length > 0) {
      return sim.detalhesMaterias.map(m => {
        const editalInfo = editalMap.get(m.disciplinaId) || editalMap.get(m.disciplinaNome.trim().toLowerCase());
        const totalQuestoesMateria = editalInfo?.questoes || m.questoesRespondidas || 10;
        const pesoMateria = editalInfo?.peso || m.peso || 1;
        const maxPts = totalQuestoesMateria * pesoMateria;

        let acertos = Number(m.acertos) || 0;
        // Fix corrupted/duplicated totals where acertos > totalQuestoesMateria
        if (acertos > totalQuestoesMateria) {
          if (sim.totalQuestoes > 0 && sim.totalAcertos <= sim.totalQuestoes) {
            acertos = Math.min(totalQuestoesMateria, Math.round((totalQuestoesMateria / sim.totalQuestoes) * sim.totalAcertos));
          } else {
            acertos = Math.min(acertos, totalQuestoesMateria);
          }
        }

        const erros = Math.max(0, totalQuestoesMateria - acertos);
        const pontuacao = Math.max(0, parseFloat((acertos * pesoMateria).toFixed(1)));
        const aproveitamento = totalQuestoesMateria > 0 ? parseFloat(((acertos / totalQuestoesMateria) * 100).toFixed(1)) : 0;

        return {
          disciplinaId: m.disciplinaId,
          disciplinaNome: m.disciplinaNome,
          questoesRespondidas: totalQuestoesMateria,
          acertos,
          erros,
          anuladas: m.anuladas || 0,
          peso: pesoMateria,
          pontuacao,
          pontuacaoMaxima: maxPts,
          aproveitamento
        };
      });
    }

    return disciplinasCadastradas.map(d => {
      const qCount = d.questoes || 10;
      const peso = d.peso || 1;
      const maxPts = qCount * peso;
      return {
        disciplinaId: d.id,
        disciplinaNome: d.nome,
        questoesRespondidas: qCount,
        acertos: 0,
        erros: qCount,
        anuladas: 0,
        peso,
        pontuacao: 0,
        pontuacaoMaxima: maxPts,
        aproveitamento: 0
      };
    });
  };

  const handleOpenSimuladoDetalhes = (sim: SimuladoItem) => {
    const resolvedList = resolveSimuladoDetalhesWithEdital(sim);
    setSelectedSimuladoDetalhes(sim);
    setIsEditingDetalhes(false);
    setEditSimuladoNome(sim.nome);
    setEditSimuladoData(sim.data);
    setEditMateriasList(resolvedList);
  };

  const handleUpdateEditMateriaAcertos = (index: number, newAcertosRaw: number) => {
    setEditMateriasList(prev => {
      const updated = [...prev];
      const current = { ...updated[index] };
      const qTotal = current.questoesRespondidas || 10;
      const acertos = Math.min(qTotal, Math.max(0, isNaN(newAcertosRaw) ? 0 : newAcertosRaw));
      const erros = Math.max(0, qTotal - acertos);
      const peso = current.peso || 1;
      const maxPts = qTotal * peso;
      const pontuacao = parseFloat(Math.max(0, acertos * peso).toFixed(1));
      const aproveitamento = qTotal > 0 ? parseFloat(((acertos / qTotal) * 100).toFixed(1)) : 0;

      updated[index] = {
        ...current,
        acertos,
        erros,
        pontuacao,
        pontuacaoMaxima: maxPts,
        aproveitamento
      };
      return updated;
    });
  };

  const handleSaveEditSimulado = () => {
    if (!selectedSimuladoDetalhes) return;

    let sumAcertos = 0;
    let sumQuestoes = 0;
    let sumPts = 0;
    let sumPtsMax = 0;

    editMateriasList.forEach(m => {
      sumAcertos += m.acertos;
      sumQuestoes += m.questoesRespondidas;
      sumPts += m.pontuacao;
      sumPtsMax += m.pontuacaoMaxima;
    });

    const aproveitamentoGeral = sumQuestoes > 0 ? parseFloat(((sumAcertos / sumQuestoes) * 100).toFixed(1)) : 0;

    const updatedItem: SimuladoItem = {
      ...selectedSimuladoDetalhes,
      nome: editSimuladoNome || selectedSimuladoDetalhes.nome,
      data: editSimuladoData || selectedSimuladoDetalhes.data,
      totalAcertos: sumAcertos,
      totalQuestoes: sumQuestoes,
      pontuacaoTotal: parseFloat(sumPts.toFixed(1)),
      pontuacaoMaximaTotal: sumPtsMax,
      aproveitamentoGeral,
      detalhesMaterias: editMateriasList
    };

    const newHistorico = listHistorico.map(sim => sim.id === selectedSimuladoDetalhes.id ? updatedItem : sim);

    updateState({
      ...state,
      simulados: {
        historico: newHistorico,
        metaAproveitamento: metaInput,
        criteriosPorCargo: simulados?.criteriosPorCargo || {}
      }
    });

    setSelectedSimuladoDetalhes(updatedItem);
    setIsEditingDetalhes(false);
  };

  const handleDeleteSimulado = (simId: string) => {
    if (!confirm("Tem certeza que deseja excluir este simulado do histórico?")) {
      return;
    }
    const newHistorico = listHistorico.filter(sim => sim.id !== simId);
    updateState({
      ...state,
      simulados: {
        historico: newHistorico,
        metaAproveitamento: metaInput,
        criteriosPorCargo: simulados?.criteriosPorCargo || {}
      }
    });
    setSelectedSimuladoDetalhes(null);
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
    let detalhesMaterias: SimuladoMateriaNota[] = [];

    if (disciplinasCadastradas.length > 0) {
      detalhesMaterias = disciplinasCadastradas.map(d => {
        const stats = gridCalculations.subjectStatsMap[d.id] || { acertos: 0, erros: 0, anuladas: 0, total: d.questoes || 10, peso: d.peso || 1 };
        const qCount = d.questoes || 10;
        const peso = d.peso || 1;
        const maxPtsDisc = qCount * peso;
        totalPtsMax += maxPtsDisc;

        const ptsBrutos = (stats.acertos * peso) - (stats.erros * peso * penalidadeErroInput);
        const ptsFinal = Math.max(0, ptsBrutos);
        // O aproveitamento da matéria é estritamente a quantidade de acertos em relação ao total de questões dadas no edital
        const aproveit = qCount > 0 ? (stats.acertos / qCount) * 100 : 0;

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
    } else {
      const qCount = questionsList.length || 60;
      totalPtsMax = qCount * 1;
      const aproveit = qCount > 0 ? (gridCalculations.countCertas / qCount) * 100 : 0;
      detalhesMaterias = [{
        disciplinaId: "disc_avulsa_1",
        disciplinaNome: novoSimuladoCargo ? `Prova Geral (${novoSimuladoCargo})` : "Conhecimentos da Prova",
        questoesRespondidas: qCount,
        acertos: gridCalculations.countCertas,
        erros: gridCalculations.countErradas,
        anuladas: 0,
        peso: 1,
        pontuacao: gridCalculations.pontuacaoConquistada,
        pontuacaoMaxima: totalPtsMax,
        aproveitamento: parseFloat(aproveit.toFixed(1))
      }];
    }

    const aproveitamentoGeral = totalPtsMax > 0 ? (gridCalculations.pontuacaoConquistada / totalPtsMax) * 100 : 0;

    const novoItem: SimuladoItem = {
      id: "sim_" + Date.now(),
      nome: novoSimuladoNome,
      data: novoSimuladoData,
      cargo: novoSimuladoCargo || edital.cargo || "Geral",
      orgao: novoSimuladoOrgao || edital.orgao || (isAvulso ? "Simulado Avulso" : "Concurso"),
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

  // Handle Official Answer Key (Gabarito) Scanner by Emphasis
  const handleEscanearGabaritoIA = async () => {
    if (!gabaritoText.trim() && !selectedGabaritoFile) {
      alert("Por favor, selecione um arquivo de gabarito (PDF/Imagem/TXT) ou cole o texto do gabarito oficial com as ênfases da prova!");
      return;
    }

    setIsScanningGabarito(true);
    setScanGabaritoResultMsg(null);

    try {
      let pdfBase64: string | undefined = undefined;
      let pdfMimeType: string | undefined = undefined;

      if (selectedGabaritoFile) {
        pdfBase64 = await fileToBase64(selectedGabaritoFile);
        pdfMimeType = selectedGabaritoFile.type || "application/pdf";
      }

      const response = await fetch("/api/scan-gabarito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: gabaritoText,
          pdfBase64,
          pdfMimeType,
          enfaseDesejada: enfaseGabarito || edital.cargo || "Geral"
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao conectar com a IA para escanear o gabarito oficial.");
      }

      const scannedGabarito = await response.json();

      if (scannedGabarito.respostas && Array.isArray(scannedGabarito.respostas) && scannedGabarito.respostas.length > 0) {
        const newGabaritoMap: { [qNum: number]: string } = {};
        scannedGabarito.respostas.forEach((item: any) => {
          if (item.numero && item.resposta) {
            newGabaritoMap[item.numero] = String(item.resposta).trim().toUpperCase();
          }
        });

        setGabaritoCorreto(prev => ({
          ...prev,
          ...newGabaritoMap
        }));

        if (scannedGabarito.sequenciaGabarito) {
          setQuickPasteGabarito(scannedGabarito.sequenciaGabarito);
        }

        // Check if detected responses are C/E or Multiple Choice
        const sampleAns = scannedGabarito.respostas.slice(0, 15).map((r: any) => String(r.resposta || "").toUpperCase());
        const isCE = sampleAns.every((a: string) => a === "C" || a === "E" || a === "X" || a === "");
        if (isCE && sampleAns.length > 0) {
          setTipoQuestoes("certo_errado");
          setPenalidadeErroInput(1.0);
        }

        setScanGabaritoResultMsg(
          `✅ Gabarito oficial escaneado com sucesso! ${scannedGabarito.totalQuestoes || scannedGabarito.respostas.length} questões extraídas para "${scannedGabarito.cargoOuEnfaseIdentificado || enfaseGabarito}". O gabarito foi automaticamente preenchido no cartão resposta abaixo.`
        );
      } else {
        throw new Error("Nenhuma resposta pôde ser identificada no gabarito para a ênfase solicitada.");
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "Erro ao processar o gabarito com a IA.";
      setScanGabaritoResultMsg(`Erro: ${msg}`);
    } finally {
      setIsScanningGabarito(false);
    }
  };

  // --- GABARITO PREENCHIDO PELO CANDIDATO IA SCANNER HANDLER ---
  const handleEscanearCandidatoIA = async () => {
    if (!candidatoText.trim() && !selectedCandidatoFile) {
      alert("Por favor, anexe a foto/PDF do cartão resposta preenchido pelo candidato ou cole o texto com as respostas marcadas!");
      return;
    }

    setIsScanningCandidato(true);
    setScanCandidatoResultMsg(null);

    try {
      let pdfBase64: string | undefined = undefined;
      let pdfMimeType: string | undefined = undefined;

      if (selectedCandidatoFile) {
        pdfBase64 = await fileToBase64(selectedCandidatoFile);
        pdfMimeType = selectedCandidatoFile.type || "image/jpeg";
      }

      const response = await fetch("/api/scan-respostas-candidato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: candidatoText,
          pdfBase64,
          pdfMimeType,
          tipoQuestoes,
          totalQuestoes: questionsList.length || undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao conectar com a IA para ler o cartão do candidato.");
      }

      const scannedData = await response.json();

      if (scannedData.respostas && Array.isArray(scannedData.respostas) && scannedData.respostas.length > 0) {
        const newUserMap: { [qNum: number]: string } = {};
        scannedData.respostas.forEach((item: any) => {
          if (item.numero && item.resposta) {
            const cleanResp = String(item.resposta).trim().toUpperCase();
            if (cleanResp !== "BRANCO" && cleanResp !== "X" && cleanResp !== "--") {
              newUserMap[item.numero] = cleanResp;
            }
          }
        });

        setRespostasUsuario(prev => ({
          ...prev,
          ...newUserMap
        }));

        if (scannedData.sequenciaRespostas) {
          setQuickPasteUser(scannedData.sequenciaRespostas);
        }

        if (scannedData.tipoQuestoes === "certo_errado") {
          setTipoQuestoes("certo_errado");
          setPenalidadeErroInput(1.0);
        }

        setScanCandidatoResultMsg(
          `✅ Cartão do candidato lido com sucesso! ${scannedData.totalQuestoes || scannedData.respostas.length} respostas identificadas pela IA e preenchidas na coluna de Marcadas.${scannedData.observacoes ? ` (${scannedData.observacoes})` : ""}`
        );
      } else {
        throw new Error("Nenhuma resposta pôde ser identificada no arquivo ou texto fornecido.");
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "Erro ao processar o cartão de respostas do candidato com a IA.";
      setScanCandidatoResultMsg(`Erro: ${msg}`);
    } finally {
      setIsScanningCandidato(false);
    }
  };

  // --- CADERNO DE PROVAS IA SCANNER HANDLER ---
  const handleEscanearCadernoIA = async () => {
    if (!cadernoText.trim() && !selectedCadernoFile) {
      alert("Por favor, selecione o arquivo do caderno de provas (PDF/Imagem/TXT) ou cole o texto das questões do caderno de prova!");
      return;
    }

    setIsScanningCaderno(true);
    setScanCadernoResultMsg(null);
    setSyncEditalSuccessMsg(null);
    setApplyQuestionsSuccessMsg(null);

    try {
      let pdfBase64: string | undefined = undefined;
      let pdfMimeType: string | undefined = undefined;

      if (selectedCadernoFile) {
        pdfBase64 = await fileToBase64(selectedCadernoFile);
        pdfMimeType = selectedCadernoFile.type || "application/pdf";
      }

      // Format disciplines and topics for cross-reference
      const disciplinasEditalPayload = disciplinasCadastradas.map(d => ({
        nome: d.nome,
        questoesAtuais: d.questoes || 10,
        peso: d.peso || 1,
        categoria: d.categoriaNome,
        assuntos: (d.assuntos || []).map(a => a.nome)
      }));

      const response = await fetch("/api/scan-caderno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cadernoText,
          pdfBase64,
          pdfMimeType,
          cargoDesejado: edital.cargo || "Geral",
          disciplinasEdital: disciplinasEditalPayload
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao conectar com a IA para analisar o caderno de provas.");
      }

      const analysisData: CadernoAnalysisResult = await response.json();
      setCadernoAnalysisResult(analysisData);

      // Auto-detect question type & penalty if indicated
      if (analysisData.tipoProva && (analysisData.tipoProva.toLowerCase().includes("certo") || analysisData.tipoProva.toLowerCase().includes("cebraspe"))) {
        setTipoQuestoes("certo_errado");
        setPenalidadeErroInput(1.0);
      }

      setScanCadernoResultMsg(
        `✅ Caderno de Provas analisado com sucesso! ${analysisData.totalQuestoes} questões exatas identificadas. Conteúdos do edital mapeados e diagnóstico pedagógico para os próximos ciclos gerado.`
      );
    } catch (err: any) {
      console.error(err);
      const isFailedToFetch = err?.message?.includes("Failed to fetch") || err?.toString()?.includes("Failed to fetch");
      const msg = isFailedToFetch
        ? "Erro de conexão ao enviar o caderno de provas para o servidor. Se o arquivo for muito extenso, tente anexar em partes ou colar o texto das questões."
        : (err?.message || "Erro ao analisar o caderno de provas com a IA.");
      setScanCadernoResultMsg(`Erro: ${msg}`);
    } finally {
      setIsScanningCaderno(false);
    }
  };

  // Apply extracted exact questions structure to Simulado / Edital
  const handleAplicarQuestoesCadernoAoSimulado = () => {
    if (!cadernoAnalysisResult) return;

    const { totalQuestoes, disciplinasMapeadas, tipoProva } = cadernoAnalysisResult;

    // Detect Cebraspe/Certo-Errado
    if (tipoProva && (tipoProva.toLowerCase().includes("certo") || tipoProva.toLowerCase().includes("cebraspe"))) {
      setTipoQuestoes("certo_errado");
      setPenalidadeErroInput(1.0);
    } else {
      setTipoQuestoes("multipla");
      setPenalidadeErroInput(0.0);
    }

    if (disciplinasMapeadas && disciplinasMapeadas.length > 0) {
      // Map existing edital categories and update discipline question counts
      const updatedCategorias = edital.categorias.map(cat => ({
        ...cat,
        disciplinas: cat.disciplinas.map(disc => {
          // Find matching mapped discipline
          const matched = disciplinasMapeadas.find(m => 
            m.nome.trim().toLowerCase() === disc.nome.trim().toLowerCase() ||
            disc.nome.trim().toLowerCase().includes(m.nome.trim().toLowerCase()) ||
            m.nome.trim().toLowerCase().includes(disc.nome.trim().toLowerCase())
          );
          if (matched && matched.questoesCount > 0) {
            return {
              ...disc,
              questoes: matched.questoesCount,
              peso: matched.pesoSugerido || disc.peso || 1
            };
          }
          return disc;
        })
      }));

      // Check if we also need to add missing disciplines if they don't exist
      const existingNames = new Set(disciplinasCadastradas.map(d => d.nome.trim().toLowerCase()));
      const missingDiscs = disciplinasMapeadas.filter(m => !existingNames.has(m.nome.trim().toLowerCase()) && !disciplinasCadastradas.some(d => d.nome.toLowerCase().includes(m.nome.toLowerCase())));

      if (updatedCategorias.length === 0) {
        // In standalone avulso mode, initialize categories with all scanned disciplines
        updatedCategorias.push({
          id: `cat_scanned_${Date.now()}`,
          nome: "Disciplinas da Prova",
          disciplinas: disciplinasMapeadas.map((m, idx) => ({
            id: `disc_scanned_${Date.now()}_${idx}`,
            nome: m.nome,
            questoes: m.questoesCount,
            peso: m.pesoSugerido || 1,
            cor: idx % 2 === 0 ? "#3b82f6" : "#10b981",
            assuntos: (m.principaisTemas || []).map((tema, tIdx) => ({
              id: `assunto_scanned_${Date.now()}_${idx}_${tIdx}`,
              nome: tema,
              registros: [],
              status: "NÃO ESTUDADO" as const,
              incidencia: "ALTA" as const
            }))
          }))
        });
      } else if (missingDiscs.length > 0) {
        // Add to the first category
        updatedCategorias[0].disciplinas.push(...missingDiscs.map((m, idx) => ({
          id: `disc_scanned_${Date.now()}_${idx}`,
          nome: m.nome,
          questoes: m.questoesCount,
          peso: m.pesoSugerido || 1,
          cor: "#3b82f6",
          assuntos: (m.principaisTemas || []).map((tema, tIdx) => ({
            id: `assunto_scanned_${Date.now()}_${idx}_${tIdx}`,
            nome: tema,
            registros: [],
            status: "NÃO ESTUDADO" as const,
            incidencia: "ALTA" as const
          }))
        })));
      }

      setQtdQuestoesAvulso(totalQuestoes);

      updateState({
        ...state,
        edital: {
          ...state.edital,
          categorias: updatedCategorias
        }
      });
    } else {
      setQtdQuestoesAvulso(totalQuestoes);
    }

    setApplyQuestionsSuccessMsg(
      `Estrutura de ${totalQuestoes} questões aplicada com sucesso ao Cartão de Respostas e ao Edital!`
    );
    setTimeout(() => setApplyQuestionsSuccessMsg(null), 5000);
  };

  // Sync / Update Edital Topics Incidences based on Exam Analysis
  const handleSincronizarIncidenciasEdital = () => {
    if (!cadernoAnalysisResult) return;

    const { conteudosCobradosNoEdital, classificacoes } = cadernoAnalysisResult;
    const incidenceMap = new Map<string, "ALTA" | "MÉDIA" | "BAIXA">();

    if (conteudosCobradosNoEdital && Array.isArray(conteudosCobradosNoEdital)) {
      conteudosCobradosNoEdital.forEach(item => {
        if (item.assunto && item.incidencia) {
          const norm = item.assunto.trim().toLowerCase();
          const inc = item.incidencia.toUpperCase().includes("ALTA") ? "ALTA" : item.incidencia.toUpperCase().includes("MÉDIA") || item.incidencia.toUpperCase().includes("MEDIA") ? "MÉDIA" : "BAIXA";
          incidenceMap.set(norm, inc);
        }
      });
    }

    if (classificacoes && Array.isArray(classificacoes)) {
      classificacoes.forEach(item => {
        if (item.assunto && item.incidencia) {
          const norm = item.assunto.trim().toLowerCase();
          const inc = item.incidencia.toUpperCase().includes("ALTA") ? "ALTA" : item.incidencia.toUpperCase().includes("MÉDIA") || item.incidencia.toUpperCase().includes("MEDIA") ? "MÉDIA" : "BAIXA";
          incidenceMap.set(norm, inc);
        }
      });
    }

    let updatedCount = 0;
    const updatedCategorias = edital.categorias.map(cat => ({
      ...cat,
      disciplinas: cat.disciplinas.map(disc => ({
        ...disc,
        assuntos: disc.assuntos.map(assunto => {
          const norm = assunto.nome.trim().toLowerCase();
          // Direct or partial match
          let matchedInc: "ALTA" | "MÉDIA" | "BAIXA" | undefined = incidenceMap.get(norm);
          if (!matchedInc) {
            for (const [key, inc] of incidenceMap.entries()) {
              if (norm.includes(key) || key.includes(norm)) {
                matchedInc = inc;
                break;
              }
            }
          }

          if (matchedInc) {
            updatedCount++;
            return {
              ...assunto,
              incidencia: matchedInc
            };
          }
          return assunto;
        })
      }))
    }));

    updateState({
      ...state,
      edital: {
        ...state.edital,
        categorias: updatedCategorias
      }
    });

    setSyncEditalSuccessMsg(
      `Incidências atualizadas com sucesso no Edital (${updatedCount} assuntos sincronizados com os dados reais do caderno de provas)!`
    );
    setTimeout(() => setSyncEditalSuccessMsg(null), 5000);
  };

  // --- EVOLUTION LINE CHART DATA ---
  const lineChartData = useMemo(() => {
    return listHistorico.map((s, idx) => ({
      id: s.id,
      index: idx + 1,
      nome: s.nome,
      data: s.data,
      dataFormatada: formatarDataDDMM(s.data),
      rotuloX: `${s.nome} (${formatarDataDDMM(s.data)})`,
      Aproveitamento: s.aproveitamentoGeral,
      Meta: metaAproveitamento,
      totalAcertos: s.totalAcertos,
      totalQuestoes: s.totalQuestoes,
      pontuacao: s.pontuacaoTotal,
      pontuacaoMax: s.pontuacaoMaximaTotal
    }));
  }, [listHistorico, metaAproveitamento]);

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
                {isAvulso ? "SIMULADO IA (AVULSO)" : "GUIA SIMULADO"}
              </span>
              <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                {isAvulso
                  ? "• Registro livre e independente de simulados e provas anteriores"
                  : `• ${edital.orgao || "Concurso"} - ${edital.cargo || "Cargo Desejado"}`}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-1 font-sans">
              {isAvulso ? "Simulados & Provas Avulsas" : "Simulados & Acompanhamento de Desempenho"}
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
                    {isAvulso ? "PAINEL DE DESEMPENHO – SIMULADOS AVULSOS" : `PAINEL DE DESEMPENHO – ${edital.orgao || "Concurso"}`} ({new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    AO VIVO
                  </span>
                </div>
                <p className={`text-xs mt-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  {isAvulso
                    ? "Acompanhamento geral de notas e aproveitamento em provas e testes realizados de forma avulsa"
                    : `Preparação para ${edital.cargo || "Cargo Desejado"}`}
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

          {/* GRÁFICO: EVOLUÇÃO DOS ACERTOS - SIMULADO (RECHARTS LINECHART / BARCHART) */}
          <div className={`p-6 rounded-3xl border transition-all ${
            darkMode ? "bg-[#0c1833] border-[#1d2f59] text-white" : "bg-white border-gray-200 text-gray-900 shadow-sm"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b pb-4 border-gray-500/20">
              <div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold uppercase tracking-wider font-sans">
                    GRÁFICO EVOLUÇÃO DOS ACERTOS - SIMULADO
                  </h3>
                </div>
                <p className={`text-xs mt-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Evolução da pontuação percentual (%) do usuário ao longo do tempo (Meta Definida: <strong className="text-amber-400">{metaAproveitamento}%</strong>)
                </p>
              </div>

              {/* Seletor de Tipo de Gráfico (Linha / Barras) */}
              <div className="flex items-center p-1 rounded-xl bg-black/20 dark:bg-white/5 border border-white/10 self-start sm:self-auto">
                <button
                  onClick={() => setChartViewMode("linha")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chartViewMode === "linha"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Exibir gráfico de linha de evolução contínua"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Linha (Evolução)</span>
                </button>

                <button
                  onClick={() => setChartViewMode("barras")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chartViewMode === "barras"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Exibir gráfico de barras"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Barras</span>
                </button>
              </div>
            </div>

            {listHistorico.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <BarChart2 className="w-12 h-12 text-gray-500 mb-3 opacity-40" />
                <p className="text-sm font-semibold text-gray-400">
                  Nenhum simulado registrado no histórico ainda.
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                  Vá até a aba <strong># GABARITO #</strong>, preencha as respostas do seu primeiro simulado e salve para visualizar a evolução de pontuação aqui no gráfico!
                </p>
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartViewMode === "linha" ? (
                    <LineChart
                      data={lineChartData}
                      margin={{ top: 20, right: 30, left: -10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e2d4d" : "#e2e8f0"} />
                      <XAxis
                        dataKey="rotuloX"
                        tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 11, fontWeight: "600" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 10 }}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const dataItem = payload[0].payload;
                            const atingiuMeta = dataItem.Aproveitamento >= metaAproveitamento;
                            return (
                              <div className={`p-3.5 rounded-2xl border shadow-xl text-xs space-y-1.5 ${
                                darkMode ? "bg-[#0f1d3d] border-[#22408a] text-white" : "bg-white border-gray-200 text-gray-900"
                              }`}>
                                <p className="font-bold text-sm text-blue-400">{dataItem.nome}</p>
                                <p className="text-[10px] text-gray-400">Data: {formatarDataDDMM(dataItem.data)}</p>
                                <div className="pt-1.5 border-t border-gray-500/20 space-y-1">
                                  <p className="flex justify-between gap-4">
                                    <span>Aproveitamento:</span>
                                    <strong className={atingiuMeta ? "text-emerald-400 font-mono" : "text-amber-400 font-mono"}>
                                      {dataItem.Aproveitamento}%
                                    </strong>
                                  </p>
                                  <p className="flex justify-between gap-4 text-gray-400">
                                    <span>Acertos:</span>
                                    <span className="font-mono text-gray-200">{dataItem.totalAcertos} / {dataItem.totalQuestoes}</span>
                                  </p>
                                  <p className="flex justify-between gap-4 text-gray-400">
                                    <span>Pontos:</span>
                                    <span className="font-mono text-gray-200">{dataItem.pontuacao} / {dataItem.pontuacaoMax} pts</span>
                                  </p>
                                  <p className="flex justify-between gap-4 text-amber-400 pt-1 border-t border-gray-500/20">
                                    <span>Meta:</span>
                                    <span className="font-mono font-bold">{metaAproveitamento}%</span>
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ paddingBottom: "10px", fontSize: "11px", fontWeight: "bold" }}
                      />
                      <ReferenceLine
                        y={metaAproveitamento}
                        stroke="#f59e0b"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        label={{
                          value: `Meta (${metaAproveitamento}%)`,
                          position: "insideTopRight",
                          fill: "#f59e0b",
                          fontSize: 11,
                          fontWeight: "bold"
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Aproveitamento"
                        name="% Aproveitamento"
                        stroke="#3b82f6"
                        strokeWidth={3.5}
                        dot={{ r: 5, fill: "#2563eb", strokeWidth: 2, stroke: "#ffffff" }}
                        activeDot={{ r: 8, stroke: "#3b82f6", strokeWidth: 3, fill: "#60a5fa" }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart
                      data={lineChartData}
                      margin={{ top: 20, right: 30, left: -10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1e2d4d" : "#e2e8f0"} />
                      <XAxis
                        dataKey="rotuloX"
                        tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 11, fontWeight: "600" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: darkMode ? "#94a3b8" : "#64748b", fontSize: 10 }}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <Tooltip
                        formatter={(val: any) => [`${val}%`, "Aproveitamento"]}
                        contentStyle={{
                          backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                          borderColor: darkMode ? "#334155" : "#cbd5e1",
                          borderRadius: "12px",
                          fontSize: "12px"
                        }}
                      />
                      <ReferenceLine
                        y={metaAproveitamento}
                        stroke="#f59e0b"
                        strokeDasharray="5 5"
                        strokeWidth={1.5}
                        label={{
                          value: `Meta (${metaAproveitamento}%)`,
                          position: "insideTopRight",
                          fill: "#f59e0b",
                          fontSize: 11,
                          fontWeight: "bold"
                        }}
                      />
                      <Bar dataKey="Aproveitamento" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                        {lineChartData.map((entry, index) => (
                          <Cell
                            key={`cell-sim-${index}`}
                            fill={entry.Aproveitamento >= metaAproveitamento ? "#00a896" : "#f4a261"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
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
              <strong className="text-emerald-400">{listHistorico.length} simulados realizados.</strong> Média geral: <strong className="text-emerald-400">{statsCalculated.mediaGeral}%</strong>. Próximos passos: {materiaMaisFraca ? `revisar ${(materiaMaisFraca.materia || "").toLowerCase()} (nota atual: ${materiaMaisFraca.nota}%).` : "manter rotina de questões."} Foco total até a prova.
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
                            onClick={() => handleOpenSimuladoDetalhes(sim)}
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
          
          {/* SEÇÃO 1: ESCANEAR EDITAL & GABARITO POR IA */}
          <div className={`p-6 rounded-3xl border transition-all space-y-5 ${
            darkMode ? "bg-[#0c1833] border-[#1d2f59] text-white" : "bg-white border-gray-200 text-gray-900 shadow-sm"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-gray-500/20">
              <div>
                <div className="flex items-center space-x-2 text-blue-400">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="text-base font-bold font-sans">
                    Escanear por IA: Edital & Gabarito Oficial por Ênfase
                  </h3>
                </div>
                <p className={`text-xs mt-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Extraia critérios e distribuição de matérias do edital ou importe automaticamente as respostas do gabarito oficial para a ênfase escolhida.
                </p>
              </div>

              {/* Sub-abas de Escaneamento */}
              <div className="flex flex-wrap items-center p-1 rounded-xl bg-black/20 dark:bg-white/5 border border-white/10 self-start sm:self-auto gap-1">
                <button
                  onClick={() => setScannerSubTab("caderno")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scannerSubTab === "caderno"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400/50"
                      : darkMode ? "text-purple-300 hover:text-white" : "text-purple-700 hover:text-purple-900"
                  }`}
                >
                  <BrainCircuit className="w-3.5 h-3.5 text-purple-300" />
                  <span>1. Caderno de Questões (IA)</span>
                </button>

                <button
                  onClick={() => setScannerSubTab("gabarito")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scannerSubTab === "gabarito"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/50"
                      : darkMode ? "text-emerald-300 hover:text-white" : "text-emerald-700 hover:text-emerald-900"
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>2. Gabarito da Prova (IA)</span>
                </button>

                <button
                  onClick={() => setScannerSubTab("candidato")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scannerSubTab === "candidato"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/50"
                      : darkMode ? "text-blue-300 hover:text-white" : "text-blue-700 hover:text-blue-900"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>3. Gabarito do Candidato (IA)</span>
                </button>

                <button
                  onClick={() => setScannerSubTab("edital")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scannerSubTab === "edital"
                      ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-1 ring-amber-400/50"
                      : darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Critérios do Edital</span>
                </button>
              </div>
            </div>

            {/* MODO 1: ESCANEAR CRITÉRIOS DO EDITAL */}
            {scannerSubTab === "edital" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                    Escanear Edital por IA (Extrair Critérios, Pesos e Eliminação do Concurso)
                  </span>
                  <span className={`text-[11px] ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Cargo alvo: <strong className="text-blue-400">{edital.cargo || "Geral"}</strong>
                  </span>
                </div>

                <p className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Anexe o arquivo PDF/TXT do edital ou cole o texto do concurso. A IA irá extrair a quantidade exata de questões por matéria, pesos, regras de eliminação e penalidades.
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

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
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
            )}

            {/* MODO 2: ESCANEAR GABARITO OFICIAL POR ÊNFASE ESCOLHIDA */}
            {scannerSubTab === "gabarito" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Escanear Gabarito Oficial da Prova por IA (de acordo com a Ênfase Escolhida)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Gabarito Oficial
                  </span>
                </div>

                <p className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Selecione ou digite a ênfase/cargo da prova, anexe o PDF do gabarito oficial ou cole o texto. A IA filtrará as respostas específicas da ênfase escolhida e preencherá automaticamente o Cartão de Respostas.
                </p>

                {/* Seleção e Definição da Ênfase Desejada */}
                <div className={`p-4 rounded-2xl border space-y-2 ${
                  darkMode ? "bg-[#112147]/60 border-[#22408a]/60" : "bg-gray-50 border-gray-200"
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className={`text-xs font-bold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                      Ênfase / Cargo / Perfil da Prova:
                    </label>
                    {edital.cargo && edital.cargo !== enfaseGabarito && (
                      <button
                        onClick={() => setEnfaseGabarito(edital.cargo)}
                        className="text-[11px] font-bold text-blue-400 hover:underline self-start sm:self-auto cursor-pointer"
                      >
                        Usar cargo atual: "{edital.cargo}"
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={enfaseGabarito}
                    onChange={(e) => setEnfaseGabarito(e.target.value)}
                    placeholder="Ex: Ênfase 14 - Engenharia de Petróleo, Cargo 01 - Agente, etc."
                    className={`w-full p-3 rounded-xl border text-xs font-bold outline-none ${
                      darkMode ? "bg-[#0c1833] border-[#22408a] text-white focus:border-emerald-400" : "bg-white border-gray-300 text-gray-900 focus:border-emerald-600"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dropzone do Arquivo de Gabarito */}
                  <div
                    onClick={() => gabaritoFileInputRef.current?.click()}
                    className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      darkMode ? "bg-[#112147]/50 border-emerald-500/40 hover:border-emerald-400 hover:bg-[#112147]" : "bg-gray-50 border-emerald-300 hover:border-emerald-500 hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="file"
                      ref={gabaritoFileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedGabaritoFile(e.target.files[0]);
                        }
                      }}
                      accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
                      className="hidden"
                    />
                    <FileCheck className="w-8 h-8 text-emerald-400 mb-2" />
                    <span className="text-xs font-bold text-emerald-400">
                      {selectedGabaritoFile ? selectedGabaritoFile.name : "Anexar Gabarito Oficial (PDF, Imagem ou TXT)"}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1">
                      PDF do gabarito preliminar/definitivo divulgado pela banca
                    </span>
                  </div>

                  {/* Textarea do Gabarito */}
                  <textarea
                    value={gabaritoText}
                    onChange={(e) => setGabaritoText(e.target.value)}
                    placeholder="Ou cole aqui o texto da folha de respostas/gabarito oficial publicado pela banca..."
                    className={`w-full p-4 rounded-2xl border text-xs h-32 outline-none transition-colors ${
                      darkMode ? "bg-[#112147] border-[#22408a] text-white focus:border-emerald-400" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-emerald-600"
                    }`}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handleEscanearGabaritoIA}
                    disabled={isScanningGabarito}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isScanningGabarito ? "animate-spin" : ""}`} />
                    <span>{isScanningGabarito ? "Extraindo Gabarito com IA..." : "Escanear Gabarito Oficial da Prova por IA"}</span>
                  </button>

                  {scanGabaritoResultMsg && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{scanGabaritoResultMsg}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MODO: ESCANEAR GABARITO PREENCHIDO PELO CANDIDATO (FOLHA DE RESPOSTAS) */}
            {scannerSubTab === "candidato" && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-400" />
                      Escanear Gabarito / Cartão de Respostas Preenchido pelo Candidato (IA)
                    </span>
                    <p className={`text-xs mt-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                      Tire uma foto do seu cartão de respostas preenchido, rascunho de prova ou anexe um PDF/Imagem. A IA fará a leitura óptica das alternativas marcadas e preencherá automaticamente a coluna de respostas marcadas para conferência imediata com o gabarito oficial.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 self-start sm:self-auto shrink-0">
                    Cartão do Aluno
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dropzone do Arquivo do Gabarito do Candidato */}
                  <div
                    onClick={() => candidatoFileInputRef.current?.click()}
                    className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      darkMode ? "bg-[#112147]/50 border-blue-500/40 hover:border-blue-400 hover:bg-[#112147]" : "bg-gray-50 border-blue-300 hover:border-blue-500 hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="file"
                      ref={candidatoFileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedCandidatoFile(e.target.files[0]);
                        }
                      }}
                      accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-blue-400 mb-2" />
                    <span className="text-xs font-bold text-blue-400">
                      {selectedCandidatoFile ? selectedCandidatoFile.name : "Anexar Foto ou PDF do Cartão do Candidato"}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1">
                      Foto nítida do cartão de respostas preenchido, anotações de prova ou PDF
                    </span>
                  </div>

                  {/* Textarea de anotações ou sequência do candidato */}
                  <textarea
                    value={candidatoText}
                    onChange={(e) => setCandidatoText(e.target.value)}
                    placeholder="Ou cole aqui o texto com as respostas marcadas pelo candidato (Ex: 1-A, 2-C, 3-D... ou a sequência contínua ABCDE...)..."
                    className={`w-full p-4 rounded-2xl border text-xs h-32 outline-none transition-colors ${
                      darkMode ? "bg-[#112147] border-[#22408a] text-white focus:border-blue-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-600"
                    }`}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handleEscanearCandidatoIA}
                    disabled={isScanningCandidato}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-blue-600/20 disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isScanningCandidato ? "animate-spin" : ""}`} />
                    <span>{isScanningCandidato ? "Lendo Cartão do Candidato com IA..." : "Escanear Respostas do Candidato por IA"}</span>
                  </button>

                  {scanCandidatoResultMsg && (
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{scanCandidatoResultMsg}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MODO 3: ESCANEAR CADERNO DE PROVAS & DIAGNÓSTICO INTELIGENTE POR IA */}
            {scannerSubTab === "caderno" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <BrainCircuit className="w-4 h-4" />
                      Escaneamento do Caderno de Provas por IA (Extração Exata & Diagnóstico de Ciclos)
                    </span>
                    <p className={`text-xs mt-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                      Anexe o caderno de questões completo (PDF/Imagem/TXT) ou cole o texto. A IA extrairá a quantidade exata de questões, mapeará quais conteúdos do edital caíram na prova e formulará um diagnóstico detalhado com os pontos que você precisa melhorar nos próximos ciclos e sessões de estudo.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 self-start sm:self-auto shrink-0">
                    IA Pedagógica
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dropzone do Arquivo do Caderno de Prova */}
                  <div
                    onClick={() => cadernoFileInputRef.current?.click()}
                    className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      darkMode ? "bg-[#112147]/50 border-purple-500/40 hover:border-purple-400 hover:bg-[#112147]" : "bg-gray-50 border-purple-300 hover:border-purple-500 hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="file"
                      ref={cadernoFileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedCadernoFile(e.target.files[0]);
                        }
                      }}
                      accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
                      className="hidden"
                    />
                    <FileText className="w-8 h-8 text-purple-400 mb-2" />
                    <span className="text-xs font-bold text-purple-400">
                      {selectedCadernoFile ? selectedCadernoFile.name : "Anexar Caderno de Provas (PDF, Imagem ou TXT)"}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1">
                      Caderno de questões da prova aplicada ou simulado impresso
                    </span>
                  </div>

                  {/* Textarea do Caderno de Provas */}
                  <textarea
                    value={cadernoText}
                    onChange={(e) => setCadernoText(e.target.value)}
                    placeholder="Ou cole aqui o texto com os enunciados, blocos de questões ou trechos do caderno de provas..."
                    className={`w-full p-4 rounded-2xl border text-xs h-32 outline-none transition-colors ${
                      darkMode ? "bg-[#112147] border-[#22408a] text-white focus:border-purple-400" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-purple-600"
                    }`}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handleEscanearCadernoIA}
                    disabled={isScanningCaderno}
                    className="w-full sm:w-auto px-7 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-purple-600/30 disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isScanningCaderno ? "animate-spin" : ""}`} />
                    <span>{isScanningCaderno ? "Escaneando Caderno e Analisando Edital..." : "Escanear Caderno de Provas & Analisar Conteúdos"}</span>
                  </button>

                  {scanCadernoResultMsg && (
                    <div className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 border ${
                      scanCadernoResultMsg.startsWith("Erro")
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                        : "bg-purple-500/10 border-purple-500/30 text-purple-300"
                    }`}>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{scanCadernoResultMsg}</span>
                    </div>
                  )}
                </div>

                {/* --- SEÇÃO DE RESULTADOS & DIAGNÓSTICO DO CADERNO DE PROVAS --- */}
                {cadernoAnalysisResult && (
                  <div className="space-y-6 pt-4 border-t border-gray-500/20 animate-fade-in">
                    
                    {/* Bloco 1: KPIs Quantitativos e Ações Rápidas */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      {/* Card Total de Questões */}
                      <div className={`p-4 rounded-2xl border ${
                        darkMode ? "bg-[#112147]/80 border-purple-500/40" : "bg-purple-50 border-purple-200"
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                            Total de Questões
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                            {cadernoAnalysisResult.tipoProva || "Identificado"}
                          </span>
                        </div>
                        <div className="flex items-baseline space-x-2 mt-2">
                          <span className="text-3xl font-black font-sans text-purple-400">
                            {cadernoAnalysisResult.totalQuestoes}
                          </span>
                          <span className="text-xs text-gray-400 font-semibold">questões na prova</span>
                        </div>
                        
                        <button
                          onClick={handleAplicarQuestoesCadernoAoSimulado}
                          className="w-full mt-3 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-purple-600/20"
                          title="Atualizar o número de questões das matérias no Simulado e no Edital"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Aplicar Qtd ao Cartão Resposta</span>
                        </button>
                      </div>

                      {/* Card Disciplinas Mapeadas */}
                      <div className={`p-4 rounded-2xl border ${
                        darkMode ? "bg-[#112147]/80 border-blue-500/40" : "bg-blue-50 border-blue-200"
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                            Disciplinas Mapeadas
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                            {cadernoAnalysisResult.disciplinasMapeadas?.length || 0} matérias
                          </span>
                        </div>
                        <div className="mt-2 space-y-1.5 max-h-24 overflow-y-auto pr-1">
                          {cadernoAnalysisResult.disciplinasMapeadas?.map((d, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="truncate max-w-[150px] font-medium" title={d.nome}>{d.nome}</span>
                              <span className="font-mono font-bold text-blue-400 shrink-0 ml-1 text-[11px]">
                                {d.questoesCount} qts ({d.faixaQuestoes})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card Conteúdos do Edital Identificados */}
                      <div className={`p-4 rounded-2xl border ${
                        darkMode ? "bg-[#112147]/80 border-emerald-500/40" : "bg-emerald-50 border-emerald-200"
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                            Assuntos do Edital
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            {cadernoAnalysisResult.conteudosCobradosNoEdital?.length || 0} cobrados
                          </span>
                        </div>
                        <p className={`text-xs mt-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          A IA identificou a incidência real de cada tema do seu edital nesta prova.
                        </p>
                        
                        <button
                          onClick={handleSincronizarIncidenciasEdital}
                          className="w-full mt-3 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                          title="Sincronizar os pesos e incidências (Alta/Média/Baixa) com a grade do Edital"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Sincronizar Incidências no Edital</span>
                        </button>
                      </div>

                    </div>

                    {/* Mensagens de Notificação de Aplicação */}
                    {applyQuestionsSuccessMsg && (
                      <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center space-x-2 animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-purple-400" />
                        <span>{applyQuestionsSuccessMsg}</span>
                      </div>
                    )}

                    {syncEditalSuccessMsg && (
                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>{syncEditalSuccessMsg}</span>
                      </div>
                    )}

                    {/* Bloco 2: Tabela de Conteúdos do Edital Cobrados na Prova */}
                    <div className={`p-5 rounded-3xl border space-y-4 ${
                      darkMode ? "bg-[#0b142b] border-[#1d2f59]" : "bg-gray-50 border-gray-200"
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-gray-500/20">
                        <div>
                          <h4 className="text-sm font-bold flex items-center gap-2 text-blue-400">
                            <Layers className="w-4 h-4" />
                            <span>Mapeamento de Conteúdos do Edital Cobrados no Caderno</span>
                          </h4>
                          <p className={`text-xs mt-0.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Detalhamento dos tópicos que a banca exigiu, quantidade de questões e justificativa pedagógica.
                          </p>
                        </div>

                        {/* Filtro de Incidência */}
                        <div className="flex items-center space-x-1">
                          {(["TODAS", "ALTA", "MÉDIA", "BAIXA"] as const).map(filtro => (
                            <button
                              key={filtro}
                              onClick={() => setCadernoFilterIncidencia(filtro)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                                cadernoFilterIncidencia === filtro
                                  ? filtro === "ALTA"
                                    ? "bg-rose-600 text-white"
                                    : filtro === "MÉDIA"
                                    ? "bg-amber-600 text-white"
                                    : filtro === "BAIXA"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-700 text-white"
                                  : darkMode
                                  ? "bg-gray-800/60 text-gray-400 hover:text-white"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`}
                            >
                              {filtro}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-gray-500/20 max-h-72 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className={`text-[10px] font-black uppercase tracking-wider sticky top-0 ${
                            darkMode ? "bg-[#112147] text-gray-300" : "bg-gray-200 text-gray-800"
                          }`}>
                            <tr>
                              <th className="p-3">Disciplina</th>
                              <th className="p-3">Assunto / Conteúdo do Edital</th>
                              <th className="p-3 text-center">Incidência</th>
                              <th className="p-3 text-center">Questões (Nº)</th>
                              <th className="p-3">Foco da Banca / Resumo de Cobrança</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-500/20 font-medium">
                            {cadernoAnalysisResult.conteudosCobradosNoEdital
                              ?.filter(item => {
                                if (cadernoFilterIncidencia === "TODAS") return true;
                                return item.incidencia?.toUpperCase().includes(cadernoFilterIncidencia);
                              })
                              .map((item, idx) => {
                                const isAlta = item.incidencia?.toUpperCase().includes("ALTA");
                                const isMedia = item.incidencia?.toUpperCase().includes("MÉDIA") || item.incidencia?.toUpperCase().includes("MEDIA");
                                return (
                                  <tr key={idx} className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-100"}>
                                    <td className="p-3 font-bold text-blue-400 whitespace-nowrap">
                                      {item.disciplina}
                                    </td>
                                    <td className="p-3 font-semibold">
                                      {item.assunto}
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                        isAlta
                                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                          : isMedia
                                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                      }`}>
                                        {item.incidencia}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center whitespace-nowrap font-mono text-gray-300">
                                      <span className="font-bold text-white">{item.frequenciaQuestoes}</span>
                                      {item.questoesNumeros && item.questoesNumeros.length > 0 && (
                                        <span className="text-[10px] text-gray-400 block">
                                          (Q: {item.questoesNumeros.join(", ")})
                                        </span>
                                      )}
                                    </td>
                                    <td className={`p-3 text-xs ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                      {item.resumoCobranca || "Cobrança direta com aplicação prática em questões."}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Bloco 3: Diagnóstico Inteligente para os Próximos Ciclos e Sessões de Estudos */}
                    <div className={`p-6 rounded-3xl border space-y-5 ${
                      darkMode ? "bg-gradient-to-br from-[#0c1833] via-[#101b3b] to-[#0a1329] border-[#223d75]" : "bg-white border-blue-200 shadow-md"
                    }`}>
                      <div className="flex items-center space-x-2 border-b pb-3 border-gray-500/20">
                        <Lightbulb className="w-5 h-5 text-amber-400" />
                        <div>
                          <h4 className="text-base font-black uppercase tracking-wider text-amber-400 font-sans">
                            Diagnóstico Inteligente: O Que Melhorar nos Próximos Ciclos & Sessões de Estudos
                          </h4>
                          <p className={`text-xs mt-0.5 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                            Recomendações estratégicas e pedagógicas formuladas pela IA para impulsionar seu rendimento nas próximas semanas.
                          </p>
                        </div>
                      </div>

                      {/* Resumo Geral da Banca */}
                      {cadernoAnalysisResult.diagnosticoProximosCiclos?.resumoGeral && (
                        <div className={`p-4 rounded-2xl border ${
                          darkMode ? "bg-[#112147]/70 border-[#22408a]/60 text-gray-200" : "bg-blue-50 border-blue-200 text-gray-800"
                        }`}>
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block mb-1">
                            Análise Geral do Nível de Exigência da Prova:
                          </span>
                          <p className="text-xs leading-relaxed font-medium">
                            {cadernoAnalysisResult.diagnosticoProximosCiclos.resumoGeral}
                          </p>
                        </div>
                      )}

                      {/* Tópicos Críticos para Melhorar nos Próximos Ciclos */}
                      <div className="space-y-3">
                        <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                          <Zap className="w-4 h-4" />
                          Tópicos Críticos e Prioridades de Reforço nos Próximos Ciclos:
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {cadernoAnalysisResult.diagnosticoProximosCiclos?.topicosCriticosMelhorar?.map((t, idx) => {
                            const isUrgente = t.prioridade?.toUpperCase().includes("URGENTE");
                            const isAlta = t.prioridade?.toUpperCase().includes("ALTA");
                            return (
                              <div
                                key={idx}
                                className={`p-4 rounded-2xl border space-y-2 transition-all ${
                                  darkMode
                                    ? isUrgente
                                      ? "bg-rose-950/20 border-rose-500/40"
                                      : isAlta
                                      ? "bg-amber-950/20 border-amber-500/40"
                                      : "bg-[#112147]/50 border-blue-500/30"
                                    : isUrgente
                                    ? "bg-rose-50 border-rose-200"
                                    : isAlta
                                    ? "bg-amber-50 border-amber-200"
                                    : "bg-blue-50 border-blue-200"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-black text-white truncate">
                                    {t.disciplina} • <span className="text-blue-400">{t.assunto}</span>
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                                    isUrgente
                                      ? "bg-rose-500/30 text-rose-300 border border-rose-500/40"
                                      : isAlta
                                      ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                                      : "bg-blue-500/30 text-blue-300 border border-blue-500/40"
                                  }`}>
                                    {t.prioridade}
                                  </span>
                                </div>

                                <div className="text-xs space-y-1">
                                  <p className={`text-[11px] ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                    <strong className="text-gray-400 font-bold">Por que reforçar:</strong> {t.motivo}
                                  </p>
                                  <div className="pt-1.5 border-t border-gray-500/20 flex items-start space-x-1.5 text-emerald-400 font-semibold text-[11px]">
                                    <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                                    <span>{t.recomendacaoEstudo}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Ajustes de Carga Horária & Ciclos */}
                      {cadernoAnalysisResult.diagnosticoProximosCiclos?.sugestaoAjusteCargaHoraria && (
                        <div className="space-y-2.5">
                          <span className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                            <Compass className="w-4 h-4" />
                            Ajustes Sugeridos na Carga Horária & Estrutura dos Ciclos:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {cadernoAnalysisResult.diagnosticoProximosCiclos.sugestaoAjusteCargaHoraria.map((adj, idx) => (
                              <div
                                key={idx}
                                className={`p-3.5 rounded-xl border text-xs ${
                                  darkMode ? "bg-[#112147]/60 border-[#22408a]/50" : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <span className="font-black text-blue-400 block mb-1">{adj.disciplina}</span>
                                <p className="font-bold text-emerald-400 text-xs mb-0.5">{adj.acaoRecomendada}</p>
                                <p className={`text-[11px] ${darkMode ? "text-gray-400" : "text-gray-600"}`}>{adj.justificativa}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Orientações Práticas para as Sessões de Estudo */}
                      {cadernoAnalysisResult.diagnosticoProximosCiclos?.orientacoesSessoesEstudo && (
                        <div className={`p-4 rounded-2xl border space-y-2.5 ${
                          darkMode ? "bg-[#081024]/80 border-[#1d2f59]" : "bg-emerald-50 border-emerald-200"
                        }`}>
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                            <ListChecks className="w-4 h-4" />
                            Orientações Táticas para as Próximas Sessões de Estudo:
                          </span>
                          <div className="space-y-1.5">
                            {cadernoAnalysisResult.diagnosticoProximosCiclos.orientacoesSessoesEstudo.map((dica, idx) => (
                              <div key={idx} className="flex items-start space-x-2 text-xs">
                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-500/30">
                                  {idx + 1}
                                </span>
                                <p className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-800"}`}>
                                  {dica}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                  </div>
                )}
              </div>
            )}
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

            {/* Cabeçalho do Simulado (Nome, Data, Órgão, Cargo e Penalidade) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <label className="block text-xs font-bold mb-1">Órgão / Banca / Concurso:</label>
                <input
                  type="text"
                  value={novoSimuladoOrgao}
                  onChange={(e) => setNovoSimuladoOrgao(e.target.value)}
                  placeholder={edital.orgao || "Ex: PETROBRAS, CEBRASPE, INSS"}
                  className={`w-full p-3 rounded-xl border text-xs font-bold outline-none ${
                    darkMode ? "bg-[#112147] border-[#22408a] text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Cargo / Especialidade:</label>
                <input
                  type="text"
                  value={novoSimuladoCargo}
                  onChange={(e) => setNovoSimuladoCargo(e.target.value)}
                  placeholder={edital.cargo || "Ex: Auditor, Técnico, Analista"}
                  className={`w-full p-3 rounded-xl border text-xs font-bold outline-none ${
                    darkMode ? "bg-[#112147] border-[#22408a] text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">Critério de Penalidade (Edital/Banca):</label>
                <select
                  value={penalidadeErroInput}
                  onChange={(e) => setPenalidadeErroInput(parseFloat(e.target.value))}
                  className={`w-full p-3 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                    darkMode ? "bg-[#112147] border-[#22408a] text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                  }`}
                >
                  <option value={0.0}>Sem Penalidade (Apenas soma acertos - FCC/FGV/Vunesp)</option>
                  <option value={1.0}>1 Erro anula 1 Certo (Cebraspe - 1,0 pt deduzido)</option>
                  <option value={0.5}>0,5 Ponto deduzido por Erro</option>
                  <option value={0.25}>0,25 Ponto deduzido por Erro</option>
                </select>
              </div>

              {disciplinasCadastradas.length === 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold">Quantidade de Questões da Prova:</label>
                    <span className="text-[11px] font-mono font-bold text-blue-400">{qtdQuestoesAvulso} questões</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[30, 50, 60, 70, 80, 100, 120].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setQtdQuestoesAvulso(n)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          qtdQuestoesAvulso === n
                            ? "bg-blue-600 text-white shadow-sm"
                            : darkMode ? "bg-[#112147] border border-[#22408a] text-gray-300 hover:text-white" : "bg-gray-100 border border-gray-300 text-gray-700"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <input
                      type="number"
                      min={5}
                      max={200}
                      value={qtdQuestoesAvulso}
                      onChange={(e) => setQtdQuestoesAvulso(Math.max(1, parseInt(e.target.value) || 1))}
                      className={`w-16 p-1.5 rounded-lg border text-xs font-bold text-center outline-none ${
                        darkMode ? "bg-[#112147] border-[#22408a] text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                      }`}
                    />
                  </div>
                </div>
              )}
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
      {selectedSimuladoDetalhes && (() => {
        // Calculate live totals for the modal view/edit
        const modalTotalAcertos = editMateriasList.reduce((acc, m) => acc + (Number(m.acertos) || 0), 0);
        const modalTotalQuestoes = editMateriasList.reduce((acc, m) => acc + (Number(m.questoesRespondidas) || 0), 0);
        const modalPontuacaoTotal = editMateriasList.reduce((acc, m) => acc + (Number(m.pontuacao) || 0), 0);
        const modalPontuacaoMax = editMateriasList.reduce((acc, m) => acc + (Number(m.pontuacaoMaxima) || 0), 0);
        const modalAproveitamentoGeral = modalTotalQuestoes > 0 
          ? parseFloat(((modalTotalAcertos / modalTotalQuestoes) * 100).toFixed(1)) 
          : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className={`relative w-full max-w-3xl my-6 p-5 sm:p-7 rounded-3xl border shadow-2xl transition-all ${
              darkMode ? "bg-[#0c1833] border-[#1d2f59] text-white" : "bg-white border-gray-300 text-gray-900"
            }`}>
              {/* Top Close Button */}
              <button
                onClick={() => {
                  setSelectedSimuladoDetalhes(null);
                  setIsEditingDetalhes(false);
                }}
                className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-5">
                {/* Header info */}
                <div className="border-b pb-4 border-gray-500/20 pr-8">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                      <Target className="w-3 h-3 inline mr-1" />
                      DETALHAMENTO DO SIMULADO
                    </span>
                    {isEditingDetalhes && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                        <Edit3 className="w-3 h-3 inline mr-1" />
                        MODO DE EDIÇÃO ATIVO
                      </span>
                    )}
                  </div>

                  {!isEditingDetalhes ? (
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black font-sans tracking-tight">
                        {selectedSimuladoDetalhes.nome}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Data da Prova: <strong className="text-gray-300">{formatarDataDDMM(selectedSimuladoDetalhes.data)}</strong> • Órgão: <strong className="text-gray-300">{selectedSimuladoDetalhes.orgao}</strong> • Cargo: <strong className="text-gray-300">{selectedSimuladoDetalhes.cargo}</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nome do Simulado</label>
                        <input
                          type="text"
                          value={editSimuladoNome}
                          onChange={(e) => setEditSimuladoNome(e.target.value)}
                          className={`w-full p-2 text-xs font-bold rounded-xl border outline-none ${
                            darkMode ? "bg-[#112147] border-blue-500 text-white" : "bg-gray-50 border-blue-400 text-gray-900"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Data da Realização</label>
                        <input
                          type="date"
                          value={editSimuladoData}
                          onChange={(e) => setEditSimuladoData(e.target.value)}
                          className={`w-full p-2 text-xs font-bold rounded-xl border outline-none ${
                            darkMode ? "bg-[#112147] border-blue-500 text-white" : "bg-gray-50 border-blue-400 text-gray-900"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-[#112147]/80 border-blue-900/40" : "bg-gray-50 border-gray-200"}`}>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">PONTUAÇÃO TOTAL</span>
                    <span className="text-lg font-black font-mono text-emerald-400 block mt-0.5">
                      {modalPontuacaoTotal.toFixed(1)} / {modalPontuacaoMax} <span className="text-xs font-normal text-gray-400">pts</span>
                    </span>
                  </div>

                  <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-[#112147]/80 border-blue-900/40" : "bg-gray-50 border-gray-200"}`}>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">APROVEITAMENTO</span>
                    <div className="flex items-baseline space-x-1.5 mt-0.5">
                      <span className={`text-lg font-black font-mono ${
                        modalAproveitamentoGeral >= metaAproveitamento ? "text-emerald-400" : "text-amber-400"
                      }`}>
                        {modalAproveitamentoGeral}%
                      </span>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-[#112147]/80 border-blue-900/40" : "bg-gray-50 border-gray-200"}`}>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">ACERTOS NO EDITAL</span>
                    <span className="text-lg font-black font-mono text-blue-400 block mt-0.5">
                      {modalTotalAcertos} / {modalTotalQuestoes} <span className="text-xs font-normal text-gray-400">qts</span>
                    </span>
                  </div>

                  <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-[#112147]/80 border-blue-900/40" : "bg-gray-50 border-gray-200"}`}>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">META DEFINIDA</span>
                    <span className="text-lg font-black font-mono text-purple-400 block mt-0.5">
                      {metaAproveitamento}% <span className="text-xs font-normal text-gray-400">meta</span>
                    </span>
                  </div>
                </div>

                {/* Subtitle & Table */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Pontuação & Desempenho por Matéria (Conforme Edital):
                    </h4>
                    <span className="text-[11px] text-gray-400 italic">
                      * Desempenho = Acertos / Total de Questões da Matéria no Edital
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-gray-500/20 shadow-inner">
                    <table className="w-full text-left text-xs">
                      <thead className={`uppercase text-[9px] font-black tracking-wider ${
                        darkMode ? "bg-[#112147] text-gray-300" : "bg-gray-100 text-gray-700"
                      }`}>
                        <tr>
                          <th className="p-3">Matéria / Disciplina</th>
                          <th className="p-3 text-center">Acertos / Total Edital</th>
                          <th className="p-3 text-center">Erros</th>
                          <th className="p-3 text-center">Pontuação</th>
                          <th className="p-3 text-right">% Aproveitamento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-500/20 font-medium">
                        {editMateriasList.map((d, idx) => {
                          const discInfo = disciplinasCadastradas.find(dc => dc.id === d.disciplinaId || dc.nome.toLowerCase() === d.disciplinaNome.toLowerCase());
                          const categoria = discInfo?.categoriaNome || (d.disciplinaNome.toLowerCase().includes("específic") ? "Conhecimentos Específicos" : "Conhecimentos Básicos");
                          const isAtingiuMeta = d.aproveitamento >= metaAproveitamento;
                          const isQuaseMeta = d.aproveitamento >= metaAproveitamento - 15;

                          return (
                            <tr key={idx} className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50/80"}>
                              <td className="p-3">
                                <div className="font-bold text-sm text-gray-100">{d.disciplinaNome}</div>
                                <div className="text-[10px] text-gray-400">
                                  {categoria} • Peso {d.peso || 1}
                                </div>
                              </td>

                              <td className="p-3 text-center">
                                {!isEditingDetalhes ? (
                                  <div className="inline-flex items-center justify-center space-x-1 font-mono">
                                    <span className="text-sm font-black text-emerald-400">{d.acertos}</span>
                                    <span className="text-xs text-gray-400">/ {d.questoesRespondidas} qts</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center justify-center space-x-1.5 font-mono">
                                    <input
                                      type="number"
                                      min={0}
                                      max={d.questoesRespondidas}
                                      value={d.acertos}
                                      onChange={(e) => handleUpdateEditMateriaAcertos(idx, parseInt(e.target.value))}
                                      className="w-14 p-1 rounded-lg text-center font-bold text-sm bg-blue-950/80 border border-blue-500 text-white outline-none focus:ring-1 focus:ring-blue-400"
                                    />
                                    <span className="text-xs text-gray-400">/ {d.questoesRespondidas}</span>
                                  </div>
                                )}
                              </td>

                              <td className="p-3 text-center">
                                <span className="font-mono font-bold text-xs text-rose-400">
                                  {d.erros}
                                </span>
                              </td>

                              <td className="p-3 text-center">
                                <span className="font-mono font-bold text-xs">
                                  {d.pontuacao} / {d.pontuacaoMaxima} <span className="text-[10px] text-gray-400">pts</span>
                                </span>
                              </td>

                              <td className="p-3 text-right">
                                <div className="flex flex-col items-end">
                                  <div className="flex items-center space-x-1.5">
                                    <span className={`font-mono font-black text-xs ${
                                      isAtingiuMeta ? "text-emerald-400" : isQuaseMeta ? "text-amber-400" : "text-rose-400"
                                    }`}>
                                      {d.aproveitamento}%
                                    </span>
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                      isAtingiuMeta 
                                        ? "bg-emerald-500/20 text-emerald-400" 
                                        : isQuaseMeta 
                                        ? "bg-amber-500/20 text-amber-400" 
                                        : "bg-rose-500/20 text-rose-400"
                                    }`}>
                                      {isAtingiuMeta ? "★ Ótimo" : isQuaseMeta ? "▲ Regular" : "🔻 Baixo"}
                                    </span>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="w-24 sm:w-28 bg-gray-700/40 h-1.5 rounded-full overflow-hidden mt-1.5">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        isAtingiuMeta ? "bg-emerald-500" : isQuaseMeta ? "bg-amber-500" : "bg-rose-500"
                                      }`}
                                      style={{ width: `${Math.min(100, Math.max(0, d.aproveitamento))}%` }}
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

                {/* Footer Controls */}
                <div className="pt-2 border-t border-gray-500/20 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteSimulado(selectedSimuladoDetalhes.id)}
                      className="px-3.5 py-2 rounded-xl border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-bold text-xs transition-all cursor-pointer inline-flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir Simulado</span>
                    </button>

                    {!isEditingDetalhes ? (
                      <button
                        onClick={() => setIsEditingDetalhes(true)}
                        className="px-3.5 py-2 rounded-xl border border-blue-500/40 hover:bg-blue-600/20 text-blue-400 font-bold text-xs transition-all cursor-pointer inline-flex items-center space-x-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Notas & Acertos</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsEditingDetalhes(false);
                          setEditMateriasList(resolveSimuladoDetalhesWithEdital(selectedSimuladoDetalhes));
                        }}
                        className="px-3.5 py-2 rounded-xl border border-gray-500/40 hover:bg-gray-500/20 text-gray-300 font-bold text-xs transition-all cursor-pointer"
                      >
                        Cancelar Edição
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {isEditingDetalhes ? (
                      <button
                        onClick={handleSaveEditSimulado}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer inline-flex items-center space-x-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Salvar Alterações</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedSimuladoDetalhes(null)}
                        className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
                      >
                        Fechar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
