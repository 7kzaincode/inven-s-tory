
import { GoogleGenAI } from "@google/genai";

/**
 * Processes an image using Gemini AI to ensure archival compliance.
 * Updated to accept base64Image as an argument to resolve the TypeScript error in ProfilePage.tsx.
 */
export async function processImageWithAI(base64Image: string) {
  // Always initialize GoogleGenAI with a named apiKey parameter from process.env.API_KEY.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // Extract base64 encoded data and the MIME type from the Data URL.
    const parts = base64Image.split(',');
    const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const base64Data = parts[1] || base64Image;

    // Use gemini-3-flash-preview for high-performance classification tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Assess if this image is a suitable profile picture for an archival community platform. Respond with 'VALID' if it is appropriate, or 'INVALID' if it violates community standards.",
          },
        ],
      },
    });

    // Access the text property directly from the GenerateContentResponse.
    const resultText = response.text?.trim().toUpperCase();

    if (resultText === 'VALID') {
      return { url: base64Image, error: null };
    } else {
      return { url: null, error: "ARCHIVAL_REJECTION: Image failed compliance check." };
    }
  } catch (error) {
    console.error("Gemini AI Processing Exception:", error);
    // Graceful fallback to avoid blocking the user flow if the AI service is unavailable.
    return { url: base64Image, error: null };
  }
}
