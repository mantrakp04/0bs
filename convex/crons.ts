import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "stopIdle",
  { minutes: 15 }, // every minute
  api.actions.mcps.stopIdle,
);

export default crons;
