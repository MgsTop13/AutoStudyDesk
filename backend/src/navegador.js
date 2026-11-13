import { BrowserManager } from "./modules/browser.js";
import { LoginManager } from "./modules/login.js";
import { TasksManager } from "./modules/tasks.js";
import { CaptchaManager } from "./modules/captcha.js";
import { AnswersManager } from "./modules/answers.js";

class Navegador {
  constructor(sessionId) {
    this.sessionId = sessionId;

    // Managers
    this.browserManager = new BrowserManager();
    this.loginManager = null;
    this.tasksManager = null;
    this.captchaManager = null;
    this.answersManager = null;

    // Dados compartilhados
    this.sedToken = null;
    this.pubTargets = [];
    this.codigoAluno = null;
    this.sedCookies = "";
    this.userAgent = "";
  }

  async iniciar() {
    await this.browserManager.iniciar();
    const page = this.browserManager.getPage();

    this.loginManager = new LoginManager(page);
    this.tasksManager = new TasksManager(page);
    this.captchaManager = new CaptchaManager(page);
    this.answersManager = new AnswersManager(page, () => this.captchaManager.getQuestoesAPI());

    // Configura listeners de resposta
    page.on("response", async (response) => {
      this.loginManager.handleResponse(response);
      this.tasksManager._handleTarefasResponse(response);
      this.captchaManager._handleQuestoesResponse(response);
    });
  }

  // ==========================================
  // LOGIN
  // ==========================================
  async login(ra, digito, senha) {
    return await this.loginManager.login(ra, digito, senha);
  }

  get aluno() {
    return this.loginManager.getAluno();
  }

  get authToken() {
    return this.loginManager.getAuthToken();
  }

  // ==========================================
  // TAREFAS
  // ==========================================
  async buscarTarefas() {
    return await this.tasksManager.buscarTarefas();
  }

  async buscarTarefasExpiradas() {
    return await this.tasksManager.buscarTarefasExpiradas();
  }

  // ==========================================
  // CAPTCHA / ATIVIDADE
  // ==========================================
  async abrirTarefa(tarefaId) {
    return await this.captchaManager.abrirTarefa(tarefaId);
  }

  async pegarCaptcha() {
    return await this.captchaManager.pegarCaptcha();
  }

  async resolverCaptcha(resposta) {
    return await this.captchaManager.resolverCaptcha(resposta);
  }

  // ==========================================
  // PREENCHER RESPOSTAS
  // ==========================================
  async preencherRespostas(respostas) {
    return await this.answersManager.preencherRespostas(respostas);
  }

  // ==========================================
  // FECHAR
  // ==========================================
  async fechar() {
    await this.browserManager.fechar();
  }
}

export default Navegador;