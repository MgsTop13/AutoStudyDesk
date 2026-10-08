import { useNavigate, Link } from "react-router";
import { useEffect, useState } from "react";
import api from "../../axios";
import HeaderP from "../../components/header";
import Settings from "../../components/Settings/settings.jsx";
import "../../../scss/global.scss"
import "./home.scss";

export default function Home() {
    const [aluno, setAluno] = useState(null);
    const [tasks, setTasks] = useState(0);
    const [carregando, setCarregando] = useState(true);
    const [configAberto, setConfigAberto] = useState(false);
    const sessionId = localStorage.getItem("session");
    const navigate = useNavigate();

    // ==========================================
    // CACHE LOCAL
    // ==========================================
    const CACHE_KEY = "home_cache";
    const CACHE_TTL = 1000 * 60 * 5; // 5 min

    function lerCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;

            const cache = JSON.parse(raw);
            if (Date.now() - cache.timestamp > CACHE_TTL) {
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

            if (!force) {
                const cache = lerCache();
                if (cache) {
                    console.log("💾 Home — cache local");
                    setAluno(cache.aluno);
                    setTasks(cache.tasks);
                    setCarregando(false);
                    return;
                }
            }

            console.log("🌐 Home — backend");

            const isOnline = await api.get(`/sessao/${sessionId}`);
            if (isOnline.data.ativa === false) {
                alert("Sessão expirada, faça login de novo");
                localStorage.removeItem(CACHE_KEY);
                localStorage.removeItem("session");
                return navigate("/");
            }

            const tarefasResp = await api.get(`/tarefas/${sessionId}`);
            const tarefasExpired = await api.get(`/tarefasExpiradas/${sessionId}`);
            const totalAtiva = tarefasResp.data.tarefas.length;
            const totalExpirada = tarefasExpired.data.tarefas.length;
            const total = totalAtiva + totalExpirada;

            setAluno(isOnline.data.aluno);
            localStorage.setItem("username", isOnline.data.aluno.nome);
            setTasks(total);

            salvarCache({
                aluno: isOnline.data.aluno,
                tasks: total,
                tasksActive: totalAtiva,
                tasksExpired: totalExpirada
            });

        } catch (error) {
            console.error(error.message);
        } finally {
            setCarregando(false);
        }
    }

    // ==========================================
    // LOGOUT
    // ==========================================
    async function logout() {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem("session");

        try {
            const logoutAccount = await api.post("/logout", { sessionId });
            if (logoutAccount.data.sucesso === true) {
                alert("Desconectado com sucesso!");
                navigate("/");
            }
        } catch (error) {
            console.error(error);
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
            <HeaderP onSettingsClick={() => setConfigAberto(true)} />

            <h1>Olá, {aluno?.nome?.split(" ")[0] || "aluno"}! 👋</h1>

            <div className="all">
                <div className="info">
                    <Link to="/Tasks" className="link">
                        <h3 onClick={() => getActivy(true)}>
                            📚 Tarefas: {tasks}
                        </h3>
                    </Link>
                    <Link to="/Home" className="link">
                        <h3>📝 Provas: Em breve</h3>
                    </Link>
                    <Link to="/Home" className="link">
                        <h3>✍️ Redação: Em breve</h3>
                    </Link>
                </div>

                <div className="boletim">
                    <h2>📊 Boletim: Em breve</h2>
                </div>
            </div>

            <p className="plataformas">Plataformas</p>
            <h2>Em breve</h2>

            <button onClick={logout} className="btn-logout">
                Sair
            </button>

            {configAberto && (
                <Settings onClose={() => setConfigAberto(false)} />
            )}
        </main>
    );
}