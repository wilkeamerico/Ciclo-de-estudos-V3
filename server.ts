import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size limits to support base64 PDFs up to 10MB
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Shared Gemini Client
let ai: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave GEMINI_API_KEY não foi configurada nas variáveis de ambiente.");
    }
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

// Helper to call Gemini with exponential backoff retries and model fallback
async function callGeminiWithRetry(client: GoogleGenAI, params: any) {
  // Primary and fallback models according to Google GenAI best practices
  const modelsToTry = [
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
  ];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await client.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errStr = (err?.message || "") + " " + JSON.stringify(err || "");
        const isRateLimit = errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED");
        const isOverloaded = errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("high demand") || errStr.includes("Spikes in demand") || errStr.includes("overloaded");
        const isTransient = isRateLimit || isOverloaded || errStr.includes("500") || errStr.includes("502") || errStr.includes("504") || errStr.includes("fetch failed");

        if (isTransient) {
          console.warn(`[Gemini API] Modelo ${model} (tentativa ${attempt}/3) erro temporário (${isRateLimit ? "429 RateLimit" : isOverloaded ? "503 Overloaded" : "Erro de Rede/Servidor"}). Aguardando...`);
          if (attempt < 3) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 6000);
            await new Promise((res) => setTimeout(res, backoffMs));
          }
        } else {
          console.warn(`[Gemini API] Erro não transiente no modelo ${model}:`, err?.message || err);
          break; // Try next model
        }
      }
    }
  }
  throw lastError;
}

