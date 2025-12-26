import { GoogleGenAI } from "@google/genai";

const TRANSFORM_PROMPT = `
YEEZY PRODUCT IMAGE TRANSFORM:
- Pure neutral white or light grey background
- Matte lighting, soft shadows
- Centered floating product
- Minimalist e-commerce catalog aesthetic
- Remove all clutter, backgrounds, and human elements
- Output: Isolated object on white
`;

export async function processImageWithAI(base64Image: string): Promise<string | null> {
  // Use process.env.API_KEY as mandated by the SDK instructions
  const apiKey = (window as any).process?.env?.API_KEY;
  
  if (!apiKey) {
    console.error("Gemini API_KEY not found. Ensure process.env.API_KEY is configured.");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: 'image/jpeg',
            },
          },
          {
            text: TRANSFORM_PROMPT,
          },
        ],
      },
    });

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error processing image with Gemini:", error);
    return null;
  }
}