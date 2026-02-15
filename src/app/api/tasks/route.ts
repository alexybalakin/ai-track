import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { title, description, boardId, priority, assigneeId } = await req.json();

  if (!title?.trim() || !boardId) {
    return NextResponse.json(
      { error: "Title and boardId are required" },
      { status: 400 }
    );
  }

  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [
        { ownerId: session!.user.id },
        { members: { some: { userId: session!.user.id } } },
      ],
    },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const maxOrder = await prisma.task.aggregate({
    where: { boardId, status: "todo" },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      boardId,
      priority: priority || "medium",
      assigneeId: assigneeId || null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(task, { status: 201 });
}
