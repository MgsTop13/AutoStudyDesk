import "./settings.scss";
import { useState, useEffect } from "react";
import api from "../../axios";

export default function Settings({ onClose }) {
    const [token, setToken] = useState("");
    const [aluno, setAluno] = useState(null);
    const [temToken, setTemToken] = useState(false);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [testando, setTestando] = useState(false);
    const [mensagem, setMensagem] = useState({ tipo: "", texto: "" });

    const username = localStorage.getItem("username");
    const CACHE_KEY = "home_cache";

    useEffect(() => {
        async function carregar() {
            try {
                setCarregando(true);

                // 1. Pega dados do aluno do cache local
                const cacheRaw = localStorage.getItem(CACHE_KEY);
                if (cacheRaw) {
                    const cache = JSON.parse(cacheRaw);
                    setAluno(cache.aluno);
                }

                // 2. Verifica se já tem token salvo
                if (username) {
                    const resp = await api.post(`/LoadText/${username}`);
                    console.log(resp)
                    setTemToken(resp.data.temToken);
                    setToken(resp.data.token)
                    localStorage.setItem("token", resp.data.token);
                    console.log("entrei")
                }

            } catch (error) {
                console.error("Erro ao carregar settings:", error);
            } finally {
                setCarregando(false);
            }
        }
        carregar();
    }, [username]);

    async function salvarToken() {
        if (!token.trim()) {
            setMensagem({ tipo: "erro", texto: "Cole um token primeiro" });
            return;
        }

        try {
            setSalvando(true);
            setMensagem({ tipo: "", texto: "" });

            const response = await api.post("/SaveText", {
                name: username,
                token: token.trim()
            });

            if (response.data.sucesso) {
                setTemToken(true);
                setToken("");
                setMensagem({
                    tipo: "sucesso",
                    texto: "✅ Token salvo com sucesso!"
                });
            } else {
                setMensagem({ tipo: "erro", texto: "❌ Erro ao salvar" });
            }
        } catch (error) {
            console.error(error);
            setMensagem({ tipo: "erro", texto: "Erro ao salvar token" });
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>

                <h1>Configurações</h1>
                {carregando && !aluno ? (
                    <p className="carregando">Carregando dados...</p>
                ) : aluno ? (
                    <div className="aluno-card">
                        <div className="avatar">
                            {aluno.nome?.charAt(0) || "?"}
                        </div>

                        <div className="info-aluno">
                            <h2>{aluno.nome}</h2>

                            <div className="emails">
                                <span>Google: {aluno.emailGoogle}</span>
                                <span>Microsoft: {aluno.emailMS}</span>
                            </div>

                            <p className="perfil">
                                {aluno.perfil} | Nick: {aluno.nick}
                            </p>
                        </div>
                    </div>
                ) : null}

                <div className="token-section">
                    <h2>Token Gemini</h2>

                    <p className="instrucoes">
                        Para usar a IA, você precisa de uma API Key gratuita do Google.
                        <a
                            href="https://aistudio.google.com/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {"A"}Pegar minha key
                        </a>
                    </p>

                    <div className={`status ${temToken ? "ativo" : "vazio"}`}>
                        {temToken
                            ? "✅ Token configurado"
                            : "⚠️ Nenhum token configurado"}
                    </div>

                    <div className="inputs">
                        <input
                            type="password"
                            placeholder="Cole sua API Key aqui"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            disabled={salvando}
                        />

                        <div className="botoes">

                            <button
                                className="btn-salvar"
                                onClick={salvarToken}
                                disabled={!token.trim() || salvando || testando}
                            >
                                {salvando ? "Salvando..." : "Salvar"}
                            </button>
                        </div>
                    </div>

                    {mensagem.texto && (
                        <div className={`mensagem ${mensagem.tipo}`}>
                            {mensagem.texto}
                        </div>
                    )}
                </div>

                <button className="btn-fechar" onClick={onClose}>
                    Fechar
                </button>

            </div>
        </div>
    );
}