// app/api/todos/export/route.ts
// Feature 09 — Export & Import
// GET: export all todos (with subtasks and tags) as JSON

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
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

export async function GET() {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const todos = todoDB.findAllByUserId.all(userId);

  const exportData = todos.map((todo) => ({
    ...todo,
    subtasks: subtaskDB.findByTodoId.all(todo.id),
    tags: tagDB.findByTodoId.all(todo.id),
  }));

  return NextResponse.json(
    { todos: exportData, exportedAt: new Date().toISOString() },
    {
      headers: {
        'Content-Disposition': 'attachment; filename="todos-export.json"',
        'Content-Type': 'application/json',
      },
    }
  );
}
