import { httpRouter } from "convex/server";
import { corsRouter } from "convex-helpers/server/cors";
import { auth } from "./auth";

const http = httpRouter();
const cors = corsRouter(http, {
  allowedHeaders: ["*"],
  allowedOrigins: ["http://localhost:3000"],
});

auth.addHttpRoutes(http);

export default http;
