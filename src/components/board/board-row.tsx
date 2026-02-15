"use client";

import { useBoard } from "@/hooks/useBoards";
import { KanbanBoard } from "./kanban-board";
import Link from "next/link";

interface BoardMeta {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  _count: { tasks: number; members: number; columns?: number };
}

// Header for a board row
function BoardRowHeader({
  board,
  isExpanded,
  onToggle,
}: {
  board: BoardMeta;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50/80 transition select-none"
    >
      {/* Chevron */}
      <svg
        className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>

      {/* Title & description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900 truncate">
            {board.title}
          </h3>
          {board.description && (
            <span className="text-sm text-slate-400 truncate hidden sm:inline">
              — {board.description}
            </span>
          )}
        </div>
      </div>

      {/* Counters */}
      <div className="flex items-center gap-3 text-xs text-slate-400 flex-shrink-0">
        <span>{board._count.tasks} tasks</span>
        <span>{board._count.members} members</span>
      </div>

      {/* Fullscreen link */}
      <Link
        href={`/board/${board.id}`}
        onClick={(e) => e.stopPropagation()}
        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition flex-shrink-0"
        title="Open fullscreen"
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
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </Link>
    </div>
  );
}

// Content that loads board data lazily
function BoardRowContent({ boardId }: { boardId: string }) {
  const { data: board, isLoading, error } = useBoard(boardId);

  if (isLoading) {
    return (
      <div className="px-5 pb-5">
        <div className="h-[420px] bg-slate-50 rounded-xl animate-pulse flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 bg-slate-200 rounded-lg" />
            <div className="h-3 bg-slate-200 rounded w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="px-5 pb-5">
        <div className="h-32 bg-red-50 rounded-xl flex items-center justify-center text-sm text-red-500">
          Failed to load board
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-100">
      <div className="h-[480px] overflow-hidden">
        <KanbanBoard board={board} />
      </div>
    </div>
  );
}

// Main BoardRow component
export function BoardRow({
  board,
  isExpanded,
  onToggle,
}: {
  board: BoardMeta;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <BoardRowHeader
        board={board}
        isExpanded={isExpanded}
        onToggle={onToggle}
      />
      {isExpanded && <BoardRowContent boardId={board.id} />}
    </div>
  );
}
