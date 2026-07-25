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
  const modelsToTry = ["gemini-3.6-flash", "gemini-3.1-flash-lite"];
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
        const isOverloaded = errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("high demand");

        if (isRateLimit || isOverloaded) {
          console.warn(`[Gemini API] Modelo ${model} (tentativa ${attempt}/3) erro temporário (${isRateLimit ? "429 RateLimit" : "503 Overloaded"}). Aguardando...`);
          if (attempt < 3) {
            await new Promise((res) => setTimeout(res, attempt * 2000));
          }
        } else {
          throw err;
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

// API endpoint for analyzing exam papers to find topic incidences
app.post("/api/scan-caderno", async (req, res) => {
  try {
    const { pdfBase64, pdfMimeType, text, assuntos } = req.body;

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

    const assuntosList = Array.isArray(assuntos) ? assuntos : [];
    parts.push({
      text: `Analise as questões presentes neste caderno de prova e determine a frequência de cobrança (incidência) para cada um dos seguintes assuntos/tópicos listados abaixo.
Classifique cada assunto estritamente como "ALTA", "MÉDIA" ou "BAIXA".

Lista de assuntos para classificar:
${JSON.stringify(assuntosList)}

Retorne um objeto JSON contendo um array 'classificacoes', onde cada item possui o nome do 'assunto' e a 'incidencia' ("ALTA", "MÉDIA" ou "BAIXA") correspondente, explicando brevemente o motivo.`,
    });

    const promptSchema = {
      type: Type.OBJECT,
      properties: {
        classificacoes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              assunto: { type: Type.STRING },
              incidencia: { type: Type.STRING, description: "ALTA, MÉDIA ou BAIXA" },
              motivo: { type: Type.STRING }
            },
            required: ["assunto", "incidencia"]
          }
        }
      },
      required: ["classificacoes"]
    };

    const response = await callGeminiWithRetry(client, {
      contents: { parts },
      config: {
        systemInstruction: "Você é uma inteligência artificial especialista em análise de provas de concursos. Sua tarefa é analisar o caderno de prova fornecido, identificar quais assuntos da lista são cobrados nas questões, e quantificar/classificar o nível de incidência de cada assunto.",
        responseMimeType: "application/json",
        responseSchema: promptSchema,
        temperature: 0.1,
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Nenhum dado retornado do Gemini.");
    }

    return res.json(JSON.parse(resultText));
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
