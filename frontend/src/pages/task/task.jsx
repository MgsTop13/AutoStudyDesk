import HeaderP from "../../components/header";
import { useEffect, useState } from "react";
import "../../../scss/global.scss";
import "./task.scss";
import api from "../../axios";


export default function Tasks(){
    const [tasks, setTasks] = useState([]);
    const sectionId = localStorage.getItem("session");
    const [expired, setExpired] = useState(false);

    async function loadTask() {
        try {
            const response = await api.get(`/tarefas/${sectionId}`);
            setTasks(response.data.tarefas);

        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        loadTask();
    }, []);

    function isExpired(value){
        setExpired(value);
    };

    return(
        <main className="main-tasks">
            <HeaderP />

            <div className="filtro">
                <select onChange={(e) => isExpired(e.target.value === "true")}>
                    <option value="false">Ativas</option>
                    <option value="true">Expiradas</option>
                </select>
            </div>

            <div className="all">
                {tasks
                    .filter((task) => task.task_expired === expired)
                    .map((task) => (
                    <div className="card" key={task.id}>
                        <section className="info">
                            <h1>{task.title}</h1>
                            <h3>Professor(a): {task.author}</h3>
                            <p>{task.description}</p>
                        </section>
                        <button>Fazer</button>
                    </div>
                ))}
            </div>
        </main>
    )
}