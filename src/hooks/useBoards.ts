"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useBoards() {
  return useQuery({
    queryKey: ["boards"],
    queryFn: async () => {
      const res = await fetch("/api/boards");
      if (!res.ok) throw new Error("Failed to fetch boards");
      return res.json();
    },
  });
}

export function useBoard(id: string) {
  return useQuery({
    queryKey: ["board", id],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${id}`);
      if (!res.ok) throw new Error("Failed to fetch board");
      return res.json();
    },
    refetchInterval: (query) => {
      const board = query.state.data;
      if (!board?.tasks) return false;
      const hasRunning = board.tasks.some(
        (t: { aiState: string }) => t.aiState === "running"
      );
      return hasRunning ? 2000 : false;
    },
  });
}

export function useCreateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; description?: string }) => {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create board");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}

export function useReorderBoards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boardIds: string[]) => {
      const res = await fetch("/api/boards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardIds }),
      });
      if (!res.ok) throw new Error("Failed to reorder boards");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}

export function useDeleteBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/boards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete board");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}
