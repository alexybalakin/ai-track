"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useBoards, useReorderBoards } from "@/hooks/useBoards";
import { useExpandedBoards } from "@/hooks/useExpandedBoards";
import { BoardRow } from "@/components/board/board-row";
import { CreateBoardInline } from "@/components/board/create-board-inline";
import toast from "react-hot-toast";

interface BoardMeta {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  _count: { tasks: number; members: number; columns?: number };
}

function SortableBoardRow({
  board,
  isExpanded,
  onToggle,
}: {
  board: BoardMeta;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: board.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BoardRow
        board={board}
        isExpanded={isExpanded}
        onToggle={onToggle}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export default function BoardsPage() {
  const { data: boards, isLoading } = useBoards();
  const { isExpanded, toggle, expand } = useExpandedBoards();
  const reorderBoards = useReorderBoards();
  const [localBoards, setLocalBoards] = useState<BoardMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (boards) setLocalBoards(boards);
  }, [boards]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const sortableIds = useMemo(
    () => localBoards.map((b) => b.id),
    [localBoards]
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = localBoards.findIndex((b) => b.id === active.id);
    const newIndex = localBoards.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(localBoards, oldIndex, newIndex);
    setLocalBoards(reordered);

    try {
      await reorderBoards.mutateAsync(reordered.map((b) => b.id));
    } catch {
      setLocalBoards(boards || []);
      toast.error("Failed to reorder projects");
    }
  }

  const activeBoard = activeId
    ? localBoards.find((b) => b.id === activeId)
    : null;

  if (isLoading) {
    return (
      <div className="mx-[60px] py-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (localBoards.length === 0) {
    return (
      <div className="mx-[60px] py-6">
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
          <div className="max-w-sm mx-auto">
            <CreateBoardInline onCreated={expand} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-[60px] py-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {localBoards.map((board) => (
              <SortableBoardRow
                key={board.id}
                board={board}
                isExpanded={isExpanded(board.id)}
                onToggle={() => toggle(board.id)}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeBoard && (
            <div className="bg-white rounded-2xl border border-blue-200 shadow-2xl opacity-90 px-5 py-4">
              <div className="flex items-center gap-3">
                <svg
                  className="w-4 h-4 text-slate-400"
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
                <span className="font-semibold text-slate-900">
                  {activeBoard.title}
                </span>
                <span className="text-xs text-slate-400">
                  {activeBoard._count.tasks} tasks
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <div className="mt-3 max-w-lg mx-auto">
        <CreateBoardInline onCreated={expand} />
      </div>
    </div>
  );
}
