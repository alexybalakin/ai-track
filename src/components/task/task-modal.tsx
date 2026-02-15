"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUpdateTask, useDeleteTask, useComments } from "@/hooks/useTasks";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  aiState: string;
  aiResult?: string;
  aiLog?: string;
  assignee?: { id: string; name?: string; email: string };
  createdAt?: string;
  updatedAt?: string;
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; name?: string; email: string; avatarUrl?: string };
}

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress_ai: "In Progress (AI)",
  review: "Review",
  done: "Done",
};

const AI_STATE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  idle: { bg: "bg-slate-100", text: "text-slate-600", label: "Idle" },
  running: { bg: "bg-blue-100", text: "text-blue-600", label: "Running" },
  succeeded: { bg: "bg-green-100", text: "text-green-600", label: "Succeeded" },
  failed: { bg: "bg-red-100", text: "text-red-600", label: "Failed" },
};

export function TaskModal({
  task,
  boardId,
  onClose,
}: {
  task: Task;
  boardId: string;
  onClose: () => void;
}) {
  const [commentText, setCommentText] = useState("");
  const updateTask = useUpdateTask(boardId);
  const deleteTask = useDeleteTask(boardId);
  const { addComment } = useComments(task.id);

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ["comments", task.id],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${task.id}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json() as Promise<Comment[]>;
    },
  });

  // Poll for AI state changes
  useEffect(() => {
    if (task.aiState !== "running") return;
    const interval = setInterval(() => {
      refetchComments();
    }, 3000);
    return () => clearInterval(interval);
  }, [task.aiState, refetchComments]);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      await addComment.mutateAsync(commentText);
      setCommentText("");
      refetchComments();
    } catch {
      toast.error("Failed to add comment");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTask.mutateAsync(task.id);
      onClose();
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  }

  const aiStyle = AI_STATE_STYLES[task.aiState] || AI_STATE_STYLES.idle;

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-50">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
              {STATUS_LABELS[task.status] || task.status}
            </span>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-lg ${aiStyle.bg} ${aiStyle.text}`}
            >
              AI: {aiStyle.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="text-slate-400 hover:text-red-500 transition p-1"
              title="Delete task"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Title & Description */}
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {task.title}
            </h2>
            {task.description && (
              <p className="text-sm text-slate-600 leading-relaxed">
                {task.description}
              </p>
            )}
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400 block mb-1">Priority</span>
              <span className="font-medium capitalize">{task.priority}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Assignee</span>
              <span className="font-medium">
                {task.assignee
                  ? task.assignee.name || task.assignee.email
                  : "Unassigned"}
              </span>
            </div>
            {task.createdAt && (
              <div>
                <span className="text-slate-400 block mb-1">Created</span>
                <span className="font-medium">{formatDate(task.createdAt)}</span>
              </div>
            )}
            {task.updatedAt && (
              <div>
                <span className="text-slate-400 block mb-1">Updated</span>
                <span className="font-medium">{formatDate(task.updatedAt)}</span>
              </div>
            )}
          </div>

          {/* AI Result */}
          {task.aiState !== "idle" && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                AI Result
              </h3>
              {task.aiState === "running" ? (
                <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-blue-600">
                    AI is processing this task...
                  </span>
                </div>
              ) : (
                <div
                  className={`rounded-xl p-4 text-sm ${
                    task.aiState === "succeeded"
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {task.aiResult || "No result available"}
                </div>
              )}

              {task.aiLog && (
                <details className="mt-2">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                    View AI log
                  </summary>
                  <pre className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">
                    {task.aiLog}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Comments */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Comments
              {comments && comments.length > 0 && (
                <span className="text-slate-400 font-normal ml-1">
                  ({comments.length})
                </span>
              )}
            </h3>

            <div className="space-y-3 mb-4">
              {comments?.map((comment: Comment) => (
                <div key={comment.id} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-medium">
                      {(comment.author.name || comment.author.email)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-slate-700">
                      {comment.author.name || comment.author.email}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 pl-8">
                    {comment.text}
                  </p>
                </div>
              ))}

              {(!comments || comments.length === 0) && (
                <p className="text-xs text-slate-400">No comments yet</p>
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || addComment.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
