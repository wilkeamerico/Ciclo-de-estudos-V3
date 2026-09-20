import React, { useState, useMemo } from "react";
import { StudyState, Edital, Categoria, Disciplina } from "../types";
import { Trash2, Plus, Sparkles, Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Save, Palette, Check, X } from "lucide-react";
import { calcularSomaPontos, fileToBase64 } from "../utils/studyHelpers";

// Paleta fixa de 48 cores pré-selecionadas e harmoniosas para o usuário escolher com 1 clique
const PALETA_48_CORES = [
  // Vermelhos & Rosas (6)
  "#ef4444", "#dc2626", "#b91c1c", "#f43f5e", "#e11d48", "#be123c",
  // Rosas & Roxos (6)
  "#ec4899", "#db2777", "#a855f7", "#9333ea", "#7e22ce", "#8b5cf6",
  // Índigos & Azuis (6)
  "#6366f1", "#4f46e5", "#3730a3", "#3b82f6", "#2563eb", "#1d4ed8",
  // Azuis Claros & Cianos (6)
  "#0284c7", "#0369a1", "#06b6d4", "#0891b2", "#0e7490", "#008080",
  // Teals & Esmeraldas (6)
  "#14b8a6", "#0d9488", "#10b981", "#059669", "#047857", "#22c55e",
  // Verdes & Limões (6)
  "#16a34a", "#15803d", "#84cc16", "#65a30d", "#4d7c0f", "#854d0e",
  // Amarelos & Âmbares (6)
  "#eab308", "#ca8a04", "#a16207", "#f59e0b", "#d97706", "#b45309",
  // Laranjas, Marrons & Neutros (6)
  "#f97316", "#ea580c", "#c2410c", "#9a3412", "#64748b", "#334155"
];

interface EditalViewProps {
  state: StudyState;
  updateState: (newState: StudyState) => void;
  darkMode: boolean;
}

type ScanStatus = "INICIAR" | "EM ANDAMENTO" | "CONCLUIDO";

// Helper to ensure every category, discipline and topic has a unique id
const ensureEditalIds = (raw: Edital): Edital => {
  if (!raw) return raw;
  return {
    ...raw,
    categorias: (raw.categorias || []).map((cat, cIdx) => ({
      ...cat,
      id: cat.id || `cat_gen_${cIdx}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      disciplinas: (cat.disciplinas || []).map((disc, dIdx) => ({
        ...disc,
        id: disc.id || `disc_gen_${cIdx}_${dIdx}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        assuntos: (disc.assuntos || []).map((ass, aIdx) => ({
          ...ass,
          id: ass.id || `ass_gen_${cIdx}_${dIdx}_${aIdx}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        }))
      }))
    }))
  };
};

export default function EditalView({ state, updateState, darkMode }: EditalViewProps) {
  const { edital } = state;

  // Local copy of edital to allow user to make adjustments and click SALVAR
  const [localEdital, setLocalEdital] = useState<Edital>(() => ensureEditalIds(JSON.parse(JSON.stringify(edital))));
  const [activeSubTab, setActiveSubTab] = useState<"manual" | "ia">("manual");

  // IA Scan states
  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("INICIAR");
  const [scanError, setScanError] = useState<string | null>(null);
  const [cargoInput, setCargoInput] = useState(() => edital.cargo || "");
  const [openColorPickerTarget, setOpenColorPickerTarget] = useState<{
    catId: string;
    discId: string;
    discName: string;
    currentCor: string;
  } | null>(null);

  // Sync local edital if global edital changes (like after a sync or reload)
  React.useEffect(() => {
    setLocalEdital(ensureEditalIds(JSON.parse(JSON.stringify(edital))));
    setCargoInput(edital.cargo || "");
  }, [edital]);

  const somaPontos = useMemo(() => calcularSomaPontos(localEdital), [localEdital]);

  const totalQuestoesGeral = useMemo(() => {
    return localEdital.categorias.reduce((acc, cat) => {
      return acc + cat.disciplinas.reduce((dAcc, d) => dAcc + (d.questoes || 0), 0);
    }, 0);
  }, [localEdital]);

  const totalCargaHorariaGeral = useMemo(() => {
    return localEdital.categorias.reduce((acc, cat) => {
      return acc + cat.disciplinas.reduce((dAcc, d) => dAcc + (d.horasTotais || 0), 0);
    }, 0);
  }, [localEdital]);

  const totalHorasPorCicloGeral = useMemo(() => {
    return localEdital.categorias.reduce((acc, cat) => {
      return acc + cat.disciplinas.reduce((dAcc, d) => dAcc + (d.horasPorCiclo || 0), 0);
    }, 0);
  }, [localEdital]);

  // --- SAVE LOCAL EDITAL MANUALLY ---
  const handleSaveEdital = () => {
    updateState({
      ...state,
      edital: localEdital
    });
    alert("Estrutura do edital salva e sincronizada com sucesso!");
  };

  // --- ADD / EXCLUDE DISCIPLINE OR KNOWLEDGE AREA ---
  const handleAddArea = () => {
    const novaArea: Categoria = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nome: "NOVA ÁREA DE CONHECIMENTO",
      disciplinas: []
    };
    setLocalEdital((prev) => ({
      ...prev,
      categorias: [...prev.categorias, novaArea]
    }));
  };

  const handleDeleteArea = (catId: string) => {
    if (confirm("Deseja realmente excluir toda esta Área de Conhecimento e suas matérias?")) {
      setLocalEdital((prev) => ({
        ...prev,
        categorias: prev.categorias.filter((cat) => cat.id !== catId)
      }));
    }
  };

  const handleAddDisciplina = (catId: string) => {
    const cores = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#f97316", "#06b6d4"];
    const randomCor = cores[Math.floor(Math.random() * cores.length)];

    const novaDisc: Disciplina = {
      id: `disc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      nome: "Nova Disciplina",
      questoes: 10,
      peso: 1,
      cor: randomCor,
      horasTotais: 15,
      horasPorCiclo: 1.5,
      assuntos: []
    };

    setLocalEdital((prev) => ({
      ...prev,
      categorias: prev.categorias.map((cat) => {
        if (cat.id === catId) {
          return {
            ...cat,
            disciplinas: [...cat.disciplinas, novaDisc]
          };
        }
        return cat;
      })
    }));
  };

  const handleDeleteDisciplina = (catId: string, discId: string) => {
    setLocalEdital((prev) => ({
      ...prev,
      categorias: prev.categorias.map((cat) => {
        if (cat.id === catId) {
          return {
            ...cat,
            disciplinas: cat.disciplinas.filter((d) => d.id !== discId)
          };
        }
        return cat;
      })
    }));
  };

  const handleUpdateDisciplinaField = (
    catId: string,
    discId: string,
    field: "nome" | "questoes" | "peso" | "cor" | "horasTotais" | "horasPorCiclo",
    val: any
  ) => {
    setLocalEdital((prev) => ({
      ...prev,
      categorias: prev.categorias.map((cat) => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          disciplinas: cat.disciplinas.map((d) => {
            if (d.id !== discId) return d;
            return {
              ...d,
              [field]: val
            };
          })
        };
      })
    }));
  };

  // --- IA EDITAL SCANNING HANDLER ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert("O arquivo excede o limite de 10MB especificado.");
        return;
      }
      setSelectedFile(file);
      setScanError(null);
    }
  };

  const handleIAStartScan = async () => {
    if (!pastedText.trim() && !selectedFile) {
      setScanError("Insira um texto ou anexe um arquivo PDF de até 10MB para escanear.");
      return;
    }

    setScanStatus("EM ANDAMENTO");
    setScanError(null);

    try {
      let pdfBase64 = undefined;
      let pdfMimeType = undefined;

      if (selectedFile) {
        pdfBase64 = await fileToBase64(selectedFile);
        pdfMimeType = selectedFile.type;
      }

      const response = await fetch("/api/scan-edital", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: pastedText,
          pdfBase64,
          pdfMimeType,
          cargoDesejado: cargoInput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao escanear o edital.");
      }

      const parsedResult = await response.json();

      // Transform result from API schema to app state structure
      const novaCategorias: Categoria[] = parsedResult.categorias.map((cat: any, cIdx: number) => {
        return {
          id: `cat_ia_${Date.now()}_${cIdx}`,
          nome: cat.nome.toUpperCase(),
          disciplinas: cat.disciplinas.map((disc: any, dIdx: number) => {
            const cores = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#f97316", "#06b6d4"];
            const randomCor = cores[(cIdx + dIdx) % cores.length];

            return {
              id: `disc_ia_${Date.now()}_${cIdx}_${dIdx}`,
              nome: disc.nome,
              questoes: parseInt(disc.questoes) || 10,
              peso: parseFloat(disc.peso) || 1,
              cor: randomCor,
              horasPorCiclo: 1.5,
              assuntos: disc.assuntos.map((assName: string, aIdx: number) => {
                const topicNum = String(aIdx + 1).padStart(2, "0");
                return {
                  id: `ass_ia_${Date.now()}_${cIdx}_${dIdx}_${aIdx}`,
                  nome: `${topicNum} - ${assName}`,
                  registros: []
                };
              })
            };
          })
        };
      });

      const parsedEdital: Edital = {
        banca: parsedResult.banca || localEdital.banca || "Indefinida",
        orgao: parsedResult.orgao || localEdital.orgao || "Indefinido",
        cargo: parsedResult.cargo || localEdital.cargo || "Não especificado",
        categorias: novaCategorias,
        discursivaInfo: parsedResult.discursivaInfo || {
          hasDiscursiva: false,
          detalhes: "",
          criteriosAvaliacao: ""
        },
        resumoExecutivo: parsedResult.resumoExecutivo || localEdital.resumoExecutivo
      };

      setLocalEdital(parsedEdital);
      
      // Sincroniza diretamente
      updateState({
        ...state,
        edital: parsedEdital
      });

      setScanStatus("CONCLUIDO");
      setActiveSubTab("manual"); // Volta para o edital manual para salvar
      alert(`Edital do órgão ${parsedEdital.orgao} escaneado com sucesso!`);
    } catch (error: any) {
      console.error(error);
      setScanStatus("INICIAR");
      const isFailedToFetch = error?.message?.includes("Failed to fetch") || error?.toString()?.includes("Failed to fetch");
      setScanError(isFailedToFetch ? "Erro de conexão ao enviar dados para a IA. Se estiver usando um PDF muito grande, tente colar o texto diretamente ou anexar um PDF menor." : (error.message || "Houve um erro de comunicação com o servidor."));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* SUB MENU GUIA EDITAL */}
      <div className="flex space-x-2 border-b border-gray-100/10 pb-1">
        <button
          onClick={() => setActiveSubTab("manual")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === "manual"
              ? darkMode
                ? "bg-[#16223f] text-white border-b-2 border-blue-500"
                : "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
              : "text-gray-400 hover:text-gray-200"
          }`}
          id="tab-manual"
        >
          <FileText className="w-4 h-4" />
          <span>Estrutura do Edital (Manual)</span>
        </button>

        <button
          onClick={() => setActiveSubTab("ia")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === "ia"
              ? darkMode
                ? "bg-[#16223f] text-white border-b-2 border-blue-500"
                : "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
              : "text-gray-400 hover:text-gray-200"
          }`}
          id="tab-ia"
        >
          <Sparkles className="w-4 h-4 text-yellow-500" />
          <span>Escanear Edital com IA</span>
        </button>
      </div>

      {activeSubTab === "manual" ? (
        <div className="space-y-6">
          {/* SOMA GERAL E INFO PRINCIPAL */}
          <div className={`p-5 rounded-2xl border transition-colors ${
            darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
          }`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-gray-100/10">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-extrabold tracking-tight text-blue-500">
                    EDITAL ATUAL: {(localEdital.orgao || "").toUpperCase()}
                  </span>
                </div>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
                  Banca: <strong>{localEdital.banca}</strong> | Cargo: <strong>{localEdital.cargo}</strong>
                </p>
              </div>

              {/* Botão de Adicionar Nova Área */}
              <button
                onClick={handleAddArea}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Área de Conhecimento</span>
              </button>
            </div>

            {/* Barra Consolidada da Soma Geral */}
            <div className={`p-4 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-4 ${
              darkMode ? "bg-[#111e3b]/80 border-[#1e2d4d]" : "bg-gray-50/80 border-gray-200"
            }`}>
              <div className="flex flex-col items-center sm:items-start">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  TOTAL DE QUESTÕES
                </span>
                <span className="text-xl font-black text-blue-500 mt-0.5">
                  {totalQuestoesGeral} Qs
                </span>
              </div>

              <div className="flex flex-col items-center sm:items-start border-l border-gray-200 dark:border-gray-800 pl-4">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  PONTUAÇÃO TOTAL
                </span>
                <span className="text-xl font-black text-amber-500 mt-0.5">
                  {somaPontos} Pts
                </span>
              </div>

              <div className="flex flex-col items-center sm:items-start border-l border-gray-200 dark:border-gray-800 pl-4">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  CARGA HORÁRIA TOTAL
                </span>
                <span className="text-xl font-black text-emerald-500 mt-0.5">
                  {totalCargaHorariaGeral}h
                </span>
              </div>

              <div className="flex flex-col items-center sm:items-start border-l border-gray-200 dark:border-gray-800 pl-4">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  HORAS POR CICLO
                </span>
                <span className="text-xl font-black text-purple-500 mt-0.5">
                  {totalHorasPorCicloGeral.toFixed(1)}h
                </span>
              </div>
            </div>
          </div>

          {/* LISTAGEM DE CATEGORIAS / BLOCOS */}
          {localEdital.categorias.map((cat, cIdx) => {
            const totalQuestoesCat = cat.disciplinas.reduce((acc, d) => acc + (d.questoes || 0), 0);
            const pontosCat = cat.disciplinas.reduce((acc, d) => acc + ((d.questoes || 0) * (d.peso || 1)), 0);
            const cargaHorariaCat = cat.disciplinas.reduce((acc, d) => acc + (d.horasTotais || 0), 0);
            const pctCat = somaPontos > 0 ? ((pontosCat / somaPontos) * 100).toFixed(1) : "0.0";
            const categoryKey = cat.id || `category_${cIdx}_${cat.nome || "area"}`;

            return (
              <div
                key={categoryKey}
                className={`p-6 rounded-2xl border transition-colors space-y-4 ${
                  darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
                }`}
              >
                <div className="flex justify-between items-center border-b border-gray-100/10 pb-3">
                  <input
                    type="text"
                    value={cat.nome}
                    onChange={(e) => {
                      setLocalEdital((prev) => ({
                        ...prev,
                        categorias: prev.categorias.map((c) => {
                          if (c.id === cat.id) {
                            return { ...c, nome: e.target.value.toUpperCase() };
                          }
                          return c;
                        })
                      }));
                    }}
                    className={`text-sm font-extrabold uppercase tracking-widest outline-none bg-transparent ${
                      darkMode ? "text-white focus:border-b focus:border-blue-500" : "text-gray-800 focus:border-b focus:border-blue-600"
                    }`}
                  />

                  <button
                    onClick={() => handleDeleteArea(cat.id)}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                      darkMode
                        ? "border-[#2d3f66] bg-red-950/20 hover:bg-red-950/45 text-red-400"
                        : "border-red-200 bg-red-50 hover:bg-red-100 text-red-600"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Área</span>
                  </button>
                </div>

                {/* TABELA DE MATÉRIAS DENTRO DO BLOCO */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className={`text-[10px] uppercase font-bold tracking-wider border-b border-gray-100/10 ${
                        darkMode ? "text-gray-400" : "text-gray-500"
                      }`}>
                        <th className="py-2.5 px-3">Cor & Disciplina</th>
                        <th className="py-2.5 px-3 text-center">Questões</th>
                        <th className="py-2.5 px-3 text-center">Peso</th>
                        <th className="py-2.5 px-3 text-center">Carga Horária (h)</th>
                        <th className="py-2.5 px-3 text-center">Horas / Ciclo</th>
                        <th className="py-2.5 px-3 text-center">Total (%)</th>
                        <th className="py-2.5 px-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.disciplinas.map((disc, dIdx) => {
                        const pontosDisc = (disc.questoes || 0) * (disc.peso || 1);
                        const totalPerc = somaPontos > 0 ? ((pontosDisc / somaPontos) * 100).toFixed(1) : "0.0";
                        const currentCor = disc.cor || "#3b82f6";
                        const currentQuestoes = disc.questoes || 0;
                        const currentPeso = disc.peso || 1;
                        const currentHorasTotais = disc.horasTotais !== undefined ? disc.horasTotais : 10;
                        const currentHorasPorCiclo = disc.horasPorCiclo !== undefined ? disc.horasPorCiclo : 1.5;
                        const discKey = disc.id || `disc_${categoryKey}_${dIdx}_${disc.nome || "mat"}`;

                        return (
                          <tr
                            key={discKey}
                            className={`border-b border-gray-100/5 transition-colors ${
                              darkMode ? "hover:bg-[#152345]/35" : "hover:bg-gray-50"
                            }`}
                          >
                            {/* COLUNA 1: COR INDEPENDENTE & NOME */}
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-2.5">
                                <button
                                  type="button"
                                  onClick={() => setOpenColorPickerTarget({
                                    catId: cat.id,
                                    discId: disc.id,
                                    discName: disc.nome,
                                    currentCor: currentCor
                                  })}
                                  className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-700 shadow-md transition-transform hover:scale-115 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                                  style={{ backgroundColor: currentCor }}
                                  title={`Alterar cor independente de "${disc.nome}"`}
                                >
                                  <Palette className="w-3.5 h-3.5 text-white drop-shadow-sm opacity-90" />
                                </button>

                                <input
                                  type="text"
                                  value={disc.nome}
                                  onChange={(e) =>
                                    handleUpdateDisciplinaField(cat.id, disc.id, "nome", e.target.value)
                                  }
                                  className={`font-semibold text-xs py-1 px-2 rounded bg-transparent border-none outline-none focus:bg-gray-100/10 focus:ring-1 focus:ring-blue-500 w-full ${
                                    darkMode ? "text-white" : "text-gray-800"
                                  }`}
                                />
                              </div>
                            </td>

                            {/* COLUNA 2: QUESTÕES (INDEPENDENTE) */}
                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateDisciplinaField(
                                      cat.id,
                                      disc.id,
                                      "questoes",
                                      Math.max(1, currentQuestoes - 1)
                                    )
                                  }
                                  className="w-6 h-6 rounded flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold transition-colors cursor-pointer"
                                  title="Diminuir questões"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={currentQuestoes}
                                  onChange={(e) =>
                                    handleUpdateDisciplinaField(
                                      cat.id,
                                      disc.id,
                                      "questoes",
                                      Math.max(1, parseInt(e.target.value) || 0)
                                    )
                                  }
                                  className={`w-12 text-center py-1 rounded border text-xs outline-none font-bold ${
                                    darkMode
                                      ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                                      : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateDisciplinaField(
                                      cat.id,
                                      disc.id,
                                      "questoes",
                                      currentQuestoes + 1
                                    )
                                  }
                                  className="w-6 h-6 rounded flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold transition-colors cursor-pointer"
                                  title="Aumentar questões"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* COLUNA 3: PESO (INDEPENDENTE) */}
                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateDisciplinaField(
                                      cat.id,
                                      disc.id,
                                      "peso",
                                      Math.max(0.5, parseFloat((currentPeso - 0.5).toFixed(1)))
                                    )
                                  }
                                  className="w-6 h-6 rounded flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold transition-colors cursor-pointer"
                                  title="Diminuir peso"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0.1"
                                  value={currentPeso}
                                  onChange={(e) =>
                                    handleUpdateDisciplinaField(
                                      cat.id,
                                      disc.id,
                                      "peso",
                                      Math.max(0.1, parseFloat(e.target.value) || 0)
                                    )
                                  }
                                  className={`w-12 text-center py-1 rounded border text-xs outline-none font-bold ${
                                    darkMode
                                      ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                                      : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateDisciplinaField(
                                      cat.id,
                                      disc.id,
                                      "peso",
                                      parseFloat((currentPeso + 0.5).toFixed(1))
                                    )
                                  }
                                  className="w-6 h-6 rounded flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold transition-colors cursor-pointer"
                                  title="Aumentar peso"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* COLUNA 4: CARGA HORÁRIA TOTAL (INDEPENDENTE) */}
                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateDisciplinaField(
                                      cat.id,
                                      disc.id,
                                      "horasTotais",
                                      Math.max(1, currentHorasTotais - 1)
                                    )
                                  }
                                  className="w-6 h-6 rounded flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold transition-colors cursor-pointer"
                                  title="Diminuir carga horária"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  step="1"
                                  min="1"
                                  value={currentHorasTotais}
                                  onChange={(e) =>
                                    handleUpdateDisciplinaField(
                                      cat.id,
                                      disc.id,
                                      "horasTotais",
                                      Math.max(1, parseFloat(e.target.value) || 0)
                                    )
                                  }
                                  className={`w-14 text-center py-1 rounded border text-xs outline-none font-bold ${
                                    darkMode
                                      ? "bg-[#16223f] border-[#25365e] text-emerald-400 focus:border-emerald-500"
                                      : "bg-white border-gray-200 text-emerald-700 focus:border-emerald-500"
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateDisciplinaField(
                                      cat.id,
                                      disc.id,
                                      "horasTotais",
                                      currentHorasTotais + 1
                                    )
                                  }
                                  className="w-6 h-6 rounded flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold transition-colors cursor-pointer"
                                  title="Aumentar carga horária"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* COLUNA 5: HORAS POR CICLO (INDEPENDENTE) */}
                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateDisciplinaField(
                                      cat.id,
                                      disc.id,
                                      "horasPorCiclo",
                                      Math.max(0.5, parseFloat((currentHorasPorCiclo - 0.5).toFixed(1)))
                                    )
                                  }
                                  className="w-6 h-6 rounded flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold transition-colors cursor-pointer"
                                  title="Diminuir horas por ciclo"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0.5"
                                  max="8"
                                  value={currentHorasPorCiclo}
                                  onChange={(e) =>
                                    handleUpdateDisciplinaField(
                                      cat.id,
                                      disc.id,
                                      "horasPorCiclo",
                                      Math.max(0.5, parseFloat(e.target.value) || 0)
                                    )
                                  }
                                  className={`w-12 text-center py-1 rounded border text-xs outline-none font-bold ${
                                    darkMode
                                      ? "bg-[#16223f] border-[#25365e] text-purple-400 focus:border-purple-500"
                                      : "bg-white border-gray-200 text-purple-700 focus:border-purple-500"
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateDisciplinaField(
                                      cat.id,
                                      disc.id,
                                      "horasPorCiclo",
                                      parseFloat((currentHorasPorCiclo + 0.5).toFixed(1))
                                    )
                                  }
                                  className="w-6 h-6 rounded flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold transition-colors cursor-pointer"
                                  title="Aumentar horas por ciclo"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* COLUNA 6: TOTAL (%) */}
                            <td className="py-3 px-3 text-center text-xs font-extrabold text-blue-500">
                              {totalPerc}%
                            </td>

                            {/* COLUNA 7: EXCLUIR */}
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleDeleteDisciplina(cat.id, disc.id)}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  darkMode
                                    ? "border-[#2d3f66] hover:bg-red-950/45 text-gray-400 hover:text-red-400"
                                    : "border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-600"
                                }`}
                                title="Remover disciplina"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {cat.disciplinas.length === 0 && (
                        <tr>
                          <td colSpan={7} className={`text-center py-6 text-xs italic ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Nenhuma disciplina cadastrada nesta área de conhecimento.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* BARRA CONTABILIZANDO TOTAL DE QUESTÕES, PONTUAÇÃO, CARGA HORÁRIA E % DA ÁREA */}
                <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row justify-between items-center gap-3 ${
                  darkMode ? "bg-[#111e3b]/80 border-[#1e2d4d]" : "bg-blue-50/60 border-blue-100"
                }`}>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs">
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-bold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Total de Questões ({cat.nome}):
                      </span>
                      <span className={`font-black ${darkMode ? "text-white" : "text-gray-900"}`}>
                        {totalQuestoesCat} questões
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 border-l border-gray-300 dark:border-gray-700 pl-3 sm:pl-6">
                      <span className={`font-bold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Pontuação Total:
                      </span>
                      <span className="font-extrabold text-amber-500">
                        {pontosCat} pts
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 border-l border-gray-300 dark:border-gray-700 pl-3 sm:pl-6">
                      <span className={`font-bold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Carga Horária:
                      </span>
                      <span className="font-extrabold text-emerald-500">
                        {cargaHorariaCat}h
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 border-l border-gray-300 dark:border-gray-700 pl-3 sm:pl-6">
                      <span className={`font-bold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Peso no Edital:
                      </span>
                      <span className="font-extrabold text-blue-500">
                        {pctCat}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full sm:w-44 bg-gray-200 dark:bg-gray-700/80 h-2 rounded-full overflow-hidden shrink-0">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, parseFloat(pctCat))}%` }}
                    />
                  </div>
                </div>

                {/* Botão: Nova Disciplina */}
                <button
                  onClick={() => handleAddDisciplina(cat.id)}
                  className={`w-full py-2 border border-dashed rounded-xl flex items-center justify-center space-x-1 text-xs font-bold transition-colors cursor-pointer ${
                    darkMode
                      ? "border-[#25365e] text-gray-400 hover:text-white hover:bg-[#16223f]/40"
                      : "border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Disciplina</span>
                </button>
              </div>
            );
          })}

          {/* ÁREA DE EXCLUSÃO (TRASH BIN) / AÇÕES INFERIORES */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center pt-4">
            <button
              onClick={handleAddArea}
              className={`w-full md:w-auto py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider border flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                darkMode
                  ? "bg-[#16223f] border-[#2d3f66] text-blue-400 hover:bg-[#1f2d50]"
                  : "bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Nova Área do Conhecimento</span>
            </button>

            {/* BOTÃO SALVAR INTEGRAL */}
            <button
              onClick={handleSaveEdital}
              className="w-full md:w-auto py-3.5 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
              id="btn-salvar-edital"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Edital</span>
            </button>
          </div>
        </div>
      ) : (
        /* IA EDITAL SCANNING TAB */
        <div className={`p-6 rounded-2xl border transition-colors space-y-6 ${
          darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
        }`}>
          <div>
            <h3 className={`text-base font-bold flex items-center gap-1.5 ${darkMode ? "text-white" : "text-gray-900"}`}>
              <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500/20" />
              Escaneador de Edital de Alto Rendimento com Inteligência Artificial
            </h3>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
              Anexe um arquivo em formato PDF (de até 10MB) ou cole o texto do edital para escanear e preencher as matérias automaticamente.
            </p>
          </div>

          {/* INPUT CARGO DESEJADO */}
          <div className="space-y-1.5 p-4 rounded-xl border border-dashed border-blue-500/30 bg-blue-500/5">
            <label className={`block text-xs font-bold uppercase tracking-wider ${darkMode ? "text-blue-400" : "text-blue-700"}`}>
              Cargo Desejado para Escaneamento Específico
            </label>
            <input
              type="text"
              placeholder="Ex: Engenheiro Mecânico, Analista de Tecnologia da Informação..."
              value={cargoInput}
              onChange={(e) => setCargoInput(e.target.value)}
              className={`w-full p-2.5 rounded-lg border outline-none text-xs transition-all ${
                darkMode
                  ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                  : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
              }`}
            />
            <p className={`text-[10px] ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Preenchendo este campo, o motor de Inteligência Artificial filtrará as matérias do edital focando estritamente no cargo desejado informado.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* INPUT TEXT AREA */}
            <div className="space-y-2">
              <label className={`block text-xs font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Opção 1: Colar Texto do Edital / Programa Programático
              </label>
              <textarea
                placeholder="Copie e cole aqui os assuntos programáticos do seu concurso ou a seção de conhecimentos do edital..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={10}
                className={`w-full p-4 rounded-xl border outline-none text-xs leading-relaxed font-mono transition-colors ${
                  darkMode
                    ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                    : "bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500 focus:bg-white"
                }`}
              />
            </div>

            {/* FILE UPLOADER */}
            <div className="space-y-2 flex flex-col justify-between">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Opção 2: Anexar Edital em PDF (Até 10MB)
                </label>
                
                <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${
                  selectedFile
                    ? "border-emerald-500 bg-emerald-500/5"
                    : darkMode
                    ? "border-[#25365e] hover:border-blue-500 bg-[#16223f]/40"
                    : "border-gray-200 hover:border-blue-500 bg-gray-50"
                }`}>
                  <Upload className={`w-8 h-8 mb-3 ${selectedFile ? "text-emerald-500" : "text-gray-400"}`} />
                  
                  {selectedFile ? (
                    <div>
                      <span className={`block text-xs font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                        {selectedFile.name}
                      </span>
                      <span className="block text-[10px] text-emerald-500 font-semibold mt-0.5">
                        Arquivo carregado ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className={`block text-xs font-bold ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                        Arraste seu PDF ou clique para selecionar
                      </span>
                      <span className={`block text-[10px] ${darkMode ? "text-gray-500" : "text-gray-400"} mt-0.5`}>
                        Apenas arquivos PDF até 10MB são permitidos
                      </span>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    style={{ display: "none" }}
                    id="file-upload-input"
                  />
                  <label htmlFor="file-upload-input" className="mt-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg cursor-pointer select-none">
                    Procurar Arquivo
                  </label>
                </div>
              </div>

              {/* STATUS DO ESCANEAMENTO */}
              <div className={`p-4 rounded-xl border flex justify-between items-center ${
                scanStatus === "EM ANDAMENTO"
                  ? "bg-amber-500/10 border-amber-500/20"
                  : scanStatus === "CONCLUIDO"
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : darkMode ? "bg-[#16223f] border-[#25365e]" : "bg-gray-100 border-gray-200"
              }`}>
                <div>
                  <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Status do Escaneamento
                  </span>
                  <span className={`text-xs font-extrabold ${
                    scanStatus === "EM ANDAMENTO"
                      ? "text-amber-500"
                      : scanStatus === "CONCLUIDO"
                      ? "text-emerald-500"
                      : darkMode ? "text-white" : "text-gray-800"
                  }`}>
                    {scanStatus}
                  </span>
                </div>

                {scanStatus === "EM ANDAMENTO" && (
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
                )}
                {scanStatus === "CONCLUIDO" && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                )}
              </div>

            </div>

          </div>

          {scanError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* INICIAR ESCANEAMENTO COM IA */}
          <div className="flex justify-end pt-2 border-t border-gray-100/10">
            <button
              onClick={handleIAStartScan}
              disabled={scanStatus === "EM ANDAMENTO"}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Escanear com IA</span>
            </button>
          </div>

        </div>
      )}

      {/* MODAL FIXO DA PALETA DE 48 CORES (POSICIONADO NO CENTRO DA TELA, NUNCA CORTADO) */}
      {openColorPickerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`relative w-full max-w-sm p-5 rounded-3xl border shadow-2xl space-y-4 ${
            darkMode ? "bg-[#0b1329] border-[#1e2d4d] text-white" : "bg-white border-gray-200 text-gray-900"
          }`}>
            <div className="flex items-center justify-between border-b border-gray-100/10 pb-3">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                  <Palette className="w-4 h-4" /> Paleta de Cores (48 Opções)
                </h3>
                <p className={`text-xs font-bold ${darkMode ? "text-gray-300" : "text-gray-700"} mt-0.5`}>
                  {openColorPickerTarget.discName}
                </p>
              </div>
              <button
                onClick={() => setOpenColorPickerTarget(null)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between space-x-2 text-xs p-2 rounded-xl bg-gray-500/10 border border-gray-100/10">
              <div className="flex items-center space-x-2">
                <span className={`font-semibold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Cor Selecionada:</span>
                <span
                  className="w-5 h-5 rounded-full border border-gray-400 shadow-sm shrink-0"
                  style={{ backgroundColor: openColorPickerTarget.currentCor }}
                />
                <span className="font-mono text-[11px] font-bold text-blue-400">{openColorPickerTarget.currentCor}</span>
              </div>

              {/* Seletor de cor customizada */}
              <label className="flex items-center space-x-1.5 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-[11px] font-bold cursor-pointer border border-blue-500/30 transition-colors">
                <span>Personalizada</span>
                <input
                  type="color"
                  value={openColorPickerTarget.currentCor}
                  onChange={(e) => {
                    const newHex = e.target.value;
                    handleUpdateDisciplinaField(openColorPickerTarget.catId, openColorPickerTarget.discId, "cor", newHex);
                    setOpenColorPickerTarget({
                      ...openColorPickerTarget,
                      currentCor: newHex
                    });
                  }}
                  className="w-4 h-4 opacity-0 absolute cursor-pointer"
                />
              </label>
            </div>

            {/* Grid de 48 Cores */}
            <div className="space-y-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Selecione uma cor da paleta:
              </span>
              <div className="grid grid-cols-8 gap-2 p-2.5 bg-black/10 dark:bg-black/30 rounded-2xl border border-gray-100/10">
                {PALETA_48_CORES.map((corHex, pIdx) => {
                  const isSelected = openColorPickerTarget.currentCor.toLowerCase() === corHex.toLowerCase();
                  return (
                    <button
                      key={`color_choice_${corHex}_${pIdx}`}
                      type="button"
                      onClick={() => {
                        handleUpdateDisciplinaField(openColorPickerTarget.catId, openColorPickerTarget.discId, "cor", corHex);
                        setOpenColorPickerTarget(null);
                      }}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all cursor-pointer flex items-center justify-center hover:scale-125 shadow-md border ${
                        isSelected ? "ring-2 ring-blue-500 ring-offset-2 scale-110 border-white z-10" : "border-black/20"
                      }`}
                      style={{ backgroundColor: corHex }}
                      title={corHex}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-gray-100/10">
              <span className="text-[10px] text-gray-400 italic">
                A cor é aplicada exclusivamente a esta matéria.
              </span>
              <button
                onClick={() => setOpenColorPickerTarget(null)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
