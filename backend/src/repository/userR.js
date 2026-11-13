import { ConnectSupabaseDB } from "../newDB.js";
import { criptografar, descriptografar } from "../utils/crypt.js";

export async function SaveToken(user) {
    const newToken = criptografar(user.token);
    const { data, error} = await ConnectSupabaseDB
        .from("user_info")
        .insert({
            name_user: user.name,
            token_user: newToken
        });
    
    console.log(data, error);
}

export async function LoadToken(username) {
    const { data, error } = await ConnectSupabaseDB
        .from("user_info")
        .select("token_user")
        .eq("name_user", username);

    //const newToken = descriptografar(data.);
    //return newToken;
    console.log( data, error )
};