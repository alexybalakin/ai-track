"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useBoard } from "@/hooks/useBoards";
import { KanbanBoard } from "./kanban-board";
import Link from "next/link";

const HEIGHT_STORAGE_KEY = "ai-track:board-heights";

function getBoardHeight(boardId: string): number {
  if (typeof window === "undefined") return 480;
  try {
    const stored = localStorage.getItem(HEIGHT_STORAGE_KEY);
    if (stored) {
      const heights = JSON.parse(stored);
      if (heights[boardId]) return heights[boardId];
    }
  } catch {}
  return 480;
}

function setBoardHeight(boardId: string, height: number) {
  try {
    const stored = localStorage.getItem(HEIGHT_STORAGE_KEY);
    const heights = stored ? JSON.parse(stored) : {};
    heights[boardId] = height;
    localStorage.setItem(HEIGHT_STORAGE_KEY, JSON.stringify(heights));
  } catch {}
}

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
  dragHandleProps,
}: {
  board: BoardMeta;
  isExpanded: boolean;
  onToggle: () => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  return (
    <div
      onClick={onToggle}
      className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-slate-50/80 transition select-none"
    >
      {/* Chevron */}
      <svg
        className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          d="M9 5l7 7-7 7"
        />
      </svg>

      {/* Title & description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-slate-900 truncate">
            {board.title}
          </h3>
          {board.description && (
            <span className="text-xs text-slate-400 truncate hidden sm:inline">
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
        className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition flex-shrink-0"
        title="Open fullscreen"
      >
        <svg
          className="w-3.5 h-3.5"
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

      {/* Drag handle — right side */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-slate-100 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition flex-shrink-0"
        >
          <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
            <circle cx="3" cy="2" r="1.5" />
            <circle cx="9" cy="2" r="1.5" />
            <circle cx="3" cy="8" r="1.5" />
            <circle cx="9" cy="8" r="1.5" />
            <circle cx="3" cy="14" r="1.5" />
            <circle cx="9" cy="14" r="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Content that loads board data lazily
function BoardRowContent({ boardId }: { boardId: string }) {
  const { data: board, isLoading, error } = useBoard(boardId);
  const [height, setHeight] = useState(() => getBoardHeight(boardId));
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing.current = true;
      startY.current = e.clientY;
      startHeight.current = height;

      function onMouseMove(ev: MouseEvent) {
        if (!isResizing.current) return;
        const delta = ev.clientY - startY.current;
        const newHeight = Math.max(200, Math.min(1200, startHeight.current + delta));
        setHeight(newHeight);
      }

      function onMouseUp() {
        if (!isResizing.current) return;
        isResizing.current = false;
        setBoardHeight(boardId, height);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [boardId, height]
  );

  // Save height on change
  useEffect(() => {
    if (!isResizing.current) {
      setBoardHeight(boardId, height);
    }
  }, [boardId, height]);

  if (isLoading) {
    return (
      <div className="px-4 pb-4">
        <div
          className="bg-slate-50 rounded-xl animate-pulse flex items-center justify-center"
          style={{ height }}
        >
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
      <div className="px-4 pb-4">
        <div className="h-32 bg-red-50 rounded-xl flex items-center justify-center text-sm text-red-500">
          Failed to load board
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-100 relative">
      <div className="overflow-hidden" style={{ height }}>
        <KanbanBoard board={board} />
      </div>

      {/* Resize handle — bottom center */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-3 cursor-ns-resize group flex items-center justify-center"
        title="Drag to resize"
      >
        <div className="w-8 h-[3px] rounded-full bg-slate-200 group-hover:bg-slate-300 transition" />
      </div>
    </div>
  );
}

// Main BoardRow component
export function BoardRow({
  board,
  isExpanded,
  onToggle,
  dragHandleProps,
}: {
  board: BoardMeta;
  isExpanded: boolean;
  onToggle: () => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <BoardRowHeader
        board={board}
        isExpanded={isExpanded}
        onToggle={onToggle}
        dragHandleProps={dragHandleProps}
      />
      {isExpanded && <BoardRowContent boardId={board.id} />}
    </div>
  );
}
