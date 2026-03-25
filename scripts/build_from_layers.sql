DROP FUNCTION IF EXISTS build_from_layers(UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, JSONB, JSONB);

CREATE OR REPLACE FUNCTION build_from_layers(
    p_project_id UUID,
    p_snap_tolerance DOUBLE PRECISION,
    p_max_pipe_length DOUBLE PRECISION,
    p_utm_srid INTEGER,
    p_default_junction_props JSONB,
    p_default_pipe_props JSONB
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

    -- 3. Staging points
    CREATE TEMP TABLE point_staging (
        id TEXT,
        type TEXT,
        geom GEOMETRY,
        properties JSONB
    ) ON COMMIT DROP;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'raw_junctions') THEN
        INSERT INTO point_staging (id, type, geom, properties) 
        SELECT properties->>'id', 'junction', ST_Transform(ST_Force2D(geom), p_utm_srid), properties 
        FROM raw_junctions WHERE project_id = p_project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'raw_tanks') THEN
        INSERT INTO point_staging (id, type, geom, properties) 
        SELECT properties->>'id', 'tank', ST_Transform(ST_Force2D(geom), p_utm_srid), properties 
        FROM raw_tanks WHERE project_id = p_project_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'raw_reservoirs') THEN
        INSERT INTO point_staging (id, type, geom, properties) 
        SELECT properties->>'id', 'reservoir', ST_Transform(ST_Force2D(geom), p_utm_srid), properties 
        FROM raw_reservoirs WHERE project_id = p_project_id;
    END IF;

    -- 4. Create Sliced Table
    v_sql := format($sql$
        CREATE TABLE public.%I (
            id SERIAL PRIMARY KEY,
            geom GEOMETRY(LineString, %s)
        )
    $sql$, v_sliced_table, p_utm_srid);
    EXECUTE v_sql;

    -- 5. Insert sliced lines
    v_sql := format($sql$
        INSERT INTO public.%I (geom)
        WITH all_geoms AS (
            SELECT ST_Transform(ST_Force2D(geom), %s) as geom FROM raw_pipes WHERE project_id = %L
            UNION ALL
            SELECT geom FROM point_staging
        ),
        noded AS (
            SELECT (ST_Dump(ST_Node(ST_Union(geom)))).geom 
            FROM (SELECT ST_Collect(geom) as geom FROM all_geoms) t
        )
        SELECT geom FROM noded WHERE ST_GeometryType(geom) = 'ST_LineString'
    $sql$, v_sliced_table, p_utm_srid, p_project_id);
    EXECUTE v_sql;

    -- 6. Build Topology
    PERFORM topology.AddTopoGeometryColumn(v_topo_name, 'public', v_sliced_table, 'topo_geom', 'LINESTRING');
    
    v_sql := format($sql$
        UPDATE public.%I SET topo_geom = topology.toTopoGeom(geom, %L, 1, %s)
    $sql$, v_sliced_table, v_topo_name, p_snap_tolerance);
    EXECUTE v_sql;

    -- 7. Extract Nodes
    v_sql := format($sql$
        INSERT INTO nodes (project_id, id, type, geom, properties)
        SELECT 
            %L, 
            COALESCE(ps.id, 'J-' || n.node_id), 
            COALESCE(ps.type, 'junction'), 
            ST_Transform(n.geom, 4326),
            (COALESCE(ps.properties, %L::jsonb) - 'connectedLinks') || jsonb_build_object(
                'id', COALESCE(ps.id, 'J-' || n.node_id),
                'connectedLinks', (
                    SELECT COALESCE(jsonb_agg('P-' || e.edge_id), '[]'::jsonb)
                    FROM %I.edge_data e
                    WHERE e.start_node = n.node_id OR e.end_node = n.node_id
                )
            )
        FROM %I.node n
        LEFT JOIN point_staging ps ON ST_DWithin(n.geom, ps.geom, 0.001)
    $sql$, p_project_id, p_default_junction_props, v_topo_name, v_topo_name);
    EXECUTE v_sql;

    -- 8. Extract Links
    v_sql := format($sql$
        INSERT INTO links (project_id, id, type, source_node_id, target_node_id, geom, properties)
        SELECT DISTINCT ON (e.edge_id)
            %L, 'P-' || e.edge_id, 'pipe', 
            (SELECT n.id FROM nodes n WHERE n.project_id = %L ORDER BY n.geom <-> ST_Transform(ST_StartPoint(e.geom), 4326) LIMIT 1),
            (SELECT n.id FROM nodes n WHERE n.project_id = %L ORDER BY n.geom <-> ST_Transform(ST_EndPoint(e.geom), 4326) LIMIT 1),
            ST_Transform(e.geom, 4326),
            %L::jsonb || jsonb_build_object(
                'id', 'P-' || e.edge_id,
                'length', ROUND(ST_Length(ST_Transform(e.geom, 4326)::geography)::numeric, 2),
                'startNodeId', (SELECT n.id FROM nodes n WHERE n.project_id = %L ORDER BY n.geom <-> ST_Transform(ST_StartPoint(e.geom), 4326) LIMIT 1),
                'endNodeId', (SELECT n.id FROM nodes n WHERE n.project_id = %L ORDER BY n.geom <-> ST_Transform(ST_EndPoint(e.geom), 4326) LIMIT 1)
            )
        FROM %I.edge_data e
        ORDER BY e.edge_id;
    $sql$, p_project_id, p_project_id, p_project_id, p_default_pipe_props, p_project_id, p_project_id, v_topo_name);
    EXECUTE v_sql;

    -- 9. Cleanup
    v_sql := format('DROP TABLE IF EXISTS public.%I CASCADE', v_sliced_table);
    EXECUTE v_sql;
    PERFORM topology.DropTopology(v_topo_name);
END;
$$ LANGUAGE plpgsql;
