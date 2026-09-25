import userControl from "./controller/userControl.js";
import taskControl from "./controller/taskControl.js";

export function AddRota(api) {
  api.use(userControl);
  api.use(taskControl);
}