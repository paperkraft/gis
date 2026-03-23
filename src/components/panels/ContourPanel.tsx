"use client";

import React, { useRef, useState, useEffect } from "react";
import { useMapStore } from "@/store/mapStore";
import { useNetworkStore } from "@/store/networkStore";
import { calculateElevationsFromContours } from "@/lib/gis/idwInterpolation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import shpjs from "shpjs";

// OpenLayers imports
import GeoJSON from "ol/format/GeoJSON";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import { Style, Stroke } from "ol/style";
import Feature from "ol/Feature";

import { UploadCloud, Layers as LayersIcon, Map as MapIcon, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface PanelProps {
  isMaximized?: boolean;
}

export function ContourPanel({ isMaximized = false }: PanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { map, vectorSource: networkSource, contourSource, setContourSource, contourLayer, setContourLayer } = useMapStore();
  const { updateFeature } = useNetworkStore();

  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<string[]>([]);
  const [selectedElevProp, setSelectedElevProp] = useState<string>("");
  const [featureCount, setFeatureCount] = useState(0);

  // Re-read properties if there's already a contourSource
  useEffect(() => {
    if (contourSource) {
      const features = contourSource.getFeatures();
      setFeatureCount(features.length);
      if (features.length > 0) {
        const props = Object.keys(features[0].getProperties()).filter(k => k !== "geometry");
        setProperties(props);
      }
    }
  }, [contourSource]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const isZip = name.endsWith(".zip");
    const isGeoJson = name.endsWith(".geojson") || name.endsWith(".json");

    if (!isZip && !isGeoJson) {
      toast.error("Please upload a .zip (Shapefile) or .geojson file.");
      return;
    }

    setLoading(true);
    toast.loading("Parsing contour file...", { id: "contour-upload" });

    try {
      let geojsonObj: any;

      if (isZip) {
        const buffer = await file.arrayBuffer();
        const parsed = await shpjs(buffer);
        // shpjs can return an array if multiple shapefiles exist in zip
        geojsonObj = Array.isArray(parsed) ? parsed[0] : parsed;
      } else {
        const text = await file.text();
        geojsonObj = JSON.parse(text);
      }

      if (!geojsonObj || !geojsonObj.features || geojsonObj.features.length === 0) {
        throw new Error("No features found in the uploaded file.");
      }

      // Map format reader
      const format = new GeoJSON();
      const features = format.readFeatures(geojsonObj, {
        featureProjection: map?.getView().getProjection() || "EPSG:3857"
      }) as Feature[];

      if (features.length === 0) {
        throw new Error("Failed to extract OpenLayers features from file.");
      }

      // Read properties of the first feature to guess elevation field
      const props = Object.keys(features[0].getProperties()).filter((key) => key !== 'geometry');
      setProperties(props);
      setFeatureCount(features.length);
      
      // Auto-select a property if named like 'ELEV', 'Z', 'CONTOUR'
      const guessed = props.find(p => ['elev', 'elevation', 'z', 'contour'].includes(p.toLowerCase()));
      if (guessed) setSelectedElevProp(guessed);

      // Create OL Vector Source and Layer
      const newSource = new VectorSource({ features });
      const newLayer = new VectorLayer({
        source: newSource,
        style: new Style({
          stroke: new Stroke({
            color: 'rgba(210, 105, 30, 0.7)', // Chocolate-ish color for contours
            width: 1.5,
          })
        }),
        zIndex: 5 // Ensure it displays decently over base map, below network usually
      });

      // Manage old layer
      if (contourLayer && map) {
        map.removeLayer(contourLayer);
      }

      if (map) {
        map.addLayer(newLayer);
        // Optionally zoom to extent
        map.getView().fit(newSource.getExtent(), { padding: [50, 50, 50, 50], duration: 800 });
      }

      setContourSource(newSource);
      setContourLayer(newLayer);

      toast.success(`Loaded ${features.length} contour lines.`, { id: "contour-upload" });

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to process contour file", { id: "contour-upload" });
    } finally {
      setLoading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleApplyElevations = () => {
    if (!contourSource) {
      toast.error("No contour loaded on the map.");
      return;
    }
    if (!selectedElevProp) {
      toast.error("Please select an elevation property from the dropdown.");
      return;
    }
    if (!networkSource) {
      toast.error("No network available.");
      return;
    }

    setLoading(true);
    toast.loading("Calculating elevations...", { id: "contour-calc" });

    try {
      const netFeatures = networkSource.getFeatures() as Feature[];
      const cFeatures = contourSource.getFeatures() as Feature[];

      const newElevations = calculateElevationsFromContours(netFeatures, cFeatures, selectedElevProp, 3);
      
      let updatedCount = 0;
      Object.entries(newElevations).forEach(([id, elev]) => {
        updateFeature(id, { elevation: elev });
        updatedCount++;
      });

      if (updatedCount === 0) {
        toast.warning("No nodes were updated (perhaps no junctions found).", { id: "contour-calc" });
      } else {
        toast.success(`Successfully updated elevations for ${updatedCount} nodes!`, { id: "contour-calc" });
      }

    } catch(err: any) {
      console.error(err);
      toast.error("Failed to calculate elevations.", { id: "contour-calc" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveContours = () => {
    if (contourLayer && map) {
      map.removeLayer(contourLayer);
    }
    setContourSource(null);
    setContourLayer(null);
    setProperties([]);
    setSelectedElevProp("");
    setFeatureCount(0);
    toast.success("Contour layer removed.");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative w-full">
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Controls (Always Visible) */}
        <div
          className={cn(
            "flex flex-col h-full bg-white dark:bg-slate-950 transition-all",
            isMaximized ? "w-1/3 min-w-[350px] border-r border-slate-200 dark:border-slate-800" : "w-full"
          )}
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col gap-1 shrink-0">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <LayersIcon className="size-5 text-primary" />
              Contours &amp; Terrain
            </h2>
            <p className="text-sm text-slate-500">Upload contour lines to visualize and extract node elevations.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
            
            {/* Upload Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">1. Upload Contour File</h3>
              
              <input 
                type="file" 
                accept=".zip,.json,.geojson" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
          
          <Button 
            variant="outline" 
            className="border-dashed border-2 h-24 flex flex-col gap-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <UploadCloud className="size-6 text-slate-400" />
            <span className="text-slate-500 font-normal">Click to upload .zip (Shapefile) or .geojson</span>
          </Button>

          {loading && <Progress value={undefined} className="h-1 shadow-sm" />}
        </div>

        {/* Configuration Section (if data loaded) */}
        {contourSource && properties.length > 0 && (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <MapIcon className="size-4" />
              2. Contour Data ({featureCount} lines)
            </h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">Elevation Attribute</label>
              <Select value={selectedElevProp} onValueChange={setSelectedElevProp}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property..." />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                   <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <Button onClick={handleApplyElevations} disabled={!selectedElevProp || loading} className="w-full flex gap-2">
                Apply to Network <ChevronRight className="size-4" />
              </Button>
              <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={handleRemoveContours}>
                Remove Layer
              </Button>
            </div>
          </div>
        )}

        {!contourSource && !loading && (
          <div className="h-full flex items-center justify-center p-6 text-center text-sm text-slate-400">
            No contours loaded. Let's start by dropping a file above.
          </div>
        )}
          </div>
        </div>

        {/* RIGHT: Empty state or extra info when maximized */}
        {isMaximized && (
          <div className="flex-1 h-full bg-slate-50 dark:bg-slate-900 hidden md:flex items-center justify-center p-8 text-center text-slate-400">
            <div className="max-w-md flex flex-col items-center gap-4">
              <LayersIcon className="size-12 opacity-20" />
              <p>Maximize the map view to better see your contour lines while adjusting the elevation parameters on the left.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
