"use client";
import { Info, Link, Mountain, RefreshCw, Save, Trash2, X } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { COMPONENT_TYPES } from "@/constants/networkComponents";
import { useNetworkStore } from "@/store/networkStore";
import { NetworkFeatureProperties } from "@/types/network";
import { ElevationService } from "@/lib/services/ElevationService";
import { Point } from "ol/geom";

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
  const [isFetchingElevation, setIsFetchingElevation] = useState(false);
  const [editedProperties, setEditedProperties] =
    useState<NetworkFeatureProperties>(properties);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditedProperties(properties);
    setHasChanges(false);
  }, [properties]);

  const handleAutoElevate = async () => {
    if (!selectedFeature) return;

    setIsFetchingElevation(true);
    try {
      const geometry = selectedFeature.getGeometry();
      if (geometry instanceof Point) {
        const elevation = await ElevationService.getElevation(
          geometry.getCoordinates()
        );
        if (elevation !== null) {
          handlePropertyChange("elevation", elevation);
        } else {
          alert("Could not fetch elevation data.");
        }
      }
    } catch (e) {
      console.error(e);
      alert("Error fetching elevation.");
    } finally {
      setIsFetchingElevation(false);
    }
  };

  const handlePropertyChange = (key: string, value: any) => {
    setEditedProperties((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (selectedFeatureId) {
      window.dispatchEvent(new CustomEvent("takeSnapshot"));
      updateFeature(selectedFeatureId, editedProperties);
      setHasChanges(false);
      console.log("Properties saved successfully");
    }
  };

  const handleDelete = () => {
    // Trigger the delete request callback instead of direct deletion
    if (onDeleteRequest) {
      onDeleteRequest();
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (!confirmClose) return;
    }
    useNetworkStore.getState().selectFeature(null);
  };

  // Get connected features info
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

  // Group properties by category
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
    const isNumeric = typeof value === "number";
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

    // Special render for Elevation
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
            className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-600 dark:text-gray-300 transition-colors"
            title="Auto-fetch elevation"
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
        type={isNumeric ? "number" : "text"}
        value={editedProperties[key] ?? ""}
        onChange={(e) =>
          handlePropertyChange(
            key,
            isNumeric ? parseFloat(e.target.value) || 0 : e.target.value
          )
        }
        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        step={isNumeric ? "0.1" : undefined}
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

  return (
    <div className="absolute top-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-10 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
      {/* Header */}
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
        <button
          onClick={handleClose}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Close"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Feature Information */}
        <div className="property-group">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Feature Information
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
                placeholder="Enter label..."
              />
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md text-xs space-y-1">
              <div className="flex justify-between py-1">
                <span className="text-gray-600 dark:text-gray-400">Type:</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {properties.type}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600 dark:text-gray-400">
                  Status:
                </span>
                <span
                  className={`font-medium ${
                    properties.isNew
                      ? "text-green-600 dark:text-green-400"
                      : "text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {properties.isNew ? "New" : "Existing"}
                </span>
              </div>
              {properties.autoCreated && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-600 dark:text-gray-400">
                    Created:
                  </span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    Auto-generated
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Topology Information */}
        {connectionInfo && (
          <div className="property-group">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-2">
              <Link className="w-4 h-4" />
              Topology
            </h4>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md space-y-2 text-sm">
              {connectionInfo.type === "node" && (
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
              )}
              {connectionInfo.type === "link" && (
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

        {/* Basic Properties */}
        {renderPropertyGroup("Basic Properties", basicProperties)}

        {/* Hydraulic Properties */}
        {renderPropertyGroup("Hydraulic Properties", hydraulicProperties)}

        {/* Operational Properties */}
        {renderPropertyGroup("Operational Properties", operationalProperties)}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex gap-2 shrink-0">
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          className="flex-1 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{hasChanges ? "Save Changes" : "Saved"}</span>
        </Button>
        <Button
          onClick={handleDelete}
          variant="outline"
          className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center px-3"
          title="Delete feature"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
