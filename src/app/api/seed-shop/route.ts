export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const shopItems = [
  // --- NERDY (6 items) - Tech & Learning ---
  { name: "Desk Lamp", category: "NERDY", cost: 15, intBoost: 1, aesBoost: 1 },
  { name: "Mechanical Keyboard", category: "NERDY", cost: 40, intBoost: 2, aesBoost: 2, wlhBoost: 1, reqINT: 2 },
  { name: "Bookshelf", category: "NERDY", cost: 60, intBoost: 3, aesBoost: 1, wlhBoost: 1, reqINT: 3 },
  { name: "Dual Monitor Setup", category: "NERDY", cost: 100, intBoost: 4, aesBoost: 2, wlhBoost: 2, reqINT: 5 },
  { name: "3D Printer", category: "NERDY", cost: 500, intBoost: 5, aesBoost: 2, wlhBoost: 2, reqINT: 8, reqWLH: 3 },
  { name: "VR Headset", category: "NERDY", cost: 200, intBoost: 4, aesBoost: 3, wlhBoost: 2, reqINT: 6, reqAES: 2 },

  // --- FITNESS (5 items) - Health & Strength ---
  { name: "Yoga Mat", category: "FITNESS", cost: 20, strBoost: 2, aesBoost: 1 },
  { name: "Kettlebell Set", category: "FITNESS", cost: 50, strBoost: 4, aesBoost: 1, reqSTR: 2 },
  { name: "Pull-up Bar", category: "FITNESS", cost: 75, strBoost: 5, aesBoost: 1, reqSTR: 3 },
  { name: "Rowing Machine", category: "FITNESS", cost: 180, strBoost: 5, vitBoost: 2, aesBoost: 1, wlhBoost: 2, reqSTR: 5, reqVIT: 2 },
  { name: "Smart Mirror", category: "FITNESS", cost: 250, intBoost: 2, strBoost: 5, aesBoost: 2, wlhBoost: 2, reqSTR: 6, reqINT: 2 },

  // --- GREENTHUMB (5 items) - Plants & Nature ---
  { name: "Plant Pot Set", category: "GREENTHUMB", cost: 15, vitBoost: 2, aesBoost: 1 },
  { name: "Indoor Herb Garden", category: "GREENTHUMB", cost: 50, vitBoost: 4, aesBoost: 2, reqVIT: 2 },
  { name: "Hydroponic System", category: "GREENTHUMB", cost: 120, vitBoost: 6, aesBoost: 2, wlhBoost: 1, reqVIT: 3 },
  { name: "Hanging Pot Set", category: "GREENTHUMB", cost: 180, vitBoost: 8, aesBoost: 3, wlhBoost: 2, reqVIT: 5, reqAES: 2 },
  { name: "Creeper", category: "GREENTHUMB", cost: 220, vitBoost: 7, aesBoost: 4, wlhBoost: 2, reqVIT: 6, reqAES: 3 },

  // --- CREATIVE (5 items) - Art & Expression ---
  { name: "Sketch Pad & Pencils", category: "CREATIVE", cost: 25, aesBoost: 2, intBoost: 1 },
  { name: "Watercolor Set", category: "CREATIVE", cost: 45, aesBoost: 3, intBoost: 1, reqAES: 2 },
  { name: "Digital Drawing Tablet", category: "CREATIVE", cost: 120, aesBoost: 4, intBoost: 2, wlhBoost: 1, reqAES: 3, reqINT: 2 },
  { name: "Pottery Wheel", category: "CREATIVE", cost: 180, aesBoost: 5, vitBoost: 2, wlhBoost: 2, reqAES: 5, reqVIT: 2 },
  { name: "Art Studio Easel", category: "CREATIVE", cost: 250, aesBoost: 6, intBoost: 2, wlhBoost: 2, reqAES: 6, reqINT: 2 },

  // --- COZY (5 items) - Comfort & Warmth ---
  { name: "Designer Tapestry", category: "COZY", cost: 100, vitBoost: 2, aesBoost: 1, reqVIT: 2 },
  { name: "Reading Nook Chair", category: "COZY", cost: 80, vitBoost: 3, aesBoost: 2, intBoost: 1, reqVIT: 2, reqAES: 1 },
  { name: "Aromatherapy Diffuser", category: "COZY", cost: 60, vitBoost: 3, aesBoost: 2, reqVIT: 2 },
  { name: "Fireplace Heater", category: "COZY", cost: 150, vitBoost: 4, aesBoost: 3, wlhBoost: 1, reqVIT: 3, reqAES: 2 },
  { name: "Hammock Chair", category: "COZY", cost: 200, vitBoost: 5, aesBoost: 3, wlhBoost: 2, reqVIT: 4, reqAES: 3 },

  // --- LUXURY (5 items) - Premium & Wealth ---
  { name: "Gold Accent Vase", category: "LUXURY", cost: 100, wlhBoost: 3, aesBoost: 2, reqWLH: 2 },
  { name: "Marble Coffee Table", category: "LUXURY", cost: 200, wlhBoost: 4, aesBoost: 3, reqWLH: 3, reqAES: 2 },
  { name: "Crystal Chandelier", category: "LUXURY", cost: 300, wlhBoost: 5, aesBoost: 4, reqWLH: 4, reqAES: 3 },
  { name: "Leather Recliner", category: "LUXURY", cost: 400, wlhBoost: 6, aesBoost: 3, strBoost: 1, reqWLH: 5, reqAES: 2 },
  { name: "Diamond Art Display", category: "LUXURY", cost: 500, wlhBoost: 8, aesBoost: 5, reqWLH: 6, reqAES: 4 },

  // --- MINIMALIST (5 items) - Clean & Simple ---
  { name: "White Ceramic Vase", category: "MINIMALIST", cost: 30, aesBoost: 2 },
  { name: "Bamboo Desk Organizer", category: "MINIMALIST", cost: 50, aesBoost: 3, intBoost: 1, reqAES: 2 },
  { name: "Floating Shelves Set", category: "MINIMALIST", cost: 80, aesBoost: 4, intBoost: 1, reqAES: 3 },
  { name: "Geometric Wall Art", category: "MINIMALIST", cost: 120, aesBoost: 5, intBoost: 1, reqAES: 4 },
  { name: "Zen Garden Kit", category: "MINIMALIST", cost: 180, aesBoost: 6, vitBoost: 2, intBoost: 1, reqAES: 5, reqVIT: 2 },

  // --- VINTAGE (5 items) - Retro & Classic ---
  { name: "Vintage Typewriter", category: "VINTAGE", cost: 80, aesBoost: 3, intBoost: 2, reqAES: 2, reqINT: 1 },
  { name: "Antique Brass Lamp", category: "VINTAGE", cost: 120, aesBoost: 4, wlhBoost: 2, reqAES: 3, reqWLH: 1 },
  { name: "Retro Record Player", category: "VINTAGE", cost: 200, aesBoost: 5, wlhBoost: 3, intBoost: 1, reqAES: 4, reqWLH: 2 },
  { name: "Victorian Armchair", category: "VINTAGE", cost: 300, aesBoost: 6, wlhBoost: 4, vitBoost: 1, reqAES: 5, reqWLH: 3 },
  { name: "Steampunk Clock", category: "VINTAGE", cost: 400, aesBoost: 7, wlhBoost: 5, intBoost: 2, reqAES: 6, reqWLH: 4, reqINT: 2 },
];

export async function POST() {
  try {
    // Clear existing shop items
    await prisma.shopItem.deleteMany();
    
    // Create all shop items
    for (const item of shopItems) {
      await prisma.shopItem.create({
        data: {
          name: item.name,
          category: item.category as any,
          cost: item.cost,
          intBoost: item.intBoost || 0,
          strBoost: item.strBoost || 0,
          vitBoost: item.vitBoost || 0,
          aesBoost: item.aesBoost || 0,
          wlhBoost: item.wlhBoost || 0,
          reqINT: item.reqINT || 0,
          reqSTR: item.reqSTR || 0,
          reqVIT: item.reqVIT || 0,
          reqAES: item.reqAES || 0,
          reqWLH: item.reqWLH || 0,
        },
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Seeded ${shopItems.length} shop items` 
    });
  } catch (error) {
    console.error("Error seeding shop:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to seed shop items" 
    }, { status: 500 });
  }
}