// Health Check Endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// API endpoint for Edital Scanning using Gemini API
app.post("/api/scan-edital", async (req, res) => {
  try {
    const { text, pdfBase64, pdfMimeType, cargoDesejado } = req.body;

    if (!text && !pdfBase64) {
      return res.status(400).json({ error: "É necessário fornecer um texto ou arquivo PDF para escanear." });
    }

    const client = getGeminiClient();

    // Prepare contents parts
    const parts: any[] = [];

    if (pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: pdfMimeType || "application/pdf",
          data: pdfBase64,
        },
      });
    }

    if (text) {
      parts.push({
        text: `Texto complementar do edital:\n${text}`,
      });
    }

    // Add prompt detailing extraction requirements
    let promptText = `Você é um especialista em análise estratégica de editais de concursos públicos no Brasil. Sua tarefa é ler o edital fornecido e extrair um resumo executivo, preciso e direto ao ponto focado no concurso. Se alguma informação solicitada abaixo não estiver presente no documento, informe expressamente no respectivo campo: "Informação não consta no edital".

Extraia as seguintes informações do edital:
1. Identificação da banca organizadora, órgão, cargo/especialidade.
2. Lista de disciplinas divididas por Categoria (ex: Conhecimentos Gerais e Conhecimentos Específicos) com número de questões, peso e assuntos programáticos.
3. Informações da Prova Discursiva.
4. Resumo Executivo Completo ("resumoExecutivo") composto por:
   - "calendario": Tabela cronológica com eventos e datas (Inscrições, Isenção, Resultado Isenção, Data Limite Pagamento Taxa, Locais de Prova, Prova Objetiva/Discursiva, Gabarito Preliminar, Recursos, Resultado Definitivo).
   - "cargos": Array de resumo executivo para cada cargo analisado contendo as 8 seções:
     1. visaoGeral (orgao, banca, cargoAnalisado, escolaridadeRequisitos, cargaHoraria, remuneracaoInicial)
     2. inscricoesIsencao (valorTaxa, siteBanca, regrasIsencao)
     3. vagasCR (vagasAmpla, vagasReservadas, vagasCR, totalConvocaveis)
     4. provaObjetiva (dataHorarioTurno, estruturaQuestoes, penalidadeErro, distribuicaoDisciplinas, criteriosEliminacao)
     5. provaDiscursiva (temDiscursiva, formato, extensao, numDiscursivasCorrigidas, criteriosPontuacao, notaMinimaAprovacao)
     6. etapasDesempate (outrasEtapas, criteriosDesempate)
     7. conteudoProgramatico (conhecimentosGerais: materia e topicos, conhecimentosEspecificos: materia e topicos)

Garantir que os números de questões e pesos sejam inteiros ou números válidos.`;

    if (cargoDesejado) {
      promptText += `\n\nCRÍTICO: O cargo desejado pelo candidato é especificamente: "${cargoDesejado}". 
Analise as partes do edital correspondentes a este cargo e extraia as disciplinas, questões, pesos e conteúdo programático, bem como as informações específicas de prova discursiva/redação e resumo executivo, focados e específicos para "${cargoDesejado}". Descarte matérias ou regras discursivas que pertençam apenas a outros cargos.`;
    }

    parts.push({
      text: promptText,
    });

    const promptSchema = {
      type: Type.OBJECT,
      properties: {
        banca: { type: Type.STRING, description: "Nome da banca organizadora (ex: Cebraspe, FGV, FCC)" },
        orgao: { type: Type.STRING, description: "Órgão do concurso (ex: Petrobras, Banco do Brasil)" },
        cargo: { type: Type.STRING, description: "Cargo ou especialidade analisada" },
        categorias: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nome: { type: Type.STRING, description: "Nome da categoria (ex: Conhecimentos Básicos, Conhecimentos Específicos)" },
              disciplinas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nome: { type: Type.STRING, description: "Nome da disciplina (ex: Língua Portuguesa, Matemática)" },
                    questoes: { type: Type.INTEGER, description: "Quantidade de questões estimadas ou indicadas" },
                    peso: { type: Type.NUMBER, description: "Peso de cada questão (padrão 1 se não especificado)" },
                    assuntos: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Lista de todos os tópicos programáticos detalhados para esta disciplina"
                    }
                  },
                  required: ["nome", "questoes", "peso", "assuntos"]
                }
              }
            },
            required: ["nome", "disciplinas"]
          }
        },
        discursivaInfo: {
          type: Type.OBJECT,
          properties: {
            hasDiscursiva: { type: Type.BOOLEAN, description: "Indica se há previsão de prova discursiva, redação, estudo de caso ou peça prática no edital para o cargo desejado" },
            detalhes: { type: Type.STRING, description: "Descrição compacta e regras da prova discursiva extraídas (ex: de 20 a 30 linhas, vale 10 pontos)" },
            criteriosAvaliacao: { type: Type.STRING, description: "Critérios de avaliação detalhados com as devidas pontuações se especificadas no edital (ex: coesão, conteúdo, norma culta)" }
          },
          required: ["hasDiscursiva", "detalhes", "criteriosAvaliacao"]
        },
        resumoExecutivo: {
          type: Type.OBJECT,
          properties: {
            calendario: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  evento: { type: Type.STRING },
                  dataStr: { type: Type.STRING },
                  detalhes: { type: Type.STRING }
                },
                required: ["evento", "dataStr"]
              }
            },
            cargos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  cargoName: { type: Type.STRING },
                  visaoGeral: {
                    type: Type.OBJECT,
                    properties: {
                      orgao: { type: Type.STRING },
                      banca: { type: Type.STRING },
                      cargoAnalisado: { type: Type.STRING },
                      escolaridadeRequisitos: { type: Type.STRING },
                      cargaHoraria: { type: Type.STRING },
                      remuneracaoInicial: { type: Type.STRING }
                    },
                    required: ["orgao", "banca", "cargoAnalisado", "escolaridadeRequisitos", "cargaHoraria", "remuneracaoInicial"]
                  },
                  inscricoesIsencao: {
                    type: Type.OBJECT,
                    properties: {
                      valorTaxa: { type: Type.STRING },
                      siteBanca: { type: Type.STRING },
                      regrasIsencao: { type: Type.STRING }
                    },
                    required: ["valorTaxa", "siteBanca", "regrasIsencao"]
                  },
                  vagasCR: {
                    type: Type.OBJECT,
                    properties: {
                      vagasAmpla: { type: Type.STRING },
                      vagasReservadas: { type: Type.STRING },
                      vagasCR: { type: Type.STRING },
                      totalConvocaveis: { type: Type.STRING }
                    },
                    required: ["vagasAmpla", "vagasReservadas", "vagasCR", "totalConvocaveis"]
                  },
                  provaObjetiva: {
                    type: Type.OBJECT,
                    properties: {
                      dataHorarioTurno: { type: Type.STRING },
                      estruturaQuestoes: { type: Type.STRING },
                      penalidadeErro: { type: Type.STRING },
                      distribuicaoDisciplinas: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            disciplinaOuBloco: { type: Type.STRING },
                            numQuestoes: { type: Type.STRING },
                            peso: { type: Type.STRING },
                            pontuacaoMaxima: { type: Type.STRING },
                            notaMinimaOuCorte: { type: Type.STRING }
                          },
                          required: ["disciplinaOuBloco", "numQuestoes", "peso", "pontuacaoMaxima", "notaMinimaOuCorte"]
                        }
                      },
                      criteriosEliminacao: { type: Type.STRING }
                    },
                    required: ["dataHorarioTurno", "estruturaQuestoes", "penalidadeErro", "distribuicaoDisciplinas", "criteriosEliminacao"]
                  },
                  provaDiscursiva: {
                    type: Type.OBJECT,
                    properties: {
                      temDiscursiva: { type: Type.BOOLEAN },
                      formato: { type: Type.STRING },
                      extensao: { type: Type.STRING },
                      numDiscursivasCorrigidas: { type: Type.STRING },
                      criteriosPontuacao: { type: Type.STRING },
                      notaMinimaAprovacao: { type: Type.STRING }
                    },
                    required: ["temDiscursiva", "formato", "extensao", "numDiscursivasCorrigidas", "criteriosPontuacao", "notaMinimaAprovacao"]
                  },
                  etapasDesempate: {
                    type: Type.OBJECT,
                    properties: {
                      outrasEtapas: { type: Type.STRING },
                      criteriosDesempate: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      }
                    },
                    required: ["outrasEtapas", "criteriosDesempate"]
                  },
                  conteudoProgramatico: {
                    type: Type.OBJECT,
                    properties: {
                      conhecimentosGerais: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            materia: { type: Type.STRING },
                            topicos: {
                              type: Type.ARRAY,
                              items: { type: Type.STRING }
                            }
                          },
                          required: ["materia", "topicos"]
                        }
                      },
                      conhecimentosEspecificos: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            materia: { type: Type.STRING },
                            topicos: {
                              type: Type.ARRAY,
                              items: { type: Type.STRING }
                            }
                          },
                          required: ["materia", "topicos"]
                        }
                      }
                    },
                    required: ["conhecimentosGerais", "conhecimentosEspecificos"]
                  }
                },
                required: ["cargoName", "visaoGeral", "inscricoesIsencao", "vagasCR", "provaObjetiva", "provaDiscursiva", "etapasDesempate", "conteudoProgramatico"]
              }
            }
          },
          required: ["calendario", "cargos"]
        }
      },
      required: ["banca", "orgao", "cargo", "categorias", "discursivaInfo"]
    };

    const response = await callGeminiWithRetry(client, {
      contents: { parts },
      config: {
        systemInstruction: "Você é um especialista em concursos públicos e organização de estudos. Extraia detalhadamente todos os dados solicitados, estruturando os assuntos programáticos de forma que o estudante possa utilizá-los individualmente para controlar seus estudos.",
        responseMimeType: "application/json",
        responseSchema: promptSchema,
        temperature: 0.1,
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Nenhum dado retornado do modelo Gemini.");
    }

    const data = JSON.parse(resultText);
    return res.json(data);
  } catch (error: any) {
    console.error("Erro no escaneamento do edital:", error);
    const errStr = (error?.message || "") + " " + JSON.stringify(error || "");
    let userMsg = error?.message || "Erro desconhecido ao processar o edital com a IA.";
    if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
      userMsg = "A cota gratuita de requisições à IA foi temporariamente excedida. Por favor, aguarde de 30 a 60 segundos e tente novamente.";
    } else if (errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("high demand")) {
      userMsg = "Os servidores da IA estão com alta demanda temporária. Por favor, tente novamente em alguns instantes.";
    }
    return res.status(500).json({ error: userMsg });
  }
});

