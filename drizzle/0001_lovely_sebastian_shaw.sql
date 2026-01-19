ALTER TABLE "simulation_results" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "simulation_results" ADD COLUMN "min_val" double precision;--> statement-breakpoint
ALTER TABLE "simulation_results" ADD COLUMN "max_val" double precision;--> statement-breakpoint
ALTER TABLE "simulation_runs" ADD COLUMN "duration" integer;