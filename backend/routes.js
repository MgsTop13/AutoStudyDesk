import loginC from "./controller/loginC.js";
import task from "./controller/task.js";
import gemini from "./controller/gemini.js";

export function AddRota(api) {
  api.use(loginC);
  api.use(task);
  api.use(gemini);
}