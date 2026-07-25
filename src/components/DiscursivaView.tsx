import React, { useState, useMemo } from "react";
import { 
  Sparkles, Award, CheckCircle, AlertTriangle, BookOpen, FileText, 
  Send, RefreshCw, Upload, Calendar, HelpCircle, Trash2, ChevronDown, 
  ChevronUp, Check, Info, FileImage 
} from "lucide-react";
import { StudyState, RegistroDiscursiva } from "../types";
import { fileToBase64 } from "../utils/studyHelpers";

interface DiscursivaViewProps {
  state: StudyState;
  updateState: (newState: StudyState) => void;
  darkMode: boolean;
}

const DEFAULT_CRITERIA: { [key: string]: string } = {
  Cebraspe: `1. Apresentação e Legibilidade (Margens, parágrafos, caligrafia legível) [Máx: 1.0 ponto]
2. Estrutura Textual (Introdução, desenvolvimento e conclusão coerentes) [Máx: 2.0 pontos]
3. Desenvolvimento do Tema e Domínio Técnico (Abordagem completa dos tópicos técnicos exigidos) [Máx: 7.0 pontos]`,
  
  FGV: `1. Estrutura Textual (Coesão, coerência e estruturação lógica dos parágrafos) [Máx: 4.0 pontos]
2. Conteúdo e Argumentação (Domínio do tema, profundidade dos argumentos e precisão técnica) [Máx: 4.0 pontos]
3. Expressão e Linguagem (Correção gramatical, precisão lexical e uso da norma culta) [Máx: 2.0 pontos]`,
  
  FCC: `1. Conteúdo (Adequação ao tema proposto, clareza e relevância dos argumentos) [Máx: 4.0 pontos]
2. Estrutura (Progressão temática coerente, coesão e divisão de parágrafos) [Máx: 3.0 pontos]
3. Expressão (Domínio da norma padrão da língua, clareza, concisão e vocabulário) [Máx: 3.0 pontos]`,
  
  Cesgranrio: `1. Adequação ao Tema e Gênero (Foco no tema e respeito ao tipo dissertativo-argumentativo) [Máx: 2.0 pontos]
2. Coesão e Coerência (Mecanismos de conexão, parágrafos e fluidez das ideias) [Máx: 3.0 pontos]
3. Domínio da Norma Padrão e Vocabulário (Morfossintaxe, concordância, ortografia e pontuação) [Máx: 5.0 pontos]`,
  
  Vunesp: `1. Tema (Fidelidade ao tema proposto e profundidade da abordagem) [Máx: 3.0 pontos]
2. Estrutura (Domínio do gênero dissertativo, parágrafos bem delimitados e fluidez) [Máx: 3.0 pontos]
3. Expressão (Coesão, coerência linguística e correção gramatical conforme a norma culta) [Máx: 4.0 pontos]`,
  
  Outra: `1. Domínio de Conteúdo Técnico [Máx: 5.0 pontos]
2. Estruturação Textual e Coesão [Máx: 3.0 pontos]
3. Correção Gramatical e Ortografia [Máx: 2.0 pontos]`
};