// API endpoint for Official Answer Key (Gabarito) Scanning by Emphasis/Cargo using Gemini API
app.post("/api/scan-gabarito", async (req, res) => {
  try {
    const { text, pdfBase64, pdfMimeType, enfaseDesejada } = req.body;

    if (!text && !pdfBase64) {
      return res.status(400).json({ error: "É necessário fornecer um arquivo PDF/Imagem ou texto com o gabarito oficial." });
    }

    const client = getGeminiClient();
    const parts: any[] = [];

    if (pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: pdfMimeType || "application/pdf",
          data: pdfBase64,
        },
      });
    }

    if (text) {
      parts.push({
        text: `Texto complementar / Gabarito oficial informado:\n${text}`,
      });
    }

    const promptText = `Você é um especialista em processamento de gabaritos oficiais de concursos públicos (Cebraspe, FGV, FCC, Cesgranrio, Vunesp, etc.).
Sua tarefa é analisar o gabarito oficial fornecido e extrair as respostas corretas de cada questão para a ênfase, perfil ou cargo especificado.

Ênfase / Cargo / Perfil Solicitado: "${enfaseDesejada || "Geral / Padrão"}".

Instruções críticas de extração:
1. Procure especificamente pelo gabarito correspondente à ênfase ou cargo "${enfaseDesejada || "Geral"}". Se o documento contiver gabaritos de várias ênfases (ex: Ênfase 1, Ênfase 2, Ênfase 14 - Engenharia de Petróleo, etc.), localize e extraia rigorosamente as respostas da ênfase solicitada.
2. Para cada questão (1, 2, 3, ...), identifique a alternativa correta (A, B, C, D, E) ou o julgamento (C para Certo, E para Errado).
3. Se uma questão foi anulada pela banca, marque a resposta como "X" ou "ANULADA".
4. Retorne a lista completa e sequencial de respostas com o número da questão e a letra correspondente, além da sequência contínua (ex: "ABCDECE...").`;

    parts.push({ text: promptText });

    const promptSchema = {
      type: Type.OBJECT,
      properties: {
        cargoOuEnfaseIdentificado: { type: Type.STRING, description: "Nome do cargo ou ênfase identificado no gabarito oficial" },
        tipoGabarito: { type: Type.STRING, description: "Tipo do gabarito (ex: Preliminar, Definitivo, Certo/Errado, Múltipla Escolha)" },
        totalQuestoes: { type: Type.INTEGER, description: "Quantidade total de questões identificadas no gabarito da ênfase" },
        sequenciaGabarito: { type: Type.STRING, description: "Sequência contínua de letras maiúsculas (ex: ABCDECCEE...)" },
        respostas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              numero: { type: Type.INTEGER, description: "Número da questão (1, 2, 3...)" },
              resposta: { type: Type.STRING, description: "Letra da alternativa correta (A, B, C, D, E, C, E ou X)" }
            },
            required: ["numero", "resposta"]
          }
        }
      },
      required: ["cargoOuEnfaseIdentificado", "totalQuestoes", "sequenciaGabarito", "respostas"]
    };

    const response = await callGeminiWithRetry(client, {
      contents: { parts },
      config: {
        systemInstruction: "Você é um assistente especialista na leitura e extração estruturada de gabaritos oficiais de concursos públicos.",
        responseMimeType: "application/json",
        responseSchema: promptSchema,
        temperature: 0.1,
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Nenhum dado retornado do modelo Gemini.");
    }

    const data = JSON.parse(resultText);
    return res.json(data);
  } catch (error: any) {
    console.error("Erro no escaneamento do gabarito por IA:", error);
    const errStr = (error?.message || "") + " " + JSON.stringify(error || "");
    let userMsg = error?.message || "Erro ao escanear o gabarito oficial com a IA.";
    if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
      userMsg = "A cota de IA foi temporariamente atingida. Por favor, aguarde alguns instantes e tente novamente.";
    }
    return res.status(500).json({ error: userMsg });
  }
});

