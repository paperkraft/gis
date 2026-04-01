"use client";

import React, { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
import { Style, Stroke, Text, Fill } from "ol/style";
import Feature from "ol/Feature";

import { UploadCloud, Layers as LayersIcon, Map as MapIcon, ChevronRight, Info, Palette, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PanelProps {
  isMaximized?: boolean;
}

export function ContourPanel({ isMaximized = false }: PanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const params = useParams();
  const projectId = params?.id as string;
  
  const { map, vectorSource: networkSource, contourSource, setContourSource, contourLayer, setContourLayer } = useMapStore();
  const { updateFeature } = useNetworkStore();

  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<string[]>([]);
  const [selectedElevProp, setSelectedElevProp] = useState<string>("");
  const [featureCount, setFeatureCount] = useState(0);
  const [hasSavedContours, setHasSavedContours] = useState(false);

  // New Appearance State
  const [showLabels, setShowLabels] = useState(false);
  const [contourColor, setContourColor] = useState('rgba(210, 105, 30, 0.7)');

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

  // Helper: Create Contour Style
  const getContourStyle = (feature: Feature) => {
    const elevValue = selectedElevProp ? feature.get(selectedElevProp) : "";
    
    return new Style({
      stroke: new Stroke({
        color: contourColor,
        width: 1.5,
      }),
      text: showLabels && elevValue !== undefined ? new Text({
        text: String(elevValue),
        font: 'bold 11px "Inter", sans-serif',
        fill: new Fill({ color: contourColor }),
        stroke: new Stroke({ color: '#fff', width: 2.5 }),
        placement: 'line',
        repeat: 500, // Interval between labels
        overflow: false,
      }) : undefined
    });
  };

  // Effect: Sync style when settings change
  useEffect(() => {
    if (contourLayer) {
      contourLayer.setStyle((feature) => getContourStyle(feature as Feature));
    }
  }, [contourLayer, showLabels, contourColor, selectedElevProp]);

  // Check for saved contours on mount
  useEffect(() => {
    if (!projectId) return;

    const checkSaved = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/contours?meta=true`);
        const data = await res.json();
        setHasSavedContours(data.hasContours);
      } catch (err) {
        console.error("Check saved contours failed:", err);
      }
    };
    checkSaved();
  }, [projectId]);

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
        style: (feature) => getContourStyle(feature as Feature),
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
    toast.success("Contour layer hidden.");
  };

  const handleSaveToProject = async () => {
    if (!contourSource || !projectId || !map) return;

    setLoading(true);
    const toastId = toast.loading("Saving contours to cloud...");

    try {
      const format = new GeoJSON();
      const features = format.writeFeaturesObject(contourSource.getFeatures(), {
        featureProjection: map.getView().getProjection(),
        dataProjection: 'EPSG:4326'
      });

      const res = await fetch(`/api/projects/${projectId}/contours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features),
      });

      if (!res.ok) throw new Error("Failed to save contours");

      setHasSavedContours(true);
      toast.success("Contours saved to project successfully!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadFromProject = async () => {
    if (!projectId || !map) return;

    setLoading(true);
    const toastId = toast.loading("Loading contours from cloud...");

    try {
      const res = await fetch(`/api/projects/${projectId}/contours`);
      const data = await res.json();

      if (!data.features || data.features.length === 0) {
        throw new Error("No contours found for this project.");
      }

      const format = new GeoJSON();
      const features = format.readFeatures(data, {
        dataProjection: 'EPSG:4326',
        featureProjection: map.getView().getProjection()
      }) as Feature[];

      const newSource = new VectorSource({ features });
      const newLayer = new VectorLayer({
        source: newSource,
        style: (feature) => getContourStyle(feature as Feature),
        zIndex: 5
      });

      map.addLayer(newLayer);
      map.getView().fit(newSource.getExtent(), { padding: [50, 50, 50, 50], duration: 800 });

      setContourSource(newSource);
      setContourLayer(newLayer);
      setHasSavedContours(true);

      // Extract properties for dropdown
      if (features.length > 0) {
          const props = Object.keys(features[0].getProperties()).filter(k => k !== "geometry");
          setProperties(props);
          setFeatureCount(features.length);

          // Auto-select elevation prop if possible
          const guessed = props.find(p => ['elev', 'elevation', 'z', 'contour'].includes(p.toLowerCase()));
          if (guessed) setSelectedElevProp(guessed);
      }

      toast.success(`Loaded ${features.length} contour lines from project.`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const clearContoursFromCloud = async () => {
    if (!projectId || !confirm("Are you sure you want to delete these contours from the project permanently?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/contours`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete contours");

      setHasSavedContours(false);
      handleRemoveContours();
      toast.success("Contours deleted from cloud.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
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
            {/* 1. Header Info Box */}
            <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-[11px] text-blue-800 space-y-2">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                    <LayersIcon size={14} className="text-primary" />
                    <span>Contour Processing</span>
                </div>
                <p className="opacity-80 leading-relaxed font-normal">
                    Upload contour lines (Shapefile/GeoJSON) to visualize terrain and automatically extract elevation data for junctions.
                </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
            
            {/* Upload Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">1. Import Contours</h3>
              
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
            <UploadCloud className="size-5 text-slate-400" />
            <span className="text-slate-500 font-normal text-xs text-center px-4">Click to upload .zip (Shapefile) or .geojson</span>
          </Button>

          {hasSavedContours && !contourSource && (
            <Button 
                variant="secondary" 
                className="mt-2 h-9 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200"
                onClick={handleLoadFromProject}
                disabled={loading}
            >
                <LayersIcon className="size-3.5 mr-2" />
                Load Contours from Project
            </Button>
          )}

          {loading && <Progress value={undefined} className="h-1 shadow-sm mt-2" />}
        </div>

        {/* Configuration Section (if data loaded) */}
        {contourSource && properties.length > 0 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <MapIcon className="size-3" />
              2. Data Mapping ({featureCount} lines)
            </h3>
            
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Elevation Attribute</label>
              <Select value={selectedElevProp} onValueChange={setSelectedElevProp}>
                <SelectTrigger className="h-9 text-xs shadow-none border-slate-200">
                  <SelectValue placeholder="Select property..." />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {properties.map(p => (
                   <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Appearance Section */}
            <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
              <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <Palette className="size-3" />
                3. Layer Appearance
              </h3>
              
              <div className="flex flex-col gap-4 px-1">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-[11px] font-semibold text-slate-600">Show Elevation Labels</Label>
                    <span className="text-[10px] text-slate-400">Display values along contour lines</span>
                  </div>
                  <Switch 
                     checked={showLabels} 
                     onCheckedChange={setShowLabels}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-[11px] font-semibold text-slate-600">Stroke Color</Label>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="color" 
                      value={contourColor.startsWith('rgba') ? '#D2691E' : contourColor} // Fallback to hex for input
                      onChange={(e) => setContourColor(e.target.value)}
                      className="w-10 h-8 p-0 border-none cursor-pointer rounded-full overflow-hidden"
                    />
                    <span className="text-[10px] text-slate-500 font-mono uppercase">{contourColor}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100">
              <Button onClick={handleApplyElevations} disabled={!selectedElevProp || loading} className="w-full flex gap-2 h-9 text-xs bg-blue-600 hover:bg-blue-700 shadow-sm">
                Apply to Network <ChevronRight className="size-4" />
              </Button>
              
              <div className="flex items-center gap-2 mt-1">
                <Button 
                   variant="outline" 
                   size="sm" 
                   className="flex-1 h-8 text-[10px]" 
                   onClick={handleSaveToProject}
                   disabled={loading}
                >
                    Save to Project
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50 h-8 text-[10px]" 
                    onClick={handleRemoveContours}
                >
                    Hide Layer
                </Button>
              </div>

              {hasSavedContours && (
                 <Button 
                    variant="link" 
                    className="text-slate-400 hover:text-red-400 h-6 text-[9px] mt-1" 
                    onClick={clearContoursFromCloud}
                    disabled={loading}
                 >
                    Delete from Cloud permanently
                 </Button>
              )}
            </div>
          </div>
        )}

        {!contourSource && !loading && (
          <div className="h-full flex items-center justify-center p-6 text-center text-[11px] text-slate-400 italic">
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
