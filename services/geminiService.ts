import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TakeoffResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const takeoffSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    projectName: {
      type: Type.STRING,
      description: "A suitable name for the project derived from the drawing title block if available, otherwise a generic name.",
    },
    summary: {
      type: Type.STRING,
      description: "A brief executive summary of what is being measured in this drawing.",
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Unique identifier for the item (e.g., 1, 2, A, B)" },
          item: { type: Type.STRING, description: "Name of the material or component (e.g., '2x4 Studs', 'Concrete Slab')" },
          description: { type: Type.STRING, description: "Detailed specification or location info" },
          quantity: { type: Type.NUMBER, description: "Estimated quantity count or measurement" },
          unit: { type: Type.STRING, description: "Unit of measurement (e.g., ea, sqft, lft, m2, m3)" },
          category: { type: Type.STRING, description: "Construction category (e.g., Structural, Electrical, Plumbing, Finishes)" },
          confidence: { type: Type.STRING, description: "Confidence level of the extraction: High, Medium, or Low" }
        },
        required: ["id", "item", "quantity", "unit", "category", "confidence"],
      },
    },
  },
  required: ["projectName", "items", "summary"],
};

export const generateTakeoff = async (base64Data: string, mimeType: string): Promise<TakeoffResult> => {
  try {
    const model = "gemini-2.5-flash"; // Best for speed/multimodal
    
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `You are an expert Senior Quantity Surveyor. Analyze this construction drawing (blueprint) or document.
            
            Perform a detailed material takeoff. 
            1. Identify all distinct structural elements, materials, and fixtures visible.
            2. Estimate quantities based on visual count or standard engineering assumptions if explicit dimensions are hard to read.
            3. Group items into logical construction categories (Structural, Electrical, etc.).
            4. If the image is partial, estimate based on visible area.
            
            Return the data in strict JSON format matching the provided schema.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: takeoffSchema,
        temperature: 0.2, // Low temperature for factual extraction
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as TakeoffResult;
    } else {
      throw new Error("No response text received from Gemini.");
    }

  } catch (error) {
    console.error("Gemini Takeoff Error:", error);
    throw error;
  }
};
