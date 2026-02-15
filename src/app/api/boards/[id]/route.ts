import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

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
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          _count: { select: { comments: true } },
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