// API endpoint for Candidate Answer Key / Answer Sheet (Gabarito Preenchido pelo Candidato) Scanning using Gemini API
app.post("/api/scan-respostas-candidato", async (req, res) => {
  try {
    const { text, pdfBase64, pdfMimeType, tipoQuestoes, totalQuestoes } = req.body;

    if (!text && !pdfBase64) {
      return res.status(400).json({ error: "É necessário fornecer uma imagem/PDF do cartão resposta ou texto com as respostas preenchidas pelo candidato." });
    }

    const client = getGeminiClient();
    const parts: any[] = [];

    if (pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: pdfMimeType || "image/jpeg",
          data: pdfBase64,
        },
      });
    }

    if (text) {
      parts.push({
        text: `Texto complementar com respostas ou anotações do candidato:\n${text}`,
      });
    }

    const promptText = `Você é um especialista em leitura óptica e visão computacional para decodificação de cartões-resposta (folha de respostas / gabarito do candidato) de concursos públicos (Cebraspe, FGV, FCC, Cesgranrio, Vunesp, etc.).
Sua tarefa é analisar o cartão de resposta, anotações de prova, rascunho de gabarito ou foto da folha preenchida pelo candidato e extrair com precisão a alternativa ou julgamento marcado pelo candidato em cada questão.

${tipoQuestoes ? `Tipo esperado de questão: ${tipoQuestoes === "certo_errado" ? "Certo ou Errado (C ou E)" : "Múltipla Escolha (A, B, C, D ou E)"}.` : ""}
${totalQuestoes ? `Total aproximado de questões esperado: ${totalQuestoes}.` : ""}

Instruções críticas:
1. Para cada questão identificada (1, 2, 3...):
   - Se a prova for Múltipla Escolha: Identifique a letra da alternativa assinalada/preenchida pelo candidato (A, B, C, D ou E).
   - Se a prova for Certo ou Errado: Identifique C (Certo) ou E (Errado).
   - Se a questão estiver em branco ou com rasura/dupla marcação, marque como em branco ("") ou "BRANCO".
2. Ordene as questões sequencialmente a partir do número 1.
3. Gere uma sequência contínua com as letras identificadas (ex: "ABCDECE...").
4. Informe o total de questões identificadas e o tipo detectado.`;

    parts.push({ text: promptText });

    const promptSchema = {
      type: Type.OBJECT,
      properties: {
        totalQuestoes: { type: Type.INTEGER, description: "Quantidade total de questões preenchidas identificadas" },
        tipoQuestoes: { type: Type.STRING, description: "Tipo identificado: multipla ou certo_errado" },
        sequenciaRespostas: { type: Type.STRING, description: "Sequência contínua de letras maiúsculas marcadas pelo candidato (ex: ABCDECE...)" },
        respostas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              numero: { type: Type.INTEGER, description: "Número da questão (1, 2, 3...)" },
              resposta: { type: Type.STRING, description: "Letra marcada pelo candidato (A, B, C, D, E, C, E ou vazio se em branco)" }
            },
            required: ["numero", "resposta"]
          }
        },
        observacoes: { type: Type.STRING, description: "Observações da leitura (ex: questões em branco ou rasuras)" }
      },
      required: ["totalQuestoes", "sequenciaRespostas", "respostas"]
    };

    const response = await callGeminiWithRetry(client, {
      contents: { parts },
      config: {
        systemInstruction: "Você é um assistente especialista na leitura óptica e transcrição de cartões de respostas de candidatos em provas de concursos públicos.",
        responseMimeType: "application/json",
        responseSchema: promptSchema,
        temperature: 0.1,
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Nenhum dado retornado do modelo Gemini.");
    }

    const data = JSON.parse(resultText);
    return res.json(data);
  } catch (error: any) {
    console.error("Erro no escaneamento das respostas do candidato por IA:", error);
    const errStr = (error?.message || "") + " " + JSON.stringify(error || "");
    let userMsg = error?.message || "Erro ao escanear as respostas do candidato com a IA.";
    if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
      userMsg = "A cota de IA foi temporariamente atingida. Por favor, aguarde alguns instantes e tente novamente.";
    }
    return res.status(500).json({ error: userMsg });
  }
});

