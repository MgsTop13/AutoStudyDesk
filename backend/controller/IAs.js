import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { limparQuestoesParaIA } from "../utils/limpar.js";

import {InsertTask} from "../repository/AIRep.js";

dotenv.config();
const endpoint = Router();

const PROMPT = `Você é um aluno respondendo retorne somente o necessário
REGRAS:
- Para "text_ai": retorne um texto dissertativo (mínimo 50 palavras)
- Responda APENAS o JSON, sem explicações

EXEMPLO:
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

endpoint.post("/EnviarAtividade/Gemini", async (req, res) => {
  const { page, sessionId } = req.body;

  try {
    const tokenGemini = process.env.gemini;

    if (!sessionId) return res.status(400).json({ details: "Faça login novamente!" });

    const entregarIA = limparQuestoesParaIA(page.questoes);
    const ai = new GoogleGenAI({ apiKey: tokenGemini });

    const interaction = await ai.interactions.create({
      model: "gemini-3.1-flash-lite",
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


endpoint.post("/SalvarAtividade", async (req, res) => {
  try {
    const taskInfo = req.body;
    const BANCO = await InsertTask(taskInfo);

    res.status(200).send({
      b: BANCO
    })
  } catch (error) {
    res.status(500).send({
      error: error.message
    })
  }
})
export default endpoint;
