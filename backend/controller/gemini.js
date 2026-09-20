import { Router } from "express";
import sessaoManager from "../section.js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv"

dotenv.config();
const endpoint = Router();

const prompt = `Você é um aluno respondendo uma tarefa escolar. Analise cada questão e retorne SOMENTE um JSON com as respostas.

REGRAS:
- Para tipo "single": retorne apenas a LETRA (A, B, C, D ou E)
- Para "fill-words": retorne um array com as palavras na ordem das lacunas
- Para "order-sentences": retorne um array com os IDs na ordem correta
- Para "text_ai": retorne um texto dissertativo (mínimo 50 palavras)
- Responda APENAS o JSON, sem explicações

FORMATO:
{
  "respostas": [
    { "id": 123, "tipo": "single", "valor": "C" },
    { "id": 456, "tipo": "fill-words", "valor": ["distributiva", "sociedade civil", "democratizar"] },
    { "id": 789, "tipo": "order-sentences", "valor": ["ghrrVdzv", "Odrwi9iV", "vZCfeqSS"] },
    { "id": 101, "tipo": "text_ai", "valor": "A participação ativa..." }
  ]
}`;

export function limparHTML(texto) {
    if (!texto) return '';
    if (typeof texto !== 'string') texto = String(texto);
    return texto
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}



export function limparQuestoesParaIA(questoesAPI) {
    if (!questoesAPI?.questions) return null;

    const questoesReais = questoesAPI.questions.filter(q => q.type !== 'info');

    return {
        tarefaId: questoesAPI.id,
        titulo: questoesAPI.title,
        descricao: limparHTML(questoesAPI.description) || '',
        totalQuestoes: questoesReais.length,
        questoes: questoesReais.map((q, index) => {
            const base = {
                ordem: index + 1,
                id: q.id,
                tipo: q.type,
                pontos: q.score,
                pergunta: limparHTML(q.statement)
            };

            if (q.type === 'single' && q.options) {
                base.opcoes = Object.entries(q.options).map(([idx, opt]) => ({
                    letra: String.fromCharCode(65 + parseInt(idx)),
                    id: opt.id,
                    texto: limparHTML(opt.statement)
                }));
            }

            if (q.type === 'fill-words' && q.options) {
                base.banco = q.options.items;
                base.lacunas = q.options.phrase.filter(p => p.type === 'select').length;
                base.frase = q.options.phrase.map(p =>
                    p.type === 'text' ? p.value : '___'
                ).join('');
            }

            if (q.type === 'order-sentences' && q.options) {
                base.frases = q.options.sentences.map((f, i) => ({
                    posicao: i + 1,
                    id: q.options.incorrects?.[i]?.id || null,
                    texto: f
                }));
            }

            if (q.type === 'text_ai') {
                base.palavrasChave = q.options?.ai_grading_keywords || [];
                base.maxChars = q.options?.max_text_count || 2000;
            }

            return base;
        })
    };
}

endpoint.post("/EnviarAtividade", async (req, res) => {
    const { page /*sessionId*/ } = req.body;

    try {
        //const navegador = sessaoManager.get(sessionId);
        const tokenGemini = process.env.gemini;
        /*
        if (!sessionId)
            return res.status(400).json({ details: "Faça login novamente!" });
        */

        const entregarIA = limparQuestoesParaIA(page.questoes);

        const ai = new GoogleGenAI({ apiKey: tokenGemini });

        const interaction = await ai.interactions.create({
            model: "gemini-3.6-flash",
            input: `${prompt}\n\nQuestões:\n${JSON.stringify(entregarIA, null, 2)}`
        });

        res.status(200).json({
            sucess: true,
            IA: interaction.output_text  // ✅ output_text
        });



    } catch (error) {
        console.error('🔴 ERRO COMPLETO:');
        console.error('   Name:', error.name);
        console.error('   Message:', error.message);
        console.error('   Status:', error.status);
        console.error('   Stack:', error.stack);

        // Tenta pegar o body da resposta
        if (error.response) {
            console.error('   Body:', JSON.stringify(error.response, null, 2));
        }

        res.status(500).json({
            sucess: false,
            error: error.message,
            // ✅ Debug extra
            debug: {
                name: error.name,
                status: error.status,
                response: error.response || 'sem response'
            }
        });

    }
})



export default endpoint;