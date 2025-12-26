
import { GoogleGenAI } from "@google/genai";

const VALIDATION_PROMPT = `
STRICT ARCHIVAL VALIDATION:
Check if this image contains a clear, physical product or object (e.g., footwear, apparel, accessory, hardware, object).
If the image is a person's face (selfie), a landscape, a screenshot of text, a meme, or abstract clutter, you MUST respond with ONLY the word "REJECTED".
If it is a valid physical object, respond with ONLY the word "VALIDATED".
`;

const TRANSFORMATION_PROMPT = `
ARCHIVAL STUDIO ISOLATION:
- Detect the primary object in the image.
- Remove ALL background elements, "wallpaper", and clutter perfectly.
- Place the isolated object on a PURE #FFFFFF (absolute white) background.
- Apply matte studio lighting with soft, natural drop shadows.
- Ensure the object is centered and fills most of the frame.
- Aesthetic: High-end minimalist catalog photography, neutral tones.
- Do not add humans or limbs.
`;

/**
 * Validates and transforms an image for the archive.
 */
export async function processImageWithAI(base64Image: string): Promise<{ url: string | null; error: string | null }> {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return { url: null, error: "ARCHIVAL SIGNAL LOST: API_KEY missing." };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const base64Data = base64Image.split(',')[1] || base64Image;

    // STAGE 1: VALIDATION
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
    if (status === "REJECTED") {
      return { url: null, error: "INTAKE DENIED: IMAGE DOES NOT CONTAIN A VALID ARCHIVAL OBJECT." };
    }

    // STAGE 2: TRANSFORMATION
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
      for (const part of transformResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          return { 
            url: `data:image/png;base64,${part.inlineData.data}`, 
            error: null 
          };
        }
      }
    }

    return { url: base64Image, error: "TRANSFORMATION BYPASS: ISOLATION FAILED, USING SOURCE." };
  } catch (error: any) {
    console.error("AI Intake Failure:", error);
    return { url: null, error: "SIGNAL COLLISION: " + error.message };
  }
}
