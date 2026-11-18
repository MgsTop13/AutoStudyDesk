import { useEffect, useCallback } from "react";
const CACHE_KEY = "home_cache";
const CACHE_TTL = 1000 * 60 * 10;

export function lerCache() {
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

export function salvarCache(data) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
        ...data,
        timestamp: Date.now()
    }));
}

// ==========================================
// CARREGA DADOS - Ativas primeiro, depois expiradas
// ==========================================
const getActivy = useCallback(async (force = false) => {
    try {
        setCarregando(true);

        if (!force) {
            const cache = lerCache();
            if (cache && cache.complete) {
                console.log("💾 Home — cache local");
                setAluno(cache.aluno);
                setTasks(cache.tasks);
                setTasksActive(cache.tasksActive);
                setTasksExpired(cache.tasksExpired);
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

        // 1. Carrega tarefas ATIVAS primeiro (mais importantes)
        const tarefasResp = await api.get(`/tarefas/${sessionId}`);
        const totalAtiva = tarefasResp.data.tarefas?.length || 0;

        setAluno(isOnline.data.aluno);
        localStorage.setItem("username", isOnline.data.aluno.nome);
        setTasksActive(totalAtiva);
        setTasks(totalAtiva); // Mostra ativas imediatamente

        // Salva cache parcial com ativas
        salvarCache({
            aluno: isOnline.data.aluno,
            tasks: totalAtiva,
            tasksActive: totalAtiva,
            tasksExpired: 0,
            complete: false
        });

        // 2. Carrega tarefas EXPIRADAS em background
        try {
            const tarefasExpired = await api.get(`/tarefasExpiradas/${sessionId}`);
            const totalExpirada = tarefasExpired.data.tarefas?.length || 0;
            const total = totalAtiva + totalExpirada;

            setTasksExpired(totalExpirada);
            setTasks(total);

            // Atualiza cache com total completo
            salvarCache({
                aluno: isOnline.data.aluno,
                tasks: total,
                tasksActive: totalAtiva,
                tasksExpired: totalExpirada,
                complete: true
            });
        } catch (error) {
            console.warn("Erro ao carregar tarefas expiradas:", error.message);
            // Não falha a página se expiradas falhar
        }

    } catch (error) {
        console.error(error.message);
    } finally {
        setCarregando(false);
    }
}, [sessionId]);