// API endpoint for analyzing exam papers (caderno de provas) to extract exact question count, map edital contents, and provide cycle improvement diagnostics
app.post("/api/scan-caderno", async (req, res) => {
  try {
    const { pdfBase64, pdfMimeType, text, assuntos, disciplinasEdital, cargoDesejado } = req.body;

    if (!pdfBase64 && !text) {
      return res.status(400).json({ error: "É necessário fornecer um caderno de provas em arquivo PDF ou texto." });
    }

    const client = getGeminiClient();
    const parts: any[] = [];

    if (pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: pdfMimeType || "application/pdf",
          data: pdfBase64,
        },
      });
    }

    if (text) {
      parts.push({
        text: `Texto complementar do caderno de provas:\n${text}`,
      });
    }

    let promptText = `Você é um renomado auditor e especialista em concursos públicos e análise pedagógica de provas (Cebraspe, FGV, FCC, Cesgranrio, Vunesp, etc.).
Sua missão é realizar uma análise aprofundada e minuciosa deste CADERNO DE PROVAS com 3 objetivos principais:

1. EXTRAÇÃO EXATA DA QUANTIDADE DE QUESTÕES:
   - Identifique rigorosamente o número total exato de questões existentes no caderno de prova (ex: 50, 60, 70, 100, 120 questões).
   - Identifique o formato das questões (Múltipla Escolha com alternativas A-E ou Certo/Errado no estilo Cebraspe).
   - Agrupe e mapeie cada bloco ou disciplina com sua respectiva faixa de questões (ex: Português: questões 1 a 15, Raciocínio Lógico: questões 16 a 25, Conhecimentos Específicos: questões 26 a 70, etc.).

2. MAPEAMENTO DOS CONTEÚDOS DO EDITAL COBRADOS NA PROVA:
   - Relacione os tópicos cobrados no caderno de prova com as disciplinas e assuntos do edital do concurso (Cargo: "${cargoDesejado || "Geral"}").
   - Identifique quais assuntos do edital tiveram incidência "ALTA", "MÉDIA" ou "BAIXA" nas questões da prova.
   - Aponte os números das questões associados a cada assunto.

3. ANÁLISE INTELIGENTE & DIAGNÓSTICO PARA OS PRÓXIMOS CICLOS E SESSÕES DE ESTUDOS:
   - Com base nos conteúdos e no grau de complexidade das questões cobradas neste caderno de provas, elabore um diagnóstico tático e pedagógico indicando com precisão QUAIS CONTEÚDOS o estudante precisa melhorar/reforçar nos próximos ciclos de estudos e sessões de estudo.
   - Forneça recomendações acionáveis por disciplina, sugestões de ajuste de carga horária/foco e orientações práticas para as sessões de estudo (revisão de teoria, foco em jurisprudência/lei seca, baterias de questões específicas, etc.).`;

    if (disciplinasEdital && Array.isArray(disciplinasEdital) && disciplinasEdital.length > 0) {
      promptText += `\n\nDisciplinas e Assuntos Cadastrados no Edital do Candidato para Cruzamento de Dados:\n${JSON.stringify(disciplinasEdital, null, 2)}`;
    } else if (assuntos && Array.isArray(assuntos) && assuntos.length > 0) {
      promptText += `\n\nLista de Assuntos do Edital para Cruzamento:\n${JSON.stringify(assuntos, null, 2)}`;
    }

    parts.push({ text: promptText });

    const promptSchema = {
      type: Type.OBJECT,
      properties: {
        totalQuestoes: { type: Type.INTEGER, description: "Quantidade total exata de questões identificadas no caderno de provas" },
        tipoProva: { type: Type.STRING, description: "Tipo da prova: 'Múltipla Escolha (A-E)' ou 'Certo / Errado (C/E)'" },
        disciplinasMapeadas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nome: { type: Type.STRING, description: "Nome da disciplina identificada" },
              questoesCount: { type: Type.INTEGER, description: "Quantidade de questões identificadas desta disciplina" },
              faixaQuestoes: { type: Type.STRING, description: "Ex: 'Questões 01 a 15'" },
              pesoSugerido: { type: Type.NUMBER, description: "Peso sugerido ou identificado (padrão 1)" },
              principaisTemas: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Principais temas identificados nesta matéria"
              }
            },
            required: ["nome", "questoesCount", "faixaQuestoes"]
          }
        },
        conteudosCobradosNoEdital: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              disciplina: { type: Type.STRING, description: "Nome da disciplina correspondente" },
              assunto: { type: Type.STRING, description: "Nome do assunto/tópico programático" },
              incidencia: { type: Type.STRING, description: "Incidência identificada: 'ALTA', 'MÉDIA' ou 'BAIXA'" },
              frequenciaQuestoes: { type: Type.INTEGER, description: "Número de questões que abordaram este assunto" },
              questoesNumeros: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: "Números das questões que cobraram este assunto"
              },
              resumoCobranca: { type: Type.STRING, description: "Breve explicação de como o assunto foi cobrado pela banca" }
            },
            required: ["disciplina", "assunto", "incidencia", "frequenciaQuestoes"]
          }
        },
        diagnosticoProximosCiclos: {
          type: Type.OBJECT,
          properties: {
            resumoGeral: { type: Type.STRING, description: "Diagnóstico geral sobre o nível de exigência e padrão de cobrança da prova" },
            topicosCriticosMelhorar: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  disciplina: { type: Type.STRING },
                  assunto: { type: Type.STRING },
                  motivo: { type: Type.STRING, description: "Por que este tema é crítico ou de alta relevância para a banca" },
                  recomendacaoEstudo: { type: Type.STRING, description: "Ação prática de estudo recomendada para as próximas sessões" },
                  prioridade: { type: Type.STRING, description: "'URGENTE', 'ALTA' ou 'MÉDIA'" }
                },
                required: ["disciplina", "assunto", "motivo", "recomendacaoEstudo", "prioridade"]
              }
            },
            sugestaoAjusteCargaHoraria: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  disciplina: { type: Type.STRING },
                  acaoRecomendada: { type: Type.STRING, description: "Ex: 'Aumentar carga em 20%', 'Manter foco em resolução de questões'" },
                  justificativa: { type: Type.STRING }
                },
                required: ["disciplina", "acaoRecomendada", "justificativa"]
              }
            },
            orientacoesSessoesEstudo: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de 4 a 6 orientações táticas e práticas para os próximos ciclos de estudo"
            }
          },
          required: ["resumoGeral", "topicosCriticosMelhorar", "sugestaoAjusteCargaHoraria", "orientacoesSessoesEstudo"]
        },
        classificacoes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              assunto: { type: Type.STRING },
              incidencia: { type: Type.STRING },
              motivo: { type: Type.STRING }
            },
            required: ["assunto", "incidencia"]
          }
        }
      },
      required: ["totalQuestoes", "tipoProva", "disciplinasMapeadas", "conteudosCobradosNoEdital", "diagnosticoProximosCiclos"]
    };

    const response = await callGeminiWithRetry(client, {
      contents: { parts },
      config: {
        systemInstruction: "Você é uma inteligência artificial especialista em análise de cadernos de prova e elaboração de planos de estudos estratégicos para concursos públicos. Extraia o quantitativo exato de questões, mapeie os conteúdos e forneça um diagnóstico inteligente de altíssimo valor pedagógico.",
        responseMimeType: "application/json",
        responseSchema: promptSchema,
        temperature: 0.1,
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Nenhum dado retornado do Gemini.");
    }

    const data = JSON.parse(resultText);
    return res.json(data);
  } catch (error: any) {
    console.error("Erro ao analisar caderno de provas:", error);
    const errStr = (error?.message || "") + " " + JSON.stringify(error || "");
    let userMsg = error?.message || "Erro ao processar o caderno de provas com a IA.";
    if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
      userMsg = "A cota gratuita de requisições à IA foi temporariamente excedida. Por favor, aguarde de 30 a 60 segundos e tente novamente.";
    } else if (errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("high demand")) {
      userMsg = "Os servidores da IA estão com alta demanda temporária. Por favor, tente novamente em alguns instantes.";
    }
    return res.status(500).json({ error: userMsg });
  }
});

