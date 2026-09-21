import { Router } from "express";
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
- Para "fill-words": retorne um array com as palavras na ordem das lacunas
- Para "order-sentences": retorne um array com os IDs na ordem correta
- Para "text_ai": retorne um texto dissertativo (mínimo 50 palavras)
- Responda APENAS o JSON, sem explicações

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

endpoint.post("/EnviarAtividade", async (req, res) => {
  const { page, sessionId } = req.body;

  try {
    const tokenGemini = process.env.gemini;

    if (!sessionId) return res.status(400).json({ details: "Faça login novamente!" });

    const entregarIA = limparQuestoesParaIA(page.questoes);
    const ai = new GoogleGenAI({ apiKey: tokenGemini });

    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: `${PROMPT}\n\nQuestões:\n${JSON.stringify(entregarIA, null, 2)}`
    });

    let texto = interaction.output_text || "";
    texto = texto.replace(/```json/g, "").replace(/```/g, "").trim();
    const respostas = JSON.parse(texto);

    res.status(200).json({
      sucess: true,
      IA: respostas.respostas
    });

  } catch (error) {
    console.error('🔴 ERRO:', error.message);
    res.status(500).json({ sucess: false, error: error.message });
  }
});

export default endpoint;
