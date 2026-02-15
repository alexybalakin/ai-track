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
import { useUpdateTaskStatus } from "@/hooks/useTasks";
import { COLUMNS, type TaskStatus } from "@/types";
import toast from "react-hot-toast";

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
  assignee?: { id: string; name?: string; email: string };
  _count?: { comments: number };
}

interface Board {
  id: string;
  title: string;
  tasks: Task[];
  members: { id: string; user: { id: string; name?: string; email: string } }[];
}

export function KanbanBoard({ board }: { board: Board }) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createInColumn, setCreateInColumn] = useState<TaskStatus>("todo");
  const updateStatus = useUpdateTaskStatus(board.id);
  const prevAiStates = useRef<Record<string, string>>({});

  // Track AI state changes and show toast notifications
  useEffect(() => {
    for (const task of board.tasks) {
      const prev = prevAiStates.current[task.id];
      if (prev === "running" && task.aiState === "succeeded") {
        toast.success(`AI finished "${task.title}" — moved to Review`);
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
      if (updated && (updated.aiState !== selectedTask.aiState || updated.status !== selectedTask.status)) {
        setSelectedTask(updated);
      }
    }
  }, [board.tasks, selectedTask]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const tasksByColumn = COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = board.tasks
        .filter((t) => t.status === col.id)
        .sort((a, b) => a.order - b.order);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
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

    // Determine the target column
    let targetColumn: string;
    if (COLUMNS.some((c) => c.id === over.id)) {
      targetColumn = over.id as string;
    } else {
      const overTask = board.tasks.find((t) => t.id === over.id);
      targetColumn = overTask?.status || task.status;
    }

    if (targetColumn === task.status) return;

    try {
      await updateStatus.mutateAsync({
        id: taskId,
        status: targetColumn,
      });

      if (targetColumn === "in_progress_ai") {
        toast("AI started working on this task", {
          icon: "🤖",
        });
      }
    } catch {
      toast.error("Failed to move task");
    }
  }

  function handleAddTask(column: TaskStatus) {
    setCreateInColumn(column);
    setShowCreateForm(true);
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
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={tasksByColumn[column.id] || []}
              onTaskClick={setSelectedTask}
              onAddTask={() => handleAddTask(column.id)}
            />
          ))}
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
          onClose={() => setSelectedTask(null)}
        />
      )}

      {showCreateForm && (
        <CreateTaskForm
          boardId={board.id}
          defaultStatus={createInColumn}
          onClose={() => setShowCreateForm(false)}
        />
      )}
    </>
  );
}