export default function DiscursivaView({ state, updateState, darkMode }: DiscursivaViewProps) {
  const discursivasList = state.discursivas || [];

  // Local state for the workspace form
  const [banca, setBanca] = useState(() => state.edital.banca || "Cebraspe");
  const [criterios, setCriterios] = useState(() => DEFAULT_CRITERIA[state.edital.banca] || DEFAULT_CRITERIA.Cebraspe);
  const [tema, setTema] = useState(
    "Discorra sobre os desafios da descarbonização e os principais caminhos para a transição energética na indústria do petróleo e biocombustíveis."
  );
  const [respostaText, setRespostaText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Loading & results
  const [isLoading, setIsLoading] = useState(false);
  const [activeCorrection, setActiveCorrection] = useState<RegistroDiscursiva | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Detail views
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Sync criteria if banca selection changes
  const handleBancaChange = (newBanca: string) => {
    setBanca(newBanca);
    if (DEFAULT_CRITERIA[newBanca]) {
      setCriterios(DEFAULT_CRITERIA[newBanca]);
    }
  };

  // Drag and drop / file states
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert("O arquivo excede o limite de 10MB permitido.");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  // Action: Copy IA scanned criteria from active Edital if available
  const hasExtractedDiscursiva = !!state.edital.discursivaInfo?.hasDiscursiva;
  const handleCopyEditalCriteria = () => {
    if (state.edital.discursivaInfo) {
      setBanca(state.edital.banca || "Edital Scanned");
      setCriterios(
        `Regras do Edital:\n${state.edital.discursivaInfo.detalhes}\n\nCritérios extraídos:\n${state.edital.discursivaInfo.criteriosAvaliacao}`
      );
      alert("Critérios e detalhes da redação extraídos do edital por IA copiados com sucesso!");
    }
  };

  // Submit for AI correction
  const handleCorrectEssay = async () => {
    if (!tema.trim()) {
      alert("Por favor, informe o tema da questão discursiva.");
      return;
    }

    if (!respostaText.trim() && !selectedFile) {
      alert("Escreva sua resposta digitada ou anexe um arquivo (foto ou PDF) contendo sua prova escrita.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setActiveCorrection(null);

    try {
      let fileBase64 = undefined;
      let fileMimeType = undefined;

      if (selectedFile) {
        fileBase64 = await fileToBase64(selectedFile);
        fileMimeType = selectedFile.type;
      }

      const response = await fetch("/api/corrigir-redacao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tema,
          texto: respostaText,
          fileBase64,
          fileMimeType,
          banca,
          criterios
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao conectar com o servidor de IA.");
      }

      const result = await response.json();
      
      // Calculate scores mapping
      const mappedScores: { [key: string]: number } = {};
      if (Array.isArray(result.notasCriterios)) {
        result.notasCriterios.forEach((item: any) => {
          mappedScores[item.criterio] = item.nota;
        });
      }

      // Generate formatted criteria string for quick display
      const criteriaDisplay = Array.isArray(result.notasCriterios)
        ? result.notasCriterios.map((item: any) => `${item.criterio}: ${item.nota}/${item.notaMaxima}`).join(", ")
        : "Nota global";

      // Formulate final observation summary
      const firstImprovement = result.pontosMelhoria?.[0] || "Revisar considerações de escrita.";
      const shortObservations = `Transcrição concluída. ${firstImprovement}`;

      // Create new discursiva log record
      const newRecord: RegistroDiscursiva = {
        id: "discursiva_" + Date.now(),
        data: new Date().toLocaleDateString("pt-BR"),
        banca: banca,
        tema: tema,
        notasCriterios: mappedScores,
        notaTotal: result.nota,
        observacoes: shortObservations,
        textoAluno: result.transcricao || respostaText || "Anexo digitalizado.",
        pontosFortes: result.pontosFortes || [],
        pontosMelhoria: result.pontosMelhoria || [],
        revisaoGramatical: result.revisaoGramatical || "",
        respostaSugerida: result.respostaSugerida || ""
      };

      // Add to studyState discursivas log array
      const updatedList = [newRecord, ...discursivasList];
      updateState({
        ...state,
        discursivas: updatedList
      });

      setActiveCorrection(newRecord);
      setExpandedLogId(newRecord.id); // auto-expand to show details
      
      // Reset form on success
      setRespostaText("");
      setSelectedFile(null);
      alert("Sua discursiva foi avaliada com sucesso pela inteligência artificial e os resultados foram salvos!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocorreu um erro ao processar sua redação com a IA.");
    } finally {
      setIsLoading(false);
    }
  };

  // Action: delete a log row
  const handleDeleteLog = (id: string) => {
    if (confirm("Tem certeza que deseja excluir permanentemente o registro desta discursiva?")) {
      const updated = discursivasList.filter((d) => d.id !== id);
      updateState({
        ...state,
        discursivas: updated
      });
      if (expandedLogId === id) setExpandedLogId(null);
      if (activeCorrection?.id === id) setActiveCorrection(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* HEADER CARD */}
      <div className={`p-6 rounded-2xl border transition-colors space-y-3 ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
      }`}>
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-blue-500" />
          <h3 className={`text-base font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
            Simulador de Prova Discursiva & Redação Inteligente
          </h3>
        </div>
        <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} leading-relaxed`}>
          O simulador discursivo com IA lê folhas de redação manuscritas via foto/imagem ou arquivos em PDF, transcreve seu texto e realiza uma avaliação milimétrica com base nos critérios de pontuação da banca examinadora selecionada.
        </p>

        {/* EXTRACTION ALERT BAR */}
        {hasExtractedDiscursiva && (
          <div className="mt-3 p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-center justify-between gap-4">
            <div className="flex items-start space-x-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0 animate-pulse" />
              <div>
                <span className="block text-xs font-bold text-blue-400">
                  Estrutura discursiva disponível para o concurso {state.edital.orgao}!
                </span>
                <span className={`block text-[10px] ${darkMode ? "text-gray-300" : "text-gray-600"} mt-0.5 max-w-xl`}>
                  A Inteligência Artificial extraiu os critérios específicos de redação ao escanear o edital. Clique ao lado para carregar e treinar sob esses moldes.
                </span>
              </div>
            </div>
            <button
              onClick={handleCopyEditalCriteria}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm transition-colors cursor-pointer flex-shrink-0"
            >
              Usar Critérios do Edital
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* INPUT FORM (COL-SPAN-7) */}
        <div className={`lg:col-span-7 p-6 rounded-2xl border transition-colors flex flex-col space-y-4 ${
          darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
        }`}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SELECT BANCA */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Banca Organizadora
              </label>
              <div className="relative">
                <select
                  value={banca}
                  onChange={(e) => handleBancaChange(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-xs font-bold outline-none transition-colors appearance-none cursor-pointer ${
                    darkMode
                      ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                      : "bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-600 focus:bg-white"
                  }`}
                >
                  <option value="Cebraspe">Cebraspe (Cespe)</option>
                  <option value="FGV">FGV (Fundação Getulio Vargas)</option>
                  <option value="FCC">FCC (Fundação Carlos Chagas)</option>
                  <option value="Cesgranrio">Cesgranrio</option>
                  <option value="Vunesp">Vunesp</option>
                  <option value="Outra">Outra / Critério Personalizado</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* EDITABLE CRITERIA */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Parâmetros e Pesos de Avaliação
              </label>
              <textarea
                value={criterios}
                onChange={(e) => setCriterios(e.target.value)}
                rows={3}
                placeholder="Insira os critérios e pesos (Ex: Coesão [Máx: 3.0], Domínio Técnico [Máx: 7.0])"
                className={`w-full p-2.5 rounded-xl border text-[10px] leading-relaxed outline-none transition-colors font-mono resize-none ${
                  darkMode
                    ? "bg-[#16223f] border-[#25365e] text-gray-300 focus:border-blue-500"
                    : "bg-gray-50 border-gray-200 text-gray-700 focus:border-blue-600 focus:bg-white"
                }`}
              />
            </div>
          </div>

          {/* TEMA DA REDAÇÃO */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Tema ou Enunciado da Prova Técnica / Discursiva
            </label>
            <input
              type="text"
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Digite o tema proposto para o treino de discursiva..."
              className={`w-full px-4 py-3 rounded-xl border text-xs font-semibold outline-none transition-colors ${
                darkMode
                  ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                  : "bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-600 focus:bg-white"
              }`}
            />
          </div>

          {/* CHOOSE INPUT METHOD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            
            {/* MANUSCRIPT FILE UPLOADER */}
            <div className="space-y-1.5 flex flex-col justify-between">
              <label className={`block text-xs font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Opção 1: Anexar Foto da Folha de Resposta / PDF (Máx 10MB)
              </label>
              
              <div className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative ${
                selectedFile
                  ? "border-emerald-500 bg-emerald-500/5"
                  : darkMode
                  ? "border-[#25365e] hover:border-blue-500 bg-[#16223f]/40"
                  : "border-gray-200 hover:border-blue-500 bg-gray-50"
              }`}>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  id="discursiva-file-upload"
                />
                <Upload className={`w-7 h-7 mb-1.5 ${selectedFile ? "text-emerald-500 animate-bounce" : "text-gray-400"}`} />
                
                {selectedFile ? (
                  <div>
                    <span className={`block text-xs font-bold ${darkMode ? "text-white" : "text-gray-800"} line-clamp-1`}>
                      {selectedFile.name}
                    </span>
                    <span className="block text-[10px] text-emerald-500 font-semibold mt-0.5">
                      Pronto para envio ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className={`block text-[10px] font-bold ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                      Solte a foto/pdf aqui ou clique
                    </span>
                    <span className="block text-[9px] text-gray-400 mt-0.5">
                      Suporta imagem ou folha escaneada em PDF
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* TYPED ANSWER TEXTAREA */}
            <div className="space-y-1.5 flex flex-col">
              <label className={`block text-xs font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Opção 2: Ou Digite sua Resposta de Estudo
              </label>
              <textarea
                placeholder="Caso prefira treinar digitando diretamente, insira sua resposta técnica completa neste campo..."
                value={respostaText}
                onChange={(e) => setRespostaText(e.target.value)}
                disabled={!!selectedFile}
                rows={4}
                maxLength={3000}
                className={`w-full p-3 rounded-xl border outline-none text-xs leading-relaxed font-sans transition-colors resize-none flex-1 ${
                  selectedFile 
                    ? "opacity-40 cursor-not-allowed bg-gray-100/5" 
                    : darkMode
                    ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                    : "bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-600 focus:bg-white"
                }`}
              />
              <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                <span>{respostaText.length} / 3000 caracteres</span>
                <span>Priorize parágrafos estruturados</span>
              </div>
            </div>

          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[11px] flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-gray-100/10">
            <button
              onClick={handleCorrectEssay}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/10 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Transcrevendo & Avaliando pela IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-yellow-300 fill-yellow-300/10" />
                  <span>Escanear & Avaliar Redação</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* FEEDBACK & REPORT SCREEN (COL-SPAN-5) */}
        <div className="lg:col-span-5 flex flex-col">
          {isLoading && (
            <div className={`p-8 rounded-2xl border flex-1 flex flex-col items-center justify-center text-center transition-colors ${
              darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
            }`}>
              <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mb-4" />
              <h4 className={`text-sm font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                IA Extraindo Textos e Analisando...
              </h4>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-2 max-w-xs leading-relaxed`}>
                Processando imagem/PDF, efetuando leitura de caligrafia (OCR) e ponderando notas de critérios específicos da banca examinadora.
              </p>
            </div>
          )}

          {activeCorrection && !isLoading && (
            <div className={`p-6 rounded-2xl border transition-colors space-y-4 flex-1 ${
              darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
            }`}>
              
              {/* GRADE & STATUS */}
              <div className="flex justify-between items-center border-b border-gray-100/10 pb-3">
                <div>
                  <span className={`block text-[9px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Resultado de Nota do Treino
                  </span>
                  <span className={`text-2xl font-black ${activeCorrection.notaTotal >= 7 ? "text-emerald-500" : "text-amber-500"}`}>
                    {activeCorrection.notaTotal.toFixed(1)} / 10.0
                  </span>
                </div>
                
                <span className={`text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${
                  activeCorrection.notaTotal >= 7
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}>
                  {activeCorrection.notaTotal >= 7 ? "Aprovado" : "Recomenda-se Revisão"}
                </span>
              </div>

              {/* CRITERIA METRICS CHIPS */}
              <div className="space-y-1.5">
                <span className={`block text-[9px] font-bold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Notas por Critério (Banca {activeCorrection.banca})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(activeCorrection.notasCriterios || {}).map(([crit, nota]) => (
                    <div 
                      key={crit}
                      className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold flex flex-col justify-center ${
                        darkMode ? "bg-[#16223f] border-[#25365e] text-white" : "bg-gray-50 border-gray-150 text-gray-700"
                      }`}
                    >
                      <span className="opacity-70 line-clamp-1">{crit}</span>
                      <span className="font-bold text-blue-500 mt-0.5">{Number(nota).toFixed(1)} Pts</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TRANSCRIBED CONTENT PREVIEW */}
              {activeCorrection.textoAluno && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                    <FileImage className="w-3.5 h-3.5" />
                    Transcrição do Texto Escaneado / Avaliado
                  </span>
                  <p className={`text-[11px] leading-relaxed p-2.5 rounded-xl border line-clamp-3 font-mono ${
                    darkMode ? "bg-[#0b1329] border-[#25365e] text-gray-300" : "bg-gray-50 border-gray-200 text-gray-600"
                  }`}>
                    "{activeCorrection.textoAluno}"
                  </p>
                </div>
              )}

              {/* STRENGTHS */}
              {activeCorrection.pontosFortes && activeCorrection.pontosFortes.length > 0 && (
                <div className="space-y-1">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Pontos Fortes da Resposta
                  </h5>
                  <ul className={`text-[11px] space-y-1 list-disc pl-4 leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    {activeCorrection.pontosFortes.slice(0, 2).map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* IMPROVEMENTS */}
              {activeCorrection.pontosMelhoria && activeCorrection.pontosMelhoria.length > 0 && (
                <div className="space-y-1">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Pontos para Melhoria
                  </h5>
                  <ul className={`text-[11px] space-y-1 list-disc pl-4 leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    {activeCorrection.pontosMelhoria.slice(0, 2).map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* IDEAL PROPOSAL SUGGESTION */}
              {activeCorrection.respostaSugerida && (
                <div className="space-y-1 pt-2 border-t border-gray-100/10">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    Padrão de Resposta Ideal
                  </h5>
                  <div className={`p-2.5 rounded-xl text-[11px] leading-relaxed max-h-32 overflow-y-auto border font-sans ${
                    darkMode ? "bg-[#0b1329] border-[#25365e] text-gray-300" : "bg-gray-50 border-gray-150 text-gray-600"
                  }`}>
                    {activeCorrection.respostaSugerida}
                  </div>
                </div>
              )}

            </div>
          )}

          {!activeCorrection && !isLoading && (
            <div className={`p-8 rounded-2xl border flex-1 flex flex-col items-center justify-center text-center transition-colors ${
              darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
            }`}>
              <Send className="w-9 h-9 text-gray-400 mb-3 opacity-60 animate-bounce" />
              <h4 className={`text-xs font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                Painel de Resultados
              </h4>
              <p className={`text-[11px] ${darkMode ? "text-gray-400" : "text-gray-500"} mt-1.5 max-w-xs leading-relaxed`}>
                Anexe seu manuscrito ou escreva a resposta técnica ao lado para visualizar a pontuação pautada em critérios reais da banca examinadora.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* LOG DE PROVAS REALIZADAS (HISTÓRICO DE EXERCÍCIOS) */}
      <div className={`p-6 rounded-2xl border transition-colors space-y-4 ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
      }`}>
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          <h4 className={`text-sm font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
            Histórico de Treinamentos de Provas Discursivas & Redações
          </h4>
        </div>

        {discursivasList.length === 0 ? (
          <div className="py-8 text-center text-xs italic text-gray-500">
            Nenhuma redação técnica avaliada neste ciclo de estudos. Comece enviando seu treino acima!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`text-[10px] uppercase font-bold tracking-wider border-b border-gray-100/10 ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Banca</th>
                  <th className="py-2.5 px-3">Tema</th>
                  <th className="py-2.5 px-3">Nota dos Critérios</th>
                  <th className="py-2.5 px-3 text-center">Nota Total</th>
                  <th className="py-2.5 px-3">Observações / Correção IA</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {discursivasList.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  
                  // Render criterion logs nicely
                  const criteriaListStr = Object.entries(log.notasCriterios)
                    .map(([crit, grade]) => `${crit}: ${grade.toFixed(1)}`)
                    .join(", ");

                  return (
                    <React.Fragment key={log.id}>
                      <tr className={`border-b border-gray-100/5 transition-colors text-xs ${
                        darkMode ? "hover:bg-[#152345]/30 text-gray-200" : "hover:bg-gray-50 text-gray-700"
                      }`}>
                        <td className="py-3 px-3 font-semibold text-[11px] whitespace-nowrap">
                          {log.data}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            darkMode ? "bg-blue-950/40 text-blue-300" : "bg-blue-50 text-blue-700"
                          }`}>
                            {log.banca}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate font-medium" title={log.tema}>
                          {log.tema}
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate text-[11px] text-gray-400">
                          {criteriaListStr || "Nota única"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`font-black text-[13px] ${
                            log.notaTotal >= 7 ? "text-emerald-500" : "text-amber-500"
                          }`}>
                            {log.notaTotal.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate text-[11px] text-gray-400">
                          {log.observacoes}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                                darkMode 
                                  ? "border-[#2d3f66] bg-[#16223f] hover:bg-[#1f2d50] text-gray-300" 
                                  : "border-gray-200 bg-white hover:bg-gray-100 text-gray-600"
                              }`}
                              title={isExpanded ? "Recolher detalhes" : "Visualizar feedback completo"}
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                darkMode
                                  ? "border-red-950/20 bg-red-950/10 hover:bg-red-950/45 text-red-400"
                                  : "border-red-200 bg-red-50 hover:bg-red-100 text-red-600"
                              }`}
                              title="Remover do Histórico"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED FEEDBACK DRAWER ROW */}
                      {isExpanded && (
                        <tr className={`${darkMode ? "bg-[#0b1329]/50" : "bg-gray-50/40"}`}>
                          <td colSpan={7} className="p-4 px-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed animate-fade-in">
                              
                              {/* TRANSCRIPT & DETAILED SCORES */}
                              <div className="space-y-3">
                                <div>
                                  <span className="block font-bold uppercase tracking-wider text-[10px] text-blue-500 mb-1">
                                    Texto Praticado e Transcrito
                                  </span>
                                  <div className={`p-3 rounded-xl border font-mono max-h-48 overflow-y-auto text-[11px] leading-relaxed ${
                                    darkMode ? "bg-[#0b1329] border-[#25365e] text-gray-300" : "bg-white border-gray-200 text-gray-600"
                                  }`}>
                                    {log.textoAluno || "Sem transcrição disponível."}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="block font-bold uppercase tracking-wider text-[10px] text-blue-500">
                                    Notas Detalhadas por Parâmetro
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {Object.entries(log.notasCriterios || {}).map(([crit, value]) => (
                                      <div key={crit} className={`p-2 rounded-xl border flex justify-between items-center ${
                                        darkMode ? "bg-[#16223f] border-[#25365e]" : "bg-white border-gray-150"
                                      }`}>
                                        <span className="font-semibold text-[11px] truncate pr-2" title={crit}>{crit}</span>
                                        <span className="font-extrabold text-blue-500 whitespace-nowrap">{Number(value).toFixed(1)} Pts</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* STRENGTHS, IMPROVEMENTS & GRAMMAR */}
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  
                                  {/* STRENGTHS */}
                                  <div className="space-y-1">
                                    <span className="block font-bold uppercase tracking-wider text-[10px] text-emerald-500 flex items-center gap-1">
                                      <Check className="w-3.5 h-3.5" /> Pontos Fortes
                                    </span>
                                    <ul className={`space-y-1 list-disc pl-4 text-[11px] ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                                      {log.pontosFortes && log.pontosFortes.length > 0 ? (
                                        log.pontosFortes.map((p, idx) => <li key={idx}>{p}</li>)
                                      ) : (
                                        <li>Argumentação de conteúdo adequada ao edital.</li>
                                      )}
                                    </ul>
                                  </div>

                                  {/* IMPROVEMENTS */}
                                  <div className="space-y-1">
                                    <span className="block font-bold uppercase tracking-wider text-[10px] text-amber-500 flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5" /> Oportunidades de Melhora
                                    </span>
                                    <ul className={`space-y-1 list-disc pl-4 text-[11px] ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                                      {log.pontosMelhoria && log.pontosMelhoria.length > 0 ? (
                                        log.pontosMelhoria.map((p, idx) => <li key={idx}>{p}</li>)
                                      ) : (
                                        <li>Possibilidade de aprofundamento de ideias.</li>
                                      )}
                                    </ul>
                                  </div>

                                </div>

                                {/* GRAMMAR */}
                                <div className="space-y-1">
                                  <span className="block font-bold uppercase tracking-wider text-[10px] text-blue-400">
                                    Revisão Ortográfica e Sintaxe
                                  </span>
                                  <p className={`p-2.5 rounded-xl border text-[11px] leading-relaxed ${
                                    darkMode ? "bg-[#0b1329] border-[#25365e] text-gray-300" : "bg-white border-gray-150 text-gray-600"
                                  }`}>
                                    {log.revisaoGramatical || "Não foram apontados desvios significativos pela banca."}
                                  </p>
                                </div>

                                {/* SUGGESTED IDEAL RESPONSE */}
                                {log.respostaSugerida && (
                                  <div className="space-y-1">
                                    <span className="block font-bold uppercase tracking-wider text-[10px] text-violet-400 flex items-center gap-1">
                                      <BookOpen className="w-3.5 h-3.5" /> Padrão de Resposta Sugerido (Estudo)
                                    </span>
                                    <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed max-h-36 overflow-y-auto ${
                                      darkMode ? "bg-[#0b1329] border-[#25365e] text-gray-300" : "bg-white border-gray-150 text-gray-600"
                                    }`}>
                                      {log.respostaSugerida}
                                    </div>
                                  </div>
                                )}

                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
