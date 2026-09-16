import { Router } from "express";
import sessaoManager from "../section.js";
const endpoint = Router();

// ==========================================
// POST /login
// Retorna dados essenciais (como o site pago)
// ==========================================
endpoint.post("/login", async (req, res) => {
  try {
    const { ra, digito, senha } = req.body;

    if (!ra || !digito || !senha) {
      return res.status(400).json({ erro: "Campos obrigatórios faltando" });
    }

    const { sessionId, navegador } = await sessaoManager.criar();

    // Faz login (rápido, espera API responder)
    await navegador.login(ra, digito, senha);

    // Busca tarefas
    const tarefas = await navegador.buscarTarefas();

    // ⚡ Retorna SÓ o essencial
    return res.json({
      sessionId,
      aluno: navegador.aluno,
      codigoAluno: navegador.codigoAluno,
      pubTargets: navegador.pubTargets,
      totalTarefas: tarefas.length,
      tarefas
    });

  } catch (error) {
    console.error("❌ Erro no login:", error);
    return res.status(500).json({ erro: error.message });
  }
});

// ==========================================
// POST /logout
// ==========================================
endpoint.post("/logout", async (req, res) => {
  try {
    const { sessionId } = req.body;
    await sessaoManager.destruir(sessionId);
    return res.json({ sucesso: true });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

// ==========================================
// GET /sessao/:sessionId
// ==========================================
endpoint.get("/sessao/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const navegador = sessaoManager.get(sessionId);

  if (!navegador) {
    return res.status(404).json({ ativa: false });
  }

  return res.json({
    ativa: true,
    aluno: navegador.aluno,
    codigoAluno: navegador.codigoAluno
  });
});

// ==========================================
// GET /sessao/:sessionId/tokens
// (DEBUG) Retorna os tokens capturados
// ==========================================
endpoint.get("/sessao/:sessionId/tokens", (req, res) => {
  const { sessionId } = req.params;
  const navegador = sessaoManager.get(sessionId);

  if (!navegador) {
    return res.status(404).json({ erro: "Sessão não encontrada" });
  }

  return res.json({
    authToken: navegador.authToken,
    sedToken: navegador.sedToken,
    sedCookies: navegador.sedCookies,
    pubTargets: navegador.pubTargets,
    codigoAluno: navegador.codigoAluno,
    userAgent: navegador.userAgent
  });
});

export default endpoint;