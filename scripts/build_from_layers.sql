DROP FUNCTION IF EXISTS build_from_layers(UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB);

CREATE OR REPLACE FUNCTION build_from_layers(
    p_project_id UUID,
    p_snap_tolerance DOUBLE PRECISION,
    p_max_pipe_length DOUBLE PRECISION,
    p_utm_srid INTEGER,
    p_junction_props JSONB,
    p_pipe_props JSONB,
    p_tank_props JSONB,
    p_reservoir_props JSONB,
    p_pump_props JSONB,
    p_valve_props JSONB
)
RETURNS VOID AS $$
DECLARE
    v_safe_id TEXT := replace(p_project_id::text, '-', '_');
    v_topo_name TEXT := 'topo_layers_' || v_safe_id;
    v_sliced_table TEXT := 'sliced_layers_' || v_safe_id;
    v_sql TEXT;
BEGIN
    -- 1. Initial cleanup
    DELETE FROM links WHERE project_id = p_project_id;
    DELETE FROM nodes WHERE project_id = p_project_id;

    v_sql := format('DROP TABLE IF EXISTS public.%I CASCADE', v_sliced_table);
    EXECUTE v_sql;
    
    IF EXISTS (SELECT 1 FROM topology.topology WHERE name = v_topo_name) THEN
        PERFORM topology.DropTopology(v_topo_name);
    END IF;

    -- 2. Create Topology
    PERFORM topology.CreateTopology(v_topo_name, p_utm_srid);

    -- 3. Staging points and lines
    CREATE TEMP TABLE point_staging (
        id TEXT,
        type TEXT,
        geom GEOMETRY,
        properties JSONB
    ) ON COMMIT DROP;

    CREATE TEMP TABLE line_staging (
        id TEXT,
        type TEXT,
        geom GEOMETRY,
        properties JSONB
    ) ON COMMIT DROP;

    -- Fill Point Staging
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'raw_junctions') THEN
        INSERT INTO point_staging SELECT properties->>'id', 'junction', ST_Transform(ST_Force2D(geom), p_utm_srid), p_junction_props || properties FROM raw_junctions WHERE project_id = p_project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'raw_tanks') THEN
        INSERT INTO point_staging SELECT properties->>'id', 'tank', ST_Transform(ST_Force2D(geom), p_utm_srid), p_tank_props || properties FROM raw_tanks WHERE project_id = p_project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'raw_reservoirs') THEN
        INSERT INTO point_staging SELECT properties->>'id', 'reservoir', ST_Transform(ST_Force2D(geom), p_utm_srid), p_reservoir_props || properties FROM raw_reservoirs WHERE project_id = p_project_id;
    END IF;

    -- Fill Line Staging
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'raw_pipes') THEN
        INSERT INTO line_staging SELECT properties->>'id', 'pipe', ST_Transform(ST_Force2D(geom), p_utm_srid), p_pipe_props || properties FROM raw_pipes WHERE project_id = p_project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'raw_pumps') THEN
        INSERT INTO line_staging SELECT properties->>'id', 'pump', ST_Transform(ST_Force2D(geom), p_utm_srid), p_pump_props || properties FROM raw_pumps WHERE project_id = p_project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'raw_valves') THEN
        INSERT INTO line_staging SELECT properties->>'id', 'valve', ST_Transform(ST_Force2D(geom), p_utm_srid), p_valve_props || properties FROM raw_valves WHERE project_id = p_project_id;
    END IF;

    -- ** OPTIMIZATION **
    -- Add indexes for spatial joins
    CREATE INDEX point_staging_geom_idx ON point_staging USING GIST(geom);
    CREATE INDEX line_staging_geom_idx ON line_staging USING GIST(geom);

    -- 4. Create Sliced Table and Insert noded lines
    v_sql := format($sql$
        CREATE TABLE public.%I (id SERIAL PRIMARY KEY, geom GEOMETRY(LineString, %s));
        INSERT INTO public.%I (geom)
        WITH all_geoms AS (
            SELECT geom FROM line_staging
            UNION ALL
            SELECT geom FROM point_staging
        ),
        noded AS (
            SELECT (ST_Dump(ST_Node(ST_Union(geom)))).geom 
            FROM (SELECT ST_Collect(geom) as geom FROM all_geoms) t
        )
        SELECT geom FROM noded WHERE ST_GeometryType(geom) = 'ST_LineString'
    $sql$, v_sliced_table, p_utm_srid, v_sliced_table);
    EXECUTE v_sql;

    -- 5. Add to Topology and Snap
    PERFORM topology.AddTopoGeometryColumn(v_topo_name, 'public', v_sliced_table, 'topo_geom', 'LINESTRING');
    v_sql := format('UPDATE public.%I SET topo_geom = topology.toTopoGeom(geom, %L, 1, %s)', v_sliced_table, v_topo_name, p_snap_tolerance);
    EXECUTE v_sql;

    -- 6. Extract Nodes
    -- Add node mapping for extreme performance in link extraction
    CREATE TEMP TABLE node_map (node_id INTEGER, mapped_id TEXT) ON COMMIT DROP;

    v_sql := format($sql$
        INSERT INTO node_map (node_id, mapped_id)
        SELECT n.node_id, COALESCE(ps.id, 'J-' || n.node_id)
        FROM %I.node n
        LEFT JOIN point_staging ps ON ST_DWithin(n.geom, ps.geom, 0.001);
    $sql$, v_topo_name);
    EXECUTE v_sql;

    CREATE INDEX node_map_node_idx ON node_map(node_id);

    v_sql := format($sql$
        INSERT INTO nodes (project_id, id, type, geom, properties)
        SELECT 
            %L, nm.mapped_id, COALESCE(ps.type, 'junction'), ST_Transform(n.geom, 4326),
            COALESCE(ps.properties, %L::jsonb) || jsonb_build_object(
                'id', nm.mapped_id,
                'connectedLinks', (
                    SELECT COALESCE(jsonb_agg(COALESCE(ls.type, 'P') || '-' || e.edge_id), '[]'::jsonb)
                    FROM %I.edge_data e
                    LEFT JOIN line_staging ls ON ST_DWithin(e.geom, ls.geom, 0.001)
                    WHERE e.start_node = n.node_id OR e.end_node = n.node_id
                )
            )
        FROM %I.node n
        LEFT JOIN point_staging ps ON ST_DWithin(n.geom, ps.geom, 0.001)
        JOIN node_map nm ON nm.node_id = n.node_id
    $sql$, p_project_id, p_junction_props, v_topo_name, v_topo_name);
    EXECUTE v_sql;

    -- 7. Extract Links
    v_sql := format($sql$
        INSERT INTO links (project_id, id, type, source_node_id, target_node_id, geom, properties)
        SELECT DISTINCT ON (e.edge_id)
            %L, COALESCE(ls.type, 'P') || '-' || e.edge_id, COALESCE(ls.type, 'pipe'), 
            nm_start.mapped_id,
            nm_end.mapped_id,
            ST_Transform(e.geom, 4326),
            COALESCE(ls.properties, %L::jsonb) || jsonb_build_object(
                'id', COALESCE(ls.type, 'P') || '-' || e.edge_id,
                'length', ROUND(ST_Length(ST_Transform(e.geom, 4326)::geography)::numeric, 2),
                'startNodeId', nm_start.mapped_id,
                'endNodeId', nm_end.mapped_id
            )
        FROM %I.edge_data e
        LEFT JOIN line_staging ls ON ST_DWithin(e.geom, ls.geom, 0.001)
        LEFT JOIN node_map nm_start ON nm_start.node_id = e.start_node
        LEFT JOIN node_map nm_end ON nm_end.node_id = e.end_node
        ORDER BY e.edge_id;
    $sql$, p_project_id, p_pipe_props, v_topo_name);
    EXECUTE v_sql;

    -- 8. Cleanup
    v_sql := format('DROP TABLE IF EXISTS public.%I CASCADE', v_sliced_table);
    EXECUTE v_sql;
    PERFORM topology.DropTopology(v_topo_name);
END;
$$ LANGUAGE plpgsql;
