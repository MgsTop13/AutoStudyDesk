import { ConnectSupabaseDB } from "../newDB.js";
import { criptografar, descriptografar } from "../utils/crypt.js";

export async function SaveToken(user) {
  try {
    if (!user?.name || !user?.token) {
      return { sucesso: false, erro: "Nome e token são obrigatórios" };
    }

    const newToken = criptografar(user.token);
    const { data, error } = await ConnectSupabaseDB
      .from("user_info")
      .upsert({
        name_user: user.name,
        token_user: newToken
      }, { onConflict: "name_user" })
      .select();

    if (error) {
      console.error("Erro ao salvar token:", error);
      return { sucesso: false, erro: error.message };
    }

    console.log("Token salvo:", data);
    return { sucesso: true, data, affectedRows: data?.length || 0 };
  } catch (error) {
    console.error("Exceção ao salvar token:", error);
    return { sucesso: false, erro: error.message };
  }
}

export async function LoadToken(username) {
  try {
    if (!username) {
      return { sucesso: false, erro: "Username é obrigatório", token: null };
    }

    const { data, error } = await ConnectSupabaseDB
      .from("user_info")
      .select("token_user")
      .eq("name_user", username)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Nenhuma linha encontrada
        return { sucesso: true, token: null, temToken: false };
      }
      console.error("Erro ao carregar token:", error);
      return { sucesso: false, erro: error.message, token: null };
    }

    let token = null;
    if (data?.token_user) {
      try {
        token = descriptografar(data.token_user);
      } catch (e) {
        console.error("Erro ao descriptografar token:", e);
        return { sucesso: false, erro: "Token corrompido", token: null };
      }
    }

    console.log("Token carregado:", token ? "sim" : "não");
    return { sucesso: true, token, temToken: !!token };
  } catch (error) {
    console.error("Exceção ao carregar token:", error);
    return { sucesso: false, erro: error.message, token: null };
  }
}