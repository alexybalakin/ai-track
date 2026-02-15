import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  const task = await prisma.task.findFirst({
    where: {
      id,
      board: {
        OR: [
          { ownerId: session!.user.id },
          { members: { some: { userId: session!.user.id } } },
        ],
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title.trim();
  if (body.description !== undefined) updateData.description = body.description?.trim() || null;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId || null;
  if (body.order !== undefined) updateData.order = body.order;

  const updated = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      _count: { select: { comments: true } },
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

  const task = await prisma.task.findFirst({
    where: {
      id,
      board: {
        OR: [
          { ownerId: session!.user.id },
          { members: { some: { userId: session!.user.id } } },
        ],
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
