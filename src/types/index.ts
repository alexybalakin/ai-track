export type TaskPriority = "low" | "medium" | "high";
export type AiState = "idle" | "running" | "succeeded" | "failed";
export type BoardRole = "owner" | "member";

export interface BoardColumn {
  id: string;
  title: string;
  color: string;
  order: number;
  aiEnabled: boolean;
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
