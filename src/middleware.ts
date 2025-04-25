import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

const isProtectedRoute = createRouteMatcher([
  "/chat(.*)",
  "/sources(.*)",
  "/api/(.*)",
  "/projects(.*)",
  "/api/webhooks(.*)",
]);

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)", // Don't run middleware on static files
    "/", // Run middleware on index page
    "/(api|trpc)(.*)", // Run middleware on API and tRPC routes
  ],
};
