ALTER TABLE "simulation_runs" ADD COLUMN "input_data" jsonb;--> statement-breakpoint
CREATE INDEX "run_feature_idx" ON "simulation_results" USING btree ("run_id","feature_id");