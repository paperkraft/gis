CREATE TABLE "links" (
	"project_id" uuid NOT NULL,
	"id" text NOT NULL,
	"type" text NOT NULL,
	"source_node_id" text NOT NULL,
	"target_node_id" text NOT NULL,
	"length" double precision DEFAULT 0,
	"diameter" double precision DEFAULT 0,
	"roughness" double precision DEFAULT 100,
	"properties" jsonb,
	"geom" geometry(LineString, 4326),
	CONSTRAINT "links_project_id_id_pk" PRIMARY KEY("project_id","id")
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"project_id" uuid NOT NULL,
	"id" text NOT NULL,
	"type" text NOT NULL,
	"elevation" double precision DEFAULT 0,
	"base_demand" double precision DEFAULT 0,
	"properties" jsonb,
	"geom" geometry(Point, 4326),
	CONSTRAINT "nodes_project_id_id_pk" PRIMARY KEY("project_id","id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "simulation_results" (
	"run_id" uuid NOT NULL,
	"feature_id" text NOT NULL,
	"time_series" jsonb
);
--> statement-breakpoint
CREATE TABLE "simulation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"status" text NOT NULL,
	"executed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_project_id_source_node_id_nodes_project_id_id_fk" FOREIGN KEY ("project_id","source_node_id") REFERENCES "public"."nodes"("project_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_project_id_target_node_id_nodes_project_id_id_fk" FOREIGN KEY ("project_id","target_node_id") REFERENCES "public"."nodes"("project_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_results" ADD CONSTRAINT "simulation_results_run_id_simulation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."simulation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "link_geo_idx" ON "links" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "node_geo_idx" ON "nodes" USING gist ("geom");