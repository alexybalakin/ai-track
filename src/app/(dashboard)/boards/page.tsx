"use client";

import { useBoards } from "@/hooks/useBoards";
import { useExpandedBoards } from "@/hooks/useExpandedBoards";
import { BoardRow } from "@/components/board/board-row";
import { CreateBoardInline } from "@/components/board/create-board-inline";

export default function BoardsPage() {
  const { data: boards, isLoading } = useBoards();
  const { isExpanded, toggle, expand } = useExpandedBoards();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-xl w-48" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Your Projects</h1>
      </div>

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
            No projects yet
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Create your first project to get started
          </p>
          <CreateBoardInline onCreated={expand} />
        </div>
      ) : (
        <div className="space-y-3">
          {boards?.map(
            (board: {
              id: string;
              title: string;
              description?: string;
              createdAt: string;
              _count: { tasks: number; members: number; columns?: number };
            }) => (
              <BoardRow
                key={board.id}
                board={board}
                isExpanded={isExpanded(board.id)}
                onToggle={() => toggle(board.id)}
              />
            )
          )}
          <CreateBoardInline onCreated={expand} />
        </div>
      )}
    </div>
  );
}
