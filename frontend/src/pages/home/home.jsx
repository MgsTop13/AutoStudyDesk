import { useNavigate, Link } from "react-router";
import { useEffect, useState } from "react";
import api from "../../axios";
import "./home.scss";

export default function Home() {
    const [filtro, setFiltro] = useState("Ativas");
    const [aluno, setAluno] = useState(null);
    const [tasks, setTasks] = useState(0);
    const [carregando, setCarregando] = useState(true);
    const sessionId = localStorage.getItem("session");
    const navigate = useNavigate();

    // ==========================================
    // CACHE LOCAL (evita chamar backend toda hora)
    // ==========================================
    const CACHE_KEY = "home_cache";
    const CACHE_TTL = 1000 * 60 * 5; // 5 minutos

    function lerCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;

            const cache = JSON.parse(raw);
            const agora = Date.now();

            // Se expirou, joga fora
            if (agora - cache.timestamp > CACHE_TTL) {
                localStorage.removeItem(CACHE_KEY);
                return null;
            }

            return cache;
        } catch {
            return null;
        }
    }

    function salvarCache(data) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            ...data,
            timestamp: Date.now()
        }));
    }

    // ==========================================
    // CARREGA DADOS
    // ==========================================
    async function getActivy(force = false) {
        try {
            setCarregando(true);

            // ✅ 1. Tenta cache local
            if (!force) {
                const cache = lerCache();
                if (cache) {
                    console.log("💾 Home — usando cache local");
                    setAluno(cache.aluno);
                    setTasks(cache.tasks);
                    setCarregando(false);
                    return;
                }
            }

            console.log("🌐 Home — buscando do backend");

            // 2. Verifica sessão + pega aluno
            const isOnline = await api.get(`/sessao/${sessionId}`);
            if (isOnline.data.ativa === false) {
                alert("Sessão expirada, faça login de novo");
                localStorage.removeItem(CACHE_KEY);
                localStorage.removeItem("session");
                return navigate("/");
            }

            // 3. Busca tarefas
            const tarefasResp = await api.get(`/tarefas/${sessionId}`);
            const tarefasExpired = await api.get(`/tarefasExpiradas/${sessionId}`);
            const totalAtiva = tarefasResp.data.tarefas.length;
            const totalExpirada = tarefasExpired.data.tarefas.length;


            // 4. Salva no estado
            setAluno(isOnline.data.aluno);
            setTasks(totalAtiva + totalExpirada);

            // 5. Salva no cache
            salvarCache({
                aluno: isOnline.data.aluno,
                tasksActive: totalAtiva,
                tasksExpired: totalExpirada
            });

        } catch (error) {
            console.error(error.message);
        } finally {
            setCarregando(false);
        }
    }

    // Limpa cache quando deslogar
    async function logout() {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem("session");
        
        try {
            const logoutAccount = await api.post("/logout", {
                sessionId: sessionId
            });
            console.log(logoutAccount);

            if(logoutAccount.data.sucesso == true){
                alert("Desconectado com sucesso!")
                navigate("/");
            }
            } catch (error) {
            console.error(error)
        }

    }

    useEffect(() => {
        getActivy();
    }, []);

    // ==========================================
    // RENDER
    // ==========================================
    if (carregando && !aluno) {
        return (
            <main className="main-home">
                <p>Carregando...</p>
            </main>
        );
    }

    return (
        <main className="main-home">

            {/* ==========================================
                CARD DO ALUNO
            ========================================== */}
            {aluno && (
                <div className="aluno-card">
                    <div className="avatar">
                        {aluno.nome?.charAt(0) || "?"}
                    </div>

                    <div className="info-aluno">
                        <h1>{aluno.nome}</h1>

                        <div className="emails">
                            <span>Google: {aluno.emailGoogle}</span>
                            <span>Microsoft: {aluno.emailMS}</span>
                        </div>

                        <p className="perfil">
                            {aluno.perfil} | Nick: {aluno.nick}
                        </p>
                    </div>
                </div>
            )}

            {/* ==========================================
                CARDS DE RESUMO
            ========================================== */}
            <div className="all">
                <div className="info">
                    <Link to="/Tasks" className="link">
                        <h3 onClick={() => getActivy(true)}>
                            Tarefas: {tasks}
                        </h3>
                    </Link>
                    <Link to="/Home" className="link">
                        <h3>Provas: Futuramente disponivel</h3>
                    </Link>
                    <Link to="/Home" className="link">
                        <h3>Redação: Futuramente disponivel</h3>
                    </Link>
                </div>

                <div className="boletim">
                    <h2>Boletim: Futuramente disponivel</h2>
                </div>
            </div>

            <p className="plataformas">Plataformas</p>
            <h2>Futuramente disponivel</h2>
            <button onClick={logout} className="btn-logout">
                Sair
            </button>
        </main>
    );
}