// API endpoint for correcting essay / discursiva answers using Gemini API
app.post("/api/corrigir-redacao", async (req, res) => {
  try {
    const { tema, texto, fileBase64, fileMimeType, banca, criterios } = req.body;

    if (!tema) {
      return res.status(400).json({ error: "É necessário fornecer o tema da questão discursiva." });
    }

    if (!texto && !fileBase64) {
      return res.status(400).json({ error: "É necessário digitar sua resposta ou anexar uma imagem/PDF com sua redação." });
    }

    const client = getGeminiClient();

    const parts: any[] = [];

    if (fileBase64) {
      parts.push({
        inlineData: {
          mimeType: fileMimeType || "image/jpeg",
          data: fileBase64,
        },
      });
    }

    let promptText = `Você é um avaliador e examinador oficial da banca examinadora "${banca || "Geral"}". 
Analise e corrija a redação técnica/questão discursiva enviada.

Tema da Questão: "${tema}"
Banca Selecionada: "${banca || "Geral"}"`;

    if (criterios) {
      promptText += `\n\nAdote rigorosamente os seguintes critérios de correção específicos e suas respectivas notas máximas:\n${criterios}`;
    }

    if (texto) {
      promptText += `\n\nTexto digitado pelo Aluno:\n"${texto}"`;
    } else {
      promptText += `\n\nAnalise o arquivo de imagem/PDF anexado contendo a redação manuscrita ou digitalizada do aluno. 
Realize o OCR/leitura com máxima atenção e transcreva todo o texto na íntegra na propriedade "transcricao" do JSON antes de avaliá-lo.`;
    }

    promptText += `\n\nAvalie o texto e retorne o parecer estruturado em português no formato JSON especificado.`;

    parts.push({ text: promptText });

    const response = await callGeminiWithRetry(client, {
      contents: { parts },
      config: {
        systemInstruction: "Você é um corretor extremamente detalhista e experiente de discursivas e redações de concursos públicos. Atribua notas realistas conforme os critérios descritos (se houver notas máximas de cada critério, respeite-as e não ultrapasse). Faça correções gramaticais precisas e forneça uma sugestão de redação perfeita.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcricao: { type: Type.STRING, description: "A transcrição completa e idêntica do texto manuscrito ou digitado analisado (or cópia do texto digitado)" },
            nota: { type: Type.NUMBER, description: "Nota final total obtida (soma das notas de cada critério)" },
            notasCriterios: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  criterio: { type: Type.STRING, description: "Nome do critério de avaliação da banca (ex: Coesão, Apresentação, Domínio do Tema)" },
                  nota: { type: Type.NUMBER, description: "Nota atribuída neste critério" },
                  notaMaxima: { type: Type.NUMBER, description: "Nota máxima possível para este critério" }
                },
                required: ["criterio", "nota", "notaMaxima"]
              },
              description: "Detalhamento das notas obtidas em cada critério avaliado"
            },
            pontosFortes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Pontos fortes encontrados na resposta, bons argumentos ou conceitos corretos apresentados"
            },
            pontosMelhoria: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Erros conceituais, falta de clareza, falhas de argumentação ou tópicos omitidos"
            },
            revisaoGramatical: { type: Type.STRING, description: "Correções e orientações sobre erros ortográficos, gramática, pontuação, crase, concordância ou regência" },
            respostaSugerida: { type: Type.STRING, description: "Sugestão exemplar de redação perfeita cobrindo integralmente o tema para servir de padrão de estudos" }
          },
          required: ["transcricao", "nota", "notasCriterios", "pontosFortes", "pontosMelhoria", "revisaoGramatical", "respostaSugerida"]
        },
        temperature: 0.15
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Nenhum dado retornado do modelo Gemini para a correção.");
    }

    return res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Erro na correção da discursiva:", error);
    const errStr = (error?.message || "") + " " + JSON.stringify(error || "");
    let userMsg = error?.message || "Erro desconhecido ao corrigir a discursiva.";
    if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
      userMsg = "A cota gratuita de requisições à IA foi temporariamente excedida. Por favor, aguarde de 30 a 60 segundos e tente novamente.";
    } else if (errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("high demand")) {
      userMsg = "Os servidores da IA estão com alta demanda temporária. Por favor, tente novamente em alguns instantes.";
    }
    return res.status(500).json({ error: userMsg });
  }
});

// Sanitize base64 data strings (remove data URI prefixes)
function sanitizeBase64(raw?: string): string {
  if (!raw) return "";
  return raw.replace(/^data:[^;]+;base64,/, "").trim();
}

// Safe JSON parser handling potential markdown wrappers
function safeParseJson(rawText: string | undefined): any {
  if (!rawText) return {};
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned);
}

// Friendly error message translator
function extractFriendlyErrorMessage(error: any): string {
  if (!error) return "Erro desconhecido ao processar com IA.";
  const msg = error.message || String(error);
  if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE") || msg.includes("Spikes in demand")) {
    return "Os servidores da IA estão temporariamente com pico de demanda (503). O sistema tentou modelos alternativos e retentativas automáticas. Por favor, tente novamente em alguns instantes.";
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
    return "Limite temporário de requisições por minuto atingido. Aguarde alguns instantes e tente novamente.";
  }
  if (msg.includes("GEMINI_API_KEY") || msg.includes("api key")) {
    return "Chave de API do Gemini não configurada ou inválida nas configurações.";
  }
  return msg;
}

