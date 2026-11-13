import { ConnectSupabaseDB } from "../newDB.js";

export async function InsertTask(task) {
  try {
    const { data, error } = await ConnectSupabaseDB
      .from("tasks")
      .insert({
        id_task: task.id,
        name_task: task.name,
        questions: JSON.stringify(task.json)
      })
      .select();

    if (error) {
      console.error("Erro ao inserir task:", error);
      return { sucesso: false, erro: error.message };
    }

    console.log("Task inserida:", data);
    return { sucesso: true, data };
  } catch (error) {
    console.error("Exceção ao inserir task:", error);
    return { sucesso: false, erro: error.message };
  }
}

export async function ListTask(task) {
  try {
    const { data, error } = await ConnectSupabaseDB
      .from("tasks")
      .select("*")
      .eq("id_task", task.id);

    if (error) {
      console.error("Erro ao buscar task:", error);
      return { sucesso: false, erro: error.message, data: [] };
    }

    console.log("Tasks encontradas:", data);
    return { sucesso: true, data: data || [] };
  } catch (error) {
    console.error("Exceção ao buscar task:", error);
    return { sucesso: false, erro: error.message, data: [] };
  }
}