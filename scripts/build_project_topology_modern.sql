CREATE OR REPLACE FUNCTION build_project_topology_modern(
    p_project_id UUID,
    p_snap_tolerance DOUBLE PRECISION DEFAULT 0.1,
    p_max_pipe_length DOUBLE PRECISION DEFAULT 150,
    p_utm_srid INTEGER DEFAULT 3857
)
RETURNS UUID
LANGUAGE plpgsql
AS $$   
DECLARE
    v_safe_id TEXT := replace(p_project_id::text, '-', '_');
    v_topo_name TEXT := 'topo_' || v_safe_id;
    v_sliced_table TEXT := 'sliced_lines_' || v_safe_id;
BEGIN

    -- =============================================
    -- 0️⃣ Cleanup existing project data & stale topologies
    -- =============================================
    DELETE FROM links WHERE project_id = p_project_id;
    DELETE FROM nodes WHERE project_id = p_project_id;

    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', v_sliced_table);

    -- Safely drop the topology if a previous run failed mid-execution
    IF EXISTS (SELECT 1 FROM topology.topology WHERE name = v_topo_name) THEN
        PERFORM topology.DropTopology(v_topo_name);
    END IF;

    -- =============================================
    -- 1️⃣ The "PHP Magic": Merge, Node, Union, and Slice
    -- =============================================
    -- OPTIMIZATION: UNLOGGED table bypasses disk writing for extreme speed
    EXECUTE format($sql$
        CREATE UNLOGGED TABLE public.%I AS
        SELECT 
            status_input,
            ST_LineSubstring(
                the_geom, 
                %s * n / length, 
                CASE 
                    WHEN %s * (n + 1) < length THEN %s * (n + 1) / length 
                    ELSE 1 
                END
            ) AS geom
        FROM (
            SELECT 
                ST_LineMerge((ST_Dump(ST_LineMerge(ST_Node(ST_Union(ST_Transform(geom, %s)))))).geom) AS the_geom, 
                status_input, 
                ST_Length(ST_LineMerge((ST_Dump(ST_LineMerge(ST_Node(ST_Union(ST_Transform(geom, %s)))))).geom)) AS length 
            FROM raw_lines 
            WHERE project_id = %L
            GROUP BY status_input
        ) AS t 
        CROSS JOIN generate_series(0, 10000) AS n 
        WHERE n * %s / length < 1;
    $sql$,
        v_sliced_table,
        p_max_pipe_length, p_max_pipe_length, p_max_pipe_length, 
        p_utm_srid, p_utm_srid,                                  
        p_project_id,                                            
        p_max_pipe_length
    );

    -- =============================================
    -- 2️⃣ Bulk Topology Generation & Snapping
    -- =============================================
    
    -- OPTIMIZATION: Build a spatial index before running the topology engine
    -- This allows toTopoGeom to snap undershoots instantly using an R-Tree
    EXECUTE format('CREATE INDEX %I_geom_idx ON public.%I USING GIST(geom)', v_sliced_table, v_sliced_table);

    PERFORM topology.CreateTopology(v_topo_name, p_utm_srid);
    
    PERFORM topology.AddTopoGeometryColumn(
        v_topo_name, 'public', v_sliced_table, 'topo_geom', 'LINESTRING'
    );
    
    -- Magnetically snaps undershoots and T-intersections
    EXECUTE format($sql$
        UPDATE public.%I SET topo_geom = topology.toTopoGeom(geom, %L, 1, %s);
    $sql$,
        v_sliced_table, v_topo_name, p_snap_tolerance
    );

    -- =============================================
    -- 3️⃣ Extract & Insert Clean Nodes (With UI Rubber-Banding)
    -- =============================================
    EXECUTE format($sql$
        INSERT INTO nodes (project_id, id, type, geom, properties)
        SELECT 
            %L, 'J-' || n.node_id, 'junction', ST_Transform(n.geom, 4326), 
            jsonb_build_object(
                'id', 'J-' || n.node_id,
                'type', 'junction',
                'label', 'J-' || n.node_id,
                'elevation', 0,
                'connectedLinks', (
                    SELECT COALESCE(jsonb_agg('P-' || e.edge_id), '[]'::jsonb)
                    FROM %I.edge_data e
                    WHERE e.start_node = n.node_id OR e.end_node = n.node_id
                )
            )
        FROM %I.node n;
    $sql$, p_project_id, v_topo_name, v_topo_name);

    -- =============================================
    -- 4️⃣ Extract & Insert Clean Links (With DISTINCT ON duplicate prevention)
    -- =============================================
    EXECUTE format($sql$
        INSERT INTO links (project_id, id, type, source_node_id, target_node_id, geom, properties)
        SELECT DISTINCT ON (e.edge_id)
            %L, 'P-' || e.edge_id, 'pipe', 'J-' || e.start_node, 'J-' || e.end_node, 
            ST_Transform(e.geom, 4326), 
            jsonb_build_object(
                'id', 'P-' || e.edge_id,
                'type', 'pipe',
                'label', 'P-' || e.edge_id,
                'length', ROUND(ST_Length(e.geom)::numeric, 2),
                'status', l.status_input,
                'startNodeId', 'J-' || e.start_node,
                'endNodeId', 'J-' || e.end_node
            )
        FROM public.%I l
        INNER JOIN %I.relation AS r ON ((l.topo_geom).id = r.topogeo_id AND (l.topo_geom).layer_id = r.layer_id)
        INNER JOIN %I.edge_data AS e ON (r.element_id = e.edge_id)
        WHERE e.start_node != e.end_node
        ORDER BY e.edge_id;
    $sql$, p_project_id, v_sliced_table, v_topo_name, v_topo_name);

    -- =============================================
    -- 5️⃣ Immaculate Cleanup
    -- =============================================
    -- Safely removes the UNLOGGED table and temporary topology schema
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', v_sliced_table);
    PERFORM topology.DropTopology(v_topo_name);

    RETURN p_project_id;

END;
$$;