import Koa from "koa";
import helloRouter from "./routes/hello.ts";

const app = new Koa();

app.use(helloRouter.routes());
app.use(helloRouter.allowedMethods());

export default app;