// Analyze Exam Endpoint (Conferir-provas / Simulado IA)
app.post("/api/analyze-exam", async (req, res) => {
  try {
    const {
      examTitle,
      candidateAnswers, // e.g. { "1": "A", "2": "C" }
      officialAnswerKey, // string text or object { "1": "B", ... }
      examPaper, // { name, mimeType, data (base64), text }
      syllabus, // { name, mimeType, data (base64), text }
      officialKeyDoc, // { name, mimeType, data (base64), text }
      totalQuestions = 30,
    } = req.body;

    const ai = getGeminiClient();

    // Prepare prompt parts
    const parts: any[] = [];

    let promptText = `Você é um Especialista Sênior em Concursos Públicos, Avaliação Pedagógica e Inteligência Artificial Educacional.
Sua missão é realizar a CORREÇÃO COMPLETA, ANÁLISE DE DESEMPENHO ESTATÍSTICA E PEDAGÓGICA, E PLANO DE ESTUDOS PERSONALIZADO para o candidato.

DADOS FORNECIDOS:
- Nome/Título da Prova/Simulado: ${examTitle || "Exame / Concurso"}
- Total de Questões esperadas: ${totalQuestions}
- Respostas assinaladas pelo candidato (Gabarito do Aluno):
${JSON.stringify(candidateAnswers, null, 2)}`;

    if (officialAnswerKey && typeof officialAnswerKey === "object") {
      promptText += `\n- Gabarito Oficial fornecido textualmente:\n${JSON.stringify(officialAnswerKey, null, 2)}\n`;
    }

    promptText += `
INSTRUÇÕES DE ANÁLISE:
1. Examine os arquivos anexados (Caderno de Provas, Edital/Conteúdo Programático e Gabarito Oficial).
2. Se o gabarito oficial estiver no documento ou imagem anexada, extraia as respostas oficiais corretas para cada questão de 1 até ${totalQuestions}.
3. Compare meticulosamente a resposta do candidato com a resposta oficial:
   - status: 'CORRECT' (se bate), 'WRONG' (se errou), 'BLANK' (se o candidato deixou em branco ou nulo), ou 'ANNULLED' (se a questão foi anulada pela banca).
4. Para CADA questão (de 1 até ${totalQuestions}), determine:
   - questionNumber: número da questão
   - discipline: disciplina principal (ex: Língua Portuguesa, Raciocínio Lógico-Matemático, Direito Constitucional, Direito Administrativo, Conhecimentos Específicos, etc.)
   - topic: assunto ou tópico específico dentro do edital (ex: 'Crase', 'Equações de 2º Grau', 'Atos Administrativos', 'Controle de Constitucionalidade', etc.)
   - difficulty: 'FÁCIL', 'MÉDIA' ou 'DIFÍCIL'
   - officialAnswer: alternativa correta oficial ('A', 'B', 'C', 'D', 'E', 'C' ou 'E' para certo/errado)
   - candidateAnswer: alternativa assinalada pelo candidato (ou null/'-')
   - isCorrect: boolean
   - explanation: explicação concisa, didática e profunda do porquê a resposta oficial está certa e onde o candidato pode ter caído em pegadinha se tiver errado
   - editalReference: cláusula ou item correspondente do conteúdo programático do edital
   - canAppeal: boolean (se há vício evidente, dupla interpretação ou divergência doutrinária passível de recurso contra a banca)
   - appealReason: justificativa técnica para recurso (se canAppeal for true, senão vazio)
5. Calcule as estatísticas gerais:
   - totalQuestions, totalCorrect, totalWrong, totalBlank, totalAnnulled, scorePercentage
   - estimatedCutoffScore: estimativa realista da nota de corte baseada no edital / tipo de prova
   - performanceTier: classificação ('Excelente - Competitivo', 'Bom - Ajustar Detalhes', 'Intermediário - Necessita Reforço', 'Iniciante - Base Frágil')
6. Gere a Análise por Disciplina:
   - Para cada disciplina identificada:
     - discipline: nome
     - weight: peso no edital (ex: 1.0, 1.5, 2.0)
     - totalQuestions, correctCount, wrongCount, blankCount, accuracyPercentage
     - diagnosis: diagnóstico do desempenho (pontos fortes e vulnerabilidades)
     - recommendedAction: ação imediata de estudo
7. Diagnóstico dos Maiores Erros (Gaps de Conhecimento):
   - Liste os 3 a 5 tópicos mais críticos onde o candidato perdeu pontos
8. Cronograma e Plano de Estudos Personalizado (Acompanhamento):
   - summary: visão geral da rota de evolução
   - weeklyPlan: array de 4 semanas com foco prioritário, disciplinas, carga horária sugerida e estratégia de revisão (ex: resolução de questões, revisão de lei seca, teoria)
   - smartTips: 3 conselhos práticos e motivacionais de alta eficiência.

Retorne ESTRITAMENTE em formato JSON compatível com o schema requisitado.`;

    parts.push({ text: promptText });

    // Attach exam paper if provided
    if (examPaper?.data && examPaper?.mimeType) {
      parts.push({
        inlineData: {
          mimeType: examPaper.mimeType,
          data: sanitizeBase64(examPaper.data),
        },
      });
      parts.push({ text: `[Arquivo anexado acima: Caderno de Provas - ${examPaper.name || "caderno"}]` });
    } else if (examPaper?.text) {
      parts.push({ text: `[Texto do Caderno de Provas]:\n${examPaper.text}` });
    }

    // Attach syllabus if provided
    if (syllabus?.data && syllabus?.mimeType) {
      parts.push({
        inlineData: {
          mimeType: syllabus.mimeType,
          data: sanitizeBase64(syllabus.data),
        },
      });
      parts.push({ text: `[Arquivo anexado acima: Edital / Conteúdo Programático - ${syllabus.name || "edital"}]` });
    } else if (syllabus?.text) {
      parts.push({ text: `[Texto do Edital / Conteúdo Programático]:\n${syllabus.text}` });
    }

    // Attach official answer key doc if provided
    if (officialKeyDoc?.data && officialKeyDoc?.mimeType) {
      parts.push({
        inlineData: {
          mimeType: officialKeyDoc.mimeType,
          data: sanitizeBase64(officialKeyDoc.data),
        },
      });
      parts.push({ text: `[Arquivo anexado acima: Gabarito Oficial - ${officialKeyDoc.name || "gabarito"}]` });
    } else if (officialKeyDoc?.text) {
      parts.push({ text: `[Texto do Gabarito Oficial]:\n${officialKeyDoc.text}` });
    }

    const response = await callGeminiWithRetry(ai, {
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            examTitle: { type: Type.STRING },
            summary: {
              type: Type.OBJECT,
              properties: {
                totalQuestions: { type: Type.INTEGER },
                totalCorrect: { type: Type.INTEGER },
                totalWrong: { type: Type.INTEGER },
                totalBlank: { type: Type.INTEGER },
                totalAnnulled: { type: Type.INTEGER },
                scorePercentage: { type: Type.NUMBER },
                weightedScore: { type: Type.NUMBER },
                estimatedCutoffScore: { type: Type.NUMBER },
                performanceTier: { type: Type.STRING },
                generalDiagnosis: { type: Type.STRING },
              },
              required: [
                "totalQuestions",
                "totalCorrect",
                "totalWrong",
                "scorePercentage",
                "performanceTier",
                "generalDiagnosis",
              ],
            },
            disciplines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  discipline: { type: Type.STRING },
                  weight: { type: Type.NUMBER },
                  totalQuestions: { type: Type.INTEGER },
                  correctCount: { type: Type.INTEGER },
                  wrongCount: { type: Type.INTEGER },
                  blankCount: { type: Type.INTEGER },
                  accuracyPercentage: { type: Type.NUMBER },
                  diagnosis: { type: Type.STRING },
                  recommendedAction: { type: Type.STRING },
                },
                required: [
                  "discipline",
                  "totalQuestions",
                  "correctCount",
                  "wrongCount",
                  "accuracyPercentage",
                ],
              },
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.INTEGER },
                  discipline: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  candidateAnswer: { type: Type.STRING },
                  officialAnswer: { type: Type.STRING },
                  status: { type: Type.STRING }, // 'CORRECT' | 'WRONG' | 'BLANK' | 'ANNULLED'
                  explanation: { type: Type.STRING },
                  editalReference: { type: Type.STRING },
                  canAppeal: { type: Type.BOOLEAN },
                  appealReason: { type: Type.STRING },
                },
                required: [
                  "questionNumber",
                  "discipline",
                  "topic",
                  "officialAnswer",
                  "status",
                  "explanation",
                ],
              },
            },
            criticalWeaknesses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  discipline: { type: Type.STRING },
                  missedCount: { type: Type.INTEGER },
                  priority: { type: Type.STRING }, // 'ALTA' | 'MÉDIA' | 'CRÍTICA'
                  actionGuide: { type: Type.STRING },
                },
                required: ["topic", "discipline", "priority", "actionGuide"],
              },
            },
            studyPlan: {
              type: Type.OBJECT,
              properties: {
                overallStrategy: { type: Type.STRING },
                recommendedDailyHours: { type: Type.NUMBER },
                weeklyCycles: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      week: { type: Type.INTEGER },
                      title: { type: Type.STRING },
                      primaryFocus: { type: Type.STRING },
                      disciplinesToReview: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      actionSteps: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      milestoneGoal: { type: Type.STRING },
                    },
                    required: ["week", "title", "primaryFocus", "actionSteps"],
                  },
                },
                smartTips: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["overallStrategy", "weeklyCycles", "smartTips"],
            },
          },
          required: [
            "examTitle",
            "summary",
            "disciplines",
            "questions",
            "criticalWeaknesses",
            "studyPlan",
          ],
        },
      },
    });

    const parsedData = safeParseJson(response.text);
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Erro na análise da prova:", error);
    const friendlyError = extractFriendlyErrorMessage(error);
    return res.status(500).json({
      success: false,
      error: friendlyError,
    });
  }
});

