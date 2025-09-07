import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // idempotent seed by name - 8 CATEGORIES, 5 ITEMS EACH = 40 TOTAL ITEMS
  const items: Array<Parameters<typeof prisma.shopItem.upsert>[0]> = [
    // --- NERDY (6 items) - Tech & Learning ---
    up("Desk Lamp","NERDY",15,{aes:1,int:1}),
    up("Mechanical Keyboard","NERDY",40,{int:2,aes:2,wlh:1}, {reqINT:2}),
    up("Bookshelf","NERDY",60,{int:3,aes:1,wlh:1}, {reqINT:3}),
    up("Dual Monitor Setup","NERDY",100,{int:4,aes:2,wlh:2}, {reqINT:5}),
    up("3D Printer","NERDY",500,{int:5,aes:2,wlh:2}, {reqINT:8,reqWLH:3}),
    up("VR Headset","NERDY",200,{int:4,aes:3,wlh:2}, {reqINT:6,reqAES:2}),

    // --- FITNESS (5 items) - Health & Strength ---
    up("Yoga Mat","FITNESS",20,{str:2,aes:1}),
    up("Kettlebell Set","FITNESS",50,{str:4,aes:1}, {reqSTR:2}),
    up("Pull-up Bar","FITNESS",75,{str:5,aes:1}, {reqSTR:3}),
    up("Rowing Machine","FITNESS",180,{str:5,vit:2,aes:1,wlh:2}, {reqSTR:5,reqVIT:2}),
    up("Smart Mirror","FITNESS",250,{int:2,str:5,aes:2,wlh:2}, {reqSTR:6,reqINT:2}),

    // --- GREENTHUMB (5 items) - Plants & Nature ---
    up("Plant Pot Set","GREENTHUMB",15,{vit:2,aes:1}),
    up("Indoor Herb Garden","GREENTHUMB",50,{vit:4,aes:2}, {reqVIT:2}),
    up("Hydroponic System","GREENTHUMB",120,{vit:6,aes:2,wlh:1}, {reqVIT:3}),
    up("Hanging Pot Set","GREENTHUMB",180,{vit:8,aes:3,wlh:2}, {reqVIT:5,reqAES:2}),
    up("Creeper","GREENTHUMB",220,{vit:7,aes:4,wlh:2}, {reqVIT:6,reqAES:3}),

    // --- CREATIVE (5 items) - Art & Expression ---
    up("Sketch Pad & Pencils","CREATIVE",25,{aes:2,int:1}),
    up("Watercolor Set","CREATIVE",45,{aes:3,int:1}, {reqAES:2}),
    up("Digital Drawing Tablet","CREATIVE",120,{aes:4,int:2,wlh:1}, {reqAES:3,reqINT:2}),
    up("Pottery Wheel","CREATIVE",180,{aes:5,vit:2,wlh:2}, {reqAES:5,reqVIT:2}),
    up("Art Studio Easel","CREATIVE",250,{aes:6,int:2,wlh:2}, {reqAES:6,reqINT:2}),

    // --- COZY (5 items) - Comfort & Warmth ---
    up("Designer Tapestry","COZY",100,{vit:2,aes:1}, {reqVIT:2}),
    up("Reading Nook Chair","COZY",80,{vit:3,aes:2,int:1}, {reqVIT:2,reqAES:1}),
    up("Aromatherapy Diffuser","COZY",60,{vit:3,aes:2}, {reqVIT:2}),
    up("Fireplace Heater","COZY",150,{vit:4,aes:3,wlh:1}, {reqVIT:3,reqAES:2}),
    up("Hammock Chair","COZY",200,{vit:5,aes:3,wlh:2}, {reqVIT:4,reqAES:3}),

    // --- LUXURY (5 items) - Premium & Wealth ---
    up("Gold Accent Vase","LUXURY",100,{wlh:3,aes:2}, {reqWLH:2}),
    up("Marble Coffee Table","LUXURY",200,{wlh:4,aes:3}, {reqWLH:3,reqAES:2}),
    up("Crystal Chandelier","LUXURY",300,{wlh:5,aes:4}, {reqWLH:4,reqAES:3}),
    up("Leather Recliner","LUXURY",400,{wlh:6,aes:3,str:1}, {reqWLH:5,reqAES:2}),
    up("Diamond Art Display","LUXURY",500,{wlh:8,aes:5}, {reqWLH:6,reqAES:4}),

    // --- MINIMALIST (5 items) - Clean & Simple ---
    up("White Ceramic Vase","MINIMALIST",30,{aes:2}),
    up("Bamboo Desk Organizer","MINIMALIST",50,{aes:3,int:1}, {reqAES:2}),
    up("Floating Shelves Set","MINIMALIST",80,{aes:4,int:1}, {reqAES:3}),
    up("Geometric Wall Art","MINIMALIST",120,{aes:5,int:1}, {reqAES:4}),
    up("Zen Garden Kit","MINIMALIST",180,{aes:6,vit:2,int:1}, {reqAES:5,reqVIT:2}),

    // --- VINTAGE (5 items) - Retro & Classic ---
    up("Vintage Typewriter","VINTAGE",80,{aes:3,int:2}, {reqAES:2,reqINT:1}),
    up("Antique Brass Lamp","VINTAGE",120,{aes:4,wlh:2}, {reqAES:3,reqWLH:1}),
    up("Retro Record Player","VINTAGE",200,{aes:5,wlh:3,int:1}, {reqAES:4,reqWLH:2}),
    up("Victorian Armchair","VINTAGE",300,{aes:6,wlh:4,vit:1}, {reqAES:5,reqWLH:3}),
    up("Steampunk Clock","VINTAGE",400,{aes:7,wlh:5,int:2}, {reqAES:6,reqWLH:4,reqINT:2}),
  ];

  for (const i of items) await prisma.shopItem.upsert(i);

  console.log("Seeded 41 items across 8 categories (6 NERDY, 5 each for others).");
}

function up(name:string, category:"NERDY"|"FITNESS"|"GREENTHUMB"|"CREATIVE"|"COZY"|"LUXURY"|"MINIMALIST"|"VINTAGE", cost:number, boosts:{int?:number,str?:number,vit?:number,aes?:number,wlh?:number}, reqs?:{reqINT?:number,reqSTR?:number,reqVIT?:number,reqAES?:number,reqWLH?:number,reqStatus?:string}) {
  return {
    where: { name },
    update: {
      name, category, cost,
      intBoost: boosts.int??0, strBoost: boosts.str??0, vitBoost: boosts.vit??0, aesBoost: boosts.aes??0, wlhBoost: boosts.wlh??0,
      reqINT: reqs?.reqINT??0, reqSTR: reqs?.reqSTR??0, reqVIT: reqs?.reqVIT??0, reqAES: reqs?.reqAES??0, reqWLH: reqs?.reqWLH??0,
      reqStatus: reqs?.reqStatus ?? null,
    },
    create: {
      name, category, cost,
      intBoost: boosts.int??0, strBoost: boosts.str??0, vitBoost: boosts.vit??0, aesBoost: boosts.aes??0, wlhBoost: boosts.wlh??0,
      reqINT: reqs?.reqINT??0, reqSTR: reqs?.reqSTR??0, reqVIT: reqs?.reqVIT??0, reqAES: reqs?.reqAES??0, reqWLH: reqs?.reqWLH??0,
      reqStatus: reqs?.reqStatus ?? null,
    }
  } as const;
}

main().finally(()=>prisma.$disconnect());