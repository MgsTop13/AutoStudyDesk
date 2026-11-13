import { ConnectSupabaseDB } from "../newDB.js";

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
    const { data, error } = await ConnectSupabaseDB
        .from("tasks")
        .select("*")
        .eq(id_task, task.id);

    console.log(data, error);
}