"use client";
import {
  Activity,
  ArrowRightLeft,
  Focus,
  Info,
  Link as LinkIcon,
  Mountain,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { LineString, Point } from "ol/geom";
import React, { useEffect, useState } from "react";

import { ResultChart } from "@/components/simulation/ResultChart";
import { Button } from "@/components/ui/button";
import { COMPONENT_TYPES } from "@/constants/networkComponents";
import { ElevationService } from "@/lib/services/ElevationService";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/store/mapStore";
import { useNetworkStore } from "@/store/networkStore";
import { useSimulationStore } from "@/store/simulationStore";
import { NetworkFeatureProperties } from "@/types/network";

interface PropertyPanelProps {
  properties: NetworkFeatureProperties;
  onDeleteRequest?: () => void;
}

export function PropertyPanel({
  properties,
  onDeleteRequest,
}: PropertyPanelProps) {
  const { selectedFeatureId, selectedFeature, updateFeature } =
    useNetworkStore();
  const { history, results } = useSimulationStore();
  const map = useMapStore((state) => state.map);

  const [editedProperties, setEditedProperties] =
    useState<NetworkFeatureProperties>(properties);
  const [hasChanges, setHasChanges] = useState(false);
  const [isFetchingElevation, setIsFetchingElevation] = useState(false);

  useEffect(() => {
    const initialProps = { ...properties };
    if (!initialProps.status) {
      if (["pipe", "pump", "valve"].includes(properties.type)) {
        initialProps.status = "open";
      } else {
        initialProps.status = "active";
      }
    }
    setEditedProperties(initialProps);
    setHasChanges(false);
  }, [properties]);

  const handlePropertyChange = (key: string, value: any) => {
    setEditedProperties((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (selectedFeatureId) {
      window.dispatchEvent(new CustomEvent("takeSnapshot"));
      updateFeature(selectedFeatureId, editedProperties);
      setHasChanges(false);
    }
  };

  const handleDelete = () => onDeleteRequest && onDeleteRequest();
  const handleClose = () => useNetworkStore.getState().selectFeature(null);

  const handleZoomToFeature = () => {
    if (!map || !selectedFeature) return;
    const geometry = selectedFeature.getGeometry();
    if (geometry) {
      map.getView().fit(geometry.getExtent(), {
        padding: [100, 100, 100, 100],
        maxZoom: 19,
        duration: 600,
      });
    }
  };

  const handleReverseFlow = () => {
    if (!selectedFeature || !selectedFeatureId) return;
    const geom = selectedFeature.getGeometry();
    if (
      ["pipe", "pump", "valve"].includes(properties.type) &&
      geom instanceof LineString
    ) {
      window.dispatchEvent(new CustomEvent("takeSnapshot"));
      const coords = geom.getCoordinates();
      geom.setCoordinates(coords.reverse());
      const newStart = editedProperties.endNodeId;
      const newEnd = editedProperties.startNodeId;
      const updates = { startNodeId: newStart, endNodeId: newEnd };
      updateFeature(selectedFeatureId, updates);
      setEditedProperties((prev) => ({ ...prev, ...updates }));
      selectedFeature.changed();
    }
  };

  const handleAutoElevate = async () => {
    if (!selectedFeature) return;
    setIsFetchingElevation(true);
    try {
      const geometry = selectedFeature.getGeometry();
      if (geometry instanceof Point) {
        const elevation = await ElevationService.getElevation(
          geometry.getCoordinates()
        );
        if (elevation !== null) handlePropertyChange("elevation", elevation);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingElevation(false);
    }
  };

  const getConnectedInfo = () => {
    if (["junction", "tank", "reservoir"].includes(properties.type)) {
      const connectedLinks = properties.connectedLinks || [];
      return {
        type: "node",
        count: connectedLinks.length,
        connections: connectedLinks,
      };
    } else if (["pipe", "pump", "valve"].includes(properties.type)) {
      return {
        type: "link",
        startNode: editedProperties.startNodeId,
        endNode: editedProperties.endNodeId,
      };
    }
    return null;
  };

  const connectionInfo = getConnectedInfo();
  const componentConfig = COMPONENT_TYPES[properties.type];

  const basicProperties = ["elevation", "demand", "population"];
  const hydraulicProperties = [
    "diameter",
    "length",
    "roughness",
    "capacity",
    "head",
    "headGain",
    "efficiency",
  ];
  const operationalProperties = ["status", "valveType", "setting", "material"];

  const renderPropertyInput = (key: string, value: any) => {
    const isBoolean = typeof value === "boolean";
    const isStatus = key === "status";

    // Common input style
    const inputClass =
      "w-full px-3 py-1.5 text-xs bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-700 dark:text-gray-200 transition-all";

    if (isBoolean) {
      return (
        <input
          type="checkbox"
          checked={editedProperties[key]}
          onChange={(e) => handlePropertyChange(key, e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
      );
    }

    if (isStatus) {
      return (
        <select
          value={editedProperties[key] as string}
          onChange={(e) => handlePropertyChange(key, e.target.value)}
          className={inputClass}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="running">Running</option>
          <option value="stopped">Stopped</option>
        </select>
      );
    }

    if (key === "elevation") {
      return (
        <div className="flex gap-2">
          <input
            type="number"
            value={editedProperties[key] ?? ""}
            onChange={(e) =>
              handlePropertyChange(key, parseFloat(e.target.value) || 0)
            }
            className={inputClass}
            step="0.1"
          />
          <button
            onClick={handleAutoElevate}
            disabled={isFetchingElevation}
            className="p-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
            title="Auto-fetch Elevation"
          >
            {isFetchingElevation ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Mountain className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      );
    }

    return (
      <input
        type={typeof value === "number" ? "number" : "text"}
        value={editedProperties[key] ?? ""}
        onChange={(e) =>
          handlePropertyChange(
            key,
            typeof value === "number"
              ? parseFloat(e.target.value) || 0
              : e.target.value
          )
        }
        className={inputClass}
        step={typeof value === "number" ? "0.1" : undefined}
      />
    );
  };

  const renderPropertyGroup = (title: string, propertyKeys: string[]) => {
    const groupProperties = propertyKeys.filter((key) =>
      editedProperties.hasOwnProperty(key)
    );
    if (groupProperties.length === 0) return null;
    return (
      <div className="mb-6 last:mb-0">
        <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
          {title}
        </h4>
        <div className="space-y-2">
          {groupProperties.map((key) => (
            <div key={key} className="grid grid-cols-3 gap-2 items-center">
              <label
                className="col-span-1 text-xs font-medium text-gray-600 dark:text-gray-400 capitalize truncate"
                title={key}
              >
                {key.replace(/([A-Z])/g, " $1").trim()}
              </label>
              <div className="col-span-2">
                {renderPropertyInput(key, editedProperties[key])}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSimulationResults = () => {
    if (!history || !results || !selectedFeatureId) return null;
    const isNode = ["junction", "tank", "reservoir"].includes(properties.type);
    const isLink = ["pipe", "pump", "valve"].includes(properties.type);
    let currentVal = 0,
      label = "",
      unit = "",
      color = "",
      dataType: "pressure" | "flow" = "pressure";

    if (isNode) {
      const res = results.nodes[selectedFeatureId];
      if (!res) return null;
      currentVal = res.pressure;
      label = "Pressure";
      unit = "psi";
      color = "#0ea5e9";
      dataType = "pressure";
    } else if (isLink) {
      const res = results.links[selectedFeatureId];
      if (!res) return null;
      currentVal = res.flow;
      label = "Flow";
      unit = "GPM";
      color = "#8b5cf6";
      dataType = "flow";
    } else return null;

    return (
      <div className="mt-6 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
        <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Activity className="w-3 h-3" /> Simulation Results
        </h4>
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-gray-500">{label}</span>
            <span className="text-lg font-bold font-mono text-gray-900 dark:text-white">
              {currentVal.toFixed(2)}{" "}
              <span className="text-xs font-normal text-gray-400">{unit}</span>
            </span>
          </div>
          <ResultChart
            featureId={selectedFeatureId}
            type={isNode ? "node" : "link"}
            history={history as any}
            dataType={dataType}
            color={color}
            unit={unit}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="absolute top-4 right-4 w-80 max-h-[calc(100vh-7rem)] overflow-hidden flex flex-col z-20 rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 bg-white dark:bg-gray-900/90 backdrop-blur-md animate-in slide-in-from-right-4 duration-300">
      {/* HEADER */}
      <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 shadow-sm">
            <Settings2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              {componentConfig?.name || properties.type}
            </h3>
            <p className="text-[10px] text-gray-500 font-mono opacity-80">
              {selectedFeatureId || "Unknown"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400 hover:text-red-500 transition-colors"
            title="Zoom"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            onClick={handleZoomToFeature}
            className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
            title="Zoom"
          >
            <Focus className="size-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
        <div className="mb-6">
          <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
            <Info className="w-3 h-3" /> General
          </h4>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="col-span-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                Label
              </label>
              <div className="col-span-2">
                <input
                  type="text"
                  value={editedProperties.label || ""}
                  onChange={(e) =>
                    handlePropertyChange("label", e.target.value)
                  }
                  className="w-full px-3 py-1.5 text-xs bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white transition-all font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {connectionInfo && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2 px-1">
              <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="w-3 h-3" /> Topology
              </h4>
              {connectionInfo.type === "link" && (
                <button
                  onClick={handleReverseFlow}
                  className="flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <ArrowRightLeft className="w-3 h-3" /> Reverse
                </button>
              )}
            </div>

            <div className="bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 rounded-xl p-3 text-xs">
              {connectionInfo.type === "node" ? (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500">Connections</span>
                    <span className="font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 rounded">
                      {connectionInfo.count}
                    </span>
                  </div>
                  {connectionInfo.connections &&
                    connectionInfo?.connections?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {connectionInfo?.connections?.map((id) => (
                          <span
                            key={id}
                            className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-[10px] font-mono text-gray-600 dark:text-gray-300 shadow-sm"
                          >
                            {id}
                          </span>
                        ))}
                      </div>
                    )}
                </>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Start Node</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-700 dark:text-gray-200 shadow-sm">
                      {connectionInfo.startNode || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">End Node</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-700 dark:text-gray-200 shadow-sm">
                      {connectionInfo.endNode || "N/A"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {renderPropertyGroup("Hydraulics", hydraulicProperties)}
        {renderPropertyGroup("Operations", operationalProperties)}
        {renderPropertyGroup("Basics", basicProperties)}
        {renderSimulationResults()}
      </div>

      {/* FOOTER */}
      <div className="px-4 py-3 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex gap-2 shrink-0">
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          size="sm"
          className={cn(
            "flex-1 gap-2 shadow-sm transition-all",
            hasChanges
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
              : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
          )}
        >
          <Save className="w-3.5 h-3.5" />
          {hasChanges ? "Save Changes" : "Saved"}
        </Button>
      </div>
    </div>
  );
}
