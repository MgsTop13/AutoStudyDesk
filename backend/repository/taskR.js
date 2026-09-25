import { connectDatabase } from "../connection.js";

export async function InsertTask(task) {
    const command = `
        INSERT INTO Tasks (id_Task, nameTask, questions)
            VALUES(?,?,?);
    `

    const [result] = await connectDatabase.query(command, [
        task.id,
        task.name,
        JSON.stringify(task.json)
    ])

    return result;
}

export async function ListTask(task) {
    const command = `
        SELECT * FROM Tasks
            WHERE id_Task = ?;
    `
    const [result] = await connectDatabase.query(command, task.id)
    
    if(result.length === 0){
        return "Não tem alguma resposta no banco"
    } else{
        return result;
    }
}