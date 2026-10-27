import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, userApiKey, imageBase64 } = await req.json();

    const activeKey = userApiKey || process.env.GEMINI_API_KEY;

    if (!activeKey) {
      return NextResponse.json(
        { error: 'Missing API Key. Please configure GEMINI_API_KEY in Vercel or input it in app settings.' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(activeKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    if (imageBase64) {
      const mimeType = imageBase64.split(';')[0].split(':')[1];
      const base64Data = imageBase64.split(',')[1];

      const imagePart = {
        inlineData: { data: base64Data, mimeType },
      };

      const result = await model.generateContent([
        `You are Optima AI, a professional mobile photo/video editor. Analyze this image and address this request: ${prompt}`,
        imagePart,
      ]);

      return NextResponse.json({ reply: result.response.text() });
    } else {
      const result = await model.generateContent(
        `You are Optima AI, an expert photo and video editing assistant. Provide concise guidance for: ${prompt}`
      );
      return NextResponse.json({ reply: result.response.text() });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 500 });
  }
}
