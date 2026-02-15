"use client";

import { useBoard } from "@/hooks/useBoards";
import { KanbanBoard } from "@/components/board/kanban-board";
import Link from "next/link";
import { use } from "react";

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: board, isLoading, error } = useBoard(id);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-slate-200 rounded-xl" />
          <div className="h-4 bg-slate-200 rounded w-32" />
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-slate-600 mb-2">
            Board not found
          </h2>
          <Link
            href="/boards"
            className="text-sm text-blue-600 hover:underline"
          >
            Back to boards
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <Link
            href="/boards"
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">
            {board.title}
          </h1>
          {board.description && (
            <span className="text-sm text-slate-400 hidden sm:inline">
              — {board.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {board.members?.map(
            (m: {
              id: string;
              user: { id: string; name?: string; email: string };
            }) => (
              <div
                key={m.id}
                className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium"
                title={m.user.name || m.user.email}
              >
                {(m.user.name || m.user.email).charAt(0).toUpperCase()}
              </div>
            )
          )}
        </div>
      </div>
      <KanbanBoard board={board} />
    </div>
  );
}
