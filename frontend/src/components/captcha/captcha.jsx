import "./captcha.scss";
import "../../../scss/global.scss";
import { useState, useEffect } from "react";
import api from "../../axios";

export default function Captcha({ task, onClose, sessionId }) {
    const [captchaT, setCaptchaT] = useState("");
    const [image, setImage] = useState("");
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState(false);
    const [resultados, setResultados] = useState(null);

    useEffect(() => {
        async function carregarCaptcha() {
            try {
                setCarregando(true);
                setErro("");

                const response = await api.post("/tarefas/abrir", {
                    sessionId,
                    tarefaId: task.id
                });

                const raw = response.data.captcha.imagem;
                const src = raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`;
                setImage(src);

            } catch (error) {
                console.error(error);
                setErro("Não foi possível carregar o captcha");
            } finally {
                setCarregando(false);
            }
        }

        if (task?.id && sessionId) carregarCaptcha();
    }, [task?.id, sessionId]);

    async function enviarCaptcha() {
        if (!captchaT.trim()) return;

        try {
            setCarregando(true);
            setErro("");

            const response = await api.post("/tarefas/captcha-ia-preencher", {
                sessionId,
                resposta: captchaT.trim()
            });

            console.log("📦 Resultado:", response.data);

            if (!response.data.sucesso) {
                setErro(response.data.details || "Captcha incorreto");
                return;
            }

            setResultados(response.data.resultadosPreenchimento);
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

    return (
        <div className="captcha">
            <h2 onClick={onClose}>Fechar</h2>

            <div className="info">
                {carregando && <p>Processando...</p>}

                {!carregando && image && !sucesso && (
                    <>
                        <img src={image} alt="captcha" />
                        <h3>Por favor, resolva o captcha</h3>
                        <input
                            type="text"
                            value={captchaT}
                            onChange={(e) => setCaptchaT(e.target.value)}
                        />
                        <button onClick={enviarCaptcha}>
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