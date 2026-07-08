module.exports = {
  credenciais: {
    ra: "SEURA",
    digito: "SEUDIGITO",
    senha: "SUASENHA"
  },
  
  urls: {
    login: 'https://saladofuturo.educacao.sp.gov.br/login-alunos',
    tarefas: 'https://saladofuturo.educacao.sp.gov.br/tarefas'
  },
  
  // Endpoints que contêm dados importantes
  endpointsDados: [
    'ListarTurmasPorAluno',
    'ListarBimestres',
    'ObterAlunoPorCodigo',
    'ListarDisciplinaPorAluno',
    'listar-perfis',
    'listar-avisos-turma',
    'conquistaAluno',
    'GetFaltasBimestreAtual',
    'GetAgendaPeriodoEscola',
    'GetAvaliacaoAluno',
    'ExibirAluno'
  ],
  
  // Endpoints de tarefas
  endpointsTarefas: [
    'edusp-api.ip.tv/tms/task/todo',
    'edusp-api.ip.tv/tms/answer'
  ],
  
  // Configurações do navegador
  browser: {
    headless: false,  // true = não mostra janela
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    timeout: 30000
  }
};