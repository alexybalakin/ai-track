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

  const comments = await prisma.comment.findMany({
    where: { taskId: id },
    include: {
      author: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { text } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

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

  const comment = await prisma.comment.create({
    data: {
      text: text.trim(),
      taskId: id,
      authorId: session!.user.id,
    },
    include: {
      author: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
