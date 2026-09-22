import { Router } from "express";
import sessaoManager from "../section.js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { limparQuestoesParaIA } from "../utils/limpar.js";

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
endpoint.get("/tarefas/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const navegador = sessaoManager.get(sessionId);

    if (!navegador) return res.status(404).json({ erro: "Sessão não encontrada" });

    const tarefas = await navegador.buscarTarefas();
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
endpoint.post("/tarefas/captcha-ia-preencher", async (req, res) => {
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
    // 2. Limpa questões
    const questoesLimpa = limparQuestoesParaIA(resultado.questoes);
    // 3. Chama Gemini
    const tokenGemini = process.env.gemini;
    const ai = new GoogleGenAI({ apiKey: tokenGemini });
    
    console.log(ai)
    
    
    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: `${PROMPT}\n\nQuestões:\n${JSON.stringify(questoesLimpa, null, 2)}`
    });

    let texto = interaction.output_text || "";
    texto = texto.replace(/```json/g, "").replace(/```/g, "").trim();
    const respostas = JSON.parse(texto).respostas;

    // 4. Preenche no site
    const resultados = await navegador.preencherRespostas(respostas);

    // 5. Retorna
    return res.json({
      sucesso: true,
      etapas: {
        captcha: "ok",
        ia: "ok",
        preenchimento: resultados
      },
      questoes: questoesLimpa,
      respostasIA: respostas,
      resultadosPreenchimento: resultados
    });

  } catch (error) {
    console.error('🔴 ERRO:', error.message);
    return res.status(500).json({ sucesso: false, error: error });
  }
});

export default endpoint;