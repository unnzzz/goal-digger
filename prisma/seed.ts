import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // idempotent seed by name
  const items: Array<Parameters<typeof prisma.shopItem.upsert>[0]> = [
    // --- NERDY ---
    up("Poster: Circuit Blueprint","NERDY",20,{aes:2,int:1}),
    up("Desk Lamp: Adjustable","NERDY",40,{aes:2,int:1}),
    up("Whiteboard (M)","NERDY",80,{int:3,aes:1},{reqINT:10}),
    up("Mechanical Keyboard","NERDY",120,{int:2,aes:2,wlh:1},{reqINT:10}),
    up("Bookshelf: Starter STEM","NERDY",150,{int:4,aes:1,wlh:1},{reqINT:15}),
    up("Raspberry Pi Lab","NERDY",180,{int:5,aes:1,wlh:1},{reqINT:20}),
    up("Dual Monitor Rig","NERDY",220,{int:4,aes:3,wlh:2},{reqINT:25,reqAES:15}),
    up("Robotics Kit","NERDY",280,{int:6,aes:1,wlh:2},{reqINT:30}),
    up("3D Printer","NERDY",320,{int:7,aes:2,wlh:2},{reqINT:35}),
    up("VR Headset","NERDY",350,{int:5,aes:4,wlh:2},{reqINT:35,reqAES:25}),
    up("Quad-Monitor Command","NERDY",420,{int:8,aes:3,wlh:3},{reqINT:40,reqAES:30}),
    up("Server Rack (Mini)","NERDY",480,{int:9,aes:2,wlh:3},{reqINT:45}),
    up("Hologram Projector","NERDY",520,{int:8,aes:5,wlh:4},{reqINT:50,reqAES:40}),
    up("Quantum Bookshelf","NERDY",600,{int:10,aes:4,wlh:4},{reqINT:55,reqStatus:"tech_scholar"}),
    up("Neon Matrix Wall","NERDY",260,{aes:6,int:2,wlh:2},{reqAES:30}),

    // --- FITNESS ---
    up("Yoga Mat","FITNESS",30,{str:2,aes:1}),
    up("Resistance Bands","FITNESS",60,{str:3,aes:1},{reqSTR:10}),
    up("Kettlebell (Set)","FITNESS",120,{str:5,aes:1},{reqSTR:15}),
    up("Pull-up Bar","FITNESS",140,{str:5,aes:1},{reqSTR:20}),
    up("Dumbbell Rack","FITNESS",200,{str:7,aes:1,wlh:1},{reqSTR:25}),
    up("Heavy Bag","FITNESS",240,{str:8,aes:1,wlh:1},{reqSTR:30}),
    up("Rowing Machine","FITNESS",300,{str:6,vit:2,aes:1,wlh:2},{reqSTR:35,reqVIT:15}),
    up("Spin Bike","FITNESS",320,{str:6,vit:2,aes:1,wlh:2},{reqSTR:35,reqVIT:15}),
    up("Squat Rack","FITNESS",380,{str:10,aes:1,wlh:2},{reqSTR:45}),
    up("Smart Mirror Coach","FITNESS",420,{int:2,str:6,aes:3,wlh:3},{reqSTR:40,reqINT:25,reqAES:25}),
    up("Cold Plunge Tub","FITNESS",450,{str:4,vit:4,aes:1,wlh:3},{reqSTR:40,reqVIT:30}),
    up("Treadmill (Pro)","FITNESS",520,{str:7,vit:3,aes:2,wlh:3},{reqSTR:50,reqVIT:30}),
    up("Recovery Massager","FITNESS",260,{str:3,vit:2,aes:1,wlh:1},{reqSTR:20}),

    // --- GREENTHUMB ---
    up("Succulent Trio","GREENTHUMB",20,{vit:2,aes:2}),
    up("Herb Planter","GREENTHUMB",40,{vit:3,aes:2}),
    up("Hanging Planter","GREENTHUMB",60,{vit:3,aes:3},{reqVIT:10}),
    up("Watering Station","GREENTHUMB",80,{vit:3,aes:2},{reqVIT:10}),
    up("Grow Light (Small)","GREENTHUMB",120,{vit:4,aes:2,wlh:1},{reqVIT:15}),
    up("Compost Bin","GREENTHUMB",160,{vit:5,aes:1,wlh:1},{reqVIT:20}),
    up("Bonsai","GREENTHUMB",200,{vit:5,aes:4,wlh:1},{reqVIT:25,reqAES:20}),
    up("Hydroponic Tower","GREENTHUMB",260,{vit:7,aes:3,wlh:2},{reqVIT:30}),
    up("Living Moss Wall","GREENTHUMB",320,{vit:6,aes:6,wlh:2},{reqVIT:35,reqAES:30}),
    up("Smart Irrigation","GREENTHUMB",340,{int:2,vit:5,aes:2,wlh:2},{reqVIT:35,reqINT:20}),
    up("Indoor Beehive (Edu)","GREENTHUMB",380,{int:3,vit:7,aes:3,wlh:2},{reqVIT:40,reqINT:25}),
    up("Greenhouse Corner","GREENTHUMB",500,{vit:10,aes:4,wlh:3},{reqVIT:50}),
    up("Zen Fountain","GREENTHUMB",220,{vit:3,aes:5,wlh:2},{reqAES:25}),

    // --- PREMIUM STYLE ---
    up("Designer Rug","GREENTHUMB",200,{vit:1,aes:6,wlh:2},{reqAES:30}),
    up("Ambient LED Strips","NERDY",140,{aes:5,wlh:1},{reqAES:20}),
    up("Framed Art Print","NERDY",180,{int:1,vit:0,aes:6,wlh:2},{reqAES:35}),
    up("Minimal Sofa","FITNESS",260,{str:1,vit:1,aes:6,wlh:2},{reqAES:35}),
    up("Vinyl Record Setup","NERDY",300,{int:1,vit:1,aes:7,wlh:3},{reqAES:40}),
    up("Sculpture Pedestal","GREENTHUMB",340,{vit:1,aes:8,wlh:3},{reqAES:45,reqWLH:30}),
    up("Smart Ambient Hub","NERDY",360,{int:2,vit:1,aes:8,wlh:3},{reqAES:45,reqINT:30}),
    up("Designer Lighting Tree","GREENTHUMB",420,{vit:2,aes:9,wlh:4},{reqAES:50,reqWLH:35}),
    up("Premium Coffee Station","FITNESS",380,{int:2,str:1,vit:2,aes:6,wlh:4},{reqAES:40,reqWLH:35}),
    up("Gallery Wall System","NERDY",500,{int:3,vit:2,aes:10,wlh:5},{reqAES:60,reqWLH:40}),
  ];

  for (const i of items) await prisma.shopItem.upsert(i);

  console.log("Seeded shop items.");
}

function up(name:string, category:"NERDY"|"FITNESS"|"GREENTHUMB", cost:number, boosts:{int?:number,str?:number,vit?:number,aes?:number,wlh?:number}, reqs?:{reqINT?:number,reqSTR?:number,reqVIT?:number,reqAES?:number,reqWLH?:number,reqStatus?:string}) {
  return {
    where: { name },
    update: {},
    create: {
      name, category, cost,
      intBoost: boosts.int??0, strBoost: boosts.str??0, vitBoost: boosts.vit??0, aesBoost: boosts.aes??0, wlhBoost: boosts.wlh??0,
      reqINT: reqs?.reqINT??0, reqSTR: reqs?.reqSTR??0, reqVIT: reqs?.reqVIT??0, reqAES: reqs?.reqAES??0, reqWLH: reqs?.reqWLH??0,
      reqStatus: reqs?.reqStatus ?? null,
    }
  } as const;
}

main().finally(()=>prisma.$disconnect());
