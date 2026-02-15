"use client";

import { useState } from "react";
import { useCreateBoard } from "@/hooks/useBoards";
import toast from "react-hot-toast";

export function CreateBoardInline({
  onCreated,
}: {
  onCreated?: (boardId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const createBoard = useCreateBoard();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const newBoard = await createBoard.mutateAsync({ title, description });
      setTitle("");
      setDescription("");
      setIsOpen(false);
      toast.success("Project created");
      onCreated?.(newBoard.id);
    } catch {
      toast.error("Failed to create project");
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition text-slate-400 hover:text-blue-500 flex items-center justify-center gap-1.5"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span className="text-xs font-medium">New Project</span>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <h3 className="font-medium text-sm text-slate-900 mb-2">New Project</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Project name"
          autoFocus
          required
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
          rows={2}
          placeholder="Description (optional)"
        />
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setTitle("");
              setDescription("");
            }}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createBoard.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {createBoard.isPending ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
