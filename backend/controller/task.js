import { Router } from "express";
import sessaoManager from "../section.js";
const endpoint = Router();

// ==========================================
// GET /tarefas/:sessionId
// ==========================================
endpoint.get("/tarefas/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const navegador = sessaoManager.get(sessionId);

    if (!navegador) {
      return res.status(404).json({ erro: "Sessão não encontrada" });
    }

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

    if (!navegador) {
      return res.status(404).json({ erro: "Sessão não encontrada" });
    }

    await navegador.abrirTarefa(tarefaId);
    const captcha = await navegador.pegarCaptcha();

    return res.json({
      captcha: {
        imagem: captcha.imagem,
        challengeId: captcha.challengeId
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

    if (!navegador) {
      return res.status(404).json({ erro: "Sessão não encontrada" });
    }

    const resultado = await navegador.resolverCaptcha(resposta);

    if (!resultado.sucesso) {
      const novoCaptcha = await navegador.pegarCaptcha();
      return res.json({
        sucesso: false,
        captcha: {
          imagem: novoCaptcha.imagem,
          challengeId: novoCaptcha.challengeId
        },
        detalhe: novoCaptcha.detalhes
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
// GET /boletim/:sessionId  (FUTURO)
// ==========================================
endpoint.get("/boletim/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const navegador = sessaoManager.get(sessionId);
    if (!navegador) return res.status(404).json({ erro: "Sessão não encontrada" });

    return res.json({ boletim: [] });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

// ==========================================
// GET /faltas/:sessionId  (FUTURO)
// ==========================================
endpoint.get("/faltas/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const navegador = sessaoManager.get(sessionId);
    if (!navegador) return res.status(404).json({ erro: "Sessão não encontrada" });

    return res.json({ faltas: [] });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

// ==========================================
// GET /agenda/:sessionId  (FUTURO)
// ==========================================
endpoint.get("/agenda/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const navegador = sessaoManager.get(sessionId);
    if (!navegador) return res.status(404).json({ erro: "Sessão não encontrada" });

    return res.json({ agenda: [] });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

export default endpoint;