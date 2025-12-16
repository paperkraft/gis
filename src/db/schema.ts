import { pgTable, text, doublePrecision, jsonb, uuid, index, timestamp, integer } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

// --- CUSTOM POSTGIS TYPE HELPER ---
// This tells Drizzle how to handle the 'geometry' column type in Postgres
const geometry = (name: string, type: string) => {
    return customType<{ data: any }>({
        dataType() {
            return `geometry(${type}, 4326)`; // SRID 4326 = Lat/Lon
        },
    })(name);
};

// --- 1. PROJECTS TABLE ---
export const projects = pgTable("projects", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),

    // We keep non-spatial settings in JSON because they are unstructured
    settings: jsonb("settings"),
    patterns: jsonb("patterns"),
    curves: jsonb("curves"),
    controls: jsonb("controls"),

    // Counters for UI
    nodeCount: integer("node_count").default(0),
    linkCount: integer("link_count").default(0),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// --- 2. NODES TABLE (Junctions, Tanks, etc.) ---
export const nodes = pgTable("nodes", {
    // Composite ID: We store the Project ID + the specific Node ID (e.g. "J-1")
    id: text("id").notNull(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),

    type: text("type").notNull(), // 'junction', 'tank', 'reservoir'

    // Critical Hydraulic Data (Indexed columns for speed)
    elevation: doublePrecision("elevation").default(0),
    baseDemand: doublePrecision("base_demand").default(0),

    // UI styling properties stored as JSON
    properties: jsonb("properties"),

    // *** SPATIAL COLUMN (PostGIS Point) ***
    geom: geometry("geom", "Point"),
}, (table) => ({
    pk: index("node_pk").on(table.projectId, table.id), // Fast lookup by ID
    geoIdx: index("node_geo_idx").using("gist", table.geom), // Spatial Index for map queries
}));

// --- 3. LINKS TABLE (Pipes, Pumps, Valves) ---
export const links = pgTable("links", {
    id: text("id").notNull(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),

    type: text("type").notNull(), // 'pipe', 'pump', 'valve'

    sourceNodeId: text("source_node_id").notNull(),
    targetNodeId: text("target_node_id").notNull(),

    length: doublePrecision("length").default(0),
    diameter: doublePrecision("diameter").default(0),
    roughness: doublePrecision("roughness").default(100),

    properties: jsonb("properties"),

    // *** SPATIAL COLUMN (PostGIS LineString) ***
    geom: geometry("geom", "LineString"),
}, (table) => ({
    pk: index("link_pk").on(table.projectId, table.id),
    geoIdx: index("link_geo_idx").using("gist", table.geom),
}));