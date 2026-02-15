"use client";

import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { Column } from "./column";
import { TaskCard } from "./task-card";
import { TaskModal } from "@/components/task/task-modal";
import { CreateTaskForm } from "@/components/task/create-task-form";
import { ColumnSettings } from "@/components/board/column-settings";
import { useUpdateTaskStatus } from "@/hooks/useTasks";
import { useCreateColumn } from "@/hooks/useColumns";
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

export function KanbanBoard({ board }: { board: Board }) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createInColumnId, setCreateInColumnId] = useState<string | undefined>();
  const [settingsColumn, setSettingsColumn] = useState<BoardColumn | null>(null);
  const updateStatus = useUpdateTaskStatus(board.id);
  const createColumn = useCreateColumn(board.id);
  const prevAiStates = useRef<Record<string, string>>({});

  const columns = board.columns || [];

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
    const task = board.tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const task = board.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine the target column ID
    let targetColumnId: string;
    if (columns.some((c) => c.id === over.id)) {
      // Dropped on column directly
      targetColumnId = over.id as string;
    } else {
      // Dropped on another task — find its column
      const overTask = board.tasks.find((t) => t.id === over.id);
      targetColumnId = overTask?.columnId || task.columnId || "";
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

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 p-6 overflow-x-auto">
          {columns.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              aiEnabled={column.aiEnabled}
              tasks={tasksByColumn[column.id] || []}
              onTaskClick={setSelectedTask}
              onAddTask={() => handleAddTask(column.id)}
              onSettingsClick={() => setSettingsColumn(column)}
            />
          ))}

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

        <DragOverlay>
          {activeTask && (
            <TaskCard task={activeTask} isOverlay />
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
