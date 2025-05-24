import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "stopIdle",
  { minutes: 15 },
  internal.mcps.mutations.stopIdle,
);

export default crons;
