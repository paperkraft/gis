"use client";

import { useState } from "react";
import {
  Filter,
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useNetworkStore } from "@/store/networkStore";
import { useUIStore } from "@/store/uiStore";
import { useMapStore } from "@/store/mapStore";
import { ModalDialog } from "../ui/modal-dialog";

type Operator =
  | "equals"
  | "contains"
  | "greater"
  | "less"
  | "greaterEq"
  | "lessEq"
  | "neq";

const FIELDS = [
  { value: "id", label: "ID", type: "string" },
  { value: "type", label: "Type (pipe, junction...)", type: "string" },
  { value: "diameter", label: "Diameter", type: "number" },
  { value: "roughness", label: "Roughness", type: "number" },
  { value: "elevation", label: "Elevation", type: "number" },
  { value: "length", label: "Length", type: "number" },
  { value: "tag", label: "Tag", type: "string" },
  { value: "status", label: "Status", type: "string" },
];

const OPERATORS: { value: Operator; label: string }[] = [
  { value: "equals", label: "Equals (=)" },
  { value: "neq", label: "Not Equal (!=)" },
  { value: "contains", label: "Contains" },
  { value: "greater", label: "Greater Than (>)" },
  { value: "less", label: "Less Than (<)" },
  { value: "greaterEq", label: "Greater or Equal (>=)" },
  { value: "lessEq", label: "Less or Equal (<=)" },
];

export function QueryBuilderModal() {
  const { queryBuilderModalOpen, setQueryBuilderModalOpen } = useUIStore();
  const { features, selectFeatures } = useNetworkStore();
  const map = useMapStore((state) => state.map);

  const [selectedField, setSelectedField] = useState<string>("diameter");
  const [selectedOperator, setSelectedOperator] = useState<Operator>("greater");
  const [value, setValue] = useState<string>("");
  const [matchCount, setMatchCount] = useState<number | null>(null);

  const handleRunQuery = (previewOnly: boolean = false) => {
    const allFeatures = Array.from(features.values());

    const matches = allFeatures.filter((f) => {
      const props = f.getProperties();

      // Get raw value (handle top-level ID specially)
      let itemValue = selectedField === "id" ? f.getId() : props[selectedField];

      // Normalize numbers if field expects number
      const fieldConfig = FIELDS.find((fl) => fl.value === selectedField);
      if (fieldConfig?.type === "number") {
        itemValue = parseFloat(itemValue);
        const queryValue = parseFloat(value);
        if (isNaN(itemValue)) return false;

        switch (selectedOperator) {
          case "equals":
            return itemValue === queryValue;
          case "neq":
            return itemValue !== queryValue;
          case "greater":
            return itemValue > queryValue;
          case "less":
            return itemValue < queryValue;
          case "greaterEq":
            return itemValue >= queryValue;
          case "lessEq":
            return itemValue <= queryValue;
          default:
            return false;
        }
      } else {
        // String comparison
        const sItem = String(itemValue || "").toLowerCase();
        const sQuery = String(value).toLowerCase();

        switch (selectedOperator) {
          case "equals":
            return sItem === sQuery;
          case "neq":
            return sItem !== sQuery;
          case "contains":
            return sItem.includes(sQuery);
          default:
            return false;
        }
      }
    });

    setMatchCount(matches.length);

    if (!previewOnly && matches.length > 0) {
      const ids = matches.map((f) => f.getId() as string);
      selectFeatures(ids); // Select in store

      // Zoom to extent of all selected
      if (map) {
        const extent = matches[0].getGeometry()?.getExtent().slice();
        if (extent) {
          matches.forEach((f) => {
            const geom = f.getGeometry();
            if (geom) {
              const e = geom.getExtent();
              import("ol/extent").then(({ extend }) => extend(extent, e));
            }
          });
          map.getView().fit(extent, {
            padding: [100, 100, 100, 100],
            duration: 800,
            maxZoom: 18,
          });
        }
      }
      setQueryBuilderModalOpen(false);
    }
  };

  return (
    <ModalDialog
      isOpen={queryBuilderModalOpen}
      onClose={() => setQueryBuilderModalOpen(!queryBuilderModalOpen)}
      title="Select by Attribute"
      icon={Filter}
    >
      <div className="space-y-4 py-2">
        <div className="grid grid-cols-1 gap-3">
          {/* Field Selection */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase">
              Field
            </label>
            <select
              value={selectedField}
              onChange={(e) => {
                setSelectedField(e.target.value);
                setMatchCount(null);
              }}
              className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm"
            >
              {FIELDS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Operator Selection */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase">
              Operator
            </label>
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value as Operator)}
              className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          {/* Value Input */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase">
              Value
            </label>
            <input
              type={
                FIELDS.find((f) => f.value === selectedField)?.type === "number"
                  ? "number"
                  : "text"
              }
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setMatchCount(null);
              }}
              placeholder="Enter value..."
              className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Result Preview */}
        {matchCount !== null && (
          <div
            className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
              matchCount > 0
                ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {matchCount > 0 ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>Found {matchCount} features matching criteria.</span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => handleRunQuery(true)}
          >
            <Search className="w-4 h-4 mr-2" /> Test Query
          </Button>
          <Button
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => handleRunQuery(false)}
            disabled={matchCount === 0}
          >
            Select Features
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}
