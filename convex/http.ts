import { httpRouter } from "convex/server";
import { corsRouter } from "convex-helpers/server/cors";
import { auth } from "./auth";
import { chat } from "./http/chat";

const http = httpRouter();
const cors = corsRouter(http, {
  allowedHeaders: ["*"],
  allowedOrigins: ["http://localhost:3000"]
});

auth.addHttpRoutes(http);

cors.route({
  path: "/chat",
  method: "POST",
  handler: chat,
});

export default http;
