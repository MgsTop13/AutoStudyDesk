import { useState } from "react"
import api from "../../axios";
import headerP from "../../components/header";
import { useNavigate } from "react-router";
import "./login.scss"

export default function Login() {
    const [ra, setRa] = useState();
    const [di, setDi] = useState();
    const [pass, setPass] = useState();
    const [isLoading, setIsLoading] = useState(false);


    async function EnviarDados() {
        try {
            setIsLoading(true);
            const response = await api.post("/login", {
                ra,
                digito: di,
                senha: pass
            });

            console.log(response.data)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="login">
            <div className="inputs">
                <div className="ra">
                    <input className="text" type="text" placeholder="ra" value={ra} onChange={(e) => setRa(e.target.value)} />
                    <input className="digit" type="number" placeholder="digito" value={di} onChange={(e) => setDi(e.target.value)} />
                </div>

                <input className="text" type="text" placeholder="senha" value={pass} onChange={(e) => setPass(e.target.value)} />
            <button onClick={EnviarDados}>{isLoading ? "Calma" : "Pode Ir"}</button>
            </div>

        </main>
    )
}