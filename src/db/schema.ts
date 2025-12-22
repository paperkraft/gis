import { pgTable, text, doublePrecision, jsonb, uuid, index, timestamp, integer, primaryKey, foreignKey } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

// Helper for PostGIS
const geometry = (name: string, type: string) => {
    return customType<{ data: any }>({
        dataType() { return `geometry(${type}, 4326)`; },
    })(name);
};

// --- 1. PROJECTS (Keep mostly as is) ---
export const projects = pgTable("projects", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    settings: jsonb("settings"), // Global settings (units, headloss formula)
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// --- 2. NODES (Enforce Uniqueness) ---
export const nodes = pgTable("nodes", {
    projectId: uuid("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    id: text("id").notNull(), // User-facing ID (e.g., "J-1")

    type: text("type").notNull(), // 'junction', 'tank', 'reservoir'

    // Core Hydraulic Columns (Indexed)
    elevation: doublePrecision("elevation").default(0),
    baseDemand: doublePrecision("base_demand").default(0),

    // JSONB for UI (color, icon) and minor props
    properties: jsonb("properties"),

    geom: geometry("geom", "Point"),
}, (table) => ({
    // COMPOSITE PRIMARY KEY: A node ID must be unique within a project
    pk: primaryKey({ columns: [table.projectId, table.id] }),
    geoIdx: index("node_geo_idx").using("gist", table.geom),
}));

// --- 3. LINKS (Strict Topology) ---
export const links = pgTable("links", {
    projectId: uuid("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    id: text("id").notNull(),

    type: text("type").notNull(), // 'pipe', 'pump', 'valve'

    // Topology: These MUST exist in the nodes table
    sourceNodeId: text("source_node_id").notNull(),
    targetNodeId: text("target_node_id").notNull(),

    length: doublePrecision("length").default(0),
    diameter: doublePrecision("diameter").default(0),
    roughness: doublePrecision("roughness").default(100),

    properties: jsonb("properties"),
    geom: geometry("geom", "LineString"),
}, (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.id] }),
    geoIdx: index("link_geo_idx").using("gist", table.geom),

    // FOREIGN KEY CONSTRAINTS (Ensures links only connect valid nodes)
    // Note: Drizzle syntax for composite FKs can be verbose; this conceptually ensures data integrity
    sourceFk: foreignKey({
        columns: [table.projectId, table.sourceNodeId],
        foreignColumns: [nodes.projectId, nodes.id]
    }).onDelete("cascade"), // If node is deleted, delete the attached pipe

    targetFk: foreignKey({
        columns: [table.projectId, table.targetNodeId],
        foreignColumns: [nodes.projectId, nodes.id]
    }).onDelete("cascade"),
}));

// --- 4. SIMULATION RESULTS (New for Scale) ---
// Don't store results in RAM for large networks. Save them here.
export const simulationRuns = pgTable("simulation_runs", {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    status: text("status").notNull(), // 'completed', 'failed'
    executedAt: timestamp("executed_at").defaultNow(),
});

export const simulationResults = pgTable("simulation_results", {
    runId: uuid("run_id").references(() => simulationRuns.id, { onDelete: 'cascade' }).notNull(),
    featureId: text("feature_id").notNull(), // Join with nodes/links manually using projectId

    // Store time-series data efficiently
    // Structure: { "00:00": 50, "01:00": 45, ... }
    // Or arrays: { "time": [0, 3600, 7200], "value": [50, 45, 60] }
    timeSeries: jsonb("time_series"),
});