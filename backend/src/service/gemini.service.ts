import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { GEMINI_CONFIG } from '../config/config';

// Initialize Gemini with default API key
const genAI = new GoogleGenerativeAI(GEMINI_CONFIG.API_KEY);

// Helper to get Gemini client with user's API key (no fallback to env)
const getGeminiClient = (userApiKey: string): GoogleGenerativeAI => {
  if (!userApiKey?.trim()) {
    throw new Error('No Gemini API key available');
  }
  return new GoogleGenerativeAI(userApiKey.trim());
};

// Available Gemini models for user selection
export const GEMINI_MODELS = [
  // Stable/current model IDs (avoid dated preview IDs; they frequently expire)
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast and efficient (recommended)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most capable' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Fastest and most cost-efficient' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', description: 'Latest preview, fast' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)', description: 'Latest preview, most intelligent' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Stable, fast' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Stable, balanced' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Stable, most capable (older gen)' },
] as const;

export type GeminiModelId = typeof GEMINI_MODELS[number]['id'];

export interface ApiKeyValidationResult {
  success: boolean;
  valid: boolean;
  error?: string;
  modelsTested?: string[];
}

/**
 * Validate a Gemini API key by making a simple test request
 * @param apiKey - The API key to validate
 * @param modelId - Optional model to test with
 * @returns Validation result with status
 */
export const validateGeminiApiKey = async (
  apiKey: string,
  modelId: string = 'gemini-2.5-flash'
): Promise<ApiKeyValidationResult> => {
  try {
    if (!apiKey?.trim()) {
      return {
        success: true,
        valid: false,
        error: 'API key is empty',
      };
    }

    const client = new GoogleGenerativeAI(apiKey.trim());
    const model = client.getGenerativeModel({ model: modelId });

    // Make a simple test request
    const result = await model.generateContent('Say "OK" if you can read this.');
    const response = result.response;
    const text = response.text();

    // Check if we got a valid response
    if (text && text.length > 0) {
      return {
        success: true,
        valid: true,
        modelsTested: [modelId],
      };
    }

    return {
      success: true,
      valid: false,
      error: 'API key did not return a valid response',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for common error patterns
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid')) {
      return {
        success: true,
        valid: false,
        error: 'Invalid API key',
      };
    }

    if (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      return {
        success: true,
        valid: false,
        error: 'API key has exceeded its quota. Please check your billing or wait for quota reset.',
      };
    }

    if (errorMessage.includes('permission') || errorMessage.includes('PERMISSION_DENIED')) {
      return {
        success: true,
        valid: false,
        error: 'API key does not have permission to use this model',
      };
    }

    return {
      success: false,
      valid: false,
      error: errorMessage,
    };
  }
};

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

// Movie recommendation interfaces
export interface WatchedMovie {
  title: string;
  genres: string[];
  rating?: number;
  releaseDate?: string;
  isFavorite?: boolean;
}

export interface MovieRecommendationInput {
  contentType: 'movie' | 'series' | 'any';
  watchedMovies: WatchedMovie[];
  mood?: string;
  userApiKey?: string;
  modelId?: string;
  excludedTitles?: string[]; // Previously shown recommendations to exclude
}

export interface MovieRecommendationResult {
  success: boolean;
  data?: {
    title: string;
    year?: string;
    genres: string[];
    reason: string;
    tmdbSearchQuery: string;
    alternativeRecommendations: Array<{
      title: string;
      year?: string;
      reason: string;
    }>;
  };
  error?: string;
}

/**
 * Get personalized movie/series recommendation using Gemini AI
 * @param input - User's preferences and watch history
 * @returns Recommended movie/series with reasoning
 */
