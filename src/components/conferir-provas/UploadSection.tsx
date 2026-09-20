import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  FileCheck,
  ClipboardList,
  Eye,
  Settings2,
  FolderOpen
} from 'lucide-react';
import { ExamFile, CicloEstudo } from '../../types';

interface UploadSectionProps {
  examTitle: string;
  setExamTitle: (t: string) => void;
  totalQuestions: number;
  setTotalQuestions: (n: number) => void;
  optionsPerQuestion: string[];
  setOptionsPerQuestion: (opts: string[]) => void;
  candidateAnswers: Record<number, string>;
  setCandidateAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  examPaper: ExamFile | null;
  setExamPaper: (f: ExamFile | null) => void;
  syllabus: ExamFile | null;
  setSyllabus: (f: ExamFile | null) => void;
  officialKeyDoc: ExamFile | null;
  setOfficialKeyDoc: (f: ExamFile | null) => void;
  isAnalyzing: boolean;
  analyzingStep: string;
  onAnalyze: () => void;
  darkMode?: boolean;
  ciclos?: CicloEstudo[];
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  examTitle,
  setExamTitle,
  totalQuestions,
  setTotalQuestions,
  optionsPerQuestion,
  setOptionsPerQuestion,
  candidateAnswers,
  setCandidateAnswers,
  examPaper,
  setExamPaper,
  syllabus,
  setSyllabus,
  officialKeyDoc,
  setOfficialKeyDoc,
  isAnalyzing,
  analyzingStep,
  onAnalyze,
  darkMode = false,
  ciclos = [],
}) => {
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [activePreviewDoc, setActivePreviewDoc] = useState<{ title: string; name: string; text: string } | null>(null);

  const examInputRef = useRef<HTMLInputElement>(null);
  const syllabusInputRef = useRef<HTMLInputElement>(null);
  const officialKeyInputRef = useRef<HTMLInputElement>(null);

  // File to base64 & text extraction helper
  const handleFileUpload = (
    file: File,
    setter: (doc: ExamFile | null) => void
  ) => {
    const reader = new FileReader();
    const isText = file.type.includes('text') || file.name.endsWith('.txt');

    if (isText) {
      reader.onload = (e) => {
        setter({
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          mimeType: 'text/plain',
          text: e.target?.result as string,
        });
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        const resultStr = e.target?.result as string;
        setter({
          name: file.name,
          size: file.size,
          type: file.type || 'application/pdf',
          mimeType: file.type || 'application/pdf',
          data: resultStr,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag & drop handlers
  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    setter: (doc: ExamFile | null) => void
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0], setter);
    }
  };

  // Answer selection on bubble sheet
  const handleSelectAnswer = (qNumber: number, option: string) => {
    setCandidateAnswers((prev) => {
      if (prev[qNumber] === option) {
        const updated = { ...prev };
        delete updated[qNumber];
        return updated;
      }
      return { ...prev, [qNumber]: option };
    });
  };

  // Batch paste parser
  const handleApplyPastedAnswers = () => {
    if (!pasteText.trim()) return;
    const newAnswers: Record<number, string> = { ...candidateAnswers };

    // Format 1: "1A 2B 3C" or "1: A\n2: C"
    const pairRegex = /(\d+)\s*[:\-\.]?\s*([a-eA-ECcEe])/gi;
    let match: RegExpExecArray | null;
    let foundPairs = false;

    while ((match = pairRegex.exec(pasteText)) !== null) {
      foundPairs = true;
      const qNum = parseInt(match[1], 10);
      const opt = match[2].toUpperCase();
      if (qNum >= 1 && qNum <= totalQuestions) {
        newAnswers[qNum] = opt;
      }
    }

    // Format 2: Continuous sequence like "ABCDEABC..."
    if (!foundPairs) {
      const lettersOnly = pasteText.replace(/[^a-eA-ECcEe]/gi, '').toUpperCase();
      for (let i = 0; i < lettersOnly.length && i < totalQuestions; i++) {
        newAnswers[i + 1] = lettersOnly[i];
      }
    }

    setCandidateAnswers(newAnswers);
    setPasteModalOpen(false);
    setPasteText('');
  };

  const answeredCount = Object.keys(candidateAnswers).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  // Pre-fill from study cycle
  const handleSelectCicloToPreFill = (ciclo: CicloEstudo) => {
    if (!examTitle || examTitle === 'Simulado Geral') {
      setExamTitle(`${ciclo.orgao} - ${ciclo.cargoDesejado}`);
    }
    // Pre-fill edital text if available in ciclo state
    if (ciclo.state?.edital?.categorias && !syllabus) {
      const formattedSyllabus = ciclo.state.edital.categorias.map(cat => 
        `=== ${cat.nome} ===\n` + cat.disciplinas.map(d => 
          `• ${d.nome} (Peso: ${d.peso}x, Questões: ${d.questoes}):\n` + 
          d.assuntos.map(a => `   - ${a.nome}`).join('\n')
        ).join('\n\n')
      ).join('\n\n');

      setSyllabus({
        name: `Edital_${ciclo.orgao.replace(/\s+/g, '_')}.txt`,
        size: formattedSyllabus.length,
        type: 'text/plain',
        mimeType: 'text/plain',
        text: formattedSyllabus,
      });
    }
  };

  const cardBg = darkMode ? "bg-[#101d3b] border-[#1e2d4d]" : "bg-white border-slate-200";
  const innerBg = darkMode ? "bg-[#0b1329] border-[#1a2b4c]" : "bg-slate-50 border-slate-200";
  const textPrimary = darkMode ? "text-white" : "text-slate-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-slate-500";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fade-in">
      {/* Top Banner with Instructions */}
      <div className={`rounded-2xl border p-6 shadow-xs relative overflow-hidden ${
        darkMode ? "bg-gradient-to-r from-[#101d3b] to-[#15254d] border-[#1e2d4d]" : "bg-gradient-to-r from-indigo-50/90 to-blue-50/70 border-indigo-100"
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
              Mapeamento & Correção Inteligente
            </span>
            <h2 className={`text-xl font-bold tracking-tight ${textPrimary}`}>
              Análise de Provas e Gabarito com IA
            </h2>
            <p className={`text-xs leading-relaxed ${darkMode ? "text-gray-300" : "text-slate-600"}`}>
              Anexe o <strong>Caderno de Provas</strong>, <strong>Edital</strong> e <strong>Gabarito Oficial</strong> (PDF, Imagem ou Texto). Preencha as respostas assinaladas pelo candidato no cartão-resposta abaixo para obter cálculo de notas com pesos, acurácia por disciplina, radar de equilíbrio, diagnóstico pedagógico, recurso contra banca e plano de estudos personalizado.
            </p>
          </div>

          {/* Quick Pre-fill from existing Ciclos if available */}
          {ciclos && ciclos.length > 0 && (
            <div className={`p-3 rounded-xl border text-xs shrink-0 space-y-1.5 ${innerBg}`}>
              <div className="flex items-center space-x-1.5 font-bold text-indigo-400">
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Puxar dados de um Concurso:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-w-xs">
                {ciclos.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCicloToPreFill(c)}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition cursor-pointer"
                    title={`Puxar matérias e edital de ${c.orgao}`}
                  >
                    {c.orgao.length > 12 ? c.orgao.substring(0, 10) + '...' : c.orgao}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left Uploads & Settings (7 cols) + Right Bubble Sheet (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Exam Config & 3 Upload Slots */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Exam Setup Settings Box */}
          <div className={`rounded-2xl border p-5 shadow-xs space-y-4 ${cardBg}`}>
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100 dark:border-[#1e2d4d]">
              <Settings2 className="w-4 h-4 text-indigo-500" />
              <h3 className={`text-sm font-bold ${textPrimary}`}>
                Configurações da Prova & Simulado
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className={`text-xs font-semibold ${textSecondary}`}>
                  Nome / Título do Concurso ou Simulado
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="Ex: Petrobras - Ênfase 1: Operação • Simulado 01"
                  className={`w-full px-3.5 py-2 text-xs font-medium rounded-xl border outline-none transition ${
                    darkMode 
                      ? "bg-[#0b1329] border-[#1a2b4c] text-white focus:border-indigo-500" 
                      : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${textSecondary}`}>
                  Quantidade de Questões
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(parseInt(e.target.value, 10))}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border outline-none cursor-pointer ${
                      darkMode 
                        ? "bg-[#0b1329] border-[#1a2b4c] text-white focus:border-indigo-500" 
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-600"
                    }`}
                  >
                    {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120].map((num) => (
                      <option key={num} value={num}>
                        {num} Questões
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${textSecondary}`}>
                  Tipo de Alternativas
                </label>
                <select
                  value={optionsPerQuestion.join(',')}
                  onChange={(e) => setOptionsPerQuestion(e.target.value.split(','))}
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border outline-none cursor-pointer ${
                    darkMode 
                      ? "bg-[#0b1329] border-[#1a2b4c] text-white focus:border-indigo-500" 
                      : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-600"
                  }`}
                >
                  <option value="A,B,C,D,E">Múltipla Escolha (A, B, C, D, E)</option>
                  <option value="A,B,C,D">Múltipla Escolha (A, B, C, D)</option>
                  <option value="C,E">Certo / Errado Cebraspe (C, E)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3 Upload Dropzones */}
          <div className="space-y-4">
            
            {/* Slot 1: Caderno de Provas */}
            <div className={`rounded-2xl border p-4.5 shadow-xs space-y-3 transition ${
              examPaper 
                ? darkMode ? "bg-indigo-950/20 border-indigo-500/40" : "bg-indigo-50/40 border-indigo-200" 
                : cardBg
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    examPaper ? "bg-indigo-600 text-white" : darkMode ? "bg-[#162750] text-indigo-400" : "bg-indigo-100 text-indigo-600"
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${textPrimary}`}>
                      1. Caderno de Provas / Simulado
                    </h4>
                    <span className={`text-[11px] ${textSecondary}`}>
                      PDF, Imagens ou TXT com enunciados e alternativas
                    </span>
                  </div>
                </div>

                {examPaper && (
                  <div className="flex items-center space-x-1">
                    {examPaper.text && (
                      <button
                        type="button"
                        onClick={() => setActivePreviewDoc({ title: 'Caderno de Provas', name: examPaper.name, text: examPaper.text || '' })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#1a2b4c] transition"
                        title="Visualizar texto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExamPaper(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                      title="Remover arquivo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {examPaper ? (
                <div className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${innerBg}`}>
                  <div className="flex items-center space-x-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className={`font-semibold truncate ${textPrimary}`}>{examPaper.name}</span>
                  </div>
                  <span className={`text-[10px] shrink-0 ${textSecondary}`}>
                    {examPaper.size > 0 ? `${(examPaper.size / 1024).toFixed(0)} KB` : 'Texto anexado'}
                  </span>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, setExamPaper)}
                  onClick={() => examInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-1 ${
                    darkMode 
                      ? "border-[#1a2b4c] hover:border-indigo-500 hover:bg-[#0e1933]" 
                      : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20"
                  }`}
                >
                  <Upload className="w-5 h-5 text-indigo-400" />
                  <p className={`text-xs font-semibold ${textPrimary}`}>
                    Arraste ou clique para selecionar o Caderno
                  </p>
                  <span className={`text-[10px] ${textSecondary}`}>
                    Suporta PDF, PNG, JPG ou TXT (até 15MB)
                  </span>
                  <input
                    ref={examInputRef}
                    type="file"
                    accept=".pdf,image/*,.txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0], setExamPaper);
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Slot 2: Edital & Conteúdo Programático */}
            <div className={`rounded-2xl border p-4.5 shadow-xs space-y-3 transition ${
              syllabus 
                ? darkMode ? "bg-indigo-950/20 border-indigo-500/40" : "bg-indigo-50/40 border-indigo-200" 
                : cardBg
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    syllabus ? "bg-indigo-600 text-white" : darkMode ? "bg-[#162750] text-indigo-400" : "bg-indigo-100 text-indigo-600"
                  }`}>
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${textPrimary}`}>
                      2. Edital & Conteúdo Programático (Opcional / Recomendado)
                    </h4>
                    <span className={`text-[11px] ${textSecondary}`}>
                      Para extração automática de pesos, notas de corte e tópicos
                    </span>
                  </div>
                </div>

                {syllabus && (
                  <div className="flex items-center space-x-1">
                    {syllabus.text && (
                      <button
                        type="button"
                        onClick={() => setActivePreviewDoc({ title: 'Edital / Conteúdo', name: syllabus.name, text: syllabus.text || '' })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#1a2b4c] transition"
                        title="Visualizar texto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSyllabus(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                      title="Remover arquivo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {syllabus ? (
                <div className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${innerBg}`}>
                  <div className="flex items-center space-x-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className={`font-semibold truncate ${textPrimary}`}>{syllabus.name}</span>
                  </div>
                  <span className={`text-[10px] shrink-0 ${textSecondary}`}>
                    {syllabus.size > 0 ? `${(syllabus.size / 1024).toFixed(0)} KB` : 'Texto anexado'}
                  </span>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, setSyllabus)}
                  onClick={() => syllabusInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-1 ${
                    darkMode 
                      ? "border-[#1a2b4c] hover:border-indigo-500 hover:bg-[#0e1933]" 
                      : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20"
                  }`}
                >
                  <Upload className="w-5 h-5 text-indigo-400" />
                  <p className={`text-xs font-semibold ${textPrimary}`}>
                    Arraste ou selecione o Edital / Conteúdo
                  </p>
                  <span className={`text-[10px] ${textSecondary}`}>
                    Extração direta de disciplinas, pesos e regras de pontuação
                  </span>
                  <input
                    ref={syllabusInputRef}
                    type="file"
                    accept=".pdf,image/*,.txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0], setSyllabus);
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Slot 3: Gabarito Oficial */}
            <div className={`rounded-2xl border p-4.5 shadow-xs space-y-3 transition ${
              officialKeyDoc 
                ? darkMode ? "bg-indigo-950/20 border-indigo-500/40" : "bg-indigo-50/40 border-indigo-200" 
                : cardBg
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    officialKeyDoc ? "bg-indigo-600 text-white" : darkMode ? "bg-[#162750] text-indigo-400" : "bg-indigo-100 text-indigo-600"
                  }`}>
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${textPrimary}`}>
                      3. Gabarito Oficial da Banca
                    </h4>
                    <span className={`text-[11px] ${textSecondary}`}>
                      PDF ou Imagem do Gabarito Preliminar/Definitivo
                    </span>
                  </div>
                </div>

                {officialKeyDoc && (
                  <div className="flex items-center space-x-1">
                    {officialKeyDoc.text && (
                      <button
                        type="button"
                        onClick={() => setActivePreviewDoc({ title: 'Gabarito Oficial', name: officialKeyDoc.name, text: officialKeyDoc.text || '' })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#1a2b4c] transition"
                        title="Visualizar texto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setOfficialKeyDoc(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                      title="Remover arquivo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {officialKeyDoc ? (
                <div className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${innerBg}`}>
                  <div className="flex items-center space-x-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className={`font-semibold truncate ${textPrimary}`}>{officialKeyDoc.name}</span>
                  </div>
                  <span className={`text-[10px] shrink-0 ${textSecondary}`}>
                    {officialKeyDoc.size > 0 ? `${(officialKeyDoc.size / 1024).toFixed(0)} KB` : 'Texto anexado'}
                  </span>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, setOfficialKeyDoc)}
                  onClick={() => officialKeyInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-1 ${
                    darkMode 
                      ? "border-[#1a2b4c] hover:border-indigo-500 hover:bg-[#0e1933]" 
                      : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20"
                  }`}
                >
                  <Upload className="w-5 h-5 text-indigo-400" />
                  <p className={`text-xs font-semibold ${textPrimary}`}>
                    Arraste ou selecione o Gabarito Oficial
                  </p>
                  <span className={`text-[10px] ${textSecondary}`}>
                    A IA cruza as respostas do candidato com as oficiais
                  </span>
                  <input
                    ref={officialKeyInputRef}
                    type="file"
                    accept=".pdf,image/*,.txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0], setOfficialKeyDoc);
                      }
                    }}
                  />
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Column: Interactive Bubble Sheet (Cartão-Resposta) */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`rounded-2xl border p-5 shadow-xs flex flex-col h-full ${cardBg}`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-[#1e2d4d]">
              <div>
                <h3 className={`text-sm font-bold ${textPrimary}`}>
                  Cartão-Resposta do Candidato
                </h3>
                <span className={`text-xs ${textSecondary}`}>
                  {answeredCount} de {totalQuestions} marcadas ({progressPercent}%)
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setPasteModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/15 text-indigo-400 hover:bg-indigo-600 hover:text-white transition cursor-pointer border border-indigo-500/30"
                  title="Colar respostas em lote"
                >
                  Colar em Lote
                </button>
                <button
                  type="button"
                  onClick={() => setCandidateAnswers({})}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                  title="Limpar cartão-resposta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bubble Sheet Grid */}
            <div className="flex-1 overflow-y-auto max-h-[460px] pr-1 py-3 space-y-2 select-none">
              {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNum) => {
                const currentAnswer = candidateAnswers[qNum];
                return (
                  <div
                    key={qNum}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                      currentAnswer 
                        ? darkMode ? "bg-indigo-950/30 border-indigo-500/40" : "bg-indigo-50/50 border-indigo-200" 
                        : innerBg
                    }`}
                  >
                    <span className={`w-8 font-mono text-xs font-bold text-center ${
                      darkMode ? "text-gray-300" : "text-slate-600"
                    }`}>
                      {qNum < 10 ? `0${qNum}` : qNum}
                    </span>

                    <div className="flex items-center space-x-2">
                      {optionsPerQuestion.map((opt) => {
                        const isSelected = currentAnswer === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectAnswer(qNum, opt)}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 scale-105'
                                : darkMode
                                ? 'bg-[#15254d] text-gray-200 border border-[#233863] hover:border-indigo-400 hover:bg-indigo-900/40'
                                : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="pt-3 border-t border-slate-100 dark:border-[#1e2d4d]">
              <div className="w-full bg-slate-200 dark:bg-[#1a2b4c] rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Action Center: Big Correction Button */}
      <div className={`rounded-2xl border p-6 shadow-xs flex flex-col items-center justify-center space-y-4 text-center ${cardBg}`}>
        {isAnalyzing ? (
          <div className="space-y-4 py-4 w-full max-w-md">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto animate-bounce">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h4 className={`text-base font-bold ${textPrimary}`}>
                A Inteligência Artificial está corrigindo e mapeando a prova...
              </h4>
              <p className="text-xs text-indigo-400 font-semibold animate-pulse">
                {analyzingStep || 'Cruzando respostas com o gabarito oficial e edital...'}
              </p>
            </div>
            <div className="w-full bg-slate-200 dark:bg-[#1a2b4c] rounded-full h-2.5 overflow-hidden">
              <div className="bg-indigo-600 h-2.5 rounded-full animate-pulse w-3/4 mx-auto" />
            </div>
          </div>
        ) : (
          <>
            <button
              id="btn-start-analysis"
              type="button"
              onClick={onAnalyze}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-base shadow-lg shadow-indigo-600/30 transition active:scale-95 flex items-center space-x-3 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-indigo-200" />
              <span>Corrigir Prova & Gerar Análise de Desempenho</span>
            </button>
            <p className={`text-xs max-w-lg ${textSecondary}`}>
              A IA cruza as respostas do candidato com o gabarito oficial, extrai disciplinas e pesos do edital e sintetiza seu cronograma de estudos.
            </p>
          </>
        )}
      </div>

      {/* Paste Answers Modal */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border ${
            darkMode ? "bg-[#101d3b] border-[#1e2d4d]" : "bg-white border-slate-100"
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-[#1e2d4d]">
              <h4 className={`text-base font-bold ${textPrimary}`}>
                Colar Gabarito do Aluno em Lote
              </h4>
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            <p className={`text-xs ${textSecondary}`}>
              Cole suas respostas em formato de lista (ex: <code>1A 2C 3B...</code> ou <code>1: A, 2: C</code>) ou como sequência contínua de letras (ex: <code>ACBD...</code>).
            </p>
            <textarea
              id="textarea-paste-answers"
              rows={5}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Exemplo:&#10;1: A&#10;2: C&#10;3: B&#10;4: D&#10;5: E"
              className={`w-full p-3 text-xs font-mono rounded-xl border outline-none ${
                darkMode 
                  ? "bg-[#0b1329] border-[#1a2b4c] text-white focus:border-indigo-500" 
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600"
              }`}
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyPastedAnswers}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer"
              >
                Aplicar Respostas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Text Preview Modal */}
      {activePreviewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col p-6 shadow-2xl border ${
            darkMode ? "bg-[#101d3b] border-[#1e2d4d]" : "bg-white border-slate-100"
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-[#1e2d4d]">
              <div>
                <h4 className={`text-base font-bold ${textPrimary}`}>
                  {activePreviewDoc.title}
                </h4>
                <p className={`text-xs ${textSecondary}`}>{activePreviewDoc.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className={`flex-1 overflow-y-auto my-4 p-3 rounded-xl font-mono text-xs whitespace-pre-wrap ${
              darkMode ? "bg-[#0b1329] text-gray-200" : "bg-slate-50 text-slate-700"
            }`}>
              {activePreviewDoc.text}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActivePreviewDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
