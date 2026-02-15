"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  aiState: string;
  assignee?: { id: string; name?: string; email: string };
  _count?: { comments: number };
}

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-50 text-red-600",
  medium: "bg-amber-50 text-amber-600",
  low: "bg-slate-50 text-slate-500",
};

const AI_STATUS: Record<string, { color: string; label: string; pulse?: boolean }> = {
  idle: { color: "bg-slate-300", label: "Idle" },
  running: { color: "bg-blue-500", label: "Running", pulse: true },
  succeeded: { color: "bg-green-500", label: "Done" },
  failed: { color: "bg-red-500", label: "Failed" },
};

interface TaskCardProps {
  task: Task;
  isOverlay?: boolean;
  onClick?: () => void;
}

export function TaskCard({ task, isOverlay, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const aiStatus = AI_STATUS[task.aiState] || AI_STATUS.idle;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-100 p-3.5 cursor-pointer hover:shadow-md hover:border-blue-100 transition group ${
        isDragging ? "opacity-50" : ""
      } ${isOverlay ? "shadow-lg rotate-2" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-slate-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition">
          {task.title}
        </h3>
        {task.aiState !== "idle" && (
          <div className="flex items-center gap-1.5 shrink-0" title={`AI: ${aiStatus.label}`}>
            <div
              className={`w-2 h-2 rounded-full ${aiStatus.color} ${
                aiStatus.pulse ? "animate-pulse" : ""
              }`}
            />
            <span className="text-[10px] text-slate-400">{aiStatus.label}</span>
          </div>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-slate-400 mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
            PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
          }`}
        >
          {task.priority}
        </span>

        <div className="flex items-center gap-2">
          {(task._count?.comments ?? 0) > 0 && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {task._count?.comments}
            </span>
          )}

          {task.assignee && (
            <div
              className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-medium"
              title={task.assignee.name || task.assignee.email}
            >
              {(task.assignee.name || task.assignee.email)
                .charAt(0)
                .toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
