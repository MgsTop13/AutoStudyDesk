export class LoginManager {
  constructor(page) {
    this.page = page;
    this.authToken = null;
    this.tokenResumo = null;
    this.aluno = null;
    this.rawLogin = null;
    this._promessaLogin = null;
  }

  setPromessaLogin(resolve) {
    this._promessaLogin = resolve;
  }

  _processarLogin(body) {
    if (body.token) this.authToken = body.token;
    if (body.tokenResumo) this.tokenResumo = body.tokenResumo;

    const d = body.DadosUsuario || {};
    const perfil = d.PERFIS?.[0] || {};
    const extra = d.A?.[0] || {};

    this.aluno = {
      codigoUsuario: d.CD_USUARIO,
      ra: body.statusRetorno || d.LOGIN,
      login: d.LOGIN,
      nome: d.NAME,
      nick: d.NM_NICK,

      emailGoogle: d.EMAIL_GOOGLE,
      emailMS: d.EMAIL_MS,

      // Perfil
      perfil: perfil.NM_PERFIL,
      comportamento: perfil.COMPORTAMENTO,

      // Extras
      dataNascimento: extra.DT_NASC,
    };

    this.rawLogin = body;

    if (this._promessaLogin) this._promessaLogin(body);
  }

  async login(ra, digito, senha) {
    await this.page.goto("https://saladofuturo.educacao.sp.gov.br/login-alunos", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await this.page.waitForSelector('input[type="text"]', { timeout: 15000 });
    await this.page.waitForTimeout(2000);

    await this.page.locator('input[type="text"]').first().fill(ra);
    await this.page.locator('input[type="text"]').nth(1).fill(digito);
    await this.page.locator('input[type="password"]').first().fill(senha);
    await this.page.locator('button:has-text("Acessar")').first().click();

    await this.page.waitForFunction(() => !window.location.href.includes("/login"), {
      timeout: 30000
    }).catch(() => { });

    await this.page.waitForTimeout(10000);
    return { sucesso: true };
  }

  handleResponse(response) {
    const url = response.url();
    if (url.includes("LoginCompletoToken") || url.includes("/login")) {
      response.json().then(body => {
        this._processarLogin(body);
      }).catch(() => { });
    }
  }

  getAuthToken() {
    return this.authToken;
  }

  getAluno() {
    return this.aluno;
  }
}