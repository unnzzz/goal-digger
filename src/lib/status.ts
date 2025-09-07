export type Stats = { INT:number; STR:number; VIT:number; AES:number; WLH:number };

export function tierLabel(v:number){
  if (v>=90) return "Legend";
  if (v>=80) return "Icon";
  if (v>=70) return "Elite";
  if (v>=60) return "Master";
  if (v>=50) return "Expert";
  if (v>=40) return "Specialist";
  if (v>=30) return "Adept";
  if (v>=20) return "Enthusiast";
  if (v>=10) return "Apprentice";
  return "Novice";
}

// Keyed statuses used for reqStatus gating - EASIER REQUIREMENTS
export const STATUS_DEFS: Array<{
  key: string; label: string; req: Partial<Stats>; priority: number;
}> = [
  // INTELLIGENCE - Much easier progression
  { key:"bookworm", label:"Bookworm", req:{INT:5}, priority:10 },
  { key:"lab_assistant", label:"Lab Assistant", req:{INT:10}, priority:12 },
  { key:"tinkerer", label:"Tinkerer", req:{INT:15}, priority:14 },
  { key:"code_alchemist", label:"Code Alchemist", req:{INT:25}, priority:16 },
  { key:"tech_scholar", label:"Tech Scholar", req:{INT:35}, priority:18 },
  { key:"polymath", label:"Polymath", req:{INT:45,AES:20}, priority:20 },

  // STRENGTH - Much easier progression
  { key:"gym_newbie", label:"Gym Newbie", req:{STR:5}, priority:10 },
  { key:"form_follower", label:"Form Follower", req:{STR:10}, priority:12 },
  { key:"power_tracker", label:"Power Tracker", req:{STR:15}, priority:14 },
  { key:"iron_addict", label:"Iron Addict", req:{STR:25}, priority:16 },
  { key:"athletic_pro", label:"Athletic Pro", req:{STR:35}, priority:18 },
  { key:"titan", label:"Titan", req:{STR:45}, priority:20 },

  // VITALITY - Much easier progression
  { key:"sprout_keeper", label:"Sprout Keeper", req:{VIT:5}, priority:10 },
  { key:"balcony_gardener", label:"Balcony Gardener", req:{VIT:10}, priority:12 },
  { key:"soil_whisperer", label:"Soil Whisperer", req:{VIT:15}, priority:14 },
  { key:"eco_artisan", label:"Eco Artisan", req:{VIT:25}, priority:16 },
  { key:"green_guardian", label:"Green Guardian", req:{VIT:35}, priority:18 },
  { key:"sustainable_sage", label:"Sustainable Sage", req:{VIT:45}, priority:20 },

  // AESTHETIC - Much easier progression
  { key:"minimalist_curator", label:"Minimalist Curator", req:{AES:8}, priority:9 },
  { key:"ambient_designer", label:"Ambient Designer", req:{AES:15}, priority:11 },
  { key:"aesthetic_virtuoso", label:"Aesthetic Virtuoso", req:{AES:25}, priority:13 },
  { key:"gallery_mind", label:"Gallery Mind", req:{AES:30,INT:20}, priority:15 },
  { key:"fashion_designer", label:"Fashion Designer", req:{AES:35,INT:20,WLH:15}, priority:17 },
  { key:"patron_of_arts", label:"Patron of Arts", req:{AES:40,WLH:25}, priority:18 },
  
  // WEALTH - Much easier progression
  { key:"collector", label:"Collector", req:{WLH:10}, priority:10 },
  { key:"mogul", label:"Mogul", req:{WLH:25}, priority:15 },
  { key:"iconic", label:"Iconic", req:{AES:40,WLH:30}, priority:21 },

  // HYBRID STATUSES - Much easier requirements
  { key:"biohacker", label:"Biohacker", req:{INT:20,VIT:20}, priority:16 },
  { key:"athleisure_guru", label:"Athleisure Guru", req:{STR:20,AES:20}, priority:16 },
  { key:"eco_engineer", label:"Eco-Engineer", req:{INT:20,VIT:25}, priority:17 },
  { key:"mind_body_master", label:"Mind-Body Master", req:{INT:25,STR:25,VIT:25}, priority:22 },
  { key:"creator_of_worlds", label:"Creator of Worlds", req:{INT:40,AES:40}, priority:23 },
];

export function hasReq(stats:Stats, need:Partial<Stats>) {
  return (need.INT==null || stats.INT>=need.INT)
      && (need.STR==null || stats.STR>=need.STR)
      && (need.VIT==null || stats.VIT>=need.VIT)
      && (need.AES==null || stats.AES>=need.AES)
      && (need.WLH==null || stats.WLH>=need.WLH);
}

export function unlockedStatuses(stats:Stats){
  return STATUS_DEFS.filter(s=>hasReq(stats,s.req)).sort((a,b)=>b.priority-a.priority);
}

export function primaryStatus(stats:Stats){
  return unlockedStatuses(stats)[0] ?? null;
}

export function meetsStatus(stats:Stats, statusKey?:string|null){
  if(!statusKey) return true;
  const def = STATUS_DEFS.find(s=>s.key===statusKey);
  return def ? hasReq(stats, def.req) : false;
}
