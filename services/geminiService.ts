import { GoogleGenAI } from "@google/genai";

const TRANSFORM_PROMPT = `
YEEZY PRODUCT IMAGE TRANSFORM:
Neutral white or cloudy background
Matte lighting
Soft shadows
No environment or room context
Centered floating product
Square or near-square crop
Studio catalog energy
Remove clutter, wrinkles, and distracting texture
Do NOT stylize like fashion editorials
Do NOT add color grading
This should look like yeezy supply product images
`;

export async function processImageWithAI(base64Image: string): Promise<string | null> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY not found in environment.");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // We use gemini-2.5-flash-image for image processing tasks
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