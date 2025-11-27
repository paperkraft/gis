"use client";

import { useState, useMemo, useEffect } from "react";
import { useNetworkStore } from "@/store/networkStore";
import {
  Table,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  Edit2,
  Save,
  XCircle,
  Maximize2,
  Minimize2,
  Check,
} from "lucide-react";
import { Feature } from "ol";
import { COMPONENT_TYPES } from "@/constants/networkComponents";

interface AttributeTableProps {
  isOpen: boolean;
  onClose: () => void;
  vectorSource?: any;
}

interface EditingCell {
  featureId: string;
  column: string;
  value: any;
}

export function AttributeTable({
  isOpen,
  onClose,
  vectorSource,
}: AttributeTableProps) {
  const { features, selectFeature, selectedFeatureId, updateFeature } =
    useNetworkStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<string>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isMaximized, setIsMaximized] = useState(false);

  // Editing state
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [editingRow, setEditingRow] = useState<string | null>(null);

  // Get all feature types
  const featureTypes = useMemo(() => {
    const types = new Set<string>();

    if (vectorSource) {
      vectorSource.getFeatures().forEach((feature: Feature) => {
        const type = feature.get("type");
        if (
          type &&
          !feature.get("isPreview") &&
          !feature.get("isVertexMarker")
        ) {
          types.add(type);
        }
      });
    }

    return Array.from(types);
  }, [vectorSource, features]);

  // Get features from vector source
  const allFeatures = useMemo(() => {
    if (!vectorSource) return [];

    return vectorSource.getFeatures().filter(
      (f: Feature) =>
        !f.get("isPreview") &&
        !f.get("isVertexMarker") &&
        !f.get("isVisualLink") // Add this
    );
  }, [vectorSource, features]);

  // Filter and sort features
  const filteredFeatures = useMemo(() => {
    let result = allFeatures;

    if (selectedType !== "all") {
      result = result.filter((f: Feature) => f.get("type") === selectedType);
    }

    if (searchQuery) {
      result = result.filter((f: Feature) => {
        const props = f.getProperties();
        return Object.values(props).some((value) =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    result.sort((a: Feature, b: Feature) => {
      let aValue = a.get(sortColumn) || a.getId() || "";
      let bValue = b.get(sortColumn) || b.getId() || "";

      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [allFeatures, selectedType, searchQuery, sortColumn, sortDirection]);

  // Get columns based on feature type
  const columns = useMemo(() => {
    if (filteredFeatures.length === 0) return [];

    const firstFeature = filteredFeatures[0];
    const type = firstFeature.get("type");

    const cols = ["id", "type", "label"];

    if (type === "pipe") {
      cols.push("length", "diameter", "roughness", "startNodeId", "endNodeId");
    } else if (type === "junction") {
      cols.push("elevation", "demand", "pattern");
    } else if (type === "tank") {
      cols.push("elevation", "initLevel", "minLevel", "maxLevel", "diameter");
    } else if (type === "reservoir") {
      cols.push("head", "pattern");
    } else if (type === "pump") {
      cols.push("power", "startNodeId", "endNodeId");
    } else if (type === "valve") {
      cols.push("diameter", "setting", "startNodeId", "endNodeId");
    }

    return cols;
  }, [filteredFeatures]);

  // Editable columns (exclude id, type, geometry, etc.)
  const isColumnEditable = (column: string): boolean => {
    const nonEditableColumns = [
      "id",
      "type",
      "geometry",
      "isNew",
      "connectedLinks",
    ];
    return !nonEditableColumns.includes(column);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleRowClick = (feature: Feature) => {
    selectFeature(feature.getId() as string);
  };

  const handleCellDoubleClick = (
    feature: Feature,
    column: string,
    currentValue: any
  ) => {
    if (!isColumnEditable(column)) return;

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✏️ Starting cell edit");
    console.log("  Feature:", feature.getId());
    console.log("  Column:", column);
    console.log("  Current value:", currentValue);

    setEditingCell({
      featureId: feature.getId() as string,
      column,
      value: currentValue,
    });
    setEditValue(
      currentValue !== undefined && currentValue !== null
        ? String(currentValue)
        : ""
    );
    setEditingRow(feature.getId() as string);
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("💾 Saving edit");
    console.log("  Feature:", editingCell.featureId);
    console.log("  Column:", editingCell.column);
    console.log("  Old value:", editingCell.value);
    console.log("  New value:", editValue);

    // Find the feature
    const feature = allFeatures.find(
      (f: Feature) => f.getId() === editingCell.featureId
    );

    if (!feature) {
      console.error("❌ Feature not found");
      handleCancelEdit();
      return;
    }

    // Convert value to appropriate type
    let finalValue: any = editValue;

    // Try to parse as number for numeric fields
    const numericFields = [
      "elevation",
      "demand",
      "diameter",
      "length",
      "roughness",
      "initLevel",
      "minLevel",
      "maxLevel",
      "head",
      "power",
      "setting",
    ];

    if (numericFields.includes(editingCell.column)) {
      const parsed = parseFloat(editValue);
      if (!isNaN(parsed)) {
        finalValue = parsed;
      }
    }

    // Update feature
    feature.set(editingCell.column, finalValue);

    // Update in store - pass id and changed property only (store expects (id, properties))
    updateFeature(feature.getId() as string, {
      [editingCell.column]: finalValue,
    });

    // Trigger vector source change event
    if (vectorSource) {
      vectorSource.changed();
    }

    console.log("  ✅ Feature updated");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    handleCancelEdit();
  };

  const handleCancelEdit = () => {
    console.log("🚫 Canceling edit");
    setEditingCell(null);
    setEditValue("");
    setEditingRow(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleExportCSV = () => {
    if (filteredFeatures.length === 0) return;

    const headers = columns.join(",");
    const rows = filteredFeatures.map((feature: Feature) => {
      return columns
        .map((col) => {
          if (col === "id") return feature.getId();
          const value = feature.get(col);
          return value !== undefined ? `"${value}"` : "";
        })
        .join(",");
    });

    const csv = [headers, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `network_${selectedType}_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    console.log("✅ CSV exported");
  };

  if (!isOpen) return null;

  return (
    <div
      className={`
        absolute bg-white shadow-2xl border-t border-gray-200 z-30
        transition-all duration-300
        ${isMaximized ? "inset-0" : "bottom-0 left-0 right-0 h-80"}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-linear-to-r from-blue-500 to-blue-600">
        <div className="flex items-center gap-3">
          <Table className="w-5 h-5 text-white" />
          <h3 className="text-lg font-semibold text-white">Attribute Table</h3>
          <span className="text-sm text-blue-100">
            {filteredFeatures.length}{" "}
            {selectedType === "all" ? "features" : selectedType}
          </span>
          {editingRow && (
            <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full font-medium">
              Editing
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4 text-white" />
            ) : (
              <Maximize2 className="w-4 h-4 text-white" />
            )}
          </button>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in table..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">All Types</option>
            {featureTypes.map((type) => (
              <option key={type} value={type}>
                {COMPONENT_TYPES[type]?.name || type}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
          title="Export to CSV"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>

        <div className="text-xs text-gray-500 px-2">
          💡 Double-click cell to edit
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-auto"
        style={{
          height: isMaximized ? "calc(100% - 140px)" : "calc(100% - 140px)",
        }}
      >
        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  onClick={() => handleSort(column)}
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors border-b border-gray-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="capitalize">{column}</span>
                    {isColumnEditable(column) && (
                      <Edit2 className="w-3 h-3 text-gray-400" />
                    )}
                    {sortColumn === column && (
                      <>
                        {sortDirection === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredFeatures.map((feature: Feature, index: number) => {
              const featureId = feature.getId() as string;
              const isSelected = featureId === selectedFeatureId;
              const isRowEditing = editingRow === featureId;

              return (
                <tr
                  key={featureId}
                  onClick={() => handleRowClick(feature)}
                  className={`
                    border-b border-gray-200 cursor-pointer transition-colors
                    ${
                      isSelected
                        ? "bg-blue-50 hover:bg-blue-100"
                        : isRowEditing
                        ? "bg-yellow-50"
                        : index % 2 === 0
                        ? "bg-white hover:bg-gray-50"
                        : "bg-gray-50 hover:bg-gray-100"
                    }
                  `}
                >
                  {columns.map((column) => {
                    let value;
                    if (column === "id") {
                      value = featureId;
                    } else {
                      value = feature.get(column);
                    }

                    const isEditing =
                      editingCell?.featureId === featureId &&
                      editingCell?.column === column;
                    const editable = isColumnEditable(column);

                    let displayValue =
                      value !== undefined && value !== null
                        ? String(value)
                        : "-";
                    if (displayValue.length > 50) {
                      displayValue = displayValue.substring(0, 47) + "...";
                    }

                    return (
                      <td
                        key={column}
                        className={`px-4 py-3 text-gray-700 ${
                          editable ? "hover:bg-blue-50" : ""
                        }`}
                        title={
                          editable ? "Double-click to edit" : String(value)
                        }
                        onDoubleClick={() =>
                          editable &&
                          handleCellDoubleClick(feature, column, value)
                        }
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              autoFocus
                              className="flex-1 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              title="Save (Enter)"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                              title="Cancel (Esc)"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className={editable ? "cursor-text" : ""}>
                            {displayValue}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredFeatures.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Table className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">No features found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
        Showing {filteredFeatures.length} of {allFeatures.length} features
        {searchQuery && ` (filtered by "${searchQuery}")`}
      </div>
    </div>
  );
}
