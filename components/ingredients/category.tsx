import { cn } from "@/lib/utils";
import { Apple, Beef, CupSoda, Leaf, Milk, Package, Utensils, Wheat } from "lucide-react";

export const INGREDIENT_CATEGORIES = [
  "sayur",
  "buah",
  "protein",
  "dairy",
  "bumbu",
  "karbohidrat",
  "minuman",
  "lainnya",
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

type CategoryMeta = {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const CATEGORY_META: Record<IngredientCategory, CategoryMeta> = {
  sayur: { label: "Sayur", Icon: Leaf },
  buah: { label: "Buah", Icon: Apple },
  protein: { label: "Protein", Icon: Beef },
  dairy: { label: "Dairy", Icon: Milk },
  bumbu: { label: "Bumbu", Icon: Utensils },
  karbohidrat: { label: "Karbohidrat", Icon: Wheat },
  minuman: { label: "Minuman", Icon: CupSoda },
  lainnya: { label: "Lainnya", Icon: Package },
};

export function getIngredientCategoryMeta(category: string): CategoryMeta {
  const key = category.toLowerCase().trim() as IngredientCategory;
  const meta = CATEGORY_META[key];
  if (meta) return meta;
  return { label: category ? category : "Lainnya", Icon: Package };
}

export function IngredientCategoryLabel({
  category,
  className,
  iconClassName,
}: {
  category: string;
  className?: string;
  iconClassName?: string;
}) {
  const meta = getIngredientCategoryMeta(category);
  const Icon = meta.Icon;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Icon className={cn("h-4 w-4 text-muted-foreground", iconClassName)} />
      <span className="capitalize">{meta.label}</span>
    </span>
  );
}
