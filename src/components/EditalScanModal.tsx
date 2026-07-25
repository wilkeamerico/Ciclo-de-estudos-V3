import React, { useState } from "react";
import { Sparkles, Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, X } from "lucide-react";
import { Edital, Categoria } from "../types";
import { fileToBase64 } from "../utils/studyHelpers";

interface EditalScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedEdital: Edital) => void;
  initialOrgao?: string;
  initialCargo?: string;
  darkMode?: boolean;
  title?: string;
}

export default function EditalScanModal({
  isOpen,
  onClose,
  onScanSuccess,
  initialOrgao = "",
  initialCargo = "",
  darkMode = true,
  title = "Escanear Edital por IA"
}: EditalScanModalProps) {
  const [orgaoInput, setOrgaoInput] = useState(initialOrgao);
  const [cargoInput, setCargoInput] = useState(initialCargo);
  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 12 * 1024 * 1024) {
        setErrorMsg("O arquivo excede o limite máximo recomendado de 12MB.");
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pastedText.trim() && !selectedFile) {
      setErrorMsg("Cole o conteúdo em texto do edital ou faça upload de um arquivo PDF.");
      return;
    }

    setIsScanning(true);
    setErrorMsg(null);

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
          cargoDesejado: cargoInput || undefined,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Erro ao conectar com o motor de análise de edital IA.");
      }

      const parsedResult = await response.json();

      const novaCategorias: Categoria[] = (parsedResult.categorias || []).map((cat: any, cIdx: number) => {
        return {
          id: `cat_ia_${Date.now()}_${cIdx}`,
          nome: (cat.nome || "CONHECIMENTOS GERAIS").toUpperCase(),
          disciplinas: (cat.disciplinas || []).map((disc: any, dIdx: number) => {
            const cores = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#f97316", "#06b6d4"];
            const randomCor = cores[(cIdx + dIdx) % cores.length];

            return {
              id: `disc_ia_${Date.now()}_${cIdx}_${dIdx}`,
              nome: disc.nome || "Disciplina",
              questoes: parseInt(disc.questoes) || 10,
              peso: parseFloat(disc.peso) || 1,
              cor: randomCor,
              horasPorCiclo: 1.5,
              assuntos: (disc.assuntos || []).map((assName: string, aIdx: number) => {
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
        banca: parsedResult.banca || "Indefinida",
        orgao: parsedResult.orgao || orgaoInput || "Órgão Concurso",
        cargo: parsedResult.cargo || cargoInput || "Cargo Analisado",
        categorias: novaCategorias,
        discursivaInfo: parsedResult.discursivaInfo || {
          hasDiscursiva: false,
          detalhes: "Informação não especificada",
          criteriosAvaliacao: "Informação não especificada"
        },
        resumoExecutivo: parsedResult.resumoExecutivo
      };

      onScanSuccess(parsedEdital);
      onClose();
    } catch (err: any) {
      console.error("Erro no escaneamento por IA:", err);
      const isFailedToFetch = err?.message?.includes("Failed to fetch") || err?.toString()?.includes("Failed to fetch");
      const msg = isFailedToFetch
        ? "Erro de conexão ao enviar o arquivo para o servidor de IA. Se estiver usando um PDF grande, tente colar o texto diretamente ou anexar um PDF menor."
        : (err?.message || "Falha ao processar arquivo com Inteligência Artificial.");
      setErrorMsg(msg);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className={`w-full max-w-2xl p-6 rounded-3xl border shadow-2xl relative animate-fade-in ${
        darkMode ? "bg-[#0f1b35] border-[#1e2d4d] text-white" : "bg-white border-gray-200 text-gray-800"
      }`}>
        <button
          type="button"
          onClick={onClose}
          disabled={isScanning}
          className="absolute right-4 top-4 text-gray-400 hover:text-white font-black text-sm p-1.5 rounded-lg hover:bg-gray-500/20 cursor-pointer disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-wider text-blue-400">
              {title}
            </h3>
            <p className="text-xs text-gray-400">
              Extraia disciplinas, questões, pesos, tópicos e resumo executivo completo via IA
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleStartScan} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                Órgão / Concurso (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: CEGÁS, DATAPREV, SEFAZ..."
                value={orgaoInput}
                onChange={(e) => setOrgaoInput(e.target.value)}
                disabled={isScanning}
                className={`w-full p-2.5 rounded-xl border outline-none text-xs transition-all ${
                  darkMode
                    ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                    : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                Cargo Desejado (IA Focus)
              </label>
              <input
                type="text"
                placeholder="Ex: Engenheiro Mecânico, Analista de TI..."
                value={cargoInput}
                onChange={(e) => setCargoInput(e.target.value)}
                disabled={isScanning}
                className={`w-full p-2.5 rounded-xl border outline-none text-xs transition-all ${
                  darkMode
                    ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                    : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
              Opção A: Upload do Edital em PDF (Até 12MB)
            </label>
            <div className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
              selectedFile
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                : darkMode
                ? "border-[#25365e] bg-[#16223f]/50 hover:border-blue-500"
                : "border-gray-200 bg-gray-50 hover:border-blue-500"
            }`}>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                disabled={isScanning}
                className="hidden"
                id="modal-pdf-upload"
              />
              <label htmlFor="modal-pdf-upload" className="cursor-pointer flex flex-col items-center gap-1.5">
                <Upload className="w-6 h-6 text-blue-400" />
                <span className="text-xs font-bold">
                  {selectedFile ? `Arquivo selecionado: ${selectedFile.name}` : "Clique para selecionar o edital em PDF"}
                </span>
                <span className="text-[10px] text-gray-400">PDFs com texto pesquisável até 12MB</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
              Opção B: Cole o Texto do Edital ou Conteúdo Programático
            </label>
            <textarea
              rows={4}
              placeholder="Cole aqui o trecho do edital, matérias e tópicos..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              disabled={isScanning}
              className={`w-full p-3 rounded-xl border outline-none text-xs font-mono transition-all ${
                darkMode
                  ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                  : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
              }`}
            />
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isScanning}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                darkMode ? "border-[#25365e] hover:bg-[#16223f]" : "border-gray-200 hover:bg-gray-100"
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isScanning}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analisando com IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span>Escanear & Preencher Ciclo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
