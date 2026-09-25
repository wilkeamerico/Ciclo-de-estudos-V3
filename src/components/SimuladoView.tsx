import React, { useState, useEffect } from "react";
import { StudyState, CicloEstudo, ExamResult, ExamFile, TopicStudyMaterial, StudyStatus } from "../types";
import { Navbar } from "./conferir-provas/Navbar";
import { SimuladoDashboardView } from "./conferir-provas/SimuladoDashboardView";
import { UploadSection } from "./conferir-provas/UploadSection";
import { PerformanceDashboard } from "./conferir-provas/PerformanceDashboard";
import { QuestionReview } from "./conferir-provas/QuestionReview";
import { StudyPlanner } from "./conferir-provas/StudyPlanner";
import { ExamHistory } from "./conferir-provas/ExamHistory";
import { Sparkles, AlertCircle, RefreshCw } from "lucide-react";

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
  ciclos = [],
  activeCicloId,
  onSelectCicloId,
  onVoltarParaCiclos,
  isPainelGeral = false,
  isAvulso = false,
}: SimuladoViewProps) {
  // Navigation active tab for Conferir-provas structure - Defaults directly to Dashboard
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'performance' | 'history'>('dashboard');

  // Active Exam Form Setup State
  const [examTitle, setExamTitle] = useState(() => {
    if (state.edital.orgao && state.edital.cargo && state.edital.orgao !== "Simulado Avulso") {
      return `${state.edital.orgao} - ${state.edital.cargo}`;
    }
    return "Simulado Geral - Concurso Público";
  });

  const [totalQuestions, setTotalQuestions] = useState<number>(60);
  const [optionsPerQuestion, setOptionsPerQuestion] = useState<string[]>(['A', 'B', 'C', 'D', 'E']);
  const [candidateAnswers, setCandidateAnswers] = useState<Record<number, string>>({});

  // Files
  const [examPaper, setExamPaper] = useState<ExamFile | null>(null);
  const [syllabus, setSyllabus] = useState<ExamFile | null>(() => {
    // If state contains edital categories with disciplines, auto-format as text syllabus
    if (state.edital.categorias && state.edital.categorias.length > 0) {
      const formatted = state.edital.categorias.map(cat => 
        `=== ${cat.nome} ===\n` + (cat.disciplinas || []).map(d => 
          `• ${d.nome} (Peso: ${d.peso || 1}x, Questões: ${d.questoes || 10}):\n` + 
          (d.assuntos || []).map(a => `   - ${a.nome}`).join('\n')
        ).join('\n\n')
      ).join('\n\n');

      return {
        name: `Edital_${(state.edital.orgao || 'Concurso').replace(/\s+/g, '_')}.txt`,
        size: formatted.length,
        type: 'text/plain',
        mimeType: 'text/plain',
        text: formatted,
      };
    }
    return null;
  });
  const [officialKeyDoc, setOfficialKeyDoc] = useState<ExamFile | null>(null);

  // Analysis execution state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Result & Historical Data
  const [currentResult, setCurrentResult] = useState<ExamResult | null>(null);
  const [history, setHistory] = useState<ExamResult[]>(() => {
    try {
      const saved = localStorage.getItem("conferir_provas_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Erro ao carregar histórico de provas:", e);
    }
    return [];
  });

  // Topic Study with Flashcards & Quiz modal state
  const [activeTopicStudy, setActiveTopicStudy] = useState<TopicStudyMaterial | null>(null);
  const [isLoadingStudyMaterial, setIsLoadingStudyMaterial] = useState(false);

  // Sync history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("conferir_provas_history", JSON.stringify(history));
    } catch (e) {
      console.error("Erro ao salvar histórico de provas:", e);
    }
  }, [history]);

  // Main Action: Analyze & Correct Exam via /api/analyze-exam
  const handleAnalyzeExam = async () => {
    if (Object.keys(candidateAnswers).length === 0) {
      setErrorMessage("Por favor, preencha ao menos algumas respostas no cartão-resposta do candidato antes de iniciar a correção.");
      return;
    }

    setErrorMessage(null);
    setIsAnalyzing(true);
    setAnalyzingStep("Extraindo e processando dados dos arquivos anexados...");

    try {
      setAnalyzingStep("Enviando dados para o modelo de Inteligência Artificial...");

      const payload = {
        examTitle: examTitle.trim() || "Simulado Geral",
        candidateAnswers,
        totalQuestions,
        examPaper,
        syllabus,
        officialKeyDoc,
      };

      const response = await fetch("/api/analyze-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro no servidor (Status ${response.status}) ao corrigir a prova.`);
      }

      setAnalyzingStep("Sintetizando diagnóstico pedagógico e gerando plano de estudos...");
      const rawResponse = await response.json();
      const resultData: ExamResult = rawResponse.data || rawResponse;

      // Ensure id and createdAt
      if (!resultData.id) {
        resultData.id = "exam_" + Date.now();
      }
      if (!resultData.createdAt) {
        resultData.createdAt = new Date().toISOString();
      }
      if (!resultData.examTitle) {
        resultData.examTitle = examTitle;
      }

      // Set active result & save into history
      setCurrentResult(resultData);
      setHistory((prev) => [resultData, ...prev.filter((h) => h.id !== resultData.id)]);

      // Also register as a SimuladoItem in the StudyState history for compatibility
      if (updateState && state) {
        const totalPontosPossiveis = (resultData.disciplines || []).reduce((acc, d) => acc + (d.totalQuestions * (d.weight || 1)), 0) || resultData.summary.totalQuestions;
        const totalPontosObtidos = (resultData.disciplines || []).reduce((acc, d) => acc + (d.correctCount * (d.weight || 1)), 0) || resultData.summary.totalCorrect;

        const novoSimuladoItem = {
          id: resultData.id,
          nome: resultData.examTitle || "Simulado IA",
          data: new Date().toISOString().split("T")[0],
          orgao: state.edital.orgao || "Concurso",
          cargo: state.edital.cargo || "Geral",
          pontuacaoTotal: totalPontosObtidos,
          pontuacaoMaximaTotal: totalPontosPossiveis,
          aproveitamentoGeral: resultData.summary.scorePercentage,
          totalAcertos: resultData.summary.totalCorrect,
          totalQuestoes: resultData.summary.totalQuestions,
          detalhesMaterias: (resultData.disciplines || []).map((d) => ({
            disciplinaId: d.discipline,
            disciplinaNome: d.discipline,
            questoesRespondidas: d.totalQuestions,
            acertos: d.correctCount,
            erros: d.wrongCount,
            anuladas: d.blankCount,
            peso: d.weight || 1,
            pontuacao: d.correctCount * (d.weight || 1),
            pontuacaoMaxima: d.totalQuestions * (d.weight || 1),
            aproveitamento: d.accuracyPercentage,
          })),
        };

        updateState({
          ...state,
          simulados: {
            ...state.simulados,
            metaAproveitamento: state.simulados?.metaAproveitamento || 80,
            historico: [novoSimuladoItem, ...(state.simulados?.historico || [])],
          },
        });
      }

      // Switch to dashboard
      setActiveTab("dashboard");
    } catch (error: any) {
      console.error("Erro ao analisar prova:", error);
      setErrorMessage(error?.message || "Ocorreu um erro ao comunicar com a IA para analisar o simulado.");
    } finally {
      setIsAnalyzing(false);
      setAnalyzingStep("");
    }
  };

  // Generate Topic Study Material with Flashcards and Quiz
  const handleGenerateStudyTopic = async (topic: string, discipline: string, errorContext?: string) => {
    setIsLoadingStudyMaterial(true);
    setActiveTopicStudy(null);

    try {
      const response = await fetch("/api/generate-topic-study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          discipline,
          errorContext,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao gerar material de estudo para o tópico.");
      }

      const rawStudy = await response.json();
      const studyData: TopicStudyMaterial = rawStudy.data || rawStudy;
      setActiveTopicStudy(studyData);
    } catch (error: any) {
      console.error("Erro ao gerar revisão do tópico:", error);
      alert(error?.message || "Não foi possível gerar os flashcards para este tópico no momento.");
    } finally {
      setIsLoadingStudyMaterial(false);
    }
  };

  // Update weakness status for a specific exam
  const handleUpdateWeaknessStatus = (examId: string, index: number, newStatus: StudyStatus) => {
    setHistory((prev) =>
      prev.map((exam) => {
        if (exam.id !== examId) return exam;
        const updatedWeaknesses = [...(exam.criticalWeaknesses || [])];
        if (updatedWeaknesses[index]) {
          updatedWeaknesses[index] = {
            ...updatedWeaknesses[index],
            status: newStatus,
          };
        }
        return {
          ...exam,
          criticalWeaknesses: updatedWeaknesses,
        };
      })
    );

    if (currentResult && currentResult.id === examId) {
      const updatedWeaknesses = [...(currentResult.criticalWeaknesses || [])];
      if (updatedWeaknesses[index]) {
        updatedWeaknesses[index] = {
          ...updatedWeaknesses[index],
          status: newStatus,
        };
        setCurrentResult({
          ...currentResult,
          criticalWeaknesses: updatedWeaknesses,
        });
      }
    }
  };

  // Select exam from history
  const handleSelectExamFromHistory = (exam: ExamResult) => {
    setCurrentResult(exam);
    setActiveTab("history");
  };

  // Delete exam from history
  const handleDeleteExamFromHistory = (id: string) => {
    if (window.confirm("Deseja realmente excluir este simulado do histórico?")) {
      setHistory((prev) => prev.filter((h) => h.id !== id));
      if (currentResult?.id === id) {
        setCurrentResult(null);
      }
    }
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-[#070d1e] text-white" : "bg-slate-50 text-slate-900"}`}>
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasResult={history.length > 0 || currentResult !== null}
        examTitle={currentResult?.examTitle || examTitle}
        darkMode={darkMode}
        onVoltarParaCiclos={onVoltarParaCiclos}
      />

      {/* Error notification banner */}
      {errorMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-4 rounded-xl border bg-red-950/30 border-red-500/40 text-red-200 flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <strong className="block font-bold">Erro ao processar a prova:</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white text-base leading-none cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Main View Container */}
      <div className="pb-16">
        {activeTab === 'dashboard' && (
          <SimuladoDashboardView
            history={history}
            edital={state.edital}
            targetScore={state.simulados?.metaAproveitamento || 85}
            onOpenUploadModal={() => {
              setCandidateAnswers({});
              setActiveTab('upload');
            }}
            onDeleteExam={handleDeleteExamFromHistory}
            onUpdateWeaknessStatus={handleUpdateWeaknessStatus}
            onGenerateStudyTopic={handleGenerateStudyTopic}
            activeTopicStudy={activeTopicStudy}
            isLoadingStudyMaterial={isLoadingStudyMaterial}
            onCloseTopicStudy={() => setActiveTopicStudy(null)}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'upload' && (
          <UploadSection
            examTitle={examTitle}
            setExamTitle={setExamTitle}
            totalQuestions={totalQuestions}
            setTotalQuestions={setTotalQuestions}
            optionsPerQuestion={optionsPerQuestion}
            setOptionsPerQuestion={setOptionsPerQuestion}
            candidateAnswers={candidateAnswers}
            setCandidateAnswers={setCandidateAnswers}
            examPaper={examPaper}
            setExamPaper={setExamPaper}
            syllabus={syllabus}
            setSyllabus={setSyllabus}
            officialKeyDoc={officialKeyDoc}
            setOfficialKeyDoc={setOfficialKeyDoc}
            isAnalyzing={isAnalyzing}
            analyzingStep={analyzingStep}
            onAnalyze={handleAnalyzeExam}
            darkMode={darkMode}
            ciclos={ciclos}
          />
        )}

        {activeTab === 'performance' && (
          <PerformanceDashboard
            result={currentResult}
            history={history}
            edital={state.edital}
            targetScore={state.simulados?.metaAproveitamento || 85}
            onSelectExam={handleSelectExamFromHistory}
            onStartNew={() => {
              setCandidateAnswers({});
              setActiveTab('upload');
            }}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'history' && (
          <ExamHistory
            history={history}
            targetScore={state.simulados?.metaAproveitamento || 85}
            onSelectExam={handleSelectExamFromHistory}
            onDeleteExam={handleDeleteExamFromHistory}
            onStartNew={() => {
              setCandidateAnswers({});
              setActiveTab('upload');
            }}
            onUpdateWeaknessStatus={handleUpdateWeaknessStatus}
            onGenerateStudyTopic={handleGenerateStudyTopic}
            activeTopicStudy={activeTopicStudy}
            isLoadingStudyMaterial={isLoadingStudyMaterial}
            onCloseTopicStudy={() => setActiveTopicStudy(null)}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  );
}
