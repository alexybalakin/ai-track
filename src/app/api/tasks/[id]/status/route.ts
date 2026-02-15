import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import OpenAI from "openai";

const VALID_STATUSES = ["todo", "in_progress_ai", "review", "done"];

function getGroqClient() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY || "",
    baseURL: "https://api.groq.com/openai/v1",
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { status, order } = await req.json();

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
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

  const updateData: Record<string, unknown> = {
    status,
    order: order ?? task.order,
  };

  // When moving to in_progress_ai, trigger AI
  if (status === "in_progress_ai" && task.status !== "in_progress_ai") {
    updateData.aiState = "running";
    updateData.aiResult = null;
    updateData.aiLog = null;
  }

  // When moving back to todo, reset AI state
  if (status === "todo") {
    updateData.aiState = "idle";
    updateData.aiResult = null;
    updateData.aiLog = null;
  }

  const updated = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      _count: { select: { comments: true } },
    },
  });

  // Run AI processing when moved to in_progress_ai
  if (status === "in_progress_ai" && task.status !== "in_progress_ai") {
    processWithAI(id, task.title, task.description || "");
  }

  return NextResponse.json(updated);
}

async function processWithAI(taskId: string, title: string, description: string) {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(`[${new Date().toISOString()}] ${msg}`);
  };

  try {
    log("AI started processing");
    log(`Task: "${title}"`);
    log("Sending request to Groq...");

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant that works on tasks. Given a task title and description, provide a detailed solution, plan, or result. Be concise but thorough. Write in the same language as the task. Format your response with clear structure using markdown.",
        },
        {
          role: "user",
          content: `Task: ${title}${description ? `\n\nDescription: ${description}` : ""}`,
        },
      ],
    });

    const result = completion.choices[0]?.message?.content;

    if (!result) {
      throw new Error("Empty response from AI");
    }

    log("Response received successfully");
    log(`Tokens used: ${completion.usage?.total_tokens ?? "N/A"}`);

    await prisma.task.update({
      where: { id: taskId },
      data: {
        aiState: "succeeded",
        aiResult: result,
        aiLog: logs.join("\n"),
        status: "review",
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    log(`Error: ${errorMsg}`);

    await prisma.task.update({
      where: { id: taskId },
      data: {
        aiState: "failed",
        aiResult: `AI error: ${errorMsg}`,
        aiLog: logs.join("\n"),
        status: "todo",
      },
    });
  }
}
