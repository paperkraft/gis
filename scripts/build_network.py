import sys
import json
import traceback
import numpy as np

def process_network():
    try:
        import geopandas as gpd
        import networkx as nx
        from shapely.ops import unary_union, substring, snap
        from shapely.geometry import Point, mapping, LineString
        import warnings
        
        warnings.filterwarnings("ignore")

        # 1. Read input and settings
        input_data = sys.stdin.read()
        payload = json.loads(input_data)
        
        geojson_data = payload.get('geojson')
        settings = payload.get('settings', {})
        
        tolerance = float(settings.get('tolerance', 5.0))
        max_length = float(settings.get('maxPipeLength', 150.0))
        
        # 2. Load and Project to Meters (EPSG:3857)
        gdf = gpd.GeoDataFrame.from_features(geojson_data["features"])
        gdf = gdf.set_crs(epsg=4326).to_crs(epsg=3857)
        gdf = gdf[gdf.geometry.type.isin(['LineString', 'MultiLineString'])]
        gdf = gdf.explode(index_parts=False).reset_index(drop=True)
        
        # 3. SNAP & NODE (Cut intersections)
        reference_network = unary_union(gdf.geometry.tolist())
        snapped_geoms = [snap(geom, reference_network, tolerance) for geom in gdf.geometry]
        noded_geom = unary_union(snapped_geoms) 
        
        if noded_geom.geom_type == 'MultiLineString':
            raw_lines = list(noded_geom.geoms)
        elif noded_geom.geom_type == 'LineString':
            raw_lines = [noded_geom]
        else:
            raw_lines = [geom for geom in noded_geom.geoms if geom.geom_type == 'LineString']
            
        # =====================================================================
        # 4. EXPLICIT GRAPH THEORY: Pseudo-Node Removal
        # =====================================================================
        G = nx.MultiGraph()
        
        # Build the initial mathematical graph
        for idx, line in enumerate(raw_lines):
            coords = list(line.coords)
            # Hash endpoints to 2 decimals (1 centimeter) to guarantee connections
            start = (round(coords[0][0], 2), round(coords[0][1], 2))
            end = (round(coords[-1][0], 2), round(coords[-1][1], 2))
            G.add_edge(start, end, geom=line)

        # Find all pseudo-nodes (nodes with exactly 2 connections)
        pseudo_nodes = [n for n, d in G.degree() if d == 2]
        
        for n in pseudo_nodes:
            edges = list(G.edges(n, data=True, keys=True))
            if len(edges) == 2:
                u, v, k1, data1 = edges[0]
                x, y, k2, data2 = edges[1]
                
                # Get the outer endpoints of the two pipes
                end1 = v if u == n else u
                end2 = y if x == n else x
                
                # If it's a loop (a pipe forming a circle), leave it alone
                if end1 == end2:
                    continue
                    
                geom1 = data1['geom']
                geom2 = data2['geom']
                
                c1 = list(geom1.coords)
                c2 = list(geom2.coords)
                
                # Ensure the coordinates are facing the right direction before fusing
                def is_shared(pt, node):
                    return abs(pt[0]-node[0]) < 0.1 and abs(pt[1]-node[1]) < 0.1
                    
                if is_shared(c1[0], n): c1.reverse()
                if is_shared(c2[-1], n): c2.reverse()
                
                # Fuse the two geometries
                new_geom = LineString(c1[:-1] + c2)
                
                # Remove the old pipes and the unnecessary node, add the new fused pipe
                G.remove_node(n)
                G.add_edge(end1, end2, geom=new_geom)

        # Extract the cleaned lines back out of the graph
        clean_lines = [data['geom'] for u, v, data in G.edges(data=True)]
        # =====================================================================
            
        # 5. MAX PIPE LENGTH (Split clean lines mathematically)
        split_lines = []
        for line in clean_lines:
            if line.length > max_length:
                num_segments = int(np.ceil(line.length / max_length))
                seg_len = line.length / num_segments
                for i in range(num_segments):
                    split_lines.append(substring(line, i * seg_len, (i + 1) * seg_len))
            else:
                split_lines.append(line)
                
        # 6. GRAPH EXTRACTION & JSON FORMATTING
        nodes_dict = {}
        node_counter = 1
        output_links = []
        output_nodes = []
        
        for idx, line in enumerate(split_lines):
            coords = list(line.coords)
            start_hash = (round(coords[0][0], 3), round(coords[0][1], 3))
            end_hash = (round(coords[-1][0], 3), round(coords[-1][1], 3))
            
            if start_hash not in nodes_dict:
                n_id = f"J-{node_counter}"
                nodes_dict[start_hash] = {"id": n_id, "pt": Point(coords[0])}
                node_counter += 1
                
            if end_hash not in nodes_dict:
                n_id = f"J-{node_counter}"
                nodes_dict[end_hash] = {"id": n_id, "pt": Point(coords[-1])}
                node_counter += 1
                
            output_links.append({
                "id": f"P-{idx + 1}",
                "source": nodes_dict[start_hash]["id"],
                "target": nodes_dict[end_hash]["id"],
                "geometry": line
            })

        for hsh, n_data in nodes_dict.items():
            output_nodes.append({
                "id": n_data["id"],
                "geometry": n_data["pt"]
            })
            
        # 7. Reproject to EPSG:4326 and output
        links_gdf = gpd.GeoDataFrame(output_links, geometry='geometry', crs="EPSG:3857").to_crs(epsg=4326)
        nodes_gdf = gpd.GeoDataFrame(output_nodes, geometry='geometry', crs="EPSG:3857").to_crs(epsg=4326)
        
        final_nodes = [{"id": row['id'], "geom": mapping(row.geometry)} for _, row in nodes_gdf.iterrows()]
        final_links = [{
            "id": row['id'], 
            "source": row['source'], 
            "target": row['target'], 
            "geom": mapping(row.geometry)
        } for _, row in links_gdf.iterrows()]

        print(json.dumps({
            "status": "success",
            "nodes": final_nodes,
            "links": final_links
        }))

    except Exception as e:
        sys.stderr.write(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    process_network()