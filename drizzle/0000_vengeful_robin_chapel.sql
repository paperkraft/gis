CREATE TABLE "links" (
	"id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"type" text NOT NULL,
	"source_node_id" text NOT NULL,
	"target_node_id" text NOT NULL,
	"length" double precision DEFAULT 0,
	"diameter" double precision DEFAULT 0,
	"roughness" double precision DEFAULT 100,
	"properties" jsonb,
	"geom" geometry(LineString, 4326)
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"type" text NOT NULL,
	"elevation" double precision DEFAULT 0,
	"base_demand" double precision DEFAULT 0,
	"properties" jsonb,
	"geom" geometry(Point, 4326)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"settings" jsonb,
	"patterns" jsonb,
	"curves" jsonb,
	"controls" jsonb,
	"node_count" integer DEFAULT 0,
	"link_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "link_pk" ON "links" USING btree ("project_id","id");--> statement-breakpoint
CREATE INDEX "link_geo_idx" ON "links" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "node_pk" ON "nodes" USING btree ("project_id","id");--> statement-breakpoint
CREATE INDEX "node_geo_idx" ON "nodes" USING gist ("geom");