import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { email } = await req.json();

  const board = await prisma.board.findFirst({
    where: { id, ownerId: session!.user.id },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found or not owner" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: id, userId: user.id } },
  });

  if (existing) {
    return NextResponse.json({ error: "User is already a member" }, { status: 400 });
  }

  const member = await prisma.boardMember.create({
    data: { boardId: id, userId: user.id, role: "member" },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(member, { status: 201 });
}
