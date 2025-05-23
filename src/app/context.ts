import { auth } from "@clerk/nextjs/server";

export const createContext = async () => {
  const { userId } = await auth();
  return { userId };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