export const getMovieRecommendation = async (
  input: MovieRecommendationInput
): Promise<MovieRecommendationResult> => {
  try {
    console.log('🎬 getMovieRecommendation called');
    const apiKey = input.userApiKey?.trim();
    if (!apiKey) {
      console.log('❌ No API key provided');
      return {
        success: false,
        error: 'No Gemini API key configured. Please add your API key in Settings.',
      };
    }

    console.log('🔑 Using API key (first 10 chars):', apiKey.substring(0, 10) + '...');
    const client = getGeminiClient(apiKey);
    const modelId = input.modelId || 'gemini-2.0-flash';
    console.log('🤖 Using model:', modelId);
    const model = client.getGenerativeModel({ model: modelId });

    // Prepare watch history summary
    const favoriteMovies = input.watchedMovies.filter(m => m.isFavorite);
    const highRatedMovies = input.watchedMovies.filter(m => m.rating && m.rating >= 8);

    // Get genre preferences from watch history
    const genreCount: Record<string, number> = {};
    input.watchedMovies.forEach(movie => {
      movie.genres?.forEach(genre => {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      });
    });
    const topGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);

    const contentTypeText = input.contentType === 'movie'
      ? 'a movie'
      : input.contentType === 'series'
        ? 'a TV series'
        : 'either a movie or TV series';

    const prompt = `You are an expert movie and TV series recommender. Based on the user's watch history and preferences, recommend ${contentTypeText} they would love.

User's Watch History Analysis:
- Total watched: ${input.watchedMovies.length} items
- Top genres: ${topGenres.join(', ') || 'Various'}
- Favorite titles: ${favoriteMovies.slice(0, 5).map(m => m.title).join(', ') || 'None marked'}
- Highly rated (8+): ${highRatedMovies.slice(0, 5).map(m => `${m.title} (${m.rating}/10)`).join(', ') || 'None'}

Recent watched titles (for context):
${input.watchedMovies.slice(0, 15).map(m => `- ${m.title}${m.rating ? ` (Rating: ${m.rating}/10)` : ''}${m.genres?.length ? ` [${m.genres.join(', ')}]` : ''}`).join('\n')}

${input.mood ? `User's current mood/preference: ${input.mood}` : ''}

IMPORTANT: Do NOT recommend any title the user has already watched. The recommendation should be something new they haven't seen.
${input.excludedTitles && input.excludedTitles.length > 0 ? `\nALSO IMPORTANT: Do NOT recommend these titles as they were already shown to the user:\n${input.excludedTitles.map(t => `- ${t}`).join('\n')}` : ''}

Provide a recommendation in JSON format ONLY (no markdown, no explanations outside JSON):

{
  "title": "exact title of the recommended ${input.contentType === 'series' ? 'series' : 'movie'}",
  "year": "release year (optional)",
  "genres": ["genre1", "genre2"],
  "reason": "2-3 sentences explaining why this is perfect for them based on their taste",
  "tmdbSearchQuery": "optimal search query to find this on TMDB",
  "alternativeRecommendations": [
    {
      "title": "alternative recommendation 1",
      "year": "year",
      "reason": "brief reason"
    },
    {
      "title": "alternative recommendation 2",
      "year": "year",
      "reason": "brief reason"
    }
  ]
}

Important:
- Choose a well-known, critically acclaimed ${input.contentType === 'series' ? 'series' : 'movie'} that matches their taste
- Consider their genre preferences and highly-rated titles
- The recommendation should feel personalized, not generic
- Provide 2 alternatives in case the main recommendation doesn't appeal
- Return ONLY the JSON object`;

    console.log('📤 Sending request to Gemini...');
    const result = await model.generateContent(prompt);
    console.log('📥 Received response from Gemini');
    const response = result.response;
    const text = response.text();
    console.log('📝 Response text length:', text.length);

    // Log token usage
    const usageMetadata = response.usageMetadata;
    if (usageMetadata) {
      console.log('🔢 Gemini Token Usage (Movie Recommendation):', {
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

    const recommendation = JSON.parse(jsonText);

    // Validate the response
    if (!recommendation.title || !recommendation.reason) {
      return {
        success: false,
        error: 'Invalid response format from Gemini',
      };
    }

    return {
      success: true,
      data: recommendation,
    };
  } catch (error) {
    console.error('❌ Gemini movie recommendation error:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error name:', error instanceof Error ? error.name : 'unknown');
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && 'stack' in error) {
      console.error('❌ Stack:', error.stack);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get recommendation',
    };
  }
};
