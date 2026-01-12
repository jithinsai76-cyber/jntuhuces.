import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export async function POST(req: Request) {
    try {
        const { image, apiKey } = await req.json();

        if (!apiKey) {
            return NextResponse.json({ error: "API Key required" }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Determine mimeType from header if present
        const mimeTypeMatch = image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";

        // Remove header from base64 string if present (data:image/jpeg;base64,...)
        const base64Data = image.split(',')[1] || image;

        const prompt = `
            You are an expert Assignment Checker. 
            Step 1: Read ALL text from this image exactly as it is written. Fix any obvious OCR errors but stay true to the image.
            Step 2: Analyze the extraction. Does the writing style sound like an AI (ChatGPT/Claude) or a Human Student?
            
            Look for:
            - AI: "In conclusion", "It is important to note", overly structured lists, perfect grammar, robotic tone.
            - Human: Natural flow, minor errors, conversational tone, personal opinion.

            Return ONLY a valid JSON object (no markdown) with this structure:
            {
                "extractedText": "The full text found in the image...",
                "aiLimit": 0 to 100 (where 100 is definitely AI, 0 is definitely handwritten human),
                "reasoning": "A short explanation of why you think so."
            }
        `;

        // Use stable Gemini 1.5 Flash (Lens technology)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Data, mimeType: mimeType } }
        ]);

        const response = await result.response;
        const text = response.text();

        // Clean markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        return NextResponse.json(data);

    } catch (error) {
        console.error("Gemini Analysis Failed:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: `Analysis failed: ${errorMessage}. Check API Key or Image.` }, { status: 500 });
    }
}
