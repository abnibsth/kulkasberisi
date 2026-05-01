import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getSupabaseBrowserClientOrNull, getSupabaseBrowserConfigError } from "@/lib/supabase/browser";

export interface Ingredient {
  id?: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  purchaseDate?: string;
  expiryDate?: string;
  barcode?: string;
  notes?: string;
  usedAt?: string;
  createdAt?: string;
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
  source?: string;
  matchPercentage?: number;
  ingredients?: { name: string; quantity: number; unit: string }[];
  createdAt?: string;
}

interface AppState {
  // Ingredients
  ingredients: Ingredient[];
  loadIngredients: () => Promise<void>;
  addIngredient: (ingredient: Ingredient) => Promise<void>;
  updateIngredient: (
    id: string,
    ingredient: Partial<Ingredient>,
  ) => Promise<void>;
  removeIngredient: (id: string) => Promise<void>;
  clearIngredients: () => void;

  // Recipes
  generatedRecipes: Recipe[];
  savedRecipes: Recipe[];
  setGeneratedRecipes: (recipes: Recipe[]) => void;
  loadSavedRecipes: () => Promise<void>;
  saveRecipe: (recipe: Recipe) => Promise<void>;
  removeSavedRecipe: (id: string) => Promise<void>;

  // UI State
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
  // Ingredients state
  ingredients: [],
  loadIngredients: async () => {
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) throw new Error(getSupabaseBrowserConfigError());
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/ingredients", {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error || "Gagal mengambil data ingredients");
    }
    const payload = (await res.json()) as { items: Ingredient[] };
    set({ ingredients: payload.items });
  },
  addIngredient: async (ingredient) => {
    const id = ingredient.id || crypto.randomUUID();
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) throw new Error(getSupabaseBrowserConfigError());
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/ingredients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...ingredient, id }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error || "Gagal menyimpan ingredient");
    }
    const payload = (await res.json()) as { item: Ingredient };
    set((state) => ({
      ingredients: [
        payload.item,
        ...state.ingredients.filter((ing) => ing.id !== payload.item.id),
      ],
    }));
  },
  updateIngredient: async (id, ingredient) => {
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) throw new Error(getSupabaseBrowserConfigError());
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(`/api/ingredients/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(ingredient),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error || "Gagal update ingredient");
    }
    const payload = (await res.json()) as { item: Ingredient };
    set((state) => ({
      ingredients: payload.item.usedAt
        ? state.ingredients.filter((ing) => ing.id !== payload.item.id)
        : state.ingredients.map((ing) =>
            ing.id === payload.item.id ? payload.item : ing,
          ),
    }));
  },
  removeIngredient: async (id) => {
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) throw new Error(getSupabaseBrowserConfigError());
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(`/api/ingredients/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error || "Gagal hapus ingredient");
    }
    set((state) => ({
      ingredients: state.ingredients.filter((ing) => ing.id !== id),
    }));
  },
  clearIngredients: () => set({ ingredients: [] }),

  // Recipes state
  generatedRecipes: [],
  savedRecipes: [],
  setGeneratedRecipes: (recipes) =>
    set({
      generatedRecipes: recipes.map((r) => ({
        ...r,
        id: r.id || crypto.randomUUID(),
        source: r.source || "ai",
      })),
    }),
  loadSavedRecipes: async () => {
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) throw new Error(getSupabaseBrowserConfigError());
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/recipes", {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || "Gagal mengambil data resep");
    }
    const payload = (await res.json()) as { items: Recipe[] };
    set({ savedRecipes: payload.items });
  },
  saveRecipe: async (recipe) => {
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) throw new Error(getSupabaseBrowserConfigError());
    const id = recipe.id || crypto.randomUUID();
    const optimistic: Recipe = {
      ...recipe,
      id,
      source: recipe.source || "ai",
    };
    set((state) => ({
      savedRecipes: [optimistic, ...state.savedRecipes.filter((r) => r.id !== id)],
    }));

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        ...optimistic,
        prepTime: optimistic.prepTime,
        cookTime: optimistic.cookTime,
        matchPercentage: optimistic.matchPercentage,
        imageUrl: optimistic.imageUrl,
      }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      set((state) => ({
        savedRecipes: state.savedRecipes.filter((r) => r.id !== id),
      }));
      throw new Error(payload?.error || "Gagal menyimpan resep");
    }
    const payload = (await res.json()) as { item: Recipe };
    set((state) => ({
      savedRecipes: [payload.item, ...state.savedRecipes.filter((r) => r.id !== payload.item.id)],
    }));
  },
  removeSavedRecipe: async (id) => {
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) throw new Error(getSupabaseBrowserConfigError());
    let removed: Recipe | null = null;
    set((state) => {
      removed = state.savedRecipes.find((r) => r.id === id) || null;
      return { savedRecipes: state.savedRecipes.filter((r) => r.id !== id) };
    });

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(`/api/recipes/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (removed) {
        set((state) => ({
          savedRecipes: [removed as Recipe, ...state.savedRecipes.filter((r) => r.id !== id)],
        }));
      }
      throw new Error(payload?.error || "Gagal menghapus resep");
    }
  },

  // UI State
  isGenerating: false,
  setIsGenerating: (isGenerating) => set({ isGenerating }),
    }),
    {
      name: "kulkasberisi-app-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        generatedRecipes: state.generatedRecipes,
      }),
    },
  ),
);
