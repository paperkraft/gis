"use client";
import React from "react";
import { AlertTriangle, X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  featureName?: string;
  featureType?: string;
  featureId?: string;
  count?: number;
  cascadeInfo?: {
    willCascade: boolean;
    message: string;
  };
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  featureName,
  featureType,
  featureId,
  count = 1,
  cascadeInfo,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  const isMulti = count > 1;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10000 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>
                {isMulti ? "Delete Multiple Items" : "Confirm Deletion"}
              </span>
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {isMulti ? (
            <div className="flex items-start gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Layers className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  Are you sure you want to delete <strong>{count}</strong>{" "}
                  selected items?
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  This will remove all selected components from the network.
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Are you sure you want to delete <strong>{featureType}</strong> "
                <strong>{featureName}</strong>" (ID:{" "}
                <code className="text-sm bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {featureId}
                </code>
                )?
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This action cannot be undone.
              </p>
            </>
          )}

          {/* Cascade Warning */}
          {cascadeInfo?.willCascade && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                ⚠️ Warning: Cascade Deletion
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {cascadeInfo.message}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end rounded-b-xl">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete {isMulti ? `(${count})` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
