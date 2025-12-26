
import { GoogleGenAI } from "@google/genai";

const VALIDATION_PROMPT = `
STRICT ARCHIVAL VALIDATION:
Check if this image contains a clear, physical product or object (e.g., footwear, apparel, accessory, hardware, electronics, furniture).
If the image is a person's face (selfie), a landscape, a screenshot of text, a meme, abstract clutter, or an empty room, you MUST respond with ONLY the word "REJECTED".
If it is a valid physical object that can be owned/collected, respond with ONLY the word "VALIDATED".
`;

const TRANSFORMATION_PROMPT = `
CRITICAL STUDIO ISOLATION PROTOCOL:
1. Identify the ONE primary physical object in the image.
2. REMOVE ALL background elements, including walls, floors, "wallpaper", furniture, and shadows.
3. EXTRACT ONLY the object.
4. Place the object on a PURE ABSOLUTE WHITE (#FFFFFF) background.
5. Apply professional studio lighting.
6. Center the object and ensure it fills 85% of the frame.
7. AESTHETIC: High-end minimalist catalog shot. Pure, clean, archival.
8. Output the object isolated.
`;

/**
 * Validates and transforms an image for the archive.
 */
export async function processImageWithAI(base64Image: string): Promise<{ url: string | null; error: string | null }> {
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey.length < 10) {
    return { url: null, error: "ARCHIVAL SIGNAL LOST: Invalid or missing API_KEY." };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const base64Data = base64Image.split(',')[1] || base64Image;

    // STAGE 1: STRICT VALIDATION (Gemini 3 Pro for high-level reasoning)
    const validationResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
          { text: VALIDATION_PROMPT }
        ]
      }
    });

    const status = validationResponse.text?.trim().toUpperCase();
    if (status?.includes("REJECTED")) {
      return { url: null, error: "INTAKE DENIED: ASSET DOES NOT MEET ARCHIVAL STANDARDS (NOT A CLEAR OBJECT)." };
    }

    // STAGE 2: TRANSFORMATION (Gemini 2.5 Flash Image for editing)
    const transformResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
          { text: TRANSFORMATION_PROMPT }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    if (transformResponse.candidates?.[0]?.content?.parts) {
      // Robustly search for the first image part in the response
      const imagePart = transformResponse.candidates[0].content.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        return { 
          url: `data:image/png;base64,${imagePart.inlineData.data}`, 
          error: null 
        };
      }
    }

    // Fallback if transformation didn't return an image part
    return { url: null, error: "TRANSFORMATION ERROR: ARCHIVAL ISOLATION ENGINE FAILED TO OUTPUT MASKED ASSET." };
  } catch (error: any) {
    console.error("AI Intake Failure:", error);
    if (error.message?.includes("API key")) {
      return { url: null, error: "ARCHIVAL SIGNAL FAILURE: The API key provided is rejected by the central node." };
    }
    return { url: null, error: "SIGNAL COLLISION: " + error.message };
  }
}
