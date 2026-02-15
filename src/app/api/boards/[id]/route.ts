import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

const DEFAULT_COLUMNS = [
  { title: "To Do",            color: "#64748b", order: 0, aiEnabled: false },
  { title: "In Progress (AI)", color: "#3b82f6", order: 1, aiEnabled: true  },
  { title: "Review",           color: "#f59e0b", order: 2, aiEnabled: false },
  { title: "Done",             color: "#22c55e", order: 3, aiEnabled: false },
];

const STATUS_TO_ORDER: Record<string, number> = {
  todo: 0,
  in_progress_ai: 1,
  review: 2,
  done: 3,
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const board = await prisma.board.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session!.user.id },
        { members: { some: { userId: session!.user.id } } },
      ],
    },
    include: {
      columns: { orderBy: { order: "asc" } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          _count: { select: { comments: true } },
          aiIterations: { orderBy: { number: "asc" } },
        },
        orderBy: { order: "asc" },
      },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      },
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // Auto-migrate: if board has no columns, create defaults and assign tasks
  if (board.columns.length === 0) {
    const createdColumns = await Promise.all(
      DEFAULT_COLUMNS.map((col) =>
        prisma.boardColumn.create({
          data: { ...col, boardId: id },
        })
      )
    );

    // Assign existing tasks to columns by their status
    for (const task of board.tasks) {
      const colIndex = STATUS_TO_ORDER[task.status] ?? 0;
      const targetColumn = createdColumns[colIndex];
      if (targetColumn) {
        await prisma.task.update({
          where: { id: task.id },
          data: { columnId: targetColumn.id },
        });
      }
    }

    // Re-fetch to get updated data
    const updated = await prisma.board.findFirst({
      where: { id },
      include: {
        columns: { orderBy: { order: "asc" } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            _count: { select: { comments: true } },
            aiIterations: { orderBy: { number: "asc" } },
          },
          orderBy: { order: "asc" },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json(board);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { title, description } = await req.json();

  const board = await prisma.board.findFirst({
    where: { id, ownerId: session!.user.id },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found or not owner" }, { status: 404 });
  }

  const updated = await prisma.board.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const board = await prisma.board.findFirst({
    where: { id, ownerId: session!.user.id },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found or not owner" }, { status: 404 });
  }

  await prisma.board.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
