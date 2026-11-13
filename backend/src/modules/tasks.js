export class TasksManager {
  constructor(page) {
    this.page = page;
    this.listaTarefas = [];
    this._promessaTarefas = null;
  }

  setPromessaTarefas(resolve) {
    this._promessaTarefas = resolve;
  }

  _handleTarefasResponse(response) {
    const url = response.url();
    if (url.includes("/tms/task/todo") && !url.includes("/count")) {
      response.json().then(body => {
        if (Array.isArray(body) && body[0]?.title) {
          this.listaTarefas = body;
          if (this._promessaTarefas) this._promessaTarefas(body);
        }
      }).catch(() => { });
    }
  }

  async buscarTarefas() {
    const promessaTarefas = new Promise((resolve) => {
      this._promessaTarefas = resolve;
    });

    await this.page.goto("https://saladofuturo.educacao.sp.gov.br/tarefas?status=A%20Fazer", {
      waitUntil: "domcontentloaded",
      timeout: 50000
    });

    await Promise.race([
      promessaTarefas,
      new Promise(r => setTimeout(r, 10000))
    ]);

    return this.listaTarefas;
  }

  async buscarTarefasExpiradas() {
    const promessaTarefas = new Promise((resolve) => {
      this._promessaTarefas = resolve;
    });

    await this.page.goto("https://saladofuturo.educacao.sp.gov.br/tarefas?status=Expiradas", {
      waitUntil: "domcontentloaded",
      timeout: 50000
    });

    await Promise.race([
      promessaTarefas,
      new Promise(r => setTimeout(r, 10000))
    ]);

    return this.listaTarefas;
  }

  getListaTarefas() {
    return this.listaTarefas;
  }
}