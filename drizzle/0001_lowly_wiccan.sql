CREATE TABLE "contours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"properties" jsonb,
	"geom" geometry(Geometry, 4326),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contours" ADD CONSTRAINT "contours_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contour_project_idx" ON "contours" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "contour_geo_idx" ON "contours" USING gist ("geom");