"use client";

import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  columnId?: string;
  assignee?: { id: string; name?: string; email: string };
  _count?: { comments: number };
}

interface ColumnProps {
  id: string;
  title: string;
  color: string;
  aiEnabled: boolean;
  tasks: Task[];
  isDraggingColumn: boolean;
  onTaskClick: (task: Task) => void;
  onAddTask: () => void;
  onSettingsClick: () => void;
}

function hexToTailwindBg(hex: string): string {
  return `color-mix(in srgb, ${hex} 15%, white)`;
}

function hexToTailwindText(hex: string): string {
  return hex;
}

export function Column({
  id,
  title,
  color,
  aiEnabled,
  tasks,
  isDraggingColumn,
  onTaskClick,
  onAddTask,
  onSettingsClick,
}: ColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${id}`,
    data: { type: "column", columnId: id },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id,
    data: { type: "column-droppable", columnId: id },
  });

  const style = {
    transform: CSS.Transform.toString(
      transform ? { ...transform, scaleX: 1, scaleY: 1 } : null
    ),
    transition,
  };

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={`flex-1 min-w-[280px] max-w-[340px] flex flex-col rounded-2xl transition ${
        isDragging ? "opacity-40 z-50" : ""
      } ${isOver && !isDraggingColumn ? "bg-blue-50/80" : "bg-slate-50/50"}`}
    >
      {/* Header with drag handle */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1.5">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-0.5 -ml-1 touch-none"
            title="Drag to reorder"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="5" r="1.5" />
              <circle cx="15" cy="5" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="19" r="1.5" />
              <circle cx="15" cy="19" r="1.5" />
            </svg>
          </button>
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-lg"
            style={{
              backgroundColor: hexToTailwindBg(color),
              color: hexToTailwindText(color),
            }}
          >
            {title}
          </span>
          {aiEnabled && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{
                backgroundColor: hexToTailwindBg(color),
                color: hexToTailwindText(color),
              }}
              title="AI processes tasks in this column"
            >
              AI
            </span>
          )}
          <span className="text-xs text-slate-400 font-medium">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddTask}
            className="text-slate-400 hover:text-blue-600 transition p-0.5"
            title="Add task"
          >
            <svg
              className="w-4.5 h-4.5"
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
          <button
            onClick={onSettingsClick}
            className="text-slate-400 hover:text-slate-600 transition p-0.5"
            title="Column settings"
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
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Task drop zone */}
      <div
        ref={setDroppableRef}
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
