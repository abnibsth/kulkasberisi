import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  let ingredients: any[] = [];
  
  try {
    const body = await req.json();
    ingredients = body.ingredients || [];
    const filters = body.filters;

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { error: "Ingredients are required" },
        { status: 400 }
      );
    }

    const ingredientList = ingredients
      .map((ing: { name: string; quantity: number; unit: string }) =>
        `${ing.name} (${ing.quantity} ${ing.unit})`
      )
      .join(", ");

    const prompt = `Generate 3-5 creative recipes based on these available ingredients: ${ingredientList}

${filters?.difficulty ? `Difficulty level: ${filters.difficulty}` : ""}
${filters?.maxTime ? `Maximum cooking time: ${filters.maxTime} minutes` : ""}
${filters?.vegetarian ? "Must be vegetarian" : ""}
${filters?.halal ? "Must be halal" : ""}

For each recipe, provide:
1. Recipe name
2. Description (1-2 sentences)
3. Prep time in minutes
4. Cook time in minutes
5. Servings
6. Difficulty (easy, medium, hard)
7. Calories (approximate)
8. Ingredients list with quantities
9. Step-by-step instructions
10. Match percentage (what % of the recipe can be made with available ingredients)

Respond in JSON format with this structure:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "description": "Brief description",
      "prepTime": 10,
      "cookTime": 20,
      "servings": 4,
      "difficulty": "easy",
      "calories": 350,
      "ingredients": [
        {"name": "Ingredient", "quantity": 100, "unit": "gram"}
      ],
      "instructions": ["Step 1", "Step 2"],
      "matchPercentage": 85
    }
  ]
}

Respond in Indonesian language.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a creative chef assistant that generates delicious recipes based on available ingredients. You respond in Indonesian and always provide structured JSON output.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const content = completion.choices[0].message.content;
    
    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON response");
    }

    const recipes = JSON.parse(jsonMatch[0]);

    return NextResponse.json(recipes);
  } catch (error) {
    console.error("Recipe generation error:", error);

    // Fallback mock response if API fails
    return NextResponse.json({
      recipes: [
        {
          name: "Resep Mock 1",
          description: "Resep contoh berdasarkan bahan tersedia",
          prepTime: 10,
          cookTime: 20,
          servings: 4,
          difficulty: "easy",
          calories: 350,
          ingredients: (ingredients || []).map((ing: any) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
          instructions: [
            "Siapkan semua bahan",
            "Campur dan olah sesuai selera",
            "Sajikan hangat",
          ],
          matchPercentage: 80,
        },
      ],
    });
  }
}
