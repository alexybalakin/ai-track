import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import OpenAI from "openai";

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
  const { columnId, order, feedback } = await req.json();

  if (!columnId) {
    return NextResponse.json({ error: "columnId is required" }, { status: 400 });
  }

  // Verify target column exists
  const targetColumn = await prisma.boardColumn.findUnique({
    where: { id: columnId },
  });

  if (!targetColumn) {
    return NextResponse.json({ error: "Column not found" }, { status: 400 });
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
      column: true,
      aiIterations: { orderBy: { number: "desc" }, take: 1 },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const wasInAiColumn = task.column?.aiEnabled ?? false;
  const movingToAiColumn = targetColumn.aiEnabled;

  const updateData: Record<string, unknown> = {
    columnId,
    status: targetColumn.title, // keep status in sync for display
    order: order ?? task.order,
  };

  // When moving to an AI-enabled column, trigger AI
  if (movingToAiColumn && !wasInAiColumn) {
    updateData.aiState = "running";

    // If there's feedback (returning from review), save it on the last iteration
    if (feedback && task.aiIterations.length > 0) {
      await prisma.aiIteration.update({
        where: { id: task.aiIterations[0].id },
        data: { feedback },
      });
    }
  }

  // When moving away from AI column to a non-AI column that isn't "downstream"
  // Reset AI state only if task had failed
  if (!movingToAiColumn && task.aiState === "failed") {
    updateData.aiState = "idle";
  }

  const updated = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      _count: { select: { comments: true } },
      aiIterations: { orderBy: { number: "asc" } },
    },
  });

  // Run AI processing when moved to an AI-enabled column
  if (movingToAiColumn && !wasInAiColumn) {
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

  // Get the task to find the board's review-like column (first non-AI column after AI column)
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      board: {
        include: {
          columns: { orderBy: { order: "asc" } },
        },
      },
      column: true,
    },
  });

  // Find the next non-AI column for success, and a "todo-like" column for failure
  const columns = task?.board.columns || [];
  const currentColOrder = task?.column?.order ?? 0;
  const reviewColumn = columns.find(
    (c) => !c.aiEnabled && c.order > currentColOrder
  );
  const todoColumn = columns.find((c) => !c.aiEnabled && c.order === 0) || columns[0];

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
        columnId: reviewColumn?.id,
        status: reviewColumn?.title || "Review",
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
        columnId: todoColumn?.id,
        status: todoColumn?.title || "To Do",
      },
    });
  }
}
