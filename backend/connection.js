import mysql from "mysql2/promise";

const connectDatabase = await mysql.createConnection({
    local: "localhost",
    user: "root", 
    password: "Potato10!",
    database: "Atividades"
});