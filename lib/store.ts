import { create } from "zustand";

export interface Ingredient {
  id?: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  barcode?: string;
}

export interface Recipe {
  id?: string;
  name: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  calories?: number;
  instructions: string[];
  imageUrl?: string;
  source: string;
  matchPercentage?: number;
  ingredients?: { name: string; quantity: number; unit: string }[];
}

interface AppState {
  // Ingredients
  ingredients: Ingredient[];
  addIngredient: (ingredient: Ingredient) => void;
  updateIngredient: (id: string, ingredient: Partial<Ingredient>) => void;
  removeIngredient: (id: string) => void;
  clearIngredients: () => void;

  // Recipes
  generatedRecipes: Recipe[];
  savedRecipes: Recipe[];
  setGeneratedRecipes: (recipes: Recipe[]) => void;
  saveRecipe: (recipe: Recipe) => void;
  removeSavedRecipe: (id: string) => void;

  // UI State
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Ingredients state
  ingredients: [],
  addIngredient: (ingredient) =>
    set((state) => ({
      ingredients: [...state.ingredients, { ...ingredient, id: ingredient.id || crypto.randomUUID() }],
    })),
  updateIngredient: (id, ingredient) =>
    set((state) => ({
      ingredients: state.ingredients.map((ing) =>
        ing.id === id ? { ...ing, ...ingredient } : ing
      ),
    })),
  removeIngredient: (id) =>
    set((state) => ({
      ingredients: state.ingredients.filter((ing) => ing.id !== id),
    })),
  clearIngredients: () => set({ ingredients: [] }),

  // Recipes state
  generatedRecipes: [],
  savedRecipes: [],
  setGeneratedRecipes: (recipes) => set({ generatedRecipes: recipes }),
  saveRecipe: (recipe) =>
    set((state) => ({
      savedRecipes: [...state.savedRecipes, recipe],
    })),
  removeSavedRecipe: (id) =>
    set((state) => ({
      savedRecipes: state.savedRecipes.filter((r) => r.id !== id),
    })),

  // UI State
  isGenerating: false,
  setIsGenerating: (isGenerating) => set({ isGenerating }),
}));
