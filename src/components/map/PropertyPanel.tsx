"use client";
import {
  Info,
  Link,
  Save,
  Trash2,
  X,
  RefreshCw,
  Mountain,
  Activity,
  FocusIcon,
  ArrowRightLeft,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { LineString, Point } from "ol/geom";
import { ElevationService } from "@/lib/services/ElevationService";
import { Button } from "@/components/ui/button";
import { COMPONENT_TYPES } from "@/constants/networkComponents";
import { useNetworkStore } from "@/store/networkStore";
import { useSimulationStore } from "@/store/simulationStore";
import { NetworkFeatureProperties } from "@/types/network";
import { ResultChart } from "@/components/simulation/ResultChart";
import { useMapStore } from "@/store/mapStore";

interface PropertyPanelProps {
  properties: NetworkFeatureProperties;
  onDeleteRequest?: () => void;
}

export function PropertyPanel({
  properties,
  onDeleteRequest,
}: PropertyPanelProps) {
  const {
    selectedFeatureId,
    selectedFeature,
    updateFeature,
    patterns,
    curves,
  } = useNetworkStore();
  const { history, results } = useSimulationStore();
  const map = useMapStore((state) => state.map);

  const [editedProperties, setEditedProperties] =
    useState<NetworkFeatureProperties>(properties);
  const [hasChanges, setHasChanges] = useState(false);
  const [isFetchingElevation, setIsFetchingElevation] = useState(false);

  // Sync state when selection changes AND polyfill missing status
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
        padding: [100, 100, 100, 100], // Padding to keep context
        maxZoom: 19, // Prevent zooming too close for points
        duration: 600, // Smooth animation
      });
    }
  };

  const handleReverseFlow = () => {
    if (!selectedFeature || !selectedFeatureId) return;

    const geom = selectedFeature.getGeometry();
    if (!(geom instanceof LineString)) return;

    window.dispatchEvent(new CustomEvent("takeSnapshot"));

    // 1. Reverse Geometry Coordinates (Visual)
    const coords = geom.getCoordinates();
    geom.setCoordinates(coords.reverse());

    // 2. Swap Start/End Node IDs (Logical)
    const newStart = editedProperties.endNodeId;
    const newEnd = editedProperties.startNodeId;

    const updates = {
      startNodeId: newStart,
      endNodeId: newEnd,
    };

    // 3. Update Store & Local State
    updateFeature(selectedFeatureId, updates);
    setEditedProperties((prev) => ({ ...prev, ...updates }));

    // Force map refresh if needed (usually automatic with geometry change)
    selectedFeature.changed();
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
        startNode: properties.startNodeId,
        endNode: properties.endNodeId,
      };
    }
    return null;
  };

  const connectionInfo = getConnectedInfo();
  const componentConfig = COMPONENT_TYPES[properties.type];

  // Define Property Groups
  const basicProperties = ["elevation", "demand", "pattern"];
  const hydraulicProperties = [
    "diameter",
    "length",
    "roughness",
    "capacity",
    "head",
    "power",
    "curve",
  ];
  const operationalProperties = [
    "status",
    "valveType",
    "setting",
    "initLevel",
    "minLevel",
    "maxLevel",
  ];

  const renderPropertyInput = (key: string, value: any) => {
    const isBoolean = typeof value === "boolean";
    const isStatus = key === "status";

    if (isBoolean) {
      return (
        <input
          type="checkbox"
          checked={editedProperties[key]}
          onChange={(e) => handlePropertyChange(key, e.target.checked)}
          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
        />
      );
    }

    if (isStatus) {
      return (
        <select
          value={editedProperties[key] as string}
          onChange={(e) => handlePropertyChange(key, e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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

    if (key === "pattern") {
      return (
        <select
          value={value || ""}
          onChange={(e) => handlePropertyChange(key, e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
        >
          <option value="">None</option>
          {patterns?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id} - {p.description || "Pattern"}
            </option>
          ))}
        </select>
      );
    }

    // 3. CURVE DROPDOWN (Pumps)
    // Assuming 'curve' property or sometimes mapped to 'power' field in UI if mode matches
    if (key === "curve" || (key === "power" && properties.type === "pump")) {
      // Logic: If user wants to switch between Power (constant) and Curve, we might need a toggle.
      // For now, let's treat "power" as a generic field that can take a Curve ID string OR a number.
      // EPANET allows both in the same field "Parameters".

      const isNumber = !isNaN(parseFloat(value));

      return (
        <div className="flex flex-col gap-1">
          <input
            type="text"
            value={value}
            onChange={(e) => handlePropertyChange(key, e.target.value)}
            placeholder="Value or Curve ID"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md"
          />
          <select
            onChange={(e) => handlePropertyChange(key, e.target.value)}
            className="w-full px-3 py-1 text-xs border border-gray-300 rounded-md bg-gray-50"
            value="" // Always reset
          >
            <option value="" disabled>
              Select Curve...
            </option>
            {curves
              ?.filter((c) => c.type === "PUMP")
              ?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} - {c.description}
                </option>
              ))}
          </select>
        </div>
      );
    }

    // 4. VALVE TYPE
    if (key === "valveType") {
      return (
        <select
          value={value}
          onChange={(e) => handlePropertyChange(key, e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
        >
          <option value="PRV">PRV (Pressure Reducing)</option>
          <option value="PSV">PSV (Pressure Sustaining)</option>
          <option value="PBV">PBV (Pressure Breaker)</option>
          <option value="FCV">FCV (Flow Control)</option>
          <option value="TCV">TCV (Throttle Control)</option>
          <option value="GPV">GPV (General Purpose)</option>
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
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            step="0.1"
          />
          <button
            onClick={handleAutoElevate}
            disabled={isFetchingElevation}
            className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            {isFetchingElevation ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Mountain className="w-4 h-4" />
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
        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
      <div className="property-group">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
          {title}
        </h4>
        <div className="space-y-3">
          {groupProperties.map((key) => (
            <div key={key} className="property-row">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </label>
              {renderPropertyInput(key, editedProperties[key])}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Simulation Results (Charts)
  const renderSimulationResults = () => {
    if (!history || !results || !selectedFeatureId) return null;

    const isNode = ["junction", "tank", "reservoir"].includes(properties.type);
    const isLink = ["pipe", "pump", "valve"].includes(properties.type);

    let currentVal = 0;
    let label = "";
    let unit = "";
    let color = "";
    let dataType: "pressure" | "flow" = "pressure";

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
    } else {
      return null;
    }

    return (
      <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Simulation Results
        </h4>
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {label} (Current)
          </span>
          <span className="text-xl font-bold font-mono text-gray-900 dark:text-white">
            {currentVal.toFixed(2)}{" "}
            <span className="text-sm font-normal text-gray-500">{unit}</span>
          </span>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-2">
          <ResultChart
            featureId={selectedFeatureId}
            type={isNode ? "node" : "link"}
            history={history}
            dataType={dataType}
            color={color}
            unit={unit}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="absolute top-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-10 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${componentConfig?.color}20` }}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: componentConfig?.color }}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {componentConfig?.name || properties.type}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ID: {selectedFeatureId || "Unknown"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            className="p-1.5 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete Feature"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomToFeature}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Zoom to Feature"
          >
            <FocusIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Close Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="property-group">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" /> Feature Information
          </h4>
          <div className="space-y-3">
            <div className="property-row">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Label
              </label>
              <input
                type="text"
                value={editedProperties.label || ""}
                onChange={(e) => handlePropertyChange("label", e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {connectionInfo && (
          <div className="property-group">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-2">
                <Link className="w-4 h-4" /> Topology
              </h4>

              {/* REVERSE BUTTON for Links */}
              {connectionInfo.type === "link" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReverseFlow}
                  className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  title="Reverse Flow Direction"
                >
                  <ArrowRightLeft className="w-3 h-3 mr-1" /> Reverse
                </Button>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md space-y-2 text-sm">
              {connectionInfo.type === "node" ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Connected Pipes:
                    </span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {connectionInfo.count}
                    </span>
                  </div>
                  {connectionInfo.connections &&
                    connectionInfo.connections.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Connected to:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {connectionInfo.connections.map((linkId: string) => (
                            <span
                              key={linkId}
                              className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs font-mono"
                            >
                              {linkId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">
                      Start Node:
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                      {connectionInfo.startNode || "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">
                      End Node:
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                      {connectionInfo.endNode || "Not set"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {renderPropertyGroup("Basic Properties", basicProperties)}
        {renderPropertyGroup("Hydraulic Properties", hydraulicProperties)}
        {renderPropertyGroup("Operational Properties", operationalProperties)}
        {renderSimulationResults()}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex gap-2 shrink-0">
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          className="flex-1 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />{" "}
          <span>{hasChanges ? "Save Changes" : "Saved"}</span>
        </Button>
      </div>
    </div>
  );
}
