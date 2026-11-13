import "./captcha.scss";
import "../../../scss/global.scss";
import { useState, useEffect, useCallback } from "react";
import api from "../../axios";

export default function Captcha({ task, onClose, sessionId }) {
    const [captchaT, setCaptchaT] = useState("");
    const [image, setImage] = useState("");
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState(false);
    const [resultados, setResultados] = useState(null);
    const [recarregandoCaptcha, setRecarregandoCaptcha] = useState(false);

    const carregarCaptcha = useCallback(async () => {
        try {
            setRecarregandoCaptcha(true);
            setErro("");

            const response = await api.post("/tarefas/abrir", {
                sessionId,
                tarefaId: task.id
            });

            const raw = response.data.captcha.imagem;
            const src = raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`;
            setImage(src);
            setCaptchaT(""); // Limpa o input ao recarregar

        } catch (error) {
            console.error(error);
            setErro("Não foi possível carregar o captcha");
        } finally {
            setCarregando(false);
            setRecarregandoCaptcha(false);
        }
    }, [sessionId, task?.id]);

    useEffect(() => {
        if (task?.id && sessionId) {
            setCarregando(true);
            carregarCaptcha();
        }
    }, [task?.id, sessionId, carregarCaptcha]);

    async function enviarCaptcha() {
        if (!captchaT.trim()) return;

        try {
            setCarregando(true);
            setErro("");
            const tokenClean = localStorage.getItem("token");

            const responseCaptcha = await api.post("/tarefas/captcha", {
                sessionId,
                resposta: captchaT.trim()
            });

            console.log("📦 Resultado captcha:", responseCaptcha.data);

            if (!responseCaptcha.data.sucesso) {
                setErro(responseCaptcha.data.details || "Captcha incorreto");
                // Não retorna aqui - deixa o usuário ver o erro e poder recarregar
                return;
            }

            const responseGemini = await api.post("/tarefas/EnviarAtividade/Gemini", {
                sessionId,
                resposta: responseCaptcha.data,
                token: tokenClean
            });

            console.log("📦 Resultado Gemini:", responseGemini.data);

            if (!responseGemini.data.sucesso) {
                setErro("Erro ao processar com IA");
                return;
            }

            setResultados(responseGemini.data.preenchimento || responseGemini.data.navegadorPreencheu || []);
            setSucesso(true);

            setTimeout(() => {
                onClose();
            }, 3000);

        } catch (error) {
            console.error(error);
            setErro("Erro ao processar");
        } finally {
            setCarregando(false);
        }
    }

    async function recarregarCaptcha() {
        await carregarCaptcha();
    }

    return (
        <div className="captcha">
            <h2 onClick={onClose}>Fechar</h2>

            <div className="info">
                {carregando && <p>Processando...</p>}

                {!carregando && image && !sucesso && (
                    <>
                        <img src={image} alt="captcha" />
                        <h3>Por favor, resolva o captcha</h3>
                        <div className="captcha-input-wrapper">
                            <input
                                type="text"
                                value={captchaT}
                                onChange={(e) => setCaptchaT(e.target.value)}
                                placeholder="Digite o captcha"
                                disabled={recarregandoCaptcha}
                            />
                            <button
                                className="btn-recarregar-captcha"
                                onClick={recarregarCaptcha}
                                disabled={recarregandoCaptcha}
                                title="Recarregar captcha"
                            >
                                {recarregandoCaptcha ? "⏳" : "🔄"}
                            </button>
                        </div>
                        <button onClick={enviarCaptcha} disabled={recarregandoCaptcha}>
                            Enviar
                        </button>
                    </>
                )}

                {sucesso && (
                    <div>
                        <h3>✅ Tarefa preenchida!</h3>
                        <p>Acertos: {resultados?.filter(r => r.ok).length}/{resultados?.length}</p>
                        <p>Vá no site e confirme o envio.</p>
                    </div>
                )}

                {erro && <p style={{ color: "red" }}>{erro}</p>}
            </div>
        </div>
    );
}