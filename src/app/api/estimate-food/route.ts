import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType = "image/jpeg", customApiKey, promptNote } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image data (Base64) is required." },
        { status: 400 }
      );
    }

    // Resolve API Key: custom key from client settings OR server environment variable
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your-gemini-api-key") {
      // Return a smart simulated estimation if API key is not yet set up,
      // so the user can test the UI experience immediately without crashing!
      return NextResponse.json({
        items: [
          {
            name: "1 Ekor Ikan Kembung Bakar",
            portion: "1 ekor sedang (80g daging)",
            calories: 160,
            protein: 22,
            carbs: 0,
            fat: 8,
          },
          {
            name: "Nasi Merah Matang",
            portion: "1 centong (100g)",
            calories: 111,
            protein: 2.6,
            carbs: 23,
            fat: 0.9,
          },
          {
            name: "Sayur Bening Bayam",
            portion: "1 mangkuk kecil",
            calories: 45,
            protein: 3,
            carbs: 7,
            fat: 0.5,
          },
        ],
        total_calories: 316,
        total_protein: 27.6,
        advice:
          "[Demo Mode] Sangat ideal untuk cutting! Tinggi protein dari ikan kembung, serat kompleks dari nasi merah dan bayam. Masukkan GEMINI_API_KEY di Settings untuk live AI scan.",
        isDemoFallback: true,
      });
    }

    // Clean base64 string
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.8-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const systemPrompt = `
You are an expert Indonesian sports nutritionist and cutting diet specialist for a male in cutting phase (Target weight loss, high protein >=110g/day, calorie deficit 1600 kcal/day).
Analyze the food photo provided. Accurately recognize Indonesian local dishes, ingredients, and portions (e.g., ikan kembung, telur rebus, telur dadar/ceplok, terong balado teri, nasi merah, nasi putih, tempe goreng/kukus, tahu, dada ayam, sayur lodeh, sayur bayam, tumis kangkung, sambal, etc.).

Return a strict JSON object with this exact schema:
{
  "items": [
    {
      "name": "string (Dish name in Indonesian with estimated portion, e.g. '1 Ekor Ikan Kembung Bakar')",
      "portion": "string (e.g. '1 ekor sedang (100g)' or '1 centong nasi (120g)')",
      "calories": number (integer kcal),
      "protein": number (integer or rounded 1 decimal grams of protein),
      "carbs": number (estimated grams of carbohydrates),
      "fat": number (estimated grams of fat)
    }
  ],
  "total_calories": number (sum of calories),
  "total_protein": number (sum of protein),
  "advice": "string (1-2 sentences practical cutting advice in Indonesian evaluating protein density and oil/fat content)"
}

${promptNote ? `Additional user context: ${promptNote}` : ""}
Estimate realistically, taking cooking method into account (fried/oil adds fat calories, boiled/grilled preserves protein with less calories).
`;

    const result = await model.generateContent([
      systemPrompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ]);

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Error in estimate-food API:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to estimate nutrition from food image.",
      },
      { status: 500 }
    );
  }
}
