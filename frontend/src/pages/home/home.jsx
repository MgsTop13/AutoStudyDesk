import { useNavigate } from "react-router";
import { Link } from "react-router";
import { useEffect } from "react";
import { useState } from "react";
import api from "../../axios";
import "./home.scss";

export default function Home() {
    const [name, setName] = useState("");
    const sectionId = localStorage.getItem("session");
    const [tasks, setTasks] = useState([{}]);
    const navigate = useNavigate();

    async function getActivy() {
        try {
            const isOnline = await api.get(`/sessao/${sectionId}`);
            if(isOnline.data.ativa === false) {
                alert("Error nos dados!");
                return navigate("/")
            };
            const tasks = await api.get(`/tarefas/${sectionId}`);
            setTasks(tasks.data.tarefas);
        } catch (error) {
            console.error(error.message)
        }
    }

    

    useEffect(() => {
        getActivy();
    }, [])



    return (
        <main className="main-home">

            <h1>Hello {name ?? 'User'}!</h1>

            <div className="all">
                <div className="info">
                    <Link to="/Tasks" className="link">
                        <h3 onClick={getActivy}>
                            Tarefas: {tasks.length}
                        </h3>
                    </Link>
                    <Link to="/Tasks" className="link">
                        <h3>Provas: 0</h3>
                    </Link>
                    <Link to="/Tasks" className="link">

                        <h3>Redação: 0</h3>
                    </Link>

                </div>

                <div className="boletim">
                    <h2>Boletim</h2>
                </div>
            </div>

            <p className="plataformas">Plataformas</p>
        </main>
    )
}