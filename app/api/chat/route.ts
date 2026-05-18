import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(req: NextRequest) {
  try {
    const { messages, conversationId, provider, apiKeys } = await req.json();
    const isTemporary = conversationId === null;
    let currentConversationId = conversationId;

    // 1. Create conversation if not exists and not temporary
    if (!currentConversationId && !isTemporary) {
      currentConversationId = uuidv4();
      const firstUserMessage = messages.find((m: any) => m.role === 'user')?.content || 'Novo Chat';
      const title = firstUserMessage.length > 30 ? firstUserMessage.substring(0, 30) + '...' : firstUserMessage;
      
      db.prepare('INSERT INTO conversations (id, title) VALUES (?, ?)')
        .run(currentConversationId, title);
    }

    // 2. Save the last message (the one just sent by the user) if not temporary
    if (!isTemporary) {
      const lastUserMsg = messages[messages.length - 1];
      db.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), currentConversationId, 'user', lastUserMsg.content);
    }

    let text = "";

    // 3. Generate response based on provider
    if (provider === 'Groq') {
       const key = apiKeys?.groq || process.env.GROQ_API_KEY;
       if (!key) throw new Error("Groq API Key não configurada");
       
       const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${key}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           model: "llama-3.3-70b-versatile",
           messages: messages.map((m: any) => ({ role: m.role, content: m.content }))
         })
       });
       const data = await res.json();
       text = data.choices?.[0]?.message?.content || "Erro no Groq";
    } else if (provider === 'Deepseek') {
       const key = apiKeys?.deepseek || process.env.DEEPSEEK_API_KEY;
       if (!key) throw new Error("Deepseek API Key não configurada");

       const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${key}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           model: "deepseek-chat",
           messages: messages.map((m: any) => ({ role: m.role, content: m.content }))
         })
       });
       const data = await res.json();
       text = data.choices?.[0]?.message?.content || "Erro no Deepseek";
    } else {
      // Default: Gemini
      const geminiKey = apiKeys?.gemini || process.env.GEMINI_API_KEY || "";
      const customClient = new GoogleGenAI({ 
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const contents = messages.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const response = await customClient.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents,
      });

      text = response.text || "Desculpe, tive um erro ao processar.";
    }

    // 4. Save assistant response if not temporary
    if (!isTemporary) {
      db.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), currentConversationId, 'assistant', text);

      // Update conversation timestamp
      db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(currentConversationId);
    }

    return NextResponse.json({ 
      role: "assistant", 
      content: text,
      conversationId: currentConversationId 
    });
  } catch (error: any) {
    console.error("LLM API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate response" }, { status: 500 });
  }
}
