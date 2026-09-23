import loginC from "./controller/loginC.js";
import task from "./controller/task.js";
import IAs from "./controller/IAs.js";

export function AddRota(api) {
  api.use(loginC);
  api.use(task);
  api.use(IAs);
}