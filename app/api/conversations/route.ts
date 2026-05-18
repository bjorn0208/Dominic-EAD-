import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const conversations = db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all();
    return NextResponse.json(conversations);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title } = await req.json();
    const id = uuidv4();
    const stmt = db.prepare('INSERT INTO conversations (id, title) VALUES (?, ?)');
    stmt.run(id, title || 'Novo Chat');
    
    return NextResponse.json({ id, title: title || 'Novo Chat' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
