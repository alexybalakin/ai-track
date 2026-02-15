"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  CollisionDetection,
  rectIntersection,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Column } from "./column";
import { TaskCard } from "./task-card";
import { TaskModal } from "@/components/task/task-modal";
import { CreateTaskForm } from "@/components/task/create-task-form";
import { ColumnSettings } from "@/components/board/column-settings";
import { useUpdateTaskStatus } from "@/hooks/useTasks";
import { useCreateColumn, useReorderColumns } from "@/hooks/useColumns";
import type { BoardColumn } from "@/types";
import toast from "react-hot-toast";

interface AiIteration {
  id: string;
  number: number;
  result: string;
  log?: string;
  state: string;
  feedback?: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  order: number;
  aiState: string;
  aiResult?: string;
  aiLog?: string;
  columnId?: string;
  assignee?: { id: string; name?: string; email: string };
  _count?: { comments: number };
  aiIterations?: AiIteration[];
}

interface Board {
  id: string;
  title: string;
  tasks: Task[];
  columns: BoardColumn[];
  members: { id: string; user: { id: string; name?: string; email: string } }[];
}

// Custom collision detection: for columns use closestCenter, for tasks use pointerWithin+rectIntersection
const customCollisionDetection: CollisionDetection = (args) => {
  const activeData = args.active.data.current;

  if (activeData?.type === "column") {
    return closestCenter(args);
  }

  // For tasks: try pointerWithin first, fallback to rectIntersection
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return rectIntersection(args);
};

