import HeaderP from "../../components/header";
import { useEffect, useState } from "react";
import "../../../scss/global.scss";
import "./task.scss";
import api from "../../axios";
import Captcha from "../../components/captcha/captcha";

export default function Tasks() {
    const [tasks, setTasks] = useState([]);
    const [filtro, setFiltro] = useState("Ativas");
    const [modal, setModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const sessionId = localStorage.getItem("session");

    // ==========================================
    // CACHE LOCAL (Tasks)
    // ==========================================
    const CACHE_KEY = `tasks_${sessionId}`;
    const CACHE_TTL = 1000 * 60 * 3; // 3 minutos

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
            data,
            timestamp: Date.now()
        }));
    }

    // ==========================================
    // CARREGA TAREFAS
    // ==========================================
    async function loadTask(force = false) {
        try {
            setCarregando(true);

            // 1. Tenta cache local
            if (!force) {
                const cache = lerCache();
                if (cache) {
                    console.log("💾 Tasks — cache local");
                    setTasks(cache.data);
                    setCarregando(false);
                    return;
                }
            }

            // 2. Busca do backend
            console.log("🌐 Tasks — backend");
            const url = force
                ? `/tarefas/${sessionId}?force=true`
                : `/tarefas/${sessionId}`;

            const response = await api.get(url);
            setTasks(response.data.tarefas);

            // 3. Salva no cache
            salvarCache(response.data.tarefas);

        } catch (error) {
            console.error(error);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        loadTask();
    }, []);

    // ==========================================
    // FILTRO (1 vez só)
    // ==========================================
    const tasksFiltradas = tasks.filter(t =>
        filtro === "Expiradas"
            ? t.task_expired === true
            : t.task_expired !== true
    );

    // ==========================================
    // MODAL
    // ==========================================
    function openModal(task) {
        setSelectedTask(task);
        setModal(true);
    }

    function closeModal() {
        setModal(false);
        setSelectedTask(null);
    }

    return (
        <main className="main-tasks">
            <HeaderP />

            <div className="filtro">
                <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                    <option value="Ativas">Ativas ({tasks.filter(t => !t.task_expired).length})</option>
                    <option value="Expiradas">Expiradas ({tasks.filter(t => t.task_expired).length})</option>
                </select>

                <button onClick={() => loadTask(true)}>
                    Atualizar
                </button>
            </div>

            {carregando && <p>Carregando...</p>}

            <div className="all">
                {!carregando && tasksFiltradas.length === 0 && (
                    <p>Nenhuma tarefa encontrada</p>
                )}

                {tasksFiltradas.map((task) => (
                    <div className="card" key={task.id}>
                        <section className="info">
                            <h1>{task.title}</h1>
                            <h3>Professor(a): {task.author}</h3>
                            <p>{task.description}</p>
                        </section>
                        <button onClick={() => openModal(task)}>Fazer</button>
                    </div>
                ))}

                {modal && selectedTask && (
                    <Captcha
                        task={selectedTask}
                        sessionId={sessionId}
                        onClose={closeModal}
                    />
                )}
            </div>
        </main>
    );
}