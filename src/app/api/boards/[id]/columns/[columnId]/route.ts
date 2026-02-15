import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id, columnId } = await params;
  const { title, color, aiEnabled, order } = await req.json();

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

  const column = await prisma.boardColumn.findFirst({
    where: { id: columnId, boardId: id },
  });

  if (!column) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title.trim();
  if (color !== undefined) updateData.color = color;
  if (aiEnabled !== undefined) updateData.aiEnabled = aiEnabled;
  if (order !== undefined) updateData.order = order;

  const updated = await prisma.boardColumn.update({
    where: { id: columnId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id, columnId } = await params;

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

  const column = await prisma.boardColumn.findFirst({
    where: { id: columnId, boardId: id },
    include: { _count: { select: { tasks: true } } },
  });

  if (!column) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }

  if (column._count.tasks > 0) {
    return NextResponse.json(
      { error: "Cannot delete column with tasks. Move tasks first." },
      { status: 400 }
    );
  }

  await prisma.boardColumn.delete({ where: { id: columnId } });

  return NextResponse.json({ success: true });
}