export function KanbanBoard({ board }: { board: Board }) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createInColumnId, setCreateInColumnId] = useState<string | undefined>();
  const [settingsColumn, setSettingsColumn] = useState<BoardColumn | null>(null);
  const [localColumns, setLocalColumns] = useState<BoardColumn[]>([]);
  const updateStatus = useUpdateTaskStatus(board.id);
  const createColumn = useCreateColumn(board.id);
  const reorderColumns = useReorderColumns(board.id);
  const prevAiStates = useRef<Record<string, string>>({});

  // Sync local columns with board data
  useEffect(() => {
    setLocalColumns(board.columns || []);
  }, [board.columns]);

  const columns = localColumns;

  // Sortable column IDs (prefixed to differentiate from task IDs)
  const sortableColumnIds = useMemo(
    () => columns.map((c) => `column-${c.id}`),
    [columns]
  );

  // Track AI state changes and show toast notifications
  useEffect(() => {
    for (const task of board.tasks) {
      const prev = prevAiStates.current[task.id];
      if (prev === "running" && task.aiState === "succeeded") {
        toast.success(`AI finished "${task.title}"`);
      } else if (prev === "running" && task.aiState === "failed") {
        toast.error(`AI failed on "${task.title}"`);
      }
    }
    const states: Record<string, string> = {};
    for (const task of board.tasks) {
      states[task.id] = task.aiState;
    }
    prevAiStates.current = states;
  }, [board.tasks]);

  // Keep selected task in sync with board data
  useEffect(() => {
    if (selectedTask) {
      const updated = board.tasks.find((t) => t.id === selectedTask.id);
      if (updated && (updated.aiState !== selectedTask.aiState || updated.columnId !== selectedTask.columnId)) {
        setSelectedTask(updated);
      }
    }
  }, [board.tasks, selectedTask]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Group tasks by columnId
  const tasksByColumn = columns.reduce(
    (acc, col) => {
      acc[col.id] = board.tasks
        .filter((t) => t.columnId === col.id)
        .sort((a, b) => a.order - b.order);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;

    if (data?.type === "column") {
      setActiveColumnId(data.columnId);
      setActiveTask(null);
    } else {
      const task = board.tasks.find((t) => t.id === event.active.id);
      if (task) {
        setActiveTask(task);
        setActiveColumnId(null);
      }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;

    // Only handle column reordering during drag-over for smooth preview
    if (activeData?.type === "column") {
      const overData = over.data.current;
      if (overData?.type === "column") {
        const activeColId = activeData.columnId;
        const overColId = overData.columnId;
        if (activeColId !== overColId) {
          setLocalColumns((prev) => {
            const oldIndex = prev.findIndex((c) => c.id === activeColId);
            const newIndex = prev.findIndex((c) => c.id === overColId);
            if (oldIndex === -1 || newIndex === -1) return prev;
            return arrayMove(prev, oldIndex, newIndex);
          });
        }
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeData = active.data.current;

    setActiveTask(null);
    setActiveColumnId(null);

    if (!over) return;

    // Handle column drop
    if (activeData?.type === "column") {
      // Save the new column order
      const newColumnIds = localColumns.map((c) => c.id);
      try {
        await reorderColumns.mutateAsync(newColumnIds);
      } catch {
        // Revert on error
        setLocalColumns(board.columns || []);
        toast.error("Failed to reorder columns");
      }
      return;
    }

    // Handle task drop
    const taskId = active.id as string;
    const task = board.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine the target column ID
    let targetColumnId: string | undefined;
    const overData = over.data.current;

    if (overData?.type === "column-droppable") {
      targetColumnId = overData.columnId;
    } else if (columns.some((c) => c.id === over.id)) {
      targetColumnId = over.id as string;
    } else {
      // Dropped on another task — find its column
      const overTask = board.tasks.find((t) => t.id === over.id);
      targetColumnId = overTask?.columnId || task.columnId;
    }

    if (!targetColumnId || targetColumnId === task.columnId) return;

    const targetCol = columns.find((c) => c.id === targetColumnId);

    try {
      await updateStatus.mutateAsync({
        id: taskId,
        columnId: targetColumnId,
      });

      if (targetCol?.aiEnabled) {
        toast("AI started working on this task", {
          icon: "🤖",
        });
      }
    } catch {
      toast.error("Failed to move task");
    }
  }

  function handleAddTask(columnId: string) {
    setCreateInColumnId(columnId);
    setShowCreateForm(true);
  }

  async function handleAddColumn() {
    try {
      await createColumn.mutateAsync({
        title: "New Column",
        color: "#64748b",
        aiEnabled: false,
      });
      toast.success("Column added");
    } catch {
      toast.error("Failed to add column");
    }
  }

  const isDraggingColumn = activeColumnId !== null;
  const activeCol = activeColumnId
    ? columns.find((c) => c.id === activeColumnId)
    : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex items-stretch p-6 overflow-x-auto gap-0">
          <SortableContext
            items={sortableColumnIds}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column, index) => (
              <div key={column.id} className="flex items-stretch">
                {/* Divider before column (except first) */}
                {index > 0 && (
                  <div className="flex items-stretch px-2 flex-shrink-0">
                    <div className="w-px bg-slate-200 self-stretch my-3" />
                  </div>
                )}
                <Column
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  aiEnabled={column.aiEnabled}
                  tasks={tasksByColumn[column.id] || []}
                  isDraggingColumn={isDraggingColumn}
                  onTaskClick={setSelectedTask}
                  onAddTask={() => handleAddTask(column.id)}
                  onSettingsClick={() => setSettingsColumn(column)}
                />
              </div>
            ))}
          </SortableContext>

          {/* Divider before add button */}
          {columns.length > 0 && (
            <div className="flex items-stretch px-2 flex-shrink-0">
              <div className="w-px bg-slate-200 self-stretch my-3" />
            </div>
          )}

          {/* Add Column button */}
          <button
            onClick={handleAddColumn}
            disabled={createColumn.isPending}
            className="min-w-[200px] flex-shrink-0 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition text-slate-400 hover:text-blue-500 gap-2"
          >
            <svg
              className="w-6 h-6"
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
            <span className="text-sm font-medium">Add Column</span>
          </button>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <TaskCard task={activeTask} isOverlay />
          )}
          {activeCol && (
            <div className="min-w-[280px] max-w-[340px] bg-slate-50 rounded-2xl shadow-2xl opacity-90 border border-blue-200 p-4">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-lg"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${activeCol.color} 15%, white)`,
                    color: activeCol.color,
                  }}
                >
                  {activeCol.title}
                </span>
                {activeCol.aiEnabled && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${activeCol.color} 15%, white)`,
                      color: activeCol.color,
                    }}
                  >
                    AI
                  </span>
                )}
                <span className="text-xs text-slate-400">
                  {(tasksByColumn[activeCol.id] || []).length} tasks
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          boardId={board.id}
          columns={columns}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {showCreateForm && (
        <CreateTaskForm
          boardId={board.id}
          defaultColumnId={createInColumnId}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {settingsColumn && (
        <ColumnSettings
          column={settingsColumn}
          boardId={board.id}
          onClose={() => setSettingsColumn(null)}
        />
      )}
    </>
  );
}
