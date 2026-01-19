"use client";

import { useMemo, useState } from 'react';
import { Area, ComposedChart, Line, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSimulationStore } from '@/store/simulationStore';
import { useNetworkStore } from '@/store/networkStore';
import { FormSelect } from '@/components/form-controls/FormSelect';

export function HGLGraph() {
  const { history, currentTimeIndex } = useSimulationStore();
  const { features } = useNetworkStore();

  const [startNodeId, setStartNodeId] = useState<string>("");
  const [endNodeId, setEndNodeId] = useState<string>("");

  // Get all Junctions for dropdown
  const nodeOptions = useMemo(() => {
    return Array.from(features.values())
        .filter(f => ['junction', 'tank', 'reservoir'].includes(f.get('type')))
        .map(f => ({ label: f.getId() as string, value: f.getId() as string }));
  }, [features]);

  // Construct Data for the Profile
  // WARNING: In a real app, use Dijkstra's algorithm to find the path.
  // Here, for MVP, we simply interpolate or just show the two points if they aren't connected directly.
  // IMPROVEMENT: We will just plot ALL nodes on X-axis sorted by ID for now to show "System Profile" 
  // or strictly the Start/End if selected. 
  
  const profileData = useMemo(() => {
    if (!history || !history.snapshots[currentTimeIndex]) return [];
    
    const snap = history.snapshots[currentTimeIndex];
    
    // Simplification: Plot selected nodes + intermediate if possible.
    // Ideally: Pathfinding. 
    // Fallback: Let's plot 10 random nodes or just the start/end to show the concept.
    
    let nodesToPlot = nodeOptions.map(n => n.value); 
    // If start/end selected, try to filter (mock path)
    if (startNodeId && endNodeId) {
        nodesToPlot = [startNodeId, endNodeId]; 
    } else {
        // Limit to first 20 nodes for readability if no selection
        nodesToPlot = nodesToPlot.slice(0, 20); 
    }

    return nodesToPlot.map(id => {
        const node = features.get(id);
        const res = snap.nodes[id];
        if (!node || !res) return null;

        const elevation = node.getProperties().elevation || 0;
        const head = res.head;
        const pressureHead = head - elevation;

        return {
            name: id,
            elevation: elevation,
            hgl: head,
            pressure: pressureHead // The gap between HGL and Elevation
        };
    }).filter(Boolean);

  }, [history, currentTimeIndex, features, startNodeId, endNodeId, nodeOptions]);

  return (
    <div className="flex flex-col h-full w-full">
        <div className="flex gap-2 mb-2">
            <div className="w-1/2">
                <FormSelect label="Start" value={startNodeId} onChange={setStartNodeId} options={[{label:'Select Start', value:''}, ...nodeOptions]} />
            </div>
            <div className="w-1/2">
                <FormSelect label="End" value={endNodeId} onChange={setEndNodeId} options={[{label:'Select End', value:''}, ...nodeOptions]} />
            </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={profileData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{fontSize: 10}} />
                <YAxis label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip />
                <Legend />
                
                {/* Ground Elevation (Gray Area) */}
                <Area type="monotone" dataKey="elevation" fill="#9ca3af" stroke="#4b5563" fillOpacity={0.4} name="Elevation" />
                
                {/* Hydraulic Grade Line (Blue Line) */}
                <Line type="monotone" dataKey="hgl" stroke="#2563eb" strokeWidth={3} dot={{r:4}} name="Hydraulic Grade" />
                
            </ComposedChart>
        </ResponsiveContainer>
    </div>
  );
}