import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { GEMINI_CONFIG } from '../config/config';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_CONFIG.API_KEY);

export interface FoodMacros {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  servingSize: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface FoodAnalysisResult {
  success: boolean;
  data?: FoodMacros;
  error?: string;
}

/**
 * Analyze a food image using Gemini Vision and return nutritional information
 * @param imageBuffer - The image buffer
 * @param mimeType - The MIME type of the image (e.g., 'image/jpeg', 'image/png')
 * @param quantity - Optional quantity description (e.g., "200g", "1 cup", "2 pieces")
 * @returns Nutritional macros for the food
 */
export const analyzeFoodImage = async (
  imageBuffer: Buffer,
  mimeType: string,
  quantity?: string
): Promise<FoodAnalysisResult> => {
  try {
    if (!GEMINI_CONFIG.API_KEY) {
      return {
        success: false,
        error: 'Gemini API key is not configured',
      };
    }

    // Use Gemini 2.0 Flash model for vision
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');

    // Create image part for Gemini
    const imagePart: Part = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    // Build the prompt
    const quantityContext = quantity
      ? `The quantity/serving size is: ${quantity}.`
      : 'Estimate a standard serving size.';

    const prompt = `Analyze this food image and provide accurate nutritional information.

${quantityContext}

Please identify the food and provide the following nutritional data in JSON format ONLY (no markdown, no explanations):

{
  "name": "food name",
  "calories": number (kcal),
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "fiber": number (grams, optional),
  "sugar": number (grams, optional),
  "servingSize": "description of serving size analyzed",
  "confidence": "high" | "medium" | "low"
}

Important:
- Be as accurate as possible with the nutritional values
- If you can identify the exact food, use standard nutritional databases values
- If it's a home-cooked meal, estimate based on visible ingredients
- Set confidence to "high" if the food is clearly identifiable, "medium" if somewhat unclear, "low" if you're guessing
- Return ONLY the JSON object, no other text`;

    // Generate content with the image
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const text = response.text();

    // Log token usage
    const usageMetadata = response.usageMetadata;
    if (usageMetadata) {
      console.log('🔢 Gemini Token Usage:', {
        promptTokens: usageMetadata.promptTokenCount,
        candidatesTokens: usageMetadata.candidatesTokenCount,
        totalTokens: usageMetadata.totalTokenCount,
      });
    }

    // Parse the JSON response
    // Clean up the response (remove markdown code blocks if present)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const macros: FoodMacros = JSON.parse(jsonText);

    // Validate the response has required fields
    if (
      typeof macros.calories !== 'number' ||
      typeof macros.protein !== 'number' ||
      typeof macros.carbs !== 'number' ||
      typeof macros.fat !== 'number'
    ) {
      return {
        success: false,
        error: 'Invalid response format from Gemini',
      };
    }

    // Round to reasonable precision
    macros.calories = Math.round(macros.calories);
    macros.protein = Math.round(macros.protein * 10) / 10;
    macros.carbs = Math.round(macros.carbs * 10) / 10;
    macros.fat = Math.round(macros.fat * 10) / 10;
    if (macros.fiber) macros.fiber = Math.round(macros.fiber * 10) / 10;
    if (macros.sugar) macros.sugar = Math.round(macros.sugar * 10) / 10;

    return {
      success: true,
      data: macros,
    };
  } catch (error) {
    console.error('Gemini food analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze food image',
    };
  }
};

