import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  tablesFilter: ["users", "projects", "project_shares", "nodes", "links", "simulation_runs", "simulation_results", "bookmarks"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;