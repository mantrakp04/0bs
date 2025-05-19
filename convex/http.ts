import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { chat } from "./http/chat";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/chat",
  method: "POST",
  handler: chat,
});

export default http;
