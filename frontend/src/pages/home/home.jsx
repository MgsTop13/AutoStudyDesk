import HeaderP from "../../components/header";
import { useEffect } from "react";
import { useState } from "react";
import { useNavigate } from "react-router";
import api from "../../axios";


export default function Home(){
    const [name, setName] = useState("");
    const sectionId = localStorage.getItem("session");
    const [tasks, setTasks] = useState({});
    const navigate = useNavigate();

    async function getActivy() {
        const tasks = await api.get(`/tarefas/${sectionId}`);
        setTasks(tasks.data.tarefas);
    }

    return(
        <main>
            <HeaderP />
            <h1>Hello {name ?? 'User'}</h1>
            <h2 onClick={getActivy}>Total tarefas: {tasks}</h2>
        </main>
    )
}