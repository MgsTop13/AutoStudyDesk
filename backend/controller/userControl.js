import { Router } from "express";
import sessaoManager from "../section.js";
import { LoadToken, SaveToken } from "../repository/userR.js"
import { criptografar, descriptografar } from "../utils/crypt.js"
const endpoint = Router();

endpoint.post("/login", async (req, res) => {
  try {
    const { ra, digito, senha } = req.body;

    if (!ra || !digito || !senha) {
      return res.status(400).json({ erro: "Campos obrigatórios faltando" });
    }

    const { sessionId, navegador } = await sessaoManager.criar();

    await navegador.login(ra, digito, senha);

    return res.json({
      sessionId,
      aluno: navegador.aluno,
      codigoAluno: navegador.codigoAluno,
      pubTargets: navegador.pubTargets
    });

  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ erro: error.message });
  }
});

endpoint.post("/logout", async (req, res) => {
  try {
    const { sessionId } = req.body;
    await sessaoManager.destruir(sessionId);
    return res.json({ sucesso: true });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

endpoint.get("/sessao/:sessionId", async(req,res) => {
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

endpoint.post("/SaveText", async(req,res) => {
  try {
    const user = req.body;
    const bancoResponse = await SaveToken(user);

    res.send({
      sucess: true,
      tokenIsSaved: bancoResponse.affectedRows
    });

  } catch (error) {
    res.status(500).send({
      error: error.message
    })
  }
});

endpoint.post("/LoadText/:username", async(req,res) => {
  try {
    const username = req.params.username;
    const newToken = await LoadToken(username);
    
    res.send({
      token: newToken,
      temToken: true
    });

  } catch (error) {
    res.status(500).send({
      error: error.message
    })
  }
});

export default endpoint;