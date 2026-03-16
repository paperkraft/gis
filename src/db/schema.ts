import { pgTable, text, doublePrecision, jsonb, uuid, index, timestamp, integer, primaryKey, foreignKey, uniqueIndex } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

// Helper for PostGIS
const geometry = (name: string, type: string) => {
    return customType<{ data: any }>({
        dataType() { return `geometry(${type}, 4326)`; },
    })(name);
};

// --- 0. USERS ---
export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    emailIdx: uniqueIndex("email_idx").on(table.email),
}));

// --- 1. PROJECTS ---
export const projects = pgTable("projects", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: 'cascade' }),
    settings: jsonb("settings"), // Global settings (units, headloss formula)
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    updatedAtIdx: index("project_updated_at_idx").on(table.updatedAt),
}));

// --- 1.1 PROJECT SHARES (Many-to-Many) ---
export const projectShares = pgTable("project_shares", {
    projectId: uuid("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
    role: text("role").default('viewer').notNull(), // 'viewer', 'editor'
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.userId] }),
}));

// --- 2. NODES (Enforce Uniqueness) ---
export const nodes = pgTable("nodes", {
    projectId: uuid("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    id: text("id").notNull(), // User-facing ID (e.g., "J-1")

    type: text("type").notNull(), // 'junction', 'tank', 'reservoir'

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
export const simulationRuns = pgTable("simulation_runs", {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    status: text("status").notNull(), // 'completed', 'failed'
    duration: integer("duration"), // Simulation duration in seconds
    executedAt: timestamp("executed_at").defaultNow(),

    // The full EPANET output log
    report: text("report"),
    warnings: jsonb("warnings"),
    inputData: jsonb("input_data"), // store parameters/scenario used for this run
});

export const simulationResults = pgTable("simulation_results", {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id").references(() => simulationRuns.id, { onDelete: 'cascade' }).notNull(),
    featureId: text("feature_id").notNull(), // Join with nodes/links manually using projectId

    // Summary Statistics (Fast Querying)
    minVal: doublePrecision("min_val"), // Min Pressure (Node) or Min Flow (Link)
    maxVal: doublePrecision("max_val"), // Max Pressure (Node) or Max Flow (Link)

    // The "Lite" Time Series (Only Report Steps)
    timeSeries: jsonb("time_series"),
}, (table) => ({
    runFeatureIdx: index("run_feature_idx").on(table.runId, table.featureId),
}));

// --- 5. BOOKMARKS ---
export const bookmarks = pgTable("bookmarks", {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(),
    center: jsonb("center").$type<number[]>().notNull(),
    zoom: doublePrecision("zoom").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

