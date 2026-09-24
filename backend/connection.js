import mysql from "mysql2/promise";

const connectDatabase = await mysql.createConnection({
    local: "localhost",
    user: "MgsTop13", 
    password: "Potato10!",
    database: "Atividades"
});

export {connectDatabase};