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
  const { status, order, feedback } = await req.json();

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
    include: {
      aiIterations: { orderBy: { number: "desc" }, take: 1 },
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

    // If there's feedback (returning from review), save it on the last iteration
    if (feedback && task.aiIterations.length > 0) {
      await prisma.aiIteration.update({
        where: { id: task.aiIterations[0].id },
        data: { feedback },
      });
    }
  }

  // When moving back to todo, reset AI state
  if (status === "todo") {
    updateData.aiState = "idle";
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
    processWithAI(id, task.title, task.description || "", feedback || null);
  }

  return NextResponse.json(updated);
}

async function processWithAI(
  taskId: string,
  title: string,
  description: string,
  feedback: string | null
) {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(`[${new Date().toISOString()}] ${msg}`);
  };

  // Get previous iterations for context
  const previousIterations = await prisma.aiIteration.findMany({
    where: { taskId },
    orderBy: { number: "asc" },
  });

  const iterationNumber = previousIterations.length + 1;

  try {
    log(`AI iteration #${iterationNumber} started`);
    log(`Task: "${title}"`);
    if (feedback) log(`User feedback: "${feedback}"`);
    log("Sending request to Groq...");

    // Build message history with previous iterations
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      {
        role: "system",
        content:
          "You are a helpful AI assistant that works on tasks. Given a task title and description, provide a detailed solution, plan, or result. Be concise but thorough. Write in the same language as the task. Format your response with clear structure using markdown. If the user provides feedback on a previous iteration, incorporate their changes and improve your result.",
      },
      {
        role: "user",
        content: `Task: ${title}${description ? `\n\nDescription: ${description}` : ""}`,
      },
    ];

    // Add previous iterations as conversation context
    for (const iter of previousIterations) {
      messages.push({
        role: "assistant",
        content: iter.result,
      });
      if (iter.feedback) {
        messages.push({
          role: "user",
          content: `Feedback on iteration #${iter.number}: ${iter.feedback}`,
        });
      }
    }

    // If there's new feedback but no iteration yet recorded it
    if (feedback && previousIterations.length > 0) {
      const lastIter = previousIterations[previousIterations.length - 1];
      if (!lastIter.feedback) {
        messages.push({
          role: "user",
          content: `Feedback: ${feedback}`,
        });
      }
    }

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
    });

    const result = completion.choices[0]?.message?.content;

    if (!result) {
      throw new Error("Empty response from AI");
    }

    log("Response received successfully");
    log(`Tokens used: ${completion.usage?.total_tokens ?? "N/A"}`);

    // Save iteration
    await prisma.aiIteration.create({
      data: {
        taskId,
        number: iterationNumber,
        result,
        log: logs.join("\n"),
        state: "succeeded",
      },
    });

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

    // Save failed iteration
    await prisma.aiIteration.create({
      data: {
        taskId,
        number: iterationNumber,
        result: `AI error: ${errorMsg}`,
        log: logs.join("\n"),
        state: "failed",
      },
    });

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
