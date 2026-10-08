//CONNECT TO SUPABASE DATABASE!!!
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js";
dotenv.config();

const ConnectSupabaseDB = await createClient(
    process.env.UrlDB,
    process.env.KeyDB
);

export {ConnectSupabaseDB};