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

// Keyed statuses used for reqStatus gating
export const STATUS_DEFS: Array<{
  key: string; label: string; req: Partial<Stats>; priority: number;
}> = [
  { key:"bookworm", label:"Bookworm", req:{INT:20}, priority:10 },
  { key:"lab_assistant", label:"Lab Assistant", req:{INT:30}, priority:12 },
  { key:"tinkerer", label:"Tinkerer", req:{INT:40}, priority:14 },
  { key:"code_alchemist", label:"Code Alchemist", req:{INT:55}, priority:16 },
  { key:"tech_scholar", label:"Tech Scholar", req:{INT:70}, priority:18 },
  { key:"polymath", label:"Polymath", req:{INT:85,AES:40}, priority:20 },

  { key:"gym_newbie", label:"Gym Newbie", req:{STR:20}, priority:10 },
  { key:"form_follower", label:"Form Follower", req:{STR:30}, priority:12 },
  { key:"power_tracker", label:"Power Tracker", req:{STR:40}, priority:14 },
  { key:"iron_addict", label:"Iron Addict", req:{STR:55}, priority:16 },
  { key:"athletic_pro", label:"Athletic Pro", req:{STR:70}, priority:18 },
  { key:"titan", label:"Titan", req:{STR:85}, priority:20 },

  { key:"sprout_keeper", label:"Sprout Keeper", req:{VIT:20}, priority:10 },
  { key:"balcony_gardener", label:"Balcony Gardener", req:{VIT:30}, priority:12 },
  { key:"soil_whisperer", label:"Soil Whisperer", req:{VIT:40}, priority:14 },
  { key:"eco_artisan", label:"Eco Artisan", req:{VIT:55}, priority:16 },
  { key:"green_guardian", label:"Green Guardian", req:{VIT:70}, priority:18 },
  { key:"sustainable_sage", label:"Sustainable Sage", req:{VIT:85}, priority:20 },

  { key:"minimalist_curator", label:"Minimalist Curator", req:{AES:35}, priority:9 },
  { key:"ambient_designer", label:"Ambient Designer", req:{AES:50}, priority:11 },
  { key:"aesthetic_virtuoso", label:"Aesthetic Virtuoso", req:{AES:70}, priority:13 },
  { key:"gallery_mind", label:"Gallery Mind", req:{AES:80,INT:50}, priority:15 },
  { key:"fashion_designer", label:"Fashion Designer", req:{AES:75,INT:45,WLH:40}, priority:17 },
  { key:"patron_of_arts", label:"Patron of Arts", req:{AES:80,WLH:60}, priority:18 },
  { key:"collector", label:"Collector", req:{WLH:40}, priority:10 },
  { key:"mogul", label:"Mogul", req:{WLH:70}, priority:15 },
  { key:"iconic", label:"Iconic", req:{AES:85,WLH:70}, priority:21 },

  { key:"biohacker", label:"Biohacker", req:{INT:50,VIT:50}, priority:16 },
  { key:"athleisure_guru", label:"Athleisure Guru", req:{STR:50,AES:50}, priority:16 },
  { key:"eco_engineer", label:"Eco-Engineer", req:{INT:45,VIT:60}, priority:17 },
  { key:"mind_body_master", label:"Mind-Body Master", req:{INT:60,STR:60,VIT:60}, priority:22 },
  { key:"creator_of_worlds", label:"Creator of Worlds", req:{INT:80,AES:80}, priority:23 },
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
