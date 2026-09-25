import React, { useState, useEffect, useMemo, useRef } from "react";
import { StudyState, Disciplina, Assunto, RegistroQuestao } from "../types";
import { formatarDataDDMMAAAA, formatarMinutosParaHHMMSS } from "../utils/studyHelpers";
import { 
  Play, Pause, RotateCcw, Plus, Trash2, Calendar, FileText, 
  CheckCircle2, ChevronUp, ChevronDown, Upload, AlertCircle, 
  Edit, Filter, GripVertical, BookOpen, CheckCircle, RefreshCw,
  Volume2, VolumeX, Bell, Award, Sparkles, X, Clock, Pencil,
  SlidersHorizontal, LayoutList, Check, Layers, ChevronRight
} from "lucide-react";

interface StudyViewProps {
  state: StudyState;
  updateState: (newState: StudyState) => void;
  darkMode: boolean;
}

export default function StudyView({ state, updateState, darkMode }: StudyViewProps) {
  const { edital, currentCycle, sessions = [] } = state;

  // Flattened list of disciplines from the active study cycle
  const disciplinas = useMemo(() => {
    const list: Disciplina[] = [];
    edital.categorias.forEach((cat) => {
      cat.disciplinas.forEach((d) => {
        list.push(d);
      });
    });
    return list;
  }, [edital]);

  // Support for custom block ordering (moved and positioned at user's discretion)
  const [orderedDisciplinas, setOrderedDisciplinas] = useState<Disciplina[]>([]);

  useEffect(() => {
    if (disciplinas.length === 0) {
      setOrderedDisciplinas([]);
      return;
    }
    const cachedOrder = localStorage.getItem(`ciclo_order_${edital.orgao}_${edital.cargo}`);
    if (cachedOrder) {
      try {
        const orderIds = JSON.parse(cachedOrder) as string[];
        const sorted = [...disciplinas].sort((a, b) => {
          const idxA = orderIds.indexOf(a.id);
          const idxB = orderIds.indexOf(b.id);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
        setOrderedDisciplinas(sorted);
        return;
      } catch (e) {
        console.error("Erro ao carregar ordem customizada de blocos:", e);
      }
    }
    setOrderedDisciplinas(disciplinas);
  }, [disciplinas, edital.orgao, edital.cargo]);

  // Keys for local storage persistence per edital & cycle
  const storageKey = useMemo(() => {
    const safeOrgao = (edital.orgao || "default").replace(/\s+/g, "_");
    const safeCargo = (edital.cargo || "default").replace(/\s+/g, "_");
    return `study_timers_${safeOrgao}_${safeCargo}_c${currentCycle}`;
  }, [edital.orgao, edital.cargo, currentCycle]);

  const discStorageKey = useMemo(() => {
    const safeOrgao = (edital.orgao || "default").replace(/\s+/g, "_");
    const safeCargo = (edital.cargo || "default").replace(/\s+/g, "_");
    return `study_disc_${safeOrgao}_${safeCargo}_c${currentCycle}`;
  }, [edital.orgao, edital.cargo, currentCycle]);

  // Selected active block/discipline ID
  const [selectedDiscId, setSelectedDiscId] = useState<string>("");

  useEffect(() => {
    if (orderedDisciplinas.length > 0) {
      const savedDiscId = localStorage.getItem(discStorageKey);
      if (savedDiscId && orderedDisciplinas.some((d) => d.id === savedDiscId)) {
        setSelectedDiscId(savedDiscId);
      } else if (!selectedDiscId || !orderedDisciplinas.some((d) => d.id === selectedDiscId)) {
        setSelectedDiscId(orderedDisciplinas[0].id);
      }
    }
  }, [orderedDisciplinas, discStorageKey]);

  useEffect(() => {
    if (selectedDiscId && discStorageKey) {
      localStorage.setItem(discStorageKey, selectedDiscId);
    }
  }, [selectedDiscId, discStorageKey]);

  const activeDisciplina = useMemo(() => {
    return orderedDisciplinas.find((d) => d.id === selectedDiscId) || null;
  }, [orderedDisciplinas, selectedDiscId]);

  // Selected topic for detailing daily question registers
  const [activeAssuntoId, setActiveAssuntoId] = useState<string | null>(null);

  // --- TIMER STATE WITH INDIVIDUAL BLOCK PERSISTENCE & CYCLE EXPIRATION ---
  // Store remaining seconds for each block (key is disciplineId)
  const [blockTimers, setBlockTimers] = useState<{ [id: string]: number }>({});
  const blockTimersRef = useRef(blockTimers);
  
  useEffect(() => {
    blockTimersRef.current = blockTimers;
  }, [blockTimers]);

  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Load blockTimers from localStorage when storageKey or disciplinas changes
  useEffect(() => {
    if (disciplinas.length === 0) return;

    let loadedTimers: { [id: string]: number } = {};
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          loadedTimers = parsed;
        }
      } catch (err) {
        console.error("Erro ao carregar tempos salvos do ciclo:", err);
      }
    }

    const mergedTimers: { [id: string]: number } = {};
    disciplinas.forEach((d) => {
      if (loadedTimers[d.id] !== undefined && typeof loadedTimers[d.id] === "number") {
        mergedTimers[d.id] = loadedTimers[d.id];
      } else {
        mergedTimers[d.id] = (d.horasPorCiclo || 1.0) * 3600;
      }
    });

    setBlockTimers(mergedTimers);
  }, [storageKey, disciplinas]);

  // Save blockTimers to localStorage whenever blockTimers state updates
  useEffect(() => {
    if (Object.keys(blockTimers).length > 0 && storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(blockTimers));
      } catch (err) {
        console.error("Erro ao salvar tempos do ciclo:", err);
      }
    }
  }, [blockTimers, storageKey]);

  // --- SOUND AND VISUAL NOTIFICATION SIGNAL ---
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const [notificationAlert, setNotificationAlert] = useState<{
    show: boolean;
    title: string;
    message: string;
    submessage?: string;
    type: 'block' | 'cycle';
    blocoNome?: string;
    proximoBlocoNome?: string;
    cicloNumero?: number;
  } | null>(null);

  const playNotificationSound = (type: 'block' | 'cycle' = 'block') => {
    if (!soundEnabledRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'block') {
        // Double chime for block completion (D5 -> A5)
        const notes = [587.33, 880];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.2);
          gain.gain.setValueAtTime(0.35, ctx.currentTime + idx * 0.2);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.2 + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.2);
          osc.stop(ctx.currentTime + idx * 0.2 + 0.5);
        });
      } else {
        // Triumph fanfare chord sequence for cycle completion (C5 -> E5 -> G5 -> C6)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);
          gain.gain.setValueAtTime(0.4, ctx.currentTime + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.15 + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.15);
          osc.stop(ctx.currentTime + idx * 0.15 + 0.65);
        });
      }
    } catch (err) {
      console.error("Erro ao reproduzir alerta sonoro:", err);
    }
  };

  // Form editing for manual override of active block timer
  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [timerInputHours, setTimerInputHours] = useState(1);
  const [timerInputMinutes, setTimerInputMinutes] = useState(0);
  const [timerInputSeconds, setTimerInputSeconds] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize input fields when the active block or its timer state changes
  useEffect(() => {
    if (activeDisciplina) {
      const plannedSecs = (activeDisciplina.horasPorCiclo || 1.0) * 3600;
      const currentRemaining = blockTimers[activeDisciplina.id] !== undefined ? blockTimers[activeDisciplina.id] : plannedSecs;
      setTimerInputHours(Math.floor(currentRemaining / 3600));
      setTimerInputMinutes(Math.floor((currentRemaining % 3600) / 60));
      setTimerInputSeconds(currentRemaining % 60);
    }
  }, [selectedDiscId, activeDisciplina, blockTimers]);

  // Handle study session history registration
  const handleSaveStudySessionForId = (discId: string, plannedSeconds: number) => {
    const disc = disciplinas.find(d => d.id === discId);
    if (!disc) return;

    const remaining = blockTimers[discId] !== undefined ? blockTimers[discId] : plannedSeconds;
    const elapsedSeconds = plannedSeconds - remaining;
    const elapsedMins = elapsedSeconds > 0 ? Math.round(elapsedSeconds / 60) : Math.round(plannedSeconds / 60);

    const newSession = {
      id: "session_" + Date.now(),
      disciplinaId: disc.id,
      disciplinaNome: disc.nome,
      data: new Date().toISOString().split("T")[0],
      duracaoMinutos: elapsedMins || 45,
      questoesAcertos: 0,
      questoesErros: 0,
      ciclo: currentCycle
    };

    updateState({
      ...state,
      sessions: [...state.sessions, newSession]
    });
  };

  // Process core study session cycle expiration
  const handleCycleCompleted = () => {
    const nextCycle = currentCycle + 1;
    updateState({
      ...state,
      currentCycle: nextCycle
    });

    const safeOrgao = (edital.orgao || "default").replace(/\s+/g, "_");
    const safeCargo = (edital.cargo || "default").replace(/\s+/g, "_");
    const nextStorageKey = `study_timers_${safeOrgao}_${safeCargo}_c${nextCycle}`;

    // Reset all block timers back to their original estimated plan
    const resetTimers: { [id: string]: number } = {};
    disciplinas.forEach((d) => {
      resetTimers[d.id] = (d.horasPorCiclo || 1.0) * 3600;
    });
    setBlockTimers(resetTimers);
    setIsTimerRunning(false);

    try {
      localStorage.setItem(nextStorageKey, JSON.stringify(resetTimers));
    } catch (e) {
      console.error("Erro ao salvar tempos do novo ciclo:", e);
    }

    // Audio sound chime + visual notification modal
    playNotificationSound('cycle');
    setNotificationAlert({
      show: true,
      title: `🏆 Ciclo nº ${currentCycle} Finalizado!`,
      message: `Parabéns! Todos os blocos do Ciclo de Estudos foram concluídos com sucesso!`,
      submessage: `O Ciclo nº ${nextCycle} foi iniciado e os tempos de todos os blocos foram renovados.`,
      type: 'cycle',
      cicloNumero: currentCycle
    });
  };

  // Core Timer Interval loop hook
  useEffect(() => {
    if (isTimerRunning && selectedDiscId) {
      intervalRef.current = setInterval(() => {
        const disc = disciplinas.find(d => d.id === selectedDiscId);
        if (!disc) return;
        const plannedSecs = (disc.horasPorCiclo || 1.0) * 3600;
        const currentRemaining = blockTimersRef.current[selectedDiscId] !== undefined ? blockTimersRef.current[selectedDiscId] : plannedSecs;

        if (currentRemaining <= 1) {
          setBlockTimers((prev) => ({ ...prev, [selectedDiscId]: 0 }));
          setIsTimerRunning(false);
          if (intervalRef.current) clearInterval(intervalRef.current);

          // Play audio notification chime for block completion
          playNotificationSound('block');

          // Automatically open "Registrar Tempo Estudado & Questões" modal
          const plannedSecs = (disc.horasPorCiclo || 1.0) * 3600;
          const mins = Math.max(1, Math.round(plannedSecs / 60));
          setSessionInputMinutes(mins);
          setSessionInputAcertos(0);
          setSessionInputErros(0);
          setSessionInputDate(new Date().toISOString().split("T")[0]);
          setSessionInputCiclo(currentCycle);
          setShowRegisterSessionModal(true);
        } else {
          setBlockTimers((prev) => ({ ...prev, [selectedDiscId]: currentRemaining - 1 }));
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isTimerRunning, selectedDiscId, disciplinas, orderedDisciplinas, currentCycle]);

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    if (!activeDisciplina) return;
    setIsTimerRunning(false);
    const plannedSecs = (activeDisciplina.horasPorCiclo || 1.0) * 3600;
    setBlockTimers(prev => ({
      ...prev,
      [activeDisciplina.id]: plannedSecs
    }));
  };

  const handleSaveCustomTimer = () => {
    if (!activeDisciplina) return;
    const totalSecs = (timerInputHours * 3600) + (timerInputMinutes * 60) + timerInputSeconds;
    setBlockTimers(prev => ({
      ...prev,
      [activeDisciplina.id]: totalSecs
    }));
    setIsEditingTimer(false);
  };

  // Helper formatting for block bar displaying timer progress
  const getBlockTimerState = (discId: string) => {
    const disc = disciplinas.find(d => d.id === discId);
    const plannedSecs = (disc?.horasPorCiclo || 1.0) * 3600;
    const remaining = blockTimers[discId] !== undefined ? blockTimers[discId] : plannedSecs;
    const elapsed = Math.max(0, plannedSecs - remaining);
    const pct = Math.min((elapsed / plannedSecs) * 100, 100);

    const hrs = Math.floor(remaining / 3600);
    const mins = Math.floor((remaining % 3600) / 60);
    const secs = remaining % 60;
    const formatted = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    return { remaining, elapsed, pct, formatted, plannedSecs };
  };

  // Helper formatting for overall cycle progress
  const cycleProgress = useMemo(() => {
    let totalPlannedSecs = 0;
    let totalRemainingSecs = 0;

    orderedDisciplinas.forEach((d) => {
      const plannedSecs = (d.horasPorCiclo || 1.0) * 3600;
      const remaining = blockTimers[d.id] !== undefined ? blockTimers[d.id] : plannedSecs;
      totalPlannedSecs += plannedSecs;
      totalRemainingSecs += remaining;
    });

    const totalElapsedSecs = Math.max(0, totalPlannedSecs - totalRemainingSecs);
    const totalPct = totalPlannedSecs > 0 ? Math.min((totalElapsedSecs / totalPlannedSecs) * 100, 100) : 0;

    const elapsedHours = (totalElapsedSecs / 3600).toFixed(1);
    const plannedHours = (totalPlannedSecs / 3600).toFixed(1);

    const remHrs = Math.floor(totalRemainingSecs / 3600);
    const remMins = Math.floor((totalRemainingSecs % 3600) / 60);
    const remSecs = totalRemainingSecs % 60;
    const formattedRemaining = `${String(remHrs).padStart(2, "0")}:${String(remMins).padStart(2, "0")}:${String(remSecs).padStart(2, "0")}`;

    const isCompleted = totalPlannedSecs > 0 && totalRemainingSecs <= 0;

    return {
      totalPlannedSecs,
      totalRemainingSecs,
      totalElapsedSecs,
      totalPct,
      elapsedHours,
      plannedHours,
      formattedRemaining,
      isCompleted
    };
  }, [orderedDisciplinas, blockTimers]);

  // --- DRAG AND DROP REORDERING EVENT HANDLERS ---
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const novos = [...orderedDisciplinas];
    const draggedItem = novos[draggedIndex];
    novos.splice(draggedIndex, 1);
    novos.splice(index, 0, draggedItem);
    setOrderedDisciplinas(novos);
    localStorage.setItem(`ciclo_order_${edital.orgao}_${edital.cargo}`, JSON.stringify(novos.map(d => d.id)));
    setDraggedIndex(null);
  };

  const moverBloco = (index: number, direcao: "up" | "down") => {
    const novos = [...orderedDisciplinas];
    const targetIndex = direcao === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < novos.length) {
      const temp = novos[index];
      novos[index] = novos[targetIndex];
      novos[targetIndex] = temp;
      setOrderedDisciplinas(novos);
      localStorage.setItem(`ciclo_order_${edital.orgao}_${edital.cargo}`, JSON.stringify(novos.map(d => d.id)));
    }
  };

  // --- FORM STATES FOR REGISTERING TOPICS AND QUESTION LOGS ---
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicIncidencia, setNewTopicIncidencia] = useState<"ALTA" | "MÉDIA" | "BAIXA">("MÉDIA");
  
  const [newLogDate, setNewLogDate] = useState(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${m}/${d.getFullYear()}`;
  });
  const [newLogAcertos, setNewLogAcertos] = useState<number>(0);
  const [newLogErros, setNewLogErros] = useState<number>(0);

  // --- FILTERS STATE FOR "ESTUDAR" TOPICS LISTING ---
  const [filterText, setFilterText] = useState("");
  const [filterIncidencia, setFilterIncidencia] = useState<"TODAS" | "ALTA" | "MÉDIA" | "BAIXA">("TODAS");
  const [filterStatus, setFilterStatus] = useState<"TODOS" | "NÃO ESTUDADO" | "ESTUDADO" | "REVISADO">("TODOS");

  // --- COMPACT / ENXUTO MODE FOR CONTROLE DE CONTEÚDO PROGRAMÁTICO ---
  const [modoEnxuto, setModoEnxuto] = useState<boolean>(() => {
    const saved = localStorage.getItem("study_conteudo_enxuto");
    return saved !== null ? saved === "true" : true;
  });

  const toggleModoEnxuto = () => {
    setModoEnxuto(prev => {
      const next = !prev;
      localStorage.setItem("study_conteudo_enxuto", String(next));
      return next;
    });
  };

  // --- RECTIFY / MANAGE TOPIC LOGS AND CREATION ---
  const handleAddTopic = () => {
    if (!newTopicName.trim() || !activeDisciplina) return;

    const topicNum = String(activeDisciplina.assuntos.length + 1).padStart(2, "0");
    const formattedName = `${topicNum} - ${newTopicName.trim()}`;

    const newAssunto: Assunto = {
      id: "ass_" + Date.now(),
      nome: formattedName,
      registros: [],
      incidencia: newTopicIncidencia,
      status: "NÃO ESTUDADO"
    };

    const updatedCategorias = edital.categorias.map((cat) => {
      return {
        ...cat,
        disciplinas: cat.disciplinas.map((disc) => {
          if (disc.id === activeDisciplina.id) {
            return {
              ...disc,
              assuntos: [...disc.assuntos, newAssunto]
            };
          }
          return disc;
        })
      };
    });

    updateState({
      ...state,
      edital: {
        ...edital,
        categorias: updatedCategorias
      }
    });

    setNewTopicName("");
  };

  const handleDeleteTopic = (assuntoId: string) => {
    if (!activeDisciplina) return;

    const updatedCategorias = edital.categorias.map((cat) => {
      return {
        ...cat,
        disciplinas: cat.disciplinas.map((disc) => {
          if (disc.id === activeDisciplina.id) {
            return {
              ...disc,
              assuntos: disc.assuntos.filter((ass) => ass.id !== assuntoId)
            };
          }
          return disc;
        })
      };
    });

    updateState({
      ...state,
      edital: {
        ...edital,
        categorias: updatedCategorias
      }
    });

    if (activeAssuntoId === assuntoId) {
      setActiveAssuntoId(null);
    }
  };

  const handleUpdateTopic = (topicId: string, updates: Partial<Assunto>) => {
    if (!activeDisciplina) return;

    const updatedCategorias = edital.categorias.map((cat) => {
      return {
        ...cat,
        disciplinas: cat.disciplinas.map((disc) => {
          if (disc.id === activeDisciplina.id) {
            return {
              ...disc,
              assuntos: disc.assuntos.map((ass) => {
                if (ass.id === topicId) {
                  return {
                    ...ass,
                    ...updates
                  };
                }
                return ass;
              })
            };
          }
          return disc;
        })
      };
    });

    updateState({
      ...state,
      edital: {
        ...edital,
        categorias: updatedCategorias
      }
    });
  };

  const handleAddQuestionLog = (assuntoId: string) => {
    if (newLogAcertos < 0 || newLogErros < 0) return;

    const total = newLogAcertos + newLogErros;

    // Convert date string from DD/MM/YYYY to YYYY-MM-DD if needed
    let formattedDate = newLogDate;
    if (newLogDate.includes("/")) {
      const pts = newLogDate.split("/");
      if (pts.length === 3) {
        formattedDate = `${pts[2]}-${pts[1].padStart(2, "0")}-${pts[0].padStart(2, "0")}`;
      }
    }

    const newReg: RegistroQuestao = {
      id: "reg_" + Date.now(),
      data: formattedDate,
      acertos: newLogAcertos,
      erros: newLogErros,
      total: total
    };

    const updatedCategorias = edital.categorias.map((cat) => {
      return {
        ...cat,
        disciplinas: cat.disciplinas.map((disc) => {
          if (disc.id === selectedDiscId) {
            return {
              ...disc,
              assuntos: disc.assuntos.map((ass) => {
                if (ass.id === assuntoId) {
                  return {
                    ...ass,
                    registros: [...ass.registros, newReg]
                  };
                }
                return ass;
              })
            };
          }
          return disc;
        })
      };
    });

    updateState({
      ...state,
      edital: {
        ...edital,
        categorias: updatedCategorias
      }
    });

    setNewLogAcertos(0);
    setNewLogErros(0);
  };

  const handleDeleteQuestionLog = (assuntoId: string, logId: string) => {
    const updatedCategorias = edital.categorias.map((cat) => {
      return {
        ...cat,
        disciplinas: cat.disciplinas.map((disc) => {
          if (disc.id === selectedDiscId) {
            return {
              ...disc,
              assuntos: disc.assuntos.map((ass) => {
                if (ass.id === assuntoId) {
                  return {
                    ...ass,
                    registros: ass.registros.filter((r) => r.id !== logId)
                  };
                }
                return ass;
              })
            };
          }
          return disc;
        })
      };
    });

    updateState({
      ...state,
      edital: {
        ...edital,
        categorias: updatedCategorias
      }
    });
  };

  // Retrieve combined question stats for each block
  const getBlockQuestionStats = (disc: Disciplina) => {
    let acertos = 0;
    let erros = 0;

    // 1. Questions from topic daily records (Controle de Conteúdo Programático)
    if (disc && disc.assuntos) {
      disc.assuntos.forEach((ass) => {
        if (ass.registros) {
          ass.registros.forEach((reg) => {
            acertos += reg.acertos || 0;
            erros += reg.erros || 0;
          });
        }
      });
    }

    // 2. Fallback to sessions if topic registros are empty for this discipline
    const topicTotal = acertos + erros;
    if (topicTotal === 0) {
      sessions.filter(s => s.disciplinaId === disc.id).forEach(s => {
        acertos += s.questoesAcertos || 0;
        erros += s.questoesErros || 0;
      });
    }

    return { acertos, erros, total: acertos + erros };
  };

  // Retrieve specific topic daily logs totals
  const getTopicTotals = (assunto: Assunto) => {
    let acertos = 0;
    let erros = 0;
    assunto.registros.forEach((r) => {
      acertos += r.acertos || 0;
      erros += r.erros || 0;
    });
    return {
      acertos,
      erros,
      total: acertos + erros
    };
  };

  // Manual session & question log modal state
  const [showRegisterSessionModal, setShowRegisterSessionModal] = useState(false);
  const [sessionInputMinutes, setSessionInputMinutes] = useState(30);
  const [sessionInputAcertos, setSessionInputAcertos] = useState(0);
  const [sessionInputErros, setSessionInputErros] = useState(0);
  const [sessionInputDate, setSessionInputDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [sessionInputCiclo, setSessionInputCiclo] = useState<number>(1);

  // Edit existing session state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionDate, setEditSessionDate] = useState<string>("");
  const [editSessionMinutes, setEditSessionMinutes] = useState<number>(0);
  const [editSessionAcertos, setEditSessionAcertos] = useState<number>(0);
  const [editSessionErros, setEditSessionErros] = useState<number>(0);
  const [editSessionCiclo, setEditSessionCiclo] = useState<number>(1);
  const [editSessionDisciplinaId, setEditSessionDisciplinaId] = useState<string>("");

  const handleOpenRegisterModal = () => {
    if (!activeDisciplina) return;
    const timerState = getBlockTimerState(activeDisciplina.id);
    const elapsedMins = Math.max(1, Math.round(timerState.elapsed / 60));
    setSessionInputMinutes(elapsedMins > 0 ? elapsedMins : 30);
    setSessionInputAcertos(0);
    setSessionInputErros(0);
    setSessionInputDate(new Date().toISOString().split("T")[0]);
    setSessionInputCiclo(currentCycle);
    setShowRegisterSessionModal(true);
  };

  const handleStartEditSession = (session: any) => {
    setEditingSessionId(session.id);
    setEditSessionDate(session.data || new Date().toISOString().split("T")[0]);
    setEditSessionMinutes(session.duracaoMinutos || 0);
    setEditSessionAcertos(session.questoesAcertos || 0);
    setEditSessionErros(session.questoesErros || 0);
    setEditSessionCiclo(session.ciclo || currentCycle);
    setEditSessionDisciplinaId(session.disciplinaId || "");
  };

  const handleConfirmEditSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSessionId) return;

    const targetDisc = disciplinas.find((d) => d.id === editSessionDisciplinaId);

    const updatedSessions = state.sessions.map((s) => {
      if (s.id === editingSessionId) {
        return {
          ...s,
          disciplinaId: targetDisc ? targetDisc.id : s.disciplinaId,
          disciplinaNome: targetDisc ? targetDisc.nome : s.disciplinaNome,
          data: editSessionDate,
          duracaoMinutos: Math.max(0, Number(editSessionMinutes) || 0),
          questoesAcertos: Math.max(0, Number(editSessionAcertos) || 0),
          questoesErros: Math.max(0, Number(editSessionErros) || 0),
          ciclo: Math.max(1, Number(editSessionCiclo) || 1)
        };
      }
      return s;
    });

    updateState({
      ...state,
      sessions: updatedSessions
    });

    setEditingSessionId(null);
  };

  const handleConfirmRegisterSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDisciplina) return;

    const mins = Math.max(0, Number(sessionInputMinutes) || 0);
    const acertos = Math.max(0, Number(sessionInputAcertos) || 0);
    const erros = Math.max(0, Number(sessionInputErros) || 0);

    const newSession = {
      id: "session_" + Date.now(),
      disciplinaId: activeDisciplina.id,
      disciplinaNome: activeDisciplina.nome,
      data: sessionInputDate || new Date().toISOString().split("T")[0],
      duracaoMinutos: mins,
      questoesAcertos: acertos,
      questoesErros: erros,
      ciclo: sessionInputCiclo || currentCycle
    };

    let updatedCategorias = edital.categorias;
    if (acertos > 0 || erros > 0) {
      const formattedDate = sessionInputDate || new Date().toISOString().split("T")[0];
      const newReg: RegistroQuestao = {
        id: "reg_session_" + Date.now(),
        data: formattedDate,
        acertos: acertos,
        erros: erros,
        total: acertos + erros
      };

      updatedCategorias = edital.categorias.map((cat) => ({
        ...cat,
        disciplinas: cat.disciplinas.map((disc) => {
          if (disc.id === activeDisciplina.id) {
            let targetAssuntos = disc.assuntos || [];
            if (targetAssuntos.length === 0) {
              targetAssuntos = [{
                id: "ass_" + Date.now(),
                nome: "01 - Conteúdo Geral da Matéria",
                registros: []
              }];
            }
            return {
              ...disc,
              assuntos: targetAssuntos.map((ass, idx) => {
                if (idx === 0) {
                  return {
                    ...ass,
                    registros: [...(ass.registros || []), newReg]
                  };
                }
                return ass;
              })
            };
          }
          return disc;
        })
      }));
    }

    updateState({
      ...state,
      edital: {
        ...edital,
        categorias: updatedCategorias
      },
      sessions: [...state.sessions, newSession]
    });

    setShowRegisterSessionModal(false);
    setIsTimerRunning(false);

    // Reduce remaining block timer by recorded minutes
    const currentRemaining = blockTimers[activeDisciplina.id] !== undefined 
      ? blockTimers[activeDisciplina.id] 
      : (activeDisciplina.horasPorCiclo || 1.0) * 3600;
    
    const newRemaining = Math.max(0, currentRemaining - mins * 60);
    const updatedTimers = {
      ...blockTimers,
      [activeDisciplina.id]: newRemaining
    };
    setBlockTimers(updatedTimers);

    // Auto transition to next block in sequence if present
    const currIdx = orderedDisciplinas.findIndex(d => d.id === activeDisciplina.id);
    if (currIdx !== -1 && currIdx < orderedDisciplinas.length - 1) {
      const nextDisc = orderedDisciplinas[currIdx + 1];
      setSelectedDiscId(nextDisc.id);

      setNotificationAlert({
        show: true,
        title: "⏰ Tempo do Bloco Concluído e Registrado!",
        message: `Sessão de ${mins} min e questões registradas com sucesso para "${activeDisciplina.nome}".`,
        submessage: `Iniciando o próximo bloco da sequência: "${nextDisc.nome}".`,
        type: 'block',
        blocoNome: activeDisciplina.nome,
        proximoBlocoNome: nextDisc.nome
      });
    } else if (currIdx === orderedDisciplinas.length - 1) {
      // Last block in sequence: check if all blocks in cycle are finished
      const allFinished = orderedDisciplinas.every(d => {
        const rem = d.id === activeDisciplina.id ? newRemaining : (updatedTimers[d.id] !== undefined ? updatedTimers[d.id] : (d.horasPorCiclo || 1.0) * 3600);
        return rem <= 0;
      });

      if (allFinished) {
        handleCycleCompleted();
      } else {
        setNotificationAlert({
          show: true,
          title: "⏰ Bloco Concluído e Registrado!",
          message: `Sessão de ${mins} min registrada para "${activeDisciplina.nome}".`,
          submessage: `Todos os blocos deste ciclo foram finalizados!`,
          type: 'block',
          blocoNome: activeDisciplina.nome
        });
      }
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    updateState({
      ...state,
      sessions: state.sessions.filter(s => s.id !== sessionId)
    });
  };

  // --- AI-POWERED TEST BOOKLET ANALYZER ---
  const [showAIAnalyzer, setShowAIAnalyzer] = useState(false);
  const [analyzerStatus, setAnalyzerStatus] = useState("");
  const [analyzerError, setAnalyzerError] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState("");
  const [fileMimeType, setFileMimeType] = useState("");
  const [manualText, setManualText] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setAnalyzerError("");

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const splitData = base64String.split(",");
      if (splitData.length > 1) {
        setFileBase64(splitData[1]);
        setFileMimeType(file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRunAIAnalysis = async () => {
    if (!activeDisciplina) return;
    if (!fileBase64 && !manualText.trim()) {
      setAnalyzerError("Por favor, anexe um arquivo PDF/Imagem ou cole o texto das questões.");
      return;
    }

    setAnalyzerStatus("Iniciando análise com Gemini AI...");
    setAnalyzerError("");

    try {
      const payload = {
        pdfBase64: fileBase64 || undefined,
        pdfMimeType: fileMimeType || undefined,
        text: manualText.trim() || undefined,
        assuntos: activeDisciplina.assuntos.map(a => a.nome)
      };

      const res = await fetch("/api/scan-caderno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro de processamento no servidor.");
      }

      const data = await res.json();
      if (data.classificacoes && Array.isArray(data.classificacoes)) {
        // Map returned incidences back to topics
        const updatedCategorias = edital.categorias.map((cat) => {
          return {
            ...cat,
            disciplinas: cat.disciplinas.map((disc) => {
              if (disc.id === activeDisciplina.id) {
                return {
                  ...disc,
                  assuntos: disc.assuntos.map((ass) => {
                    const match = data.classificacoes.find(
                      (item: any) => 
                        (item?.assunto || "").toLowerCase().includes((ass?.nome || "").toLowerCase()) || 
                        (ass?.nome || "").toLowerCase().includes((item?.assunto || "").toLowerCase())
                    );
                    if (match) {
                      return {
                        ...ass,
                        incidencia: (match.incidencia as "ALTA" | "MÉDIA" | "BAIXA") || "MÉDIA"
                      };
                    }
                    return ass;
                  })
                };
              }
              return disc;
            })
          };
        });

        updateState({
          ...state,
          edital: {
            ...edital,
            categorias: updatedCategorias
          }
        });

        setAnalyzerStatus("");
        alert("Análise concluída com sucesso! Os assuntos foram categorizados por relevância.");
        setShowAIAnalyzer(false);
        setUploadedFile(null);
        setFileBase64("");
        setManualText("");
      } else {
        throw new Error("Formato de resposta inválido do modelo de Inteligência Artificial.");
      }
    } catch (error: any) {
      console.error(error);
      setAnalyzerError(error.message || "Não foi possível conectar ao servidor de IA.");
      setAnalyzerStatus("");
    }
  };

  // Filter topics in real time
  const filteredTopics = useMemo(() => {
    if (!activeDisciplina) return [];
    return activeDisciplina.assuntos.filter((ass) => {
      const matchesText = (ass?.nome || "").toLowerCase().includes((filterText || "").toLowerCase());
      
      const currentInc = ass.incidencia || "MÉDIA";
      const matchesInc = filterIncidencia === "TODAS" || currentInc === filterIncidencia;
      
      const currentStatus = ass.status || "NÃO ESTUDADO";
      const matchesStatus = filterStatus === "TODOS" || currentStatus === filterStatus;

      return matchesText && matchesInc && matchesStatus;
    });
  }, [activeDisciplina, filterText, filterIncidencia, filterStatus]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in font-sans">
      
      {/* PAINEL DO TEMPORIZADOR & SEQUÊNCIA DOS BLOCOS DO CICLO (50% / COL-SPAN-6) */}
      <div className="min-w-0 flex flex-col">
        
        {/* Unified study loop control card */}
        <div className={`p-4 sm:p-6 rounded-2xl border transition-all flex flex-col flex-1 min-w-0 ${
          darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
        }`}>
          
          {/* Section 1: Ciclo de Estudos em Curso (Compact indicator & Overall Progress Bar) */}
          <div className="pb-4 mb-4 border-b border-gray-100/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600/10 text-blue-500 font-extrabold text-xl shrink-0">
                  {currentCycle}
                </div>
                <div className="min-w-0">
                  <h4 className={`text-xs font-bold uppercase tracking-wider truncate ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    Ciclo em Curso
                  </h4>
                  <p className={`text-[11px] truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Seus blocos estão no ciclo nº <strong>{currentCycle}</strong>.
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                darkMode ? "bg-blue-900/30 text-blue-300" : "bg-blue-50 text-blue-700"
              }`}>
                Ativo
              </span>
            </div>

            {/* Overall Cycle Progress Bar */}
            <div className={`relative overflow-hidden p-3 rounded-xl border mt-3 transition-all ${
              darkMode ? "border-[#1e2d4d] bg-[#111e3b]/40" : "border-gray-200 bg-gray-50/70"
            }`}>
              {/* Progress Filling Overlay */}
              <div 
                className="absolute left-0 top-0 bottom-0 transition-all duration-1000 ease-out" 
                style={{ 
                  width: `${cycleProgress.totalPct}%`, 
                  backgroundColor: cycleProgress.isCompleted ? "#10b981" : "#3b82f6",
                  opacity: darkMode ? 0.08 : 0.05
                }} 
              />

              {/* Top Row: Title & Formatted Time */}
              <div className="relative z-10 flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest block">
                    PROGRESSO GERAL DO CICLO
                  </span>
                  <h4 className={`text-xs font-bold truncate ${darkMode ? "text-white" : "text-gray-900"}`}>
                    Andamento do Ciclo {currentCycle}
                  </h4>
                </div>

                <div className="text-right flex flex-col items-end shrink-0">
                  <span className={`text-[11px] font-mono font-extrabold whitespace-nowrap ${
                    cycleProgress.isCompleted ? "text-emerald-500" : darkMode ? "text-blue-300" : "text-blue-600"
                  }`}>
                    {cycleProgress.isCompleted ? "CONCLUÍDO" : cycleProgress.formattedRemaining}
                  </span>
                  <span className={`text-[9px] ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Meta Total: {cycleProgress.plannedHours}h
                  </span>
                </div>
              </div>

              {/* Progress Bar Line */}
              <div className="relative z-10 w-full bg-gray-200/50 dark:bg-gray-800/60 h-1.5 rounded-full overflow-hidden mt-2.5">
                <div 
                  className="h-full transition-all duration-1000 ease-out rounded-full"
                  style={{ 
                    width: `${cycleProgress.totalPct}%`, 
                    backgroundColor: cycleProgress.isCompleted ? "#10b981" : "#3b82f6"
                  }} 
                />
              </div>

              {/* Bottom Row Metrics */}
              <div className="relative z-10 flex justify-between items-center mt-2.5 pt-1.5 border-t border-gray-100/10 text-[9px] gap-2">
                <span className={`font-semibold uppercase tracking-wider truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Concluído: <span className={darkMode ? "text-white" : "text-gray-800"}>{cycleProgress.elapsedHours}h</span> ({cycleProgress.totalPct.toFixed(1)}%)
                </span>
                <span className={`font-semibold uppercase tracking-wider shrink-0 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {orderedDisciplinas.length} {orderedDisciplinas.length === 1 ? "bloco" : "blocos"}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Temporizador Geral (Proportionally Scalable Display) */}
          {activeDisciplina && (
            <div className="flex flex-col items-center justify-center pb-5 mb-5 border-b border-gray-100/10 relative overflow-hidden w-full">
              <h4 className={`text-xs sm:text-sm font-bold uppercase tracking-wider mb-2 text-center truncate max-w-full px-2 ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}>
                Temporizador Geral: <strong className="text-blue-500">{activeDisciplina.nome}</strong>
              </h4>

              {/* Visual Timer Display (Fluidly Scalable & Proportion-Preserving) */}
              <div className="relative w-full max-w-[260px] sm:max-w-[300px] md:max-w-[340px] aspect-square flex flex-col items-center justify-center my-2 select-none mx-auto">
                <svg viewBox="0 0 240 240" className="w-full h-full absolute inset-0 transform -rotate-90">
                  <circle cx="120" cy="120" r="102" fill="transparent" stroke={darkMode ? "#1e2d4d" : "#e2e8f0"} strokeWidth="8" />
                  <circle
                    cx="120"
                    cy="120"
                    r="102"
                    fill="transparent"
                    stroke={activeDisciplina?.cor || "#3b82f6"}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 102}
                    strokeDashoffset={2 * Math.PI * 102 * (1 - getBlockTimerState(activeDisciplina.id).pct / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>

                {isEditingTimer ? (
                  <div className="z-10 flex flex-col items-center space-y-2 bg-[#101b35] p-3 rounded-2xl border border-blue-600/30 shadow-2xl max-w-[220px]">
                    <span className="text-[10px] font-extrabold uppercase text-blue-400 tracking-wider">Ajustar Tempo (H:M:S)</span>
                    <div className="flex items-center space-x-1.5">
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] text-gray-400 uppercase font-bold mb-0.5">Horas</span>
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={timerInputHours}
                          onChange={(e) => setTimerInputHours(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-12 text-center py-1 bg-[#0b1329] border border-gray-700 text-white rounded-lg font-mono font-bold text-xs focus:border-blue-500 outline-none"
                        />
                      </div>
                      <span className="text-white text-xs font-bold pt-3">:</span>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] text-gray-400 uppercase font-bold mb-0.5">Min</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={timerInputMinutes}
                          onChange={(e) => setTimerInputMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                          className="w-12 text-center py-1 bg-[#0b1329] border border-gray-700 text-white rounded-lg font-mono font-bold text-xs focus:border-blue-500 outline-none"
                        />
                      </div>
                      <span className="text-white text-xs font-bold pt-3">:</span>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] text-gray-400 uppercase font-bold mb-0.5">Seg</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={timerInputSeconds}
                          onChange={(e) => setTimerInputSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                          className="w-12 text-center py-1 bg-[#0b1329] border border-gray-700 text-white rounded-lg font-mono font-bold text-xs focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-1 w-full">
                      <button
                        onClick={handleSaveCustomTimer}
                        className="flex-1 py-1.5 bg-blue-600 text-white text-[11px] font-extrabold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
                      >
                        Definir
                      </button>
                      <button
                        onClick={() => setIsEditingTimer(false)}
                        className="py-1.5 px-2 bg-gray-700 text-gray-200 text-[11px] font-bold rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                      >
                        X
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="z-10 text-center cursor-pointer p-2 rounded-2xl hover:bg-blue-500/5 transition-all" onClick={() => setIsEditingTimer(true)} title="Clique para ajustar o cronômetro">
                    <span className={`text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-mono font-black tracking-tight leading-none ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                      {getBlockTimerState(activeDisciplina.id).formatted}
                    </span>
                    <p className={`text-[11px] sm:text-xs uppercase font-extrabold mt-2 tracking-wider ${
                      isTimerRunning ? "text-emerald-500 animate-pulse" : "text-gray-400"
                    }`}>
                      {isTimerRunning ? "ESTUDANDO..." : "PAUSADO"}
                    </p>
                    <p className="text-[10px] sm:text-xs text-blue-400 font-bold mt-1 hover:underline">Ajustar Tempo (H:M:S)</p>
                  </div>
                )}
              </div>

              {/* Single Core Study Controller Buttons */}
              <div className="flex items-center justify-center space-x-2.5 mt-3 w-full max-w-xs px-2">
                <button
                  onClick={toggleTimer}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    isTimerRunning
                      ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                  }`}
                >
                  {isTimerRunning ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Iniciar</span>
                    </>
                  )}
                </button>

                <button
                  onClick={resetTimer}
                  className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    darkMode
                      ? "bg-[#16223f] border-[#25365e] text-gray-300 hover:bg-[#1d2d52]"
                      : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200"
                  }`}
                  title="Reiniciar Bloco"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    const nextState = !soundEnabled;
                    setSoundEnabled(nextState);
                    if (nextState) {
                      playNotificationSound('block');
                    }
                  }}
                  className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    soundEnabled
                      ? darkMode
                        ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/60"
                        : "bg-emerald-50 border-emerald-300 text-emerald-600 hover:bg-emerald-100"
                      : darkMode
                        ? "bg-[#16223f] border-[#25365e] text-gray-500 hover:bg-[#1d2d52]"
                        : "bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200"
                  }`}
                  title={soundEnabled ? "Sinal sonoro ativo (Clique para testar ou desativar)" : "Sinal sonoro desativado (Clique para ativar)"}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>

              {/* Explicit Record Session & Questions Button */}
              <button
                onClick={handleOpenRegisterModal}
                className="w-full max-w-xs mt-3 py-2.5 px-3 rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">Registrar Tempo Estudado & Questões</span>
              </button>
            </div>
          )}

          {/* Section 3: Sequência de Blocos do Ciclo (Anti-Squish Flexible Layout) */}
          <div className="flex flex-col flex-grow min-w-0">
            <div className="flex justify-between items-center mb-2.5">
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-white" : "text-gray-800"}`}>
                  Sequência de Blocos do Ciclo
                </h3>
                <p className={`text-[10px] ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5`}>
                  Clique para estudar ou ordene usando as setas.
                </p>
              </div>
            </div>

            {/* Scrollable container for the blocks with generous responsive room */}
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
              {orderedDisciplinas.map((d, index) => {
                const isActive = d.id === selectedDiscId;
                const { pct, formatted, remaining } = getBlockTimerState(d.id);
                const qStats = getBlockQuestionStats(d);
                const isCompleted = remaining <= 0;

                return (
                  <div
                    key={d.id ? `ord-${d.id}` : `ord-idx-${index}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => setSelectedDiscId(d.id)}
                    className={`relative overflow-hidden p-3 rounded-xl border transition-all cursor-pointer group min-w-0 ${
                      isActive
                        ? darkMode
                          ? "border-blue-500 bg-[#162547] shadow-lg shadow-blue-500/5"
                          : "border-blue-600 bg-blue-50/70 shadow-sm"
                        : darkMode
                        ? "border-[#1e2d4d] bg-[#111e3b]/40 hover:bg-[#111e3b]/80"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    {/* Progress Filling Overlay */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 transition-all duration-1000 ease-out" 
                      style={{ 
                        width: `${pct}%`, 
                        backgroundColor: isCompleted ? "#10b981" : (d.cor || "#3b82f6"),
                        opacity: darkMode ? 0.08 : 0.05
                      }} 
                    />

                    {/* Left border active colored indicator stripe */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                      style={{ backgroundColor: d.cor || "#3b82f6" }}
                    />

                    {/* Top Row: Block Title & Estimated Time / Timer */}
                    <div className="relative z-10 flex justify-between items-start gap-2 min-w-0">
                      <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                        <GripVertical className="w-3.5 h-3.5 text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest block">
                            BLOCO {index + 1}
                          </span>
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`} title={d.nome}>
                            {d.nome}
                          </h4>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end shrink-0 pl-1">
                        <span className={`text-[11px] sm:text-xs font-mono font-extrabold whitespace-nowrap ${
                          isCompleted ? "text-emerald-500" : darkMode ? "text-blue-300" : "text-blue-600"
                        }`}>
                          {isCompleted ? "CONCLUÍDO" : formatted}
                        </span>
                        <span className={`text-[9px] ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          Meta: {d.horasPorCiclo || 1}h
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Line */}
                    <div className="relative z-10 w-full bg-gray-200/50 dark:bg-gray-800/60 h-1.5 rounded-full overflow-hidden mt-2">
                      <div 
                        className="h-full transition-all duration-1000 ease-out rounded-full"
                        style={{ 
                          width: `${pct}%`, 
                          backgroundColor: isCompleted ? "#10b981" : (d.cor || "#3b82f6")
                        }} 
                      />
                    </div>

                    {/* Bottom Row: Questions Metrics and Ordering arrows */}
                    <div className="relative z-10 flex justify-between items-center mt-2 pt-1.5 border-t border-gray-100/10 text-[9px] sm:text-[10px] gap-2">
                      <div className={`font-semibold uppercase tracking-wider truncate min-w-0 ${
                        darkMode ? "text-gray-400" : "text-gray-500"
                      }`}>
                        Questões: <span className={darkMode ? "text-white" : "text-gray-800"}>{qStats.total}</span> feitas 
                        {qStats.total > 0 && (
                          <span className="ml-1 text-[8px] text-emerald-500">
                            ({qStats.acertos}A / {qStats.erros}E)
                          </span>
                        )}
                      </div>

                      {/* Reordering Controls */}
                      <div className="flex space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={index === 0}
                          type="button"
                          onClick={() => moverBloco(index, "up")}
                          className={`p-0.5 rounded hover:bg-gray-100/10 disabled:opacity-30 ${
                            darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"
                          }`}
                          title="Mover para Cima"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={index === orderedDisciplinas.length - 1}
                          type="button"
                          onClick={() => moverBloco(index, "down")}
                          className={`p-0.5 rounded hover:bg-gray-100/10 disabled:opacity-30 ${
                            darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"
                          }`}
                          title="Mover para Baixo"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}

              {orderedDisciplinas.length === 0 && (
                <p className={`text-xs text-center py-6 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Nenhuma disciplina ou bloco cadastrado neste ciclo.
                </p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* CONTROLE DO CONTEÚDO PROGRAMÁTICO & ASSUNTOS (50% / COL-SPAN-6) */}
      <div className="min-w-0 flex flex-col space-y-6">
        
        <div className={`p-4 sm:p-6 rounded-2xl border transition-colors flex-1 ${
          darkMode ? "bg-[#0f1b35] border-[#1e2d4d] text-white" : "bg-white border-gray-200 shadow-sm text-gray-800"
        }`}>
          
          <div className="border-b border-gray-100/10 pb-4 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold flex items-center gap-2 truncate">
                <BookOpen className="w-5 h-5 text-blue-500 shrink-0" />
                <span className="truncate">Controle de Conteúdo Programático</span>
              </h3>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mt-0.5 truncate`}>
                Tópicos do bloco ativo: <strong className="text-blue-500">{activeDisciplina?.nome || "Selecione uma matéria"}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Toggle Modo Enxuto */}
              <button
                onClick={toggleModoEnxuto}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all border cursor-pointer ${
                  modoEnxuto
                    ? "bg-blue-600/15 border-blue-500/40 text-blue-400 hover:bg-blue-600/25"
                    : darkMode
                    ? "bg-[#16223f] border-[#25365e] text-gray-300 hover:bg-[#1d2d52]"
                    : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                }`}
                title={modoEnxuto ? "Alternar para Modo Expandido" : "Alternar para Modo Enxuto"}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                <span>{modoEnxuto ? "Modo Enxuto" : "Modo Detalhado"}</span>
              </button>

              {/* AI Analyzer toggle option */}
              {activeDisciplina && (
                <button
                  onClick={() => setShowAIAnalyzer(!showAIAnalyzer)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all border cursor-pointer ${
                    showAIAnalyzer
                      ? "bg-red-500/10 border-red-500/30 text-red-400"
                      : "bg-blue-600 border-transparent hover:bg-blue-700 text-white shadow-sm"
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${analyzerStatus ? "animate-spin" : ""}`} />
                  <span>{showAIAnalyzer ? "Cancelar IA" : "Organizar por IA"}</span>
                </button>
              )}
            </div>
          </div>

          {/* COLLAPSIBLE AREA: AI EXAM BOOKLET SCANNER */}
          {showAIAnalyzer && activeDisciplina && (
            <div className={`p-4 rounded-xl border mb-5 transition-all animate-fade-in ${
              darkMode ? "bg-[#111e3c]/50 border-blue-900/40" : "bg-blue-50/40 border-blue-100"
            }`}>
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  ANÁLISE DE CADERNO DE PROVAS POR IA
                </h4>
                <button 
                  onClick={() => setShowAIAnalyzer(false)}
                  className={`text-xs font-bold hover:underline ${darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}
                >
                  Cancelar
                </button>
              </div>

              <p className={`text-[11px] mb-4 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                Anexe o arquivo em PDF ou Imagem de um caderno de prova anterior deste concurso. A inteligência artificial irá analisar quais assuntos listados foram mais exigidos e os categorizará por relevância de estudo em <strong>ALTA</strong>, <strong>MÉDIA</strong> ou <strong>BAIXA</strong> incidência.
              </p>

              <div className="space-y-4">
                {/* File Upload Selector & Drag and Drop zone */}
                <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  uploadedFile 
                    ? "border-emerald-500/50 bg-emerald-500/5" 
                    : darkMode 
                    ? "border-[#25365e] hover:border-blue-500/50" 
                    : "border-gray-300 hover:border-blue-500/50"
                }`}>
                  <input
                    type="file"
                    accept="application/pdf, image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="booklet-upload"
                  />
                  <label htmlFor="booklet-upload" className="cursor-pointer block">
                    <Upload className={`w-8 h-8 mx-auto mb-2 ${uploadedFile ? "text-emerald-500" : "text-gray-400"}`} />
                    <span className="text-xs font-bold block">
                      {uploadedFile ? uploadedFile.name : "Clique para anexar PDF ou Imagem"}
                    </span>
                    <span className="text-[10px] text-gray-500 block mt-1">
                      Ou arraste o caderno de prova aqui
                    </span>
                  </label>
                </div>

                {/* Text Fallback Textarea option */}
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    Ou cole as questões de prova diretamente neste campo:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Cole aqui o texto ou questões do caderno de prova anterior para que a IA faça o rastreamento dos tópicos..."
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none resize-none transition-colors ${
                      darkMode
                        ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                        : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
                    }`}
                  />
                </div>

                {/* Error and processing alerts */}
                {analyzerError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{analyzerError}</span>
                  </div>
                )}

                {analyzerStatus && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                    <span>{analyzerStatus}</span>
                  </div>
                )}

                {/* Start triggering action button */}
                <button
                  disabled={!!analyzerStatus}
                  onClick={handleRunAIAnalysis}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Analisar com Inteligência Artificial</span>
                </button>
              </div>
            </div>
          )}

          {/* INSERÇÃO MANUAL DE NOVO TÓPICO COM INCIDÊNCIA */}
          {activeDisciplina && (
            <div className={`rounded-xl border mb-5 transition-all ${
              modoEnxuto
                ? "p-3 bg-gray-50/30 border-gray-200/50 dark:bg-[#111e3b]/30 dark:border-[#1e2d4d]"
                : "p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-gray-50/30 border-gray-200/50 dark:bg-transparent dark:border-[#1e2d4d]"
            }`}>
              {modoEnxuto ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="Cadastrar novo assunto programático..."
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTopic();
                    }}
                    className={`flex-1 px-3 py-1.5 rounded-lg border outline-none text-xs transition-colors ${
                      darkMode
                        ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                        : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
                    }`}
                  />
                  <select
                    value={newTopicIncidencia}
                    onChange={(e) => setNewTopicIncidencia(e.target.value as any)}
                    className={`px-2 py-1.5 rounded-lg border outline-none text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      darkMode
                        ? "bg-[#16223f] border-[#25365e] text-white"
                        : "bg-white border-gray-200 text-gray-800"
                    }`}
                  >
                    <option value="ALTA">Alta Incidência</option>
                    <option value="MÉDIA">Média Incidência</option>
                    <option value="BAIXA">Baixa Incidência</option>
                  </select>
                  <button
                    onClick={handleAddTopic}
                    className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1 transition-all cursor-pointer shadow-sm shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="md:col-span-6">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Cadastrar Assunto Manualmente
                    </label>
                    <input
                      type="text"
                      placeholder="Nome do assunto / tópico programático"
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border outline-none text-xs transition-colors ${
                        darkMode
                          ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                          : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
                      }`}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Nível de Incidência
                    </label>
                    <select
                      value={newTopicIncidencia}
                      onChange={(e) => setNewTopicIncidencia(e.target.value as any)}
                      className={`w-full px-3 py-2 rounded-xl border outline-none text-xs font-bold transition-colors cursor-pointer ${
                        darkMode
                          ? "bg-[#16223f] border-[#25365e] text-white"
                          : "bg-white border-gray-200 text-gray-800"
                      }`}
                    >
                      <option value="ALTA">Alta Incidência</option>
                      <option value="MÉDIA">Média Incidência</option>
                      <option value="BAIXA">Baixa Incidência</option>
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <button
                      onClick={handleAddTopic}
                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cadastrar</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ADVANCED FILTERS BAR */}
          {activeDisciplina && (
            <div className={`mb-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
              modoEnxuto
                ? "p-2.5 bg-gray-50/20 dark:bg-[#16223f]/20 border-gray-200/50 dark:border-[#1e2d4d]"
                : "p-4 bg-gray-50/20 dark:bg-[#16223f]/30 border-gray-200/50 dark:border-[#1e2d4d]"
            }`}>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Filtros</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 md:max-w-2xl">
                {/* Text Filter */}
                <input
                  type="text"
                  placeholder="Pesquisar assunto..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className={`px-2.5 py-1 text-xs rounded-lg border outline-none ${
                    darkMode ? "bg-[#14203d] border-[#25365e] text-white" : "bg-white border-gray-200 text-gray-800"
                  }`}
                />

                {/* Filter by Incidence */}
                <select
                  value={filterIncidencia}
                  onChange={(e) => setFilterIncidencia(e.target.value as any)}
                  className={`px-2 py-1 text-xs rounded-lg border outline-none font-semibold cursor-pointer ${
                    darkMode ? "bg-[#14203d] border-[#25365e] text-white" : "bg-white border-gray-200 text-gray-800"
                  }`}
                >
                  <option value="TODAS">Incidência: Todas</option>
                  <option value="ALTA">Alta Incidência</option>
                  <option value="MÉDIA">Média Incidência</option>
                  <option value="BAIXA">Baixa Incidência</option>
                </select>

                {/* Filter by Status */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className={`px-2 py-1 text-xs rounded-lg border outline-none font-semibold cursor-pointer ${
                    darkMode ? "bg-[#14203d] border-[#25365e] text-white" : "bg-white border-gray-200 text-gray-800"
                  }`}
                >
                  <option value="TODOS">Status: Todos</option>
                  <option value="NÃO ESTUDADO">Não Estudado</option>
                  <option value="ESTUDADO">Estudado</option>
                  <option value="REVISADO">Revisado</option>
                </select>
              </div>
            </div>
          )}

          {/* LISTAGEM DE TÓPICOS PROGRAMÁTICOS (MODO ENXUTO OU DETALHADO) */}
          <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
            {filteredTopics.map((ass, topicIdx) => {
              const totals = getTopicTotals(ass);
              const isOpen = activeAssuntoId === ass.id;
              const currentInc = ass.incidencia || "MÉDIA";
              const currentStatus = ass.status || "NÃO ESTUDADO";

              // Next status cycle helper
              const handleCycleStatus = (e: React.MouseEvent) => {
                e.stopPropagation();
                const nextStatus: "NÃO ESTUDADO" | "ESTUDADO" | "REVISADO" =
                  currentStatus === "NÃO ESTUDADO"
                    ? "ESTUDADO"
                    : currentStatus === "ESTUDADO"
                    ? "REVISADO"
                    : "NÃO ESTUDADO";
                handleUpdateTopic(ass.id, { status: nextStatus });
              };

              const handleCycleIncidence = (e: React.MouseEvent) => {
                e.stopPropagation();
                const nextInc: "ALTA" | "MÉDIA" | "BAIXA" = 
                  currentInc === "ALTA" ? "MÉDIA" : currentInc === "MÉDIA" ? "BAIXA" : "ALTA";
                handleUpdateTopic(ass.id, { incidencia: nextInc });
              };

              if (modoEnxuto) {
                // MODO ENXUTO: Linha compacta, visual limpo e direto
                return (
                  <div
                    key={ass.id ? `topic-${ass.id}` : `topic-idx-${topicIdx}`}
                    className={`border rounded-xl transition-all ${
                      isOpen
                        ? darkMode
                          ? "border-blue-500/50 bg-[#162547]/50"
                          : "border-blue-400 bg-blue-50/50"
                        : darkMode
                        ? "border-[#1e2d4d] bg-[#14203e]/30 hover:bg-[#14203e]/60"
                        : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
                    }`}
                  >
                    {/* Compact Row */}
                    <div 
                      className="py-2 px-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 cursor-pointer"
                      onClick={() => setActiveAssuntoId(isOpen ? null : ass.id)}
                    >
                      {/* Left: Status Toggle + Name + Incidência Badge */}
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        {/* 1-Click Status Badge */}
                        <button
                          type="button"
                          onClick={handleCycleStatus}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider shrink-0 transition-all cursor-pointer shadow-sm ${
                            currentStatus === "REVISADO"
                              ? "bg-emerald-600 text-white"
                              : currentStatus === "ESTUDADO"
                              ? "bg-blue-600 text-white"
                              : darkMode
                              ? "bg-gray-800 text-gray-400 hover:text-white"
                              : "bg-gray-200 text-gray-600 hover:text-gray-900"
                          }`}
                          title="Clique para alternar: Não Estudado ➜ Estudado ➜ Revisado"
                        >
                          {currentStatus === "REVISADO" ? "✓ Revisado" : currentStatus === "ESTUDADO" ? "● Estudado" : "○ Não Estudado"}
                        </button>

                        <h4 className={`text-xs font-bold truncate flex-1 ${darkMode ? "text-white" : "text-gray-900"}`} title={ass.nome}>
                          {ass.nome}
                        </h4>

                        {/* Incidence Badge */}
                        <button
                          type="button"
                          onClick={handleCycleIncidence}
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 transition-colors cursor-pointer ${
                            currentInc === "ALTA"
                              ? "bg-red-500/15 text-red-400 border border-red-500/20"
                              : currentInc === "MÉDIA"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                          }`}
                          title="Clique para alternar incidência (Alta / Média / Baixa)"
                        >
                          {currentInc}
                        </button>
                      </div>

                      {/* Right: Questions summary & Action buttons */}
                      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[11px] font-mono font-semibold text-gray-400">
                          {totals.total > 0 ? (
                            <span>
                              <strong className={darkMode ? "text-white" : "text-gray-800"}>{totals.total}q</strong>
                              {" "}(<span className="text-emerald-400">{totals.acertos}A</span>/<span className="text-rose-400">{totals.erros}E</span>)
                            </span>
                          ) : (
                            <span className="text-gray-500">0q</span>
                          )}
                        </span>

                        {/* Toggle Question Logs Drawer */}
                        <button
                          type="button"
                          onClick={() => setActiveAssuntoId(isOpen ? null : ass.id)}
                          className={`p-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                            isOpen
                              ? "bg-blue-600 text-white"
                              : darkMode
                              ? "text-blue-400 hover:bg-blue-500/10"
                              : "text-blue-600 hover:bg-blue-50"
                          }`}
                          title={isOpen ? "Fechar registros" : "Ver/Adicionar questões"}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {/* Trash button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteTopic(ass.id)}
                          className={`p-1 rounded-md transition-colors cursor-pointer ${
                            darkMode
                              ? "text-gray-500 hover:text-rose-400 hover:bg-rose-500/10"
                              : "text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                          }`}
                          title="Excluir assunto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Compact Expandable Drawer for Question Logs */}
                    {isOpen && (
                      <div className={`p-3 border-t text-xs transition-all ${
                        darkMode ? "border-[#1e2d4d] bg-[#0b1329]/90" : "border-gray-200 bg-white"
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                            Registros de Questões: {ass.nome}
                          </span>
                        </div>

                        {/* Log Rows list */}
                        <div className="space-y-1.5 mb-3 max-h-36 overflow-y-auto pr-1">
                          {ass.registros.map((reg, regIdx) => (
                            <div
                              key={reg.id ? `reg-${reg.id}` : `reg-idx-${regIdx}`}
                              className={`flex justify-between items-center px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                                darkMode 
                                  ? "bg-[#14203e]/40 border-gray-800" 
                                  : "bg-gray-50 border-gray-100"
                              }`}
                            >
                              <span className="flex items-center gap-1.5 text-gray-400 font-mono text-[11px]">
                                <Calendar className="w-3 h-3 text-blue-500" />
                                {formatarDataDDMMAAAA(reg.data)}
                              </span>
                              
                              <div className="flex items-center space-x-3 text-[11px]">
                                <span className={darkMode ? "text-emerald-400" : "text-emerald-600"}>
                                  <strong>{reg.acertos}</strong> A
                                </span>
                                <span className={darkMode ? "text-red-400" : "text-red-600"}>
                                  <strong>{reg.erros}</strong> E
                                </span>
                                <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                                  Total: {reg.total}q
                                </span>

                                <button
                                  onClick={() => handleDeleteQuestionLog(ass.id, reg.id)}
                                  className="text-gray-400 hover:text-red-500 p-0.5 rounded hover:bg-red-500/10 transition-colors"
                                  title="Excluir registro"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {ass.registros.length === 0 && (
                            <p className={`text-[11px] text-center py-2 italic ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                              Nenhum registro de questões para este assunto.
                            </p>
                          )}
                        </div>

                        {/* Quick Register form fields */}
                        <div className={`p-2.5 rounded-lg border grid grid-cols-1 sm:grid-cols-4 gap-2 items-end ${
                          darkMode ? "bg-[#0e172e] border-blue-900/40" : "bg-blue-50/45 border-blue-100"
                        }`}>
                          <div>
                            <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${
                              darkMode ? "text-gray-400" : "text-gray-600"
                            }`}>
                              Data
                            </label>
                            <input
                              type="text"
                              placeholder="DD/MM/AAAA"
                              value={newLogDate}
                              onChange={(e) => setNewLogDate(e.target.value)}
                              className={`w-full px-2 py-1 rounded border text-xs outline-none ${
                                darkMode
                                  ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                                  : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${
                              darkMode ? "text-gray-400" : "text-gray-600"
                            }`}>
                              Acertos
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={newLogAcertos}
                              onChange={(e) => setNewLogAcertos(Math.max(0, parseInt(e.target.value) || 0))}
                              className={`w-full px-2 py-1 rounded border text-xs outline-none ${
                                darkMode
                                  ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                                  : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${
                              darkMode ? "text-gray-400" : "text-gray-600"
                            }`}>
                              Erros
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={newLogErros}
                              onChange={(e) => setNewLogErros(Math.max(0, parseInt(e.target.value) || 0))}
                              className={`w-full px-2 py-1 rounded border text-xs outline-none ${
                                darkMode
                                  ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                                  : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
                              }`}
                            />
                          </div>

                          <div>
                            <button
                              onClick={() => handleAddQuestionLog(ass.id)}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-all cursor-pointer shadow-sm flex items-center justify-center space-x-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Salvar</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              }

              // MODO DETALHADO (Tradicional)
              return (
                <div
                  key={ass.id ? `topic-${ass.id}` : `topic-idx-${topicIdx}`}
                  className={`border rounded-xl transition-all ${
                    darkMode
                      ? "border-[#1e2d4d] bg-[#14203e]/30 hover:bg-[#14203e]/60"
                      : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
                  }`}
                >
                  {/* HEADER ROW: Nome, Incidência, Status toggle, Lixeira e Detalhes */}
                  <div 
                    className="p-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 cursor-pointer"
                    onClick={() => setActiveAssuntoId(isOpen ? null : ass.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <h4 className={`text-sm font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {ass.nome}
                        </h4>

                        {/* Interactive Click-to-Cycle Incidence Badge */}
                        <button
                          onClick={handleCycleIncidence}
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider transition-colors cursor-pointer ${
                            currentInc === "ALTA"
                              ? "bg-red-500/15 text-red-500 hover:bg-red-500/25 border border-red-500/20"
                              : currentInc === "MÉDIA"
                              ? "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border border-amber-500/20"
                              : "bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 border border-blue-500/20"
                          }`}
                          title="Clique para alternar o grau de incidência"
                        >
                          {currentInc}
                        </button>
                      </div>

                      <div className="flex items-center space-x-3 mt-1.5 text-xs text-gray-500 font-semibold">
                        <span>Questões: {totals.total} resolvidas</span>
                        {totals.total > 0 && (
                          <span className="text-emerald-500">({totals.acertos}A / {totals.erros}E)</span>
                        )}
                      </div>
                    </div>

                    {/* Interactive segmented status control */}
                    <div className="flex items-center gap-2 self-stretch md:self-auto" onClick={(e) => e.stopPropagation()}>
                      <div className={`flex rounded-lg p-0.5 text-[10px] font-extrabold border ${
                        darkMode ? "bg-[#0b1328] border-gray-800" : "bg-gray-100/85 border-gray-200"
                      }`}>
                        {(["NÃO ESTUDADO", "ESTUDADO", "REVISADO"] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => handleUpdateTopic(ass.id, { status: st })}
                            className={`px-2 py-1 rounded-md transition-all uppercase tracking-wider cursor-pointer ${
                              currentStatus === st
                                ? st === "REVISADO"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : st === "ESTUDADO"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-gray-500 text-white shadow-sm"
                                : darkMode
                                ? "text-gray-400 hover:text-white"
                                : "text-gray-500 hover:text-gray-900"
                            }`}
                          >
                            {st === "NÃO ESTUDADO" ? "NÃO ESTUDADO" : st === "ESTUDADO" ? "ESTUDADO" : "REVISADO"}
                          </button>
                        ))}
                      </div>

                      {/* Lixeira Delete button */}
                      <button
                        onClick={() => handleDeleteTopic(ass.id)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          darkMode
                            ? "border-[#2d3f66] hover:bg-red-950/45 text-gray-400 hover:text-red-400"
                            : "border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-600"
                        }`}
                        title="Excluir assunto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                  {/* SUBSECTION: DAILY RESOLUTION LOGS & NEW QUESTIONS REGISTER */}
                  {isOpen && (
                    <div className={`p-4 border-t transition-all ${
                      darkMode ? "border-[#1e2d4d] bg-[#0b1329]/90" : "border-gray-200 bg-white"
                    }`}>
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-blue-500">
                          Registros Diários de Resolução de Questões
                        </h5>
                      </div>

                      {/* Log Rows list */}
                      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
                        {ass.registros.map((reg, regIdx) => (
                          <div
                            key={reg.id ? `reg-${reg.id}` : `reg-idx-${regIdx}`}
                            className={`flex justify-between items-center px-3 py-2 rounded-lg text-xs font-medium border ${
                              darkMode 
                                ? "bg-[#14203e]/40 border-gray-800" 
                                : "bg-gray-50 border-gray-100"
                            }`}
                          >
                            <span className="flex items-center gap-1.5 text-gray-400 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-blue-500" />
                              {formatarDataDDMMAAAA(reg.data)}
                            </span>
                            
                            <div className="flex items-center space-x-4">
                              <span className={darkMode ? "text-emerald-400" : "text-emerald-600"}>
                                <strong>{reg.acertos}</strong> Acertos
                              </span>
                              <span className={darkMode ? "text-red-400" : "text-red-600"}>
                                <strong>{reg.erros}</strong> Erros
                              </span>
                              <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                                Total: {reg.total} q.
                              </span>

                              {/* Lixeira delete button for daily resolution entry */}
                              <button
                                onClick={() => handleDeleteQuestionLog(ass.id, reg.id)}
                                className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Excluir registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {ass.registros.length === 0 && (
                          <p className={`text-xs text-center py-4 italic ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                            Nenhum registro de questões feito para este assunto.
                          </p>
                        )}
                      </div>

                      {/* Register form fields */}
                      <div className={`p-3.5 rounded-xl border grid grid-cols-1 sm:grid-cols-4 gap-3 items-end ${
                        darkMode ? "bg-[#0e172e] border-blue-900/40" : "bg-blue-50/45 border-blue-100"
                      }`}>
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                            darkMode ? "text-gray-400" : "text-gray-600"
                          }`}>
                            Data do Estudo
                          </label>
                          <input
                            type="text"
                            placeholder="DD/MM/AAAA"
                            value={newLogDate}
                            onChange={(e) => setNewLogDate(e.target.value)}
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none transition-colors ${
                              darkMode
                                ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                                : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
                            }`}
                          />
                        </div>

                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                            darkMode ? "text-gray-400" : "text-gray-600"
                          }`}>
                            Acertos
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={newLogAcertos}
                            onChange={(e) => setNewLogAcertos(Math.max(0, parseInt(e.target.value) || 0))}
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none transition-colors ${
                              darkMode
                                ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                                : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
                            }`}
                          />
                        </div>

                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                            darkMode ? "text-gray-400" : "text-gray-600"
                          }`}>
                            Erros
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={newLogErros}
                            onChange={(e) => setNewLogErros(Math.max(0, parseInt(e.target.value) || 0))}
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none transition-colors ${
                              darkMode
                                ? "bg-[#16223f] border-[#25365e] text-white focus:border-blue-500"
                                : "bg-white border-gray-200 text-gray-800 focus:border-blue-500"
                            }`}
                          />
                        </div>

                        <div>
                          <button
                            onClick={() => handleAddQuestionLog(ass.id)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm flex items-center justify-center space-x-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Registrar</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              );
            })}

            {(!activeDisciplina || filteredTopics.length === 0) && (
              <div className="text-center py-12 border border-dashed rounded-xl border-gray-200 dark:border-gray-800">
                <FileText className="w-10 h-10 text-gray-400 mx-auto opacity-50 mb-3" />
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Nenhum assunto programático encontrado para exibir.
                </p>
                <p className="text-[11px] text-blue-500 mt-1">
                  Ajuste os filtros de busca acima ou cadastre um novo assunto programático!
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* SEÇÃO COMPLETA: SESSÕES REGISTRADAS (HISTÓRICO COMPLETO DE BLOCOS E QUESTÕES) */}
      <div className="col-span-1 lg:col-span-2 mt-2">
        <div className={`p-4 sm:p-6 rounded-3xl border transition-all ${
          darkMode ? "bg-[#0f1b35] border-[#1e2d4d]" : "bg-white border-gray-200 shadow-sm"
        }`}>
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100/10">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-base font-extrabold uppercase tracking-wide ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Sessões Registradas
                </h3>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Histórico unificado dos tempos concluídos de todos os blocos, datas e questões resolvidas.
                </p>
              </div>
            </div>

            {/* Quick summary metrics */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                darkMode ? "bg-[#111e3b] border-gray-700 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-700"
              }`}>
                Total: <strong className="text-blue-500">{state.sessions.length}</strong> {state.sessions.length === 1 ? "sessão" : "sessões"}
              </span>
              <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                darkMode ? "bg-[#111e3b] border-gray-700 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-700"
              }`}>
                Tempo Acumulado: <strong className="text-emerald-500">
                  {(state.sessions.reduce((acc, s) => acc + (s.duracaoMinutos || 0), 0) / 60).toFixed(1)}h
                </strong>
              </span>
              <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                darkMode ? "bg-[#111e3b] border-gray-700 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-700"
              }`}>
                Questões: <strong className="text-emerald-400">{state.sessions.reduce((acc, s) => acc + (s.questoesAcertos || 0), 0)}A</strong> / <strong className="text-rose-400">{state.sessions.reduce((acc, s) => acc + (s.questoesErros || 0), 0)}E</strong>
              </span>
            </div>
          </div>

          {/* Table / List of Registered Sessions */}
          {state.sessions.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-2xl border-gray-200 dark:border-gray-800">
              <Clock className="w-10 h-10 text-gray-400 mx-auto opacity-40 mb-2" />
              <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Nenhuma sessão de estudo registrada ainda.
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Conclua um bloco de estudos para que o tempo e questões sejam direcionados automaticamente para esta aba!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b text-[10px] font-extrabold uppercase tracking-wider ${
                    darkMode ? "border-gray-800 text-gray-400 bg-black/20" : "border-gray-200 text-gray-600 bg-gray-50"
                  }`}>
                    <th className="py-3 px-3">DATA</th>
                    <th className="py-3 px-3 text-center">N° CICLO</th>
                    <th className="py-3 px-3">BLOCO / MATÉRIA</th>
                    <th className="py-3 px-3 text-center">HORAS CONCLUÍDAS</th>
                    <th className="py-3 px-3 text-center text-emerald-400">QUESTÕES CERTAS</th>
                    <th className="py-3 px-3 text-center text-rose-400">QUESTÕES ERRADAS</th>
                    <th className="py-3 px-3 text-center font-bold">TOTAL</th>
                    <th className="py-3 px-3 text-right">AÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/10">
                  {state.sessions
                    .slice()
                    .reverse()
                    .map((session, sIdx) => {
                      const disc = disciplinas.find(d => d.id === session.disciplinaId);
                      const catColor = disc?.cor || "#3b82f6";
                      const acertos = session.questoesAcertos || 0;
                      const erros = session.questoesErros || 0;
                      const totalQ = acertos + erros;
                      const hhmmss = formatarMinutosParaHHMMSS(session.duracaoMinutos || 0);
                      const dataFormatada = formatarDataDDMMAAAA(session.data);

                      return (
                        <tr
                          key={session.id ? `sess-${session.id}` : `sess-idx-${sIdx}`}
                          className={`transition-colors hover:bg-blue-500/5 ${
                            darkMode ? "text-gray-200" : "text-gray-800"
                          }`}
                        >
                          <td className="py-3 px-3 font-mono text-xs font-semibold whitespace-nowrap">
                            {dataFormatada}
                          </td>
                          <td className="py-3 px-3 text-center font-mono">
                            <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {session.ciclo}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border"
                              style={{
                                backgroundColor: `${catColor}15`,
                                borderColor: `${catColor}40`,
                                color: darkMode ? "#ffffff" : "#1e293b"
                              }}
                            >
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                              {session.disciplinaNome}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-xs text-blue-400 whitespace-nowrap">
                            {hhmmss}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-xs text-emerald-400">
                            {acertos}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-xs text-rose-400">
                            {erros}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-extrabold text-xs text-blue-300">
                            {totalQ}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleStartEditSession(session)}
                                className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors cursor-pointer"
                                title="Editar este registro de sessão"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Excluir este registro de sessão"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE REGISTRO MANUAL DE SESSÃO E QUESTÕES */}
      {showRegisterSessionModal && activeDisciplina && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`relative w-full max-w-md p-6 rounded-3xl border shadow-2xl transition-all ${
            darkMode ? "bg-[#0c1833] border-blue-500/40 text-white" : "bg-white border-blue-200 text-gray-900"
          }`}>
            <button
              onClick={() => setShowRegisterSessionModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">Registrar Sessão de Estudo</h3>
                <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">{activeDisciplina.nome}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmRegisterSession} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-400">
                    Data do Estudo
                  </label>
                  <input
                    type="date"
                    value={sessionInputDate}
                    onChange={(e) => setSessionInputDate(e.target.value)}
                    className={`w-full py-2 px-3 rounded-xl border font-mono text-sm outline-none ${
                      darkMode ? "bg-[#111e3b] border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-400">
                    Ciclo de Estudo (Nº)
                  </label>
                  <select
                    value={sessionInputCiclo}
                    onChange={(e) => setSessionInputCiclo(parseInt(e.target.value) || currentCycle)}
                    className={`w-full py-2 px-3 rounded-xl border font-mono text-sm outline-none ${
                      darkMode ? "bg-[#111e3b] border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                    }`}
                  >
                    {Array.from({ length: Math.max(currentCycle + 5, 10) }, (_, i) => i + 1).map((c) => (
                      <option key={c} value={c}>
                        Ciclo {c} {c === currentCycle ? "(Atual)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-400">
                  Tempo Estudado (em Minutos)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={sessionInputMinutes}
                    onChange={(e) => setSessionInputMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                    className={`flex-1 py-2 px-3 rounded-xl border font-mono font-bold text-sm outline-none ${
                      darkMode ? "bg-[#111e3b] border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                    }`}
                    required
                  />
                  <span className="text-xs font-bold text-gray-400">min ({(sessionInputMinutes / 60).toFixed(1)}h)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-emerald-400">
                    Acertos (Questões)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={sessionInputAcertos}
                    onChange={(e) => setSessionInputAcertos(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`w-full py-2 px-3 rounded-xl border font-mono text-sm outline-none ${
                      darkMode ? "bg-[#111e3b] border-emerald-500/30 text-white" : "bg-emerald-50 border-emerald-300 text-emerald-900"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-rose-400">
                    Erros (Questões)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={sessionInputErros}
                    onChange={(e) => setSessionInputErros(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`w-full py-2 px-3 rounded-xl border font-mono text-sm outline-none ${
                      darkMode ? "bg-[#111e3b] border-rose-500/30 text-white" : "bg-rose-50 border-rose-300 text-rose-900"
                    }`}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 leading-relaxed">
                💡 Ao salvar, este registro atualizará instantaneamente seus gráficos de Produtividade por Dia, Disciplinas Estudadas, Desempenho e Horas Acumuladas no Ciclo {currentCycle}!
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterSessionModal(false)}
                  className="py-2 px-4 rounded-xl text-xs font-bold bg-gray-700 hover:bg-gray-600 text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Registro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE SESSÃO REGISTRADA */}
      {editingSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`relative w-full max-w-md p-6 rounded-3xl border shadow-2xl transition-all ${
            darkMode ? "bg-[#0c1833] border-blue-500/40 text-white" : "bg-white border-blue-200 text-gray-900"
          }`}>
            <button
              onClick={() => setEditingSessionId(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                <Pencil className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">Editar Sessão Registrada</h3>
                <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">Ajustar Informações da Sessão</p>
              </div>
            </div>

            <form onSubmit={handleConfirmEditSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-400">
                  Bloco / Matéria
                </label>
                <select
                  value={editSessionDisciplinaId}
                  onChange={(e) => setEditSessionDisciplinaId(e.target.value)}
                  className={`w-full py-2 px-3 rounded-xl border font-mono text-sm outline-none ${
                    darkMode ? "bg-[#111e3b] border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                  }`}
                >
                  {disciplinas.map((d, idx) => (
                    <option key={d.id || `disc-opt-${idx}`} value={d.id}>
                      {(d.nome || "").toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-400">
                    Data do Estudo
                  </label>
                  <input
                    type="date"
                    value={editSessionDate}
                    onChange={(e) => setEditSessionDate(e.target.value)}
                    className={`w-full py-2 px-3 rounded-xl border font-mono text-sm outline-none ${
                      darkMode ? "bg-[#111e3b] border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-400">
                    Ciclo de Estudo (Nº)
                  </label>
                  <select
                    value={editSessionCiclo}
                    onChange={(e) => setEditSessionCiclo(parseInt(e.target.value) || 1)}
                    className={`w-full py-2 px-3 rounded-xl border font-mono text-sm outline-none ${
                      darkMode ? "bg-[#111e3b] border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                    }`}
                  >
                    {Array.from({ length: Math.max(currentCycle + 5, 10) }, (_, i) => i + 1).map((c) => (
                      <option key={c} value={c}>
                        Ciclo {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-gray-400">
                  Tempo Estudado (em Minutos)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    max="1440"
                    value={editSessionMinutes}
                    onChange={(e) => setEditSessionMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`flex-1 py-2 px-3 rounded-xl border font-mono font-bold text-sm outline-none ${
                      darkMode ? "bg-[#111e3b] border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                    }`}
                    required
                  />
                  <span className="text-xs font-bold text-gray-400">min ({(editSessionMinutes / 60).toFixed(1)}h)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-emerald-400">
                    Acertos (Questões)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editSessionAcertos}
                    onChange={(e) => setEditSessionAcertos(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`w-full py-2 px-3 rounded-xl border font-mono text-sm outline-none ${
                      darkMode ? "bg-[#111e3b] border-emerald-500/30 text-white" : "bg-emerald-50 border-emerald-300 text-emerald-900"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-rose-400">
                    Erros (Questões)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editSessionErros}
                    onChange={(e) => setEditSessionErros(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`w-full py-2 px-3 rounded-xl border font-mono text-sm outline-none ${
                      darkMode ? "bg-[#111e3b] border-rose-500/30 text-white" : "bg-rose-50 border-rose-300 text-rose-900"
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSessionId(null)}
                  className="py-2 px-4 rounded-xl text-xs font-bold bg-gray-700 hover:bg-gray-600 text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-lg shadow-blue-600/20 flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE SINALIZAÇÃO SONORA E VISUAL (FINAL DE BLOCO E FINAL DE CICLO) */}
      {notificationAlert && notificationAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`relative w-full max-w-md p-6 rounded-3xl border shadow-2xl transition-all transform animate-scale-up ${
            notificationAlert.type === 'cycle'
              ? darkMode
                ? "bg-[#0c1833] border-amber-500/50 text-white"
                : "bg-white border-amber-400 text-gray-900"
              : darkMode
                ? "bg-[#0c1833] border-emerald-500/50 text-white"
                : "bg-white border-emerald-400 text-gray-900"
          }`}>
            {/* Close button */}
            <button
              onClick={() => setNotificationAlert(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Visual animated badge with glowing ring */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center animate-bounce ${
                  notificationAlert.type === 'cycle'
                    ? "bg-amber-500/20 text-amber-400 ring-8 ring-amber-500/10"
                    : "bg-emerald-500/20 text-emerald-400 ring-8 ring-emerald-500/10"
                }`}>
                  {notificationAlert.type === 'cycle' ? (
                    <Award className="w-10 h-10" />
                  ) : (
                    <Bell className="w-10 h-10" />
                  )}
                </div>
                <span className="absolute -top-1 -right-1 flex h-5 w-5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    notificationAlert.type === 'cycle' ? "bg-amber-400" : "bg-emerald-400"
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-5 w-5 ${
                    notificationAlert.type === 'cycle' ? "bg-amber-500" : "bg-emerald-500"
                  }`}></span>
                </span>
              </div>

              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider mb-2 ${
                  notificationAlert.type === 'cycle'
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                }`}>
                  {notificationAlert.type === 'cycle' ? "Conclusão do Ciclo de Estudos" : "Final de Bloco de Estudo"}
                </span>
                <h3 className="text-xl font-bold font-serif">
                  {notificationAlert.title}
                </h3>
                <p className="text-sm font-medium mt-2 opacity-90 leading-relaxed">
                  {notificationAlert.message}
                </p>
                {notificationAlert.submessage && (
                  <p className="text-xs mt-1.5 opacity-75 font-mono">
                    {notificationAlert.submessage}
                  </p>
                )}
              </div>

              {/* Controls: Replay sound chime & dismiss button */}
              <div className="flex items-center space-x-3 w-full pt-2">
                <button
                  onClick={() => playNotificationSound(notificationAlert.type)}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all cursor-pointer ${
                    darkMode
                      ? "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                      : "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-800"
                  }`}
                  title="Reproduzir o som de aviso novamente"
                >
                  <Volume2 className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span>Ouvir Aviso Sonoro</span>
                </button>

                <button
                  onClick={() => setNotificationAlert(null)}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs text-white transition-all cursor-pointer shadow-lg ${
                    notificationAlert.type === 'cycle'
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  }`}
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
