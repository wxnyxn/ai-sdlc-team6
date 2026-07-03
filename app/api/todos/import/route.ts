// app/api/todos/import/route.ts
// Feature 09 — Export & Import
// POST: import todos from a previously exported JSON payload
// ID remapping is applied so no conflicts occur with existing data.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, subtaskDB, tagDB, userDB } from '@/lib/db';

async function resolveUserId(): Promise<number | null> {
  const session = await getSession();
  if (session) return session.userId;
  if (process.env.NODE_ENV !== 'production') {
    const user = userDB.findByUsername.get('dev');
    if (user) return user.id;
    const result = userDB.create.run('dev');
    return Number(result.lastInsertRowid);
  }
  return null;
}

interface ImportSubtask {
  title: string;
  completed: number;
  position: number;
}

interface ImportTag {
  name: string;
  color: string;
}

interface ImportTodo {
  title: string;
  completed: number;
  priority: string;
  due_date: string | null;
  recurrence_pattern: string | null;
  reminder_offset_minutes: number | null;
  subtasks?: ImportSubtask[];
  tags?: ImportTag[];
}

export async function POST(request: NextRequest) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { todos } = body as { todos?: ImportTodo[] };
  if (!Array.isArray(todos)) {
    return NextResponse.json({ error: 'Invalid import format: expected { todos: [] }' }, { status: 400 });
  }

  let imported = 0;

  for (const todo of todos) {
    if (!todo.title?.trim()) continue;

    const validPriorities = ['high', 'medium', 'low'];
    const priority = validPriorities.includes(todo.priority) ? todo.priority : 'medium';

    const todoResult = todoDB.create.run(
      userId,
      todo.title.trim(),
      priority,
      todo.due_date ?? null,
      todo.recurrence_pattern ?? null,
      todo.reminder_offset_minutes ?? null
    );
    const newTodoId = Number(todoResult.lastInsertRowid);

    // Restore completed state
    if (todo.completed) {
      todoDB.update.run(
        todo.title.trim(), priority, todo.due_date ?? null, 1,
        todo.recurrence_pattern ?? null, todo.reminder_offset_minutes ?? null,
        newTodoId, userId
      );
    }

    // Import subtasks
    if (Array.isArray(todo.subtasks)) {
      for (const sub of todo.subtasks) {
        if (!sub.title?.trim()) continue;
        const subResult = subtaskDB.create.run(newTodoId, sub.title.trim(), sub.position ?? 0);
        if (sub.completed) {
          subtaskDB.update.run(sub.title.trim(), 1, sub.position ?? 0, Number(subResult.lastInsertRowid));
        }
      }
    }

    // Import tags: find or create each tag, then attach
    if (Array.isArray(todo.tags)) {
      for (const tag of todo.tags) {
        if (!tag.name?.trim()) continue;

        // Try to find an existing tag with this name for this user
        const existingTags = tagDB.findByUserId.all(userId);
        let tagId: number | undefined = existingTags.find(
          (t) => t.name.toLowerCase() === tag.name.toLowerCase()
        )?.id;

        if (!tagId) {
          const tagResult = tagDB.create.run(userId, tag.name.trim(), tag.color ?? '#6b7280');
          tagId = Number(tagResult.lastInsertRowid);
        }

        tagDB.addToTodo.run(newTodoId, tagId);
      }
    }

    imported++;
  }

  return NextResponse.json({ imported }, { status: 201 });
}
