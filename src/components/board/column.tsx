"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskCard } from "./task-card";

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

interface ColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: () => void;
}

const COLUMN_COLORS: Record<string, string> = {
  todo: "bg-slate-100 text-slate-600",
  in_progress_ai: "bg-blue-100 text-blue-600",
  review: "bg-amber-100 text-amber-600",
  done: "bg-green-100 text-green-600",
};

export function Column({ id, title, tasks, onTaskClick, onAddTask }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={`flex-1 min-w-[280px] max-w-[340px] flex flex-col rounded-2xl transition ${
        isOver ? "bg-blue-50/80" : "bg-slate-50/50"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
              COLUMN_COLORS[id] || "bg-slate-100 text-slate-600"
            }`}
          >
            {title}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {tasks.length}
          </span>
        </div>
        {id === "todo" && (
          <button
            onClick={onAddTask}
            className="text-slate-400 hover:text-blue-600 transition"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        )}
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 px-3 pb-3 space-y-2 overflow-y-auto"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-slate-300">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}
