import { connectDatabase } from "../connection.js";
import { ConnectSupabaseDB } from "../connectionSP.js";


export async function InsertTask(task) {
    const { data, error } = await ConnectSupabaseDB
        .from("tasks")
        .insert({
            id_task: task.id,
            name_task: task.name,
            questions: JSON.stringify(task.json)
        });
    
    console.log(data, error)

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