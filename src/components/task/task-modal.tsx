"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUpdateTask, useDeleteTask, useUpdateTaskStatus, useComments } from "@/hooks/useTasks";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";

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
  aiState: string;
  aiResult?: string;
  aiLog?: string;
  assignee?: { id: string; name?: string; email: string };
  createdAt?: string;
  updatedAt?: string;
  aiIterations?: AiIteration[];
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

const MARKDOWN_CLASSES =
  "prose prose-sm max-w-none [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_p]:mb-2 [&_p]:leading-relaxed [&_ul]:mb-2 [&_ul]:pl-4 [&_ul]:list-disc [&_ol]:mb-2 [&_ol]:pl-4 [&_ol]:list-decimal [&_li]:mb-1 [&_code]:bg-black/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_pre]:bg-black/5 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:mb-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_strong]:font-semibold [&_hr]:my-3 [&_hr]:border-slate-200";

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
  const [feedbackText, setFeedbackText] = useState("");
  const [expandedIterations, setExpandedIterations] = useState<Set<number>>(new Set());
  const updateTask = useUpdateTask(boardId);
  const updateStatus = useUpdateTaskStatus(boardId);
  const deleteTask = useDeleteTask(boardId);
  const { addComment } = useComments(task.id);

  const iterations = task.aiIterations || [];

  // Auto-expand latest iteration
  useEffect(() => {
    if (iterations.length > 0) {
      const latest = iterations[iterations.length - 1].number;
      setExpandedIterations((prev) => {
        const next = new Set(prev);
        next.add(latest);
        return next;
      });
    }
  }, [iterations.length]);

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

  async function handleReturnToAI() {
    if (!feedbackText.trim()) {
      toast.error("Please enter feedback for AI");
      return;
    }

    try {
      await updateStatus.mutateAsync({
        id: task.id,
        status: "in_progress_ai",
        feedback: feedbackText.trim(),
      });
      setFeedbackText("");
      toast("AI started a new iteration with your feedback", { icon: "🤖" });
    } catch {
      toast.error("Failed to return task to AI");
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

  function toggleIteration(num: number) {
    setExpandedIterations((prev) => {
      const next = new Set(prev);
      if (next.has(num)) {
        next.delete(num);
      } else {
        next.add(num);
      }
      return next;
    });
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

          {/* AI Running State */}
          {task.aiState === "running" && (
            <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-blue-600">
                AI is processing this task (iteration #{iterations.length + 1})...
              </span>
            </div>
          )}

          {/* AI Iterations */}
          {iterations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                AI Iterations
                <span className="text-slate-400 font-normal ml-1">
                  ({iterations.length})
                </span>
              </h3>

              <div className="space-y-3">
                {iterations.map((iter) => {
                  const isExpanded = expandedIterations.has(iter.number);
                  const isSucceeded = iter.state === "succeeded";
                  const isFailed = iter.state === "failed";

                  return (
                    <div
                      key={iter.id}
                      className={`rounded-xl border overflow-hidden ${
                        isSucceeded
                          ? "border-green-200"
                          : isFailed
                          ? "border-red-200"
                          : "border-slate-200"
                      }`}
                    >
                      {/* Iteration header — clickable to expand/collapse */}
                      <button
                        onClick={() => toggleIteration(iter.number)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition ${
                          isSucceeded
                            ? "bg-green-50 hover:bg-green-100"
                            : isFailed
                            ? "bg-red-50 hover:bg-red-100"
                            : "bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                              isSucceeded
                                ? "bg-green-200 text-green-700"
                                : isFailed
                                ? "bg-red-200 text-red-700"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {iter.number}
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              isSucceeded
                                ? "text-green-700"
                                : isFailed
                                ? "text-red-700"
                                : "text-slate-600"
                            }`}
                          >
                            Iteration #{iter.number}
                            {isSucceeded && " ✓"}
                            {isFailed && " ✗"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(iter.createdAt)}
                          </span>
                        </div>
                        <svg
                          className={`w-4 h-4 text-slate-400 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {/* Iteration content */}
                      {isExpanded && (
                        <div className="px-4 py-3 space-y-3">
                          {/* Result */}
                          <div
                            className={`rounded-lg p-3 text-sm ${
                              isSucceeded
                                ? "bg-green-50/50 text-green-800"
                                : isFailed
                                ? "bg-red-50/50 text-red-800"
                                : "bg-slate-50 text-slate-800"
                            }`}
                          >
                            <div className={MARKDOWN_CLASSES}>
                              <ReactMarkdown>
                                {iter.result || "No result available"}
                              </ReactMarkdown>
                            </div>
                          </div>

                          {/* Feedback on this iteration */}
                          {iter.feedback && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <div className="flex items-center gap-1.5 mb-1">
                                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                <span className="text-xs font-medium text-amber-700">
                                  Your feedback
                                </span>
                              </div>
                              <p className="text-sm text-amber-800">
                                {iter.feedback}
                              </p>
                            </div>
                          )}

                          {/* Log */}
                          {iter.log && (
                            <details>
                              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                                View log
                              </summary>
                              <pre className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                                {iter.log}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legacy AI Result (for tasks without iterations) */}
          {task.aiState !== "idle" && iterations.length === 0 && task.aiState !== "running" && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                AI Result
              </h3>
              <div
                className={`rounded-xl p-4 text-sm ${
                  task.aiState === "succeeded"
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                <div className={MARKDOWN_CLASSES}>
                  <ReactMarkdown>
                    {task.aiResult || "No result available"}
                  </ReactMarkdown>
                </div>
              </div>

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

          {/* Feedback & Return to AI — shown when task is in review */}
          {task.status === "review" && task.aiState === "succeeded" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Return to AI with feedback
              </h3>
              <p className="text-xs text-blue-600 mb-3">
                Describe what needs to be changed and the AI will create a new iteration.
              </p>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="e.g. Add more details about authentication, restructure section 3..."
                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
                rows={3}
              />
              <button
                onClick={handleReturnToAI}
                disabled={!feedbackText.trim() || updateStatus.isPending}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {updateStatus.isPending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Return to AI
                  </>
                )}
              </button>
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
