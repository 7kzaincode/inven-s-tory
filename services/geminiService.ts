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

/**
 * Processes an image using Gemini AI to isolate the product on a white background.
 * Adheres to the @google/genai coding guidelines.
 */
export async function processImageWithAI(base64Image: string): Promise<string | null> {
  // Use process.env.API_KEY directly as per SDK requirements. 
  // This variable is assumed to be pre-configured.
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.error("Critical Error: process.env.API_KEY is not defined. Archival intake failed.");
    return null;
  }

  try {
    // Initialize the SDK instance right before the call to ensure up-to-date configuration.
    const ai = new GoogleGenAI({ apiKey });
    
    // Using gemini-2.5-flash-image for image generation tasks.
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

    // Iterate through candidates and parts to locate the processed image.
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
