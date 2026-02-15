"use client";

import { useBoards, useCreateBoard } from "@/hooks/useBoards";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BoardsPage() {
  const { data: boards, isLoading } = useBoards();
  const createBoard = useCreateBoard();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    await createBoard.mutateAsync({ title, description });
    setTitle("");
    setDescription("");
    setShowCreate(false);
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-xl w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Your Boards</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          + New Board
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Create Board</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Board name"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="What's this board for?"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition"
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
        </div>
      )}

      {boards?.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-slate-600 mb-1">
            No boards yet
          </h2>
          <p className="text-sm text-slate-400">
            Create your first board to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards?.map(
            (board: {
              id: string;
              title: string;
              description?: string;
              createdAt: string;
              _count: { tasks: number; members: number };
            }) => (
              <button
                key={board.id}
                onClick={() => router.push(`/board/${board.id}`)}
                className="bg-white rounded-2xl border border-slate-100 p-6 text-left hover:shadow-md hover:border-blue-100 transition group"
              >
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition mb-1">
                  {board.title}
                </h3>
                {board.description && (
                  <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                    {board.description}
                  </p>
                )}
                <div className="flex gap-4 text-xs text-slate-400">
                  <span>{board._count.tasks} tasks</span>
                  <span>{board._count.members} members</span>
                </div>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