// Flashcards and Smart Review Topic Generator Endpoint
app.post("/api/generate-topic-study", async (req, res) => {
  try {
    const { topic, discipline, errorContext } = req.body;
    const ai = getGeminiClient();

    const prompt = `Você é um mentor especialista em aprovação em concursos.
O aluno errou questões sobre o assunto: "${topic}" na disciplina "${discipline}".
Contexto adicional do erro: "${errorContext || "Dificuldade na aplicação prática dos conceitos"}".

Gere um mini-material de revisão acelerada contendo:
1. Resumo Flash do Conteúdo (regras essenciais, fórmulas ou mnemônicos)
2. 3 Flashcards (Pergunta desafiadora e Resposta comentada)
3. 2 Questões inéditas de fixação com gabarito comentado
4. Pegadinhas mais comuns de bancas examinadoras neste assunto.`;

    const response = await callGeminiWithRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            discipline: { type: Type.STRING },
            flashSummary: { type: Type.STRING },
            mnemonics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            commonTraps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING },
                  back: { type: Type.STRING },
                },
                required: ["front", "back"],
              },
            },
            practiceQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  statement: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctOptionIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: ["statement", "options", "correctOptionIndex", "explanation"],
              },
            },
          },
          required: ["topic", "discipline", "flashSummary", "flashcards", "practiceQuestions"],
        },
      },
    });

    const parsed = safeParseJson(response.text);
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Erro ao gerar revisão de tópico:", error);
    const friendlyError = extractFriendlyErrorMessage(error);
    return res.status(500).json({
      success: false,
      error: friendlyError,
    });
  }
});

// Serve frontend assets using Vite or Static files depending on environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Servidor] Rodando em http://localhost:${PORT}`);
  });
}

startServer();
