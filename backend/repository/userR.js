import { connectDatabase } from "../connection.js";
import { criptografar, descriptografar } from "../utils/crypt.js";

export async function SaveToken(user) {
    const command = `
        INSERT INTO User (name_User, token_User)
            VALUES (?,?);
    `
    const newToken = criptografar(user.token);
    const [result] = await connectDatabase.query(command, [
        user.name,
        newToken
    ])

    return result;
}

export async function LoadToken(username) {
    const command = `
        SELECT token_User FROM User
            WHERE name_User = ?;
    `
    const [result] = await connectDatabase.query(command, username);
    const newToken = descriptografar(result[0].token_User);
    return newToken;

};