import { useState } from "react"
import api from "../../axios";
import headerP from "../../components/header";
import { useNavigate } from "react-router";
import "./login.scss"
import "../../../scss/global.scss"

export default function Login() {
    const [ra, setRa] = useState("");
    const [di, setDi] = useState("");
    const [pass, setPass] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    async function EnviarDados() {
        if(!ra || !di || !pass){
            alert("Por favor, insira todos os campos CORRETAMENTE!")
            return;
        }

        try {
            setIsLoading(true);
            const response = await api.post("/login", {
                ra,
                digito: di,
                senha: pass
            });

            localStorage.setItem("session", response.data.sessionId);
            if(response.data.sessionId){
                navigate("/Home")
            } else{
                alert("Error no login!")
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="login">
            <h1>Bem vindo(a) ao Auto StudyDesk!</h1>
            <div className="inputs">
                <div className="ra">
                    <input className="text" type="text" placeholder="ra" value={ra} onChange={(e) => setRa(e.target.value)} />
                    <input className="digit" type="number" placeholder="digito" value={di} onChange={(e) => setDi(e.target.value)} />
                </div>

                <div className="password-wrapper">
                    <input
                        className="text"
                        type={showPassword ? "text" : "password"}
                        placeholder="senha"
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                    />
                    <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                        {showPassword ? "🙈" : "👁️"}
                    </button>
                </div>

            <button onClick={EnviarDados} disabled={isLoading}>{isLoading ? "Calma" : "Pode Ir"}</button>
            </div>

        </main>
    )
}