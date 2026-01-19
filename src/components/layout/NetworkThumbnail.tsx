"use client";

import { useMemo } from "react";

interface NetworkThumbnailProps {
  data: any[] | { features: any[] }; // Handles Array or Object
  className?: string;
}

export function NetworkThumbnail({ data, className }: NetworkThumbnailProps) {
  
  const { paths, points, viewBox } = useMemo(() => {
    // 1. Normalize Input: Ensure we have a flat array of features
    let features: any[] = [];
    if (Array.isArray(data)) {
        features = data;
    } else if (data && Array.isArray(data.features)) {
        features = data.features;
    }

    if (features.length === 0) return { paths: [], points: [], viewBox: "0 0 100 100" };

    // 2. Scan Extents (Min/Max X/Y)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const lineFeatures: number[][][] = []; // Store coordinates for lines
    const pointFeatures: number[][] = [];  // Store coordinates for points

    features.forEach(f => {
        const geom = f.geometry;
        if (!geom || !geom.coordinates) return;

        // A. Handle Lines (Pipes)
        if (geom.type === 'LineString') {
            const coords = geom.coordinates; // [[x,y], [x,y]]
            lineFeatures.push(coords);
            coords.forEach((c: number[]) => {
                const [x, y] = c;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            });
        } 
        // B. Handle Points (Junctions) - Only needed if we want to draw dots
        else if (geom.type === 'Point') {
            const [x, y] = geom.coordinates;
            pointFeatures.push([x, y]);
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    });

    if (minX === Infinity) return { paths: [], points: [], viewBox: "0 0 100 100" };

    // 3. Normalize & Flip Y (So map isn't upside down)
    // SVG Y goes DOWN. Map Y goes UP. 
    // We will normalize everything to a 100x100 box logic for easier path string generation.
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Prevent division by zero for single points
    const safeWidth = width || 1; 
    const safeHeight = height || 1;
    const aspectRatio = safeWidth / safeHeight;

    // We'll map X to [0, 100*Ratio] and Y to [100, 0] (Flipped)
    const scaleX = (val: number) => ((val - minX) / safeWidth) * 100 * aspectRatio;
    const scaleY = (val: number) => 100 - ((val - minY) / safeHeight) * 100; // Flip Y

    // 4. Generate SVG Paths
    const svgPaths = lineFeatures.map(line => {
        return line.map((pt, i) => {
            const x = scaleX(pt[0]);
            const y = scaleY(pt[1]);
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        }).join(" ");
    });

    // 5. Generate SVG Points (Only if we have NO lines, or specific requirement)
    // If we have pipes, points are just visual noise in a thumbnail.
    // If we have NO pipes, we draw points so the user sees *something*.
    const svgPoints = svgPaths.length === 0 ? pointFeatures.map(pt => ({
        cx: scaleX(pt[0]).toFixed(2),
        cy: scaleY(pt[1]).toFixed(2)
    })) : [];

    // Viewbox is now predictable based on our scaling
    const finalW = 100 * aspectRatio;
    const finalH = 100;
    
    // Add 10% Padding
    const pad = 10;
    const vb = `${-pad} ${-pad} ${finalW + pad*2} ${finalH + pad*2}`;

    return { paths: svgPaths, points: svgPoints, viewBox: vb };

  }, [data]);

  // --- Render ---
  if ((paths.length === 0 && points.length === 0)) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-lg ${className}`}>
        <span className="text-[10px] text-slate-400 font-medium">NO GEOMETRY</span>
      </div>
    );
  }

  return (
    <div className={`relative bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden ${className}`}>
      <svg 
        viewBox={viewBox} 
        className="w-full h-full text-primary dark:text-primary-dark"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Draw Pipes */}
        <g stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
          {paths.map((d, i) => (
            <path key={i} d={d} className="opacity-90" />
          ))}
        </g>

        {/* Draw Nodes (Only if no pipes exist) */}
        {points.length > 0 && (
           <g fill="currentColor" className="text-slate-400">
             {points.map((pt, i) => (
                <circle key={i} cx={pt.cx} cy={pt.cy} r="2" />
             ))}
           </g>
        )}
      </svg>
    </div>
  );
}