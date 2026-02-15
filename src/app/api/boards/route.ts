import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  const boards = await prisma.board.findMany({
    where: {
      OR: [
        { ownerId: session!.user.id },
        { members: { some: { userId: session!.user.id } } },
      ],
    },
    include: {
      _count: { select: { tasks: true, members: true, columns: true } },
      owner: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(boards);
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { title, description } = await req.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const board = await prisma.board.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      ownerId: session!.user.id,
      members: {
        create: { userId: session!.user.id, role: "owner" },
      },
      columns: {
        create: [
          { title: "To Do",            color: "#64748b", order: 0, aiEnabled: false },
          { title: "In Progress (AI)", color: "#3b82f6", order: 1, aiEnabled: true  },
          { title: "Review",           color: "#f59e0b", order: 2, aiEnabled: false },
          { title: "Done",             color: "#22c55e", order: 3, aiEnabled: false },
        ],
      },
    },
  });

  return NextResponse.json(board, { status: 201 });
}

export async function PUT(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { boardIds } = await req.json();

  if (!Array.isArray(boardIds) || boardIds.length === 0) {
    return NextResponse.json({ error: "boardIds required" }, { status: 400 });
  }

  // Verify all boards belong to the user
  const boards = await prisma.board.findMany({
    where: {
      id: { in: boardIds },
      OR: [
        { ownerId: session!.user.id },
        { members: { some: { userId: session!.user.id } } },
      ],
    },
    select: { id: true },
  });

  if (boards.length !== boardIds.length) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await prisma.$transaction(
    boardIds.map((boardId: string, index: number) =>
      prisma.board.update({
        where: { id: boardId },
        data: { order: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
