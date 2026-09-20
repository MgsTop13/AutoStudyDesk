import "./captcha.scss";
import "../../../scss/global.scss";
import { useState, useEffect } from "react";
import api from "../../axios";

export default function Captcha({ task, onClose, sessionId }) {
    const [captchaT, setCaptchaT] = useState("");
    const [image, setImage] = useState("");
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarCaptcha() {
        try {
            setCarregando(true);
            setErro("");

            const response = await api.post("/tarefas/abrir", {
                sessionId,
                tarefaId: task.id
            });

            console.log("📦 Resposta recebida:", response.data.captcha.challengeId);

            setImage(response.data.captcha.imagem);
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
            const response = await api.post("/tarefas/captcha", {
                sessionId,
                resposta: captchaT.trim()
            });

            console.log("Resposta do /tarefas/captcha:", response.data);

            if (!response.data.sucesso) {
                setErro(response.data.details || "Captcha incorreto");
                return;
            }

            console.log("✅ Questões liberadas:", response.data.questoes);
            onClose();
        } catch (error) {
            console.error(error);
            setErro("Erro ao enviar captcha");
        }
    }

    return (
        <div className="captcha">
            <h2 onClick={onClose}>Fechar</h2>

            <div className="info">
                {carregando && <p>Carregando captcha...</p>}

                {!carregando && image && (
                    <img src={image} alt="captcha" />
                )}

                {erro && <p style={{ color: "red" }}>{erro}</p>}

                <h2>Por favor, envie o captcha para a lição ser enviada</h2>

                <input
                    type="text"
                    value={captchaT}
                    onChange={(e) => setCaptchaT(e.target.value)}
                    disabled={carregando}
                />

                <button onClick={enviarCaptcha} disabled={carregando}>
                    Enviar
                </button>
            </div>
        </div>
    );
}