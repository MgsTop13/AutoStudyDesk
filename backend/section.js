import Navegador from "./navegador.js";
import { randomUUID } from "crypto";

class SessaoManager {
  constructor() {
    this.sessoes = new Map();
  }

  async criar() {
    const sessionId = randomUUID();
    const navegador = new Navegador(sessionId);
    await navegador.iniciar();
    this.sessoes.set(sessionId, navegador);
    return { sessionId, navegador };
  }

  get(sessionId) {
    return this.sessoes.get(sessionId);
  }

  async destruir(sessionId) {
    const navegador = this.sessoes.get(sessionId);
    if (navegador) {
      await navegador.fechar();
      this.sessoes.delete(sessionId);
    }
  }
}

export default new SessaoManager();