import { Router } from "express";
import sessaoManager from "../section.js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { limparQuestoesParaIA } from "../utils/cleanActivy.js";
import {InsertTask, ListTask} from "../repository/taskR.js";


dotenv.config();
const endpoint = Router();

const PROMPT = `Você é um aluno respondendo uma tarefa escolar. Analise cada questão e retorne SOMENTE um JSON com as respostas.

REGRAS:
- Para tipo "single": retorne apenas a LETRA (A, B, C, D ou E)
- Para tipo "multi": retorne um array com as LETRAS corretas
- Para "true-false": retorne um array de booleanos (true/false na ordem)
- Para "fill-words": retorne um array com as palavras na ordem das lacunas (use EXATAMENTE as palavras do banco)
- Para "order-sentences": retorne um array com os IDs na ordem correta
- Para "text_ai": retorne um texto dissertativo (mínimo 50 palavras)
- Responda APENAS o JSON, sem explicações, sem markdown

FORMATO:
{
  "respostas": [
    { "id": 123, "tipo": "single", "valor": "C" },
    { "id": 124, "tipo": "multi", "valor": ["A", "C"] },
    { "id": 125, "tipo": "true-false", "valor": [true, true, false, true] },
    { "id": 456, "tipo": "fill-words", "valor": ["distributiva", "sociedade civil", "democratizar"] },
    { "id": 789, "tipo": "order-sentences", "valor": ["ghrrVdzv", "Odrwi9iV", "vZCfeqSS"] },
    { "id": 101, "tipo": "text_ai", "valor": "A participação ativa..." }
  ]
}`;

// ==========================================
// GET /tarefas/:sessionId
// ==========================================

// controller/task.js
endpoint.get("/tarefas/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const navegador = sessaoManager.get(sessionId);
    if (!navegador) return res.status(404).json({ erro: "Sessão não encontrada" });

    // ✅ Só busca 1x (todas)
    const tarefas = await navegador.buscarTarefas();

    return res.json({ tarefas });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

endpoint.get("/tarefasExpiradas/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const navegador = sessaoManager.get(sessionId);
    if (!navegador) return res.status(404).json({ erro: "Sessão não encontrada" });

    // ✅ Só busca 1x (todas)
    const tarefas = await navegador.buscarTarefasExpiradas();

    return res.json({ tarefas });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});
// ==========================================
// POST /tarefas/abrir
// ==========================================
endpoint.post("/tarefas/abrir", async (req, res) => {
  try {
    const { sessionId, tarefaId } = req.body;
    const navegador = sessaoManager.get(sessionId);

    if (!navegador) return res.status(404).json({ erro: "Sessão não encontrada" });

    await navegador.abrirTarefa(tarefaId);
    const captcha = await navegador.pegarCaptcha();

    return res.json({
      captcha: {
        imagem: captcha.imagem
      }
    });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

// ==========================================
// POST /tarefas/captcha
// ==========================================
endpoint.post("/tarefas/captcha", async (req, res) => {
  try {
    const { sessionId, resposta } = req.body;
    const navegador = sessaoManager.get(sessionId);

    if (!navegador) return res.status(404).json({ erro: "Sessão não encontrada" });

    const resultado = await navegador.resolverCaptcha(resposta);

    if (!resultado.sucesso) {
      return res.json({
        sucesso: false,
        details: "Por favor faça o captcha novamente!"
      });
    }

    return res.json({
      sucesso: true,
      questoes: resultado.questoes
    });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

// ==========================================
// POST /tarefas/captcha-ia-preencher
// Faz TUDO: valida captcha + chama IA + preenche
// ==========================================
endpoint.post("/tarefas/EnviarAtividade/Gemini", async (req, res) => {
  try {
    const { sessionId, resposta } = req.body;
    const navegador = sessaoManager.get(sessionId);

    if (!navegador) return res.status(404).json({ erro: "Sessão não encontrada" });

    // 1. Resolve CAPTCHA
    const resultado = await navegador.resolverCaptcha(resposta);
    if (!resultado.sucesso) {
      return res.json({
        sucesso: false,
        etapa: "captcha",
        details: "CAPTCHA inválido, tente novamente"
      });
    }
    const questoesLimpa = limparQuestoesParaIA(resultado.questoes);
    const ExistAnswer = await ListTask({
      id: questoesLimpa.tarefaId
    });

    if (ExistAnswer === "Não tem alguma resposta no banco") {
      const tokenGemini = process.env.gemini;
      const ai = new GoogleGenAI({ apiKey: tokenGemini });

      const interaction = await ai.interactions.create({
        model: "gemini-3.1-flash-lite",
        input: `${PROMPT}\n\nQuestões:\n${JSON.stringify(questoesLimpa, null, 2)}`
      });

      let texto = interaction.output_text || "";
      texto = texto.replace(/```json/g, "").replace(/```/g, "").trim();
      const respostas = JSON.parse(texto).respostas;

      // 4. Preenche no site
      const resultados = await navegador.preencherRespostas(respostas);
      const saveOnBank = await InsertTask({
        id: questoesLimpa.tarefaId,
        name: questoesLimpa.titulo,
        json: respostas
      });

      // 5. Retorna
      return res.json({
        sucesso: true,
        preenchimento: resultados,
        respostasIA: respostas,
        existeAntes: false,
        bancoSalvou: saveOnBank.affectedRows
      });
    } else {
      const resultadosInWebsite = await navegador.preencherRespostas(ExistAnswer[0].questions);
      return res.json({
        sucesso: true,
        existeAntes: true,
        navegadorPreencheu: resultadosInWebsite
      })
    }

  } catch (error) {
    console.error('🔴 ERRO:', error.message);
    return res.status(500).json({ sucesso: false, error: error });
  }
});

export default endpoint;