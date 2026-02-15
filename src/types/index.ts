export type TaskStatus = "todo" | "in_progress_ai" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type AiState = "idle" | "running" | "succeeded" | "failed";
export type BoardRole = "owner" | "member";

export const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in_progress_ai", title: "In Progress (AI)" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
