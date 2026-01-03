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
 * @param description - Optional description of the food (e.g., "khichdi 200g with curd 30g")
 * @returns Nutritional macros for the food
 */
export const analyzeFoodImage = async (
  imageBuffer: Buffer,
  mimeType: string,
  description?: string
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
    const descriptionContext = description
      ? `User description: "${description}". Use this to understand what food items are present and their quantities.`
      : 'Estimate based on visual analysis and assume a standard serving size.';

    const prompt = `Analyze this food image and provide accurate nutritional information.

${descriptionContext}

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

// Goal calculation interfaces
export interface GoalCalculationInput {
  gender: 'male' | 'female' | 'other';
  age: number;
  height: number; // cm
  currentWeight: number; // kg
  targetWeight?: number; // kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  fitnessGoal: 'lose_weight' | 'maintain' | 'gain_muscle' | 'gain_weight';
}

export interface GoalCalculationResult {
  success: boolean;
  data?: {
    caloriesIntake: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number; // ml
    caloriesBurn: number;
    explanation: string;
    tips: string[];
  };
  error?: string;
}

/**
 * Calculate personalized fitness goals using Gemini AI
 * @param input - User's personal information and goals
 * @returns Calculated macro targets and recommendations
 */
export const calculateGoalsWithAI = async (
  input: GoalCalculationInput
): Promise<GoalCalculationResult> => {
  try {
    if (!GEMINI_CONFIG.API_KEY) {
      return {
        success: false,
        error: 'Gemini API key is not configured',
      };
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an expert nutritionist and fitness coach. Calculate personalized daily nutrition goals for this person.

User Profile:
- Gender: ${input.gender}
- Age: ${input.age} years
- Height: ${input.height} cm
- Current Weight: ${input.currentWeight} kg
${input.targetWeight ? `- Target Weight: ${input.targetWeight} kg` : ''}
- Activity Level: ${input.activityLevel.replace('_', ' ')}
- Fitness Goal: ${input.fitnessGoal.replace('_', ' ')}

Calculate and provide the following in JSON format ONLY (no markdown, no explanations outside JSON):

{
  "caloriesIntake": number (daily calorie intake target),
  "protein": number (grams per day),
  "carbs": number (grams per day),
  "fat": number (grams per day),
  "water": number (ml per day, typically 2000-4000),
  "caloriesBurn": number (recommended daily calories to burn through exercise),
  "explanation": "Brief explanation of how these values were calculated",
  "tips": ["tip1", "tip2", "tip3"] (3 personalized tips for achieving their goal)
}

Important:
- Use scientifically-backed formulas (Mifflin-St Jeor for BMR, appropriate activity multipliers)
- Adjust macros based on fitness goal (higher protein for muscle gain/weight loss, appropriate deficit/surplus)
- Consider the person's age, gender, and activity level
- Provide realistic, achievable targets
- Return ONLY the JSON object`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Log token usage
    const usageMetadata = response.usageMetadata;
    if (usageMetadata) {
      console.log('🔢 Gemini Token Usage (Goals):', {
        promptTokens: usageMetadata.promptTokenCount,
        candidatesTokens: usageMetadata.candidatesTokenCount,
        totalTokens: usageMetadata.totalTokenCount,
      });
    }

    // Parse the JSON response
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

    const goals = JSON.parse(jsonText);

    // Validate the response
    if (
      typeof goals.caloriesIntake !== 'number' ||
      typeof goals.protein !== 'number' ||
      typeof goals.carbs !== 'number' ||
      typeof goals.fat !== 'number'
    ) {
      return {
        success: false,
        error: 'Invalid response format from Gemini',
      };
    }

    // Round values
    goals.caloriesIntake = Math.round(goals.caloriesIntake);
    goals.protein = Math.round(goals.protein);
    goals.carbs = Math.round(goals.carbs);
    goals.fat = Math.round(goals.fat);
    goals.water = Math.round(goals.water || 2500);
    goals.caloriesBurn = Math.round(goals.caloriesBurn || 300);

    return {
      success: true,
      data: goals,
    };
  } catch (error) {
    console.error('Gemini goal calculation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate goals',
    };
  }
};

