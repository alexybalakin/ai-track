"use client";

import { useState } from "react";
import { useUpdateColumn, useDeleteColumn } from "@/hooks/useColumns";
import toast from "react-hot-toast";
import type { BoardColumn } from "@/types";

const PRESET_COLORS = [
  "#64748b", // slate
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f59e0b", // amber
  "#22c55e", // green
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
];

export function ColumnSettings({
  column,
  boardId,
  onClose,
}: {
  column: BoardColumn;
  boardId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(column.title);
  const [color, setColor] = useState(column.color);
  const [aiEnabled, setAiEnabled] = useState(column.aiEnabled);
  const updateColumn = useUpdateColumn(boardId);
  const deleteColumn = useDeleteColumn(boardId);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      await updateColumn.mutateAsync({
        columnId: column.id,
        title: title.trim(),
        color,
        aiEnabled,
      });
      toast.success("Column updated");
      onClose();
    } catch {
      toast.error("Failed to update column");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this column? Tasks must be moved first.")) return;

    try {
      await deleteColumn.mutateAsync(column.id);
      toast.success("Column deleted");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete column"
      );
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Column Settings</h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Column name"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-blue-500 scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-slate-200"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          {/* AI Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-medium text-slate-700">
                AI Enabled
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                AI will automatically process tasks in this column
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                aiEnabled ? "bg-blue-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  aiEnabled ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {/* Preview */}
          <div className="bg-slate-50 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 block mb-1">
              Preview
            </span>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-lg"
                style={{
                  backgroundColor: `color-mix(in srgb, ${color} 15%, white)`,
                  color,
                }}
              >
                {title || "Untitled"}
              </span>
              {aiEnabled && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${color} 15%, white)`,
                    color,
                  }}
                >
                  AI
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleDelete}
            disabled={deleteColumn.isPending}
            className="text-xs text-red-500 hover:text-red-700 transition"
          >
            Delete column
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateColumn.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {updateColumn.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
