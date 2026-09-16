import express from 'express';
import cors from "cors";
import { AddRota } from "./routes.js";

const server = express();
const port = 5010;

server.use(express.json());
server.use(cors());

AddRota(server);

server.listen(port, () => console.log("Nice"))