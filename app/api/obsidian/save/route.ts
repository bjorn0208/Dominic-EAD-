import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { title, content, tags } = await req.json();
    
    // In a real environment, this would write to a local file system 
    // or call the Obsidian Local REST API.
    // Here we simulate success.
    console.log(`Saving note to Obsidian: ${title}`);
    console.log(`Content: ${content}`);
    console.log(`Tags: ${tags}`);

    return NextResponse.json({ 
      success: true, 
      message: "Nota salva no Obsidian com sucesso!",
      path: `Notes/${title}.md`
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao salvar nota" }, { status: 500 });
  }
}
