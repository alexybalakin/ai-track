import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(
  req: Request,
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
    },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  return NextResponse.json(board.columns);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { title, color, aiEnabled } = await req.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // Verify board access
  const board = await prisma.board.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session!.user.id },
        { members: { some: { userId: session!.user.id } } },
      ],
    },
    include: { columns: { orderBy: { order: "desc" }, take: 1 } },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const maxOrder = board.columns[0]?.order ?? -1;

  const column = await prisma.boardColumn.create({
    data: {
      title: title.trim(),
      color: color || "#3b82f6",
      aiEnabled: aiEnabled ?? false,
      order: maxOrder + 1,
      boardId: id,
    },
  });

  return NextResponse.json(column, { status: 201 });
}

// Bulk reorder columns
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { columnIds } = await req.json();

  if (!Array.isArray(columnIds) || columnIds.length === 0) {
    return NextResponse.json({ error: "columnIds array is required" }, { status: 400 });
  }

  // Verify board access
  const board = await prisma.board.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session!.user.id },
        { members: { some: { userId: session!.user.id } } },
      ],
    },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // Update all column orders in a transaction
  await prisma.$transaction(
    columnIds.map((columnId: string, index: number) =>
      prisma.boardColumn.update({
        where: { id: columnId },
        data: { order: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
