import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRecipeImageUrl(name: string): string {
  const n = name.toLowerCase();

  if (n.includes("ayam bakar madu pedas") || (n.includes("ayam") && n.includes("pedas"))) {
    return "/ayam-bakar-madu-pedas.png";
  }

  if (n.includes("ayam bakar madu jeruk") || (n.includes("ayam") && n.includes("jeruk"))) {
    return "/ayam-bakar-madu-jeruk.png";
  }

  if (n.includes("bayam goreng tepung") || n.includes("bayam goreng") || n.includes("crispy bayam")) {
    return "/bayam-goreng-tepung.png";
  }

  if (n.includes("omlet bayam") || n.includes("omelette bayam") || n.includes("omelet bayam")) {
    return "/omelet-bayam.png";
  }

  if (n.includes("sup bening bayam") || n.includes("sup bening")) {
    return "/sup-bening-bayam.png";
  }

  let id = "photo-1546069901-ba9599a7e63c"; // default general delicious food bowl

  if (n.includes("nasi goreng")) {
    id = "photo-1603133872878-684f208fb84b"; // fried rice (valid, active)
  } else if (n.includes("sate") || n.includes("satay")) {
    id = "photo-1529193591184-b1d58069ecdd";
  } else if (n.includes("ayam") && n.includes("pedas")) {
    id = "photo-1549488344-c367f73a0741"; // grilled chicken over fire (valid, active)
  } else if (n.includes("ayam") && n.includes("jeruk")) {
    id = "photo-1604908176997-125f25cc6f3d"; // roasted chicken on plate (valid, active)
  } else if (n.includes("ayam bakar")) {
    id = "photo-1549488344-c367f73a0741"; // grilled chicken (valid, active)
  } else if (n.includes("ayam") || n.includes("bebek") || n.includes("chicken")) {
    id = "photo-1604908176997-125f25cc6f3d"; // roasted chicken (valid, active)
  } else if (n.includes("bayam goreng") || n.includes("crispy bayam") || n.includes("sayur goreng")) {
    id = "photo-1541592106381-b31e9677c0e5"; // crispy golden fried chips/fries (valid, active)
  } else if (n.includes("sup") || n.includes("soto") || n.includes("kuah") || n.includes("soup")) {
    id = "photo-1603105037880-880cd4edfb0d"; // soup bowl (valid, active)
  } else if (n.includes("omelet") || n.includes("omelette")) {
    id = "photo-1605335032549-b50035033c5a"; // omelette fold (valid, active)
  } else if (n.includes("telur") || n.includes("dadar") || n.includes("egg")) {
    id = "photo-1525351484163-7529414344d8"; // eggs / sunny side up toast
  } else if (n.includes("ikan") || n.includes("seafood") || n.includes("udang") || n.includes("cumi") || n.includes("fish")) {
    id = "photo-1519708227418-c8fd9a32b7a2";
  } else if (n.includes("daging") || n.includes("sapi") || n.includes("kambing") || n.includes("rendang") || n.includes("steak")) {
    id = "photo-1603048588665-791ca8aea617";
  } else if (n.includes("bayam") || n.includes("sayur") || n.includes("salad") || n.includes("tumis") || n.includes("cah") || n.includes("kangkung")) {
    id = "photo-1540189549336-e6e99c3679fe"; // fresh green spinach skillet (valid, active)
  } else if (n.includes("mie") || n.includes("bakmi") || n.includes("bihun") || n.includes("ramen")) {
    id = "photo-1569718212165-3a8278d5f624";
  } else if (n.includes("jus") || n.includes("smoothie") || n.includes("minuman") || n.includes("drink")) {
    id = "photo-1621506289937-a8e4df240d0b";
  } else if (n.includes("kue") || n.includes("roti") || n.includes("dessert") || n.includes("manis")) {
    id = "photo-1551024601-bec78aea704b";
  }

  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;
}
