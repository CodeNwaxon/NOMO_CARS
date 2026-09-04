import { NextResponse } from 'next/server';
import translate from 'google-translate-api-x';

export async function POST(req: Request) {
  try {
    const { text, targetLang } = await req.json();

    if (!text || !targetLang) {
      return NextResponse.json({ error: 'Missing text or target language' }, { status: 400 });
    }

    const res = await translate(text, { to: targetLang }) as any;
    
    return NextResponse.json({ translatedText: res.text });
  } catch (error: any) {
    console.error("Translation API Error:", error);
    return NextResponse.json({ error: 'Failed to translate' }, { status: 500 });
  }
}
