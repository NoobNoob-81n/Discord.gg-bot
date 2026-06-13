/**
 * 🤖 DISCORD.JS v14 BOT — ULTIMATE EDITION
 * ==========================================
 * Railway-ready | All original systems preserved | Massive fishing + RPG expansion
 *
 * ORIGINAL (preserved):
 *  ✅ Economy, Leveling, Games (Wordle/Trivia/Slots/BJ/FNF/Boss), Community, Pets, Adventure
 *  ✅ Moderation, Setup, Owner commands, Auto-responses, Welcome, Tickets
 *
 * NEW SYSTEMS:
 *  🎣 Fisch-Inspired Fishing  — Rarities, mutations, rods, bait, biomes, weather, quests
 *  ⚔️  RPG                    — Classes, dungeons, skills, armor, crafting
 *  🏘️  Guilds                  — Bank, leaderboard, wars
 *  💰 Economy+                — Prestige, achievements, marketplace, battle pass
 *  🎮 Mini-Games              — Hangman, TicTacToe, Higher/Lower, CoinFlip, Connect4
 *  🐾 Pets+                   — Evolution, abilities, breeding
 *  📊 Progression             — Titles, badges, collection log, milestones, seasons
 *  🏆 Global Leaderboard      — No pings, join dates, multiple categories
 *  😂 Fun/Troll               — !fakeban, !fakekick, !roast, !ship, !mock etc.
 *
 * ARCHITECTURE:
 *  - Single file (no modules) for Railway simplicity
 *  - All new data added to UserData class with backward-compat fromJSON
 *  - CooldownManager preserved and extended
 *  - Original loadData/saveData structure intact (data.json wraps userData key)
 *  - All original command names preserved exactly
 */

require('dotenv').config();
const fs      = require('fs/promises');
const fsSync  = require('fs');
const path    = require('path');
const {
    Client, GatewayIntentBits, REST, Routes,
    SlashCommandBuilder, EmbedBuilder,
    PermissionFlagsBits, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, ChannelType,
    StringSelectMenuBuilder,
} = require('discord.js');

// ════════════════════════════════════════════════════════════════
// ♦️ CONFIG
// ════════════════════════════════════════════════════════════════
const OWNER_ID         = process.env.OWNER_ID || '1340069836096667859';
const DATA_FILE        = path.join(__dirname, 'data.json');
const GAME_TIMEOUT     = 300_000;
const CLEANUP_INTERVAL = 60_000;
const WORDLE_TIMEOUT   = 300_000;
const SEASON           = 1;

// ════════════════════════════════════════════════════════════════
// ♦️ FISHING DATA TABLES
// ════════════════════════════════════════════════════════════════

const RARITY_COLORS = {
    Common: 0x9E9E9E, Uncommon: 0x4CAF50, Rare: 0x2196F3,
    Epic: 0x9C27B0, Legendary: 0xFF9800, Mythical: 0xF44336, Secret: 0x1a1a2e,
};

// Fish species — id, name, emoji, rarity, baseValue, minWeight, maxWeight, xp, description
const FISH_SPECIES = [
    // ── COMMON ──
    { id:'sardine',      name:'Sardine',           emoji:'🐟', r:'Common',    val:12,   wMin:0.1, wMax:0.5,  xp:5,    desc:'A tiny, abundant fish found everywhere.' },
    { id:'carp',         name:'Carp',              emoji:'🐠', r:'Common',    val:18,   wMin:0.5, wMax:4,    xp:7,    desc:'A common freshwater fish with golden scales.' },
    { id:'perch',        name:'Perch',             emoji:'🐡', r:'Common',    val:22,   wMin:0.2, wMax:2,    xp:8,    desc:'Striped freshwater fish, great for beginners.' },
    { id:'catfish',      name:'Catfish',           emoji:'🐟', r:'Common',    val:28,   wMin:1,   wMax:8,    xp:9,    desc:'Whisker-bearing bottom feeder.' },
    { id:'bluegill',     name:'Bluegill',          emoji:'🐠', r:'Common',    val:20,   wMin:0.1, wMax:1,    xp:7,    desc:'Bright blue-gilled sunfish.' },
    { id:'roach',        name:'Roach',             emoji:'🐡', r:'Common',    val:15,   wMin:0.1, wMax:1.5,  xp:6,    desc:'Silver freshwater fish found in rivers.' },
    { id:'bream',        name:'Bream',             emoji:'🐟', r:'Common',    val:24,   wMin:0.3, wMax:2,    xp:8,    desc:'Flat-bodied river fish.' },
    { id:'minnow',       name:'Minnow',            emoji:'🐠', r:'Common',    val:8,    wMin:0.01,wMax:0.1,  xp:4,    desc:'Tiny schooling fish.' },
    { id:'dace',         name:'Dace',              emoji:'🐡', r:'Common',    val:16,   wMin:0.1, wMax:0.8,  xp:6,    desc:'Swift freshwater fish.' },
    { id:'crucian',      name:'Crucian Carp',      emoji:'🐟', r:'Common',    val:20,   wMin:0.3, wMax:3,    xp:7,    desc:'Round-bodied common carp relative.' },
    // ── UNCOMMON ──
    { id:'bass',         name:'Largemouth Bass',   emoji:'🐟', r:'Uncommon',  val:65,   wMin:0.5, wMax:5,    xp:22,   desc:'Popular sport fish with a huge mouth.' },
    { id:'trout',        name:'Rainbow Trout',     emoji:'🐠', r:'Uncommon',  val:85,   wMin:0.5, wMax:7,    xp:28,   desc:'Colorful trout with a pink streak.' },
    { id:'pike',         name:'Northern Pike',     emoji:'🐡', r:'Uncommon',  val:95,   wMin:1,   wMax:12,   xp:32,   desc:'Aggressive predator of cold waters.' },
    { id:'walleye',      name:'Walleye',           emoji:'🐟', r:'Uncommon',  val:80,   wMin:0.5, wMax:6,    xp:25,   desc:'Glassy-eyed nocturnal fish.' },
    { id:'zander',       name:'Zander',            emoji:'🐠', r:'Uncommon',  val:90,   wMin:0.8, wMax:8,    xp:30,   desc:'European relative of the walleye.' },
    { id:'chub',         name:'Chub',              emoji:'🐡', r:'Uncommon',  val:55,   wMin:0.3, wMax:4,    xp:20,   desc:'Bronze-scaled river fish.' },
    { id:'ruffe',        name:'Ruffe',             emoji:'🐟', r:'Uncommon',  val:60,   wMin:0.1, wMax:1,    xp:18,   desc:'Spiny little fish of European rivers.' },
    { id:'grayling',     name:'Grayling',          emoji:'🐠', r:'Uncommon',  val:75,   wMin:0.3, wMax:3,    xp:24,   desc:'Arctic fish with a magnificent dorsal fin.' },
    // ── RARE ──
    { id:'salmon',       name:'Atlantic Salmon',   emoji:'🐠', r:'Rare',      val:220,  wMin:2,   wMax:30,   xp:70,   desc:'Legendary migrating fish of the North Atlantic.' },
    { id:'tuna',         name:'Bluefin Tuna',      emoji:'🐡', r:'Rare',      val:380,  wMin:10,  wMax:300,  xp:100,  desc:'Massive open-ocean speedster.' },
    { id:'swordfish',    name:'Swordfish',         emoji:'🐟', r:'Rare',      val:420,  wMin:15,  wMax:200,  xp:110,  desc:'Bill-bearing apex predator of the deep blue.' },
    { id:'pufferfish',   name:'Pufferfish',        emoji:'🐡', r:'Rare',      val:310,  wMin:0.3, wMax:5,    xp:85,   desc:'Toxic reef dweller that inflates when threatened.' },
    { id:'barracuda',    name:'Barracuda',         emoji:'🐟', r:'Rare',      val:290,  wMin:2,   wMax:15,   xp:80,   desc:'Razor-toothed torpedo of the tropics.' },
    { id:'tarpon',       name:'Tarpon',            emoji:'🐠', r:'Rare',      val:350,  wMin:5,   wMax:80,   xp:95,   desc:'Silver king of the flats, a sport-fishing legend.' },
    // ── EPIC ──
    { id:'manta',        name:'Manta Ray',         emoji:'🦈', r:'Epic',      val:1100, wMin:50,  wMax:500,  xp:260,  desc:'Graceful winged giant of the open ocean.' },
    { id:'oarfish',      name:'Oarfish',           emoji:'🐍', r:'Epic',      val:1300, wMin:30,  wMax:250,  xp:310,  desc:'Serpentine deep-sea fish, source of sea-monster myths.' },
    { id:'anglerfish',   name:'Anglerfish',        emoji:'🐟', r:'Epic',      val:950,  wMin:1,   wMax:20,   xp:230,  desc:'Bioluminescent predator of midnight depths.' },
    { id:'electric_eel', name:'Electric Eel',      emoji:'⚡', r:'Epic',      val:1150, wMin:2,   wMax:20,   xp:280,  desc:'Living battery of the Amazon, 600V of danger.' },
    { id:'coelacanth',   name:'Coelacanth',        emoji:'🐠', r:'Epic',      val:1800, wMin:20,  wMax:90,   xp:400,  desc:'Living fossil, unchanged for 400 million years.' },
    { id:'beluga',       name:'Beluga Sturgeon',   emoji:'🐡', r:'Epic',      val:2000, wMin:20,  wMax:1000, xp:450,  desc:'Ancient giant, prized for its caviar.' },
    // ── LEGENDARY ──
    { id:'narwhal',      name:'Narwhal',           emoji:'🦄', r:'Legendary', val:5500, wMin:400, wMax:1600, xp:850,  desc:'Unicorn of the sea with a spiraled tusk.' },
    { id:'colossal_squid',name:'Colossal Squid',   emoji:'🦑', r:'Legendary', val:6500, wMin:200, wMax:750,  xp:950,  desc:'The largest invertebrate on Earth.' },
    { id:'golden_carp',  name:'Golden Carp',       emoji:'✨', r:'Legendary', val:8500, wMin:1,   wMax:10,   xp:1050, desc:'A mythically rare carp with shimmering gold scales.' },
    { id:'megalodon',    name:'Megalodon Pup',     emoji:'🦷', r:'Legendary', val:9000, wMin:100, wMax:500,  xp:1100, desc:'Offspring of the ancient 60-foot shark, impossibly alive.' },
    { id:'giant_squid',  name:'Giant Squid',       emoji:'🦑', r:'Legendary', val:7000, wMin:100, wMax:400,  xp:900,  desc:'Deep-sea monster with dinner-plate eyes.' },
    // ── MYTHICAL ──
    { id:'sea_serpent',  name:'Sea Serpent',       emoji:'🐉', r:'Mythical',  val:28000,wMin:500, wMax:3000, xp:3200, desc:'Primordial serpent said to encircle the world.' },
    { id:'leviathan',    name:'Leviathan',         emoji:'🌊', r:'Mythical',  val:55000,wMin:1000,wMax:8000, xp:5500, desc:'Ancient sea deity of chaos and storms.' },
    { id:'kraken_spawn', name:'Kraken Spawn',      emoji:'🦑', r:'Mythical',  val:32000,wMin:300, wMax:2000, xp:4200, desc:'Young of the immortal Kraken, still the size of a ship.' },
    // ── SECRET ──
    { id:'void_fish',         name:'Void Fish',           emoji:'🌑', r:'Secret', val:120000,wMin:0.001,wMax:0.001,xp:12000,desc:'A fish from between dimensions. It weighs nothing and everything.' },
    { id:'celestial_koi',     name:'Celestial Koi',       emoji:'🌟', r:'Secret', val:180000,wMin:1,    wMax:1,    xp:15000,desc:'Formed from stardust. Catching it is said to grant a wish.' },
    { id:'crowned_anglerfish', name:'Crowned Angler Fish', emoji:'👑', r:'Secret', val:250000,wMin:5,    wMax:50,   xp:20000,desc:'A golden-crowned horror of the abyss. Key to unlocking the Scylla.' },
    { id:'frozen_leviathan',  name:'Frozen Leviathan',    emoji:'❄️', r:'Secret', val:300000,wMin:1000, wMax:5000, xp:25000,desc:'An ancient sea titan frozen for eons. Required to enter Scylla Chamber.' },
    { id:'magma_leviathan',   name:'Magma Leviathan',     emoji:'🌋', r:'Secret', val:300000,wMin:1000, wMax:5000, xp:25000,desc:'A volcanic sea titan of liquid fire. Required to enter Scylla Chamber.' },
];

// Rarity weight table — lower weight = rarer
const RARITY_WEIGHTS = {
    Common:4000, Uncommon:2200, Rare:1200, Epic:600, Legendary:250, Mythical:80, Secret:5
};

// Mutations
const MUTATIONS = [
    { id:'none',       name:'',            emoji:'',   mult:1.0,  weight:8000 },
    { id:'golden',     name:'Golden',      emoji:'✨',  mult:3.0,  weight:600  },
    { id:'shiny',      name:'Shiny',       emoji:'💎',  mult:2.5,  weight:400  },
    { id:'albino',     name:'Albino',      emoji:'🤍',  mult:2.0,  weight:300  },
    { id:'corrupted',  name:'Corrupted',   emoji:'🌑',  mult:4.0,  weight:120  },
    { id:'radiant',    name:'Radiant',     emoji:'🌟',  mult:5.0,  weight:60   },
    { id:'ancient',    name:'Ancient',     emoji:'🏛️',  mult:6.0,  weight:30   },
    { id:'fossilized', name:'Fossilized',  emoji:'🦕',  mult:7.0,  weight:15   },
    { id:'celestial',  name:'Celestial',   emoji:'✴️',  mult:10.0, weight:8    },
    { id:'abyssal',    name:'Abyssal',     emoji:'🌊',  mult:8.0,  weight:12   },
    { id:'prismatic',  name:'Prismatic',   emoji:'🌈',  mult:15.0, weight:3    },
];

// Fishing rods — id, name, emoji, price, reqLevel, reqQuest, rodPower, luck, desc
const FISHING_RODS = [
    { id:'plastic',    name:'Plastic Rod',        emoji:'🎣', price:0,       reqLv:0,   reqQ:null,        pwr:1.0,  luck:0,   desc:'The starter rod. Catches basic fish.' },
    { id:'carbon',     name:'Carbon Rod',         emoji:'🎣', price:800,     reqLv:5,   reqQ:null,        pwr:1.3,  luck:2,   desc:'Lightweight and responsive.' },
    { id:'steady',     name:'Steady Rod',         emoji:'🎣', price:3000,    reqLv:10,  reqQ:null,        pwr:1.6,  luck:4,   desc:'Excellent control, great for rare fish.' },
    { id:'iron',       name:'Iron Rod',           emoji:'🎣', price:8000,    reqLv:15,  reqQ:null,        pwr:2.0,  luck:6,   desc:'Sturdy rod for tougher fish.' },
    { id:'titanium',   name:'Titanium Rod',       emoji:'🎣', price:25000,   reqLv:25,  reqQ:null,        pwr:2.5,  luck:8,   desc:'Lightweight titanium for deep sea fishing.' },
    { id:'enchanted',  name:'Enchanted Rod',      emoji:'✨', price:80000,   reqLv:35,  reqQ:null,        pwr:3.0,  luck:12,  desc:'Magically enhanced for rare catches.' },
    { id:'crystal',    name:'Crystal Rod',        emoji:'💎', price:250000,  reqLv:50,  reqQ:null,        pwr:4.0,  luck:18,  desc:'Crystalline rod that attracts Legendary fish.' },
    { id:'void',       name:'Void Rod',           emoji:'🌑', price:1000000, reqLv:75,  reqQ:null,        pwr:5.5,  luck:25,  desc:'Forged from void matter. Mythical fish possible.' },
    { id:'nolife',     name:'No Life Rod',        emoji:'🏆', price:500000,  reqLv:50,  reqQ:'grind_100', pwr:4.5,  luck:20,  desc:'Only available to true fishing addicts.' },
    { id:'mythical',   name:'Mythical Rod',       emoji:'🌟', price:2000000, reqLv:100, reqQ:null,        pwr:7.0,  luck:35,  desc:'Legendary rod of the ancients. Catches anything.' },
    { id:'celestial',  name:'Celestial Rod',      emoji:'✴️', price:0,       reqLv:0,   reqQ:'prestige5', pwr:10.0, luck:50,  desc:'Prestige reward. The ultimate fishing rod.' },
    { id:'scylla',     name:"Scylla's Grasp",     emoji:'🦑', price:0,       reqLv:100, reqQ:'scylla',    pwr:12.0, luck:60,  desc:'Forged from Scylla herself. Catches Secret fish easily.' },
];

// Rod enchantments
const ROD_ENCHANTS = [
    { id:'lucky',    name:'Lucky',     emoji:'🍀', cost:2000,  desc:'+10% mutation chance' },
    { id:'swift',    name:'Swift',     emoji:'⚡', cost:5000,  desc:'-25% fishing cooldown' },
    { id:'magnetic', name:'Magnetic',  emoji:'🧲', cost:12000, desc:'+20% rare fish rate'  },
    { id:'deep',     name:'Deep Sea',  emoji:'🌊', cost:30000, desc:'Enables deep biomes'  },
    { id:'fortune',  name:'Fortune',   emoji:'💰', cost:50000, desc:'+30% sell value'      },
    { id:'ancient',  name:'Ancient',   emoji:'🏛️', cost:150000,desc:'+ancient mutation chance' },
];

// Bait types
const BAIT_TYPES = [
    { id:'worm',      name:'Worm',         emoji:'🪱', price:50,    bonus:'common',    mult:1.4, desc:'Common fish magnet' },
    { id:'minnow',    name:'Minnow',       emoji:'🐟', price:200,   bonus:'uncommon',  mult:1.6, desc:'Attracts uncommon fish' },
    { id:'cricket',   name:'Cricket',      emoji:'🦗', price:600,   bonus:'rare',      mult:1.9, desc:'Rare fish bait' },
    { id:'shrimp',    name:'Shrimp',       emoji:'🦐', price:1500,  bonus:'epic',      mult:2.2, desc:'Epic fish lure' },
    { id:'squid',     name:'Squid',        emoji:'🦑', price:6000,  bonus:'legendary', mult:2.8, desc:'Legendary fish bait' },
    { id:'voidbait',  name:'Void Bait',    emoji:'🌑', price:60000, bonus:'mythical',  mult:3.5, desc:'Mythical/Secret bait' },
    { id:'goldenlure',name:'Golden Lure',  emoji:'✨', price:3000,  bonus:'mutation',  mult:4.0, desc:'3x mutation chance' },
    { id:'ancient',   name:'Ancient Bait', emoji:'🏛️', price:25000, bonus:'ancient',   mult:5.0, desc:'Ancient mutation bait' },
];

// Biomes — id, name, emoji, unlockLv, rarities allowed, desc
const BIOMES = [
    { id:'pond',          name:'Pond',             emoji:'🌿', unlockLv:0,   maxRarity:'Uncommon',  desc:'A calm starter pond.' },
    { id:'river',         name:'River',            emoji:'🏞️', unlockLv:5,   maxRarity:'Rare',      desc:'Fast-flowing river waters.' },
    { id:'lake',          name:'Lake',             emoji:'🏔️', unlockLv:10,  maxRarity:'Epic',      desc:'Deep, cold lake with large fish.' },
    { id:'ocean',         name:'Ocean',            emoji:'🌊', unlockLv:20,  maxRarity:'Legendary', desc:'The vast open ocean.' },
    { id:'challenger',    name:'Challenger Deep',  emoji:'🌑', unlockLv:35,  maxRarity:'Mythical',  desc:'Deepest point on Earth.' },
    { id:'volcanic',      name:'Volcanic Vents',   emoji:'🌋', unlockLv:50,  maxRarity:'Mythical',  desc:'Superheated vents teeming with heat-adapted life.' },
    { id:'abyss',         name:"Abyssal Zenith",   emoji:'🌑', unlockLv:75,  maxRarity:'Secret',    desc:'Beyond light and reason.' },
    { id:'marianas',      name:"Mariana's Veil",   emoji:'👑', unlockLv:100, maxRarity:'Secret',    desc:'Secret fishing grounds. Scylla Key obtainable here.' },
    { id:'celestial_sea', name:'Celestial Sea',    emoji:'✴️', unlockLv:150, maxRarity:'Secret',    desc:'Starlit waters beyond the world.' },
];

const RARITY_ORDER = ['Common','Uncommon','Rare','Epic','Legendary','Mythical','Secret'];

// Weather effects
const WEATHER_EFFECTS = [
    { id:'sunny',   name:'Sunny',   emoji:'☀️',  commonMult:1.0, rareMult:0.9, legMult:0.8  },
    { id:'cloudy',  name:'Cloudy',  emoji:'☁️',  commonMult:1.1, rareMult:1.0, legMult:0.9  },
    { id:'rainy',   name:'Rainy',   emoji:'🌧️',  commonMult:0.8, rareMult:1.4, legMult:1.2  },
    { id:'stormy',  name:'Stormy',  emoji:'⛈️',  commonMult:0.5, rareMult:1.8, legMult:2.0  },
    { id:'foggy',   name:'Foggy',   emoji:'🌫️',  commonMult:0.9, rareMult:1.3, legMult:1.5  },
    { id:'aurora',  name:'Aurora',  emoji:'🌌',  commonMult:0.7, rareMult:2.0, legMult:3.5  },
    { id:'eclipse', name:'Eclipse', emoji:'🌑',  commonMult:0.3, rareMult:2.5, legMult:5.0  },
];

// World events
const WORLD_EVENTS = [
    { id:'whale',      name:'Whale Migration',  emoji:'🐋', dur:3600000, desc:'Whale pods appear! Legendary fish chance doubled!',       effect:'legend2x' },
    { id:'orca',       name:'Orca Hunt',        emoji:'🐬', dur:2700000, desc:'Orca pods scatter fish! Rare fish triple chance!',         effect:'rare3x'   },
    { id:'megalodon',  name:'Megalodon Sighting',emoji:'🦷',dur:1800000, desc:'A Megalodon lurks! Mythical fish possible everywhere!',   effect:'myth_any' },
    { id:'kraken',     name:'Kraken Rising',    emoji:'🦑', dur:3600000, desc:'The Kraken awakens! All mutations x5!',                  effect:'mut5x'    },
    { id:'leviathan',  name:'Leviathan Storm',  emoji:'🌊', dur:1800000, desc:'Ancient storm! Secret fish chance for 30 minutes!',      effect:'secret_chance'},
    { id:'goldtide',   name:'Golden Tide',      emoji:'✨', dur:3600000, desc:'Golden waters! Fish sell for 3x their value!',           effect:'sell3x'   },
    { id:'treasure',   name:'Treasure Tide',    emoji:'💰', dur:3600000, desc:'Treasure chests triple chance!',                         effect:'chest3x'  },
];

// Boss fish
const BOSS_FISH = [
    { id:'ancient_shark',  name:'Ancient Shark',    emoji:'🦈', hp:15000,  reward:25000,  xp:6000,   desc:'A prehistoric megalodon fragment.' },
    { id:'thunder_whale',  name:'Thunder Whale',    emoji:'🐋', hp:40000,  reward:80000,  xp:15000,  desc:'A whale that controls lightning!' },
    { id:'kraken_lord',    name:'Kraken Lord',      emoji:'🦑', hp:100000, reward:250000, xp:50000,  desc:'The immortal Kraken itself!' },
    { id:'void_leviathan', name:'Void Leviathan',   emoji:'🌑', hp:500000, reward:1000000,xp:200000, desc:'An entity from outside existence.' },
];

// Achievements
const ACHIEVEMENTS = [
    { id:'first_catch',   name:'First Cast',        emoji:'🎣', desc:'Catch your first fish',              reward:100,   cond:{t:'catch',  n:1}        },
    { id:'catch10',       name:'Fisher',            emoji:'🐟', desc:'Catch 10 fish',                      reward:200,   cond:{t:'catch',  n:10}       },
    { id:'catch100',      name:'Angler',            emoji:'🎣', desc:'Catch 100 fish',                     reward:1000,  cond:{t:'catch',  n:100}      },
    { id:'catch1000',     name:'Master Angler',     emoji:'🏅', desc:'Catch 1,000 fish',                   reward:10000, cond:{t:'catch',  n:1000}     },
    { id:'rare_first',    name:'Rare Find',         emoji:'💙', desc:'Catch your first Rare fish',         reward:500,   cond:{t:'rarity', r:'Rare'}   },
     { id:'epic_first',    name:'Epic Catch',        emoji:'💜', desc:'Catch your first Epic fish',         reward:2000,  cond:{t:'rarity', r:'Epic'}   },
    { id:'legend_first',  name:'Legendary Catch',   emoji:'🧡', desc:'Catch a Legendary fish',             reward:8000,  cond:{t:'rarity', r:'Legendary'}},
    { id:'mythical_first',name:'Myth Hunter',       emoji:'❤️', desc:'Catch a Mythical fish',              reward:40000, cond:{t:'rarity', r:'Mythical'}},
    { id:'secret_first',  name:'Secret Keeper',     emoji:'🌑', desc:'Catch a Secret fish',                reward:200000,cond:{t:'rarity', r:'Secret'} },
    { id:'mutation_first',name:'Mutant',            emoji:'🧬', desc:'Catch a mutated fish',               reward:500,   cond:{t:'mutation',n:1}       },
    { id:'golden_catch',  name:'Gold Hunter',       emoji:'✨', desc:'Catch a Golden fish',                reward:3000,  cond:{t:'mut_type',m:'golden'}},
    { id:'dungeon10',     name:'Dungeon Delver',    emoji:'⚔️', desc:'Clear 10 dungeons',                  reward:5000,  cond:{t:'dungeon', n:10}      },
    { id:'boss_first',    name:'Boss Slayer',       emoji:'💀', desc:'Defeat a boss fish',                 reward:15000, cond:{t:'boss',    n:1}        },
    { id:'species20',     name:'Collector',         emoji:'📚', desc:'Discover 20 unique species',         reward:5000,  cond:{t:'species', n:20}      },
    { id:'species_all',   name:'Encyclopedist',     emoji:'📖', desc:'Discover all fish species',          reward:100000,cond:{t:'species', n:FISH_SPECIES.length}},
    { id:'prestige1',     name:'Reborn',            emoji:'🔄', desc:'Prestige once',                      reward:50000, cond:{t:'prestige',n:1}       },
    { id:'rich1m',        name:'Millionaire',       emoji:'💰', desc:'Accumulate 1,000,000 coins',         reward:20000, cond:{t:'coins',   n:1000000}  },
    { id:'level50',       name:'Veteran',           emoji:'⭐', desc:'Reach level 50',                     reward:25000, cond:{t:'level',   n:50}       },
    { id:'level100',      name:'Legend',            emoji:'🌟', desc:'Reach level 100',                    reward:100000,cond:{t:'level',   n:100}      },
    { id:'streak7',       name:'Week Warrior',      emoji:'🔥', desc:'7-day login streak',                 reward:3000,  cond:{t:'streak',  n:7}        },
    { id:'streak30',      name:'Dedicated',         emoji:'💪', desc:'30-day login streak',                reward:20000, cond:{t:'streak',  n:30}       },
    { id:'married',       name:'Taken',             emoji:'💍', desc:'Get married',                        reward:500,   cond:{t:'married', n:1}        },
    { id:'scylla',        name:'Scylla Slayer',     emoji:'🦑', desc:'Defeat the Scylla',                  reward:500000,cond:{t:'scylla',  n:1}        },
];

// Titles
const TITLES = [
    { id:'newbie',        name:'Newbie',          emoji:'🐣', req:null           },
    { id:'angler',        name:'The Angler',      emoji:'🎣', req:'catch100'      },
    { id:'master_angler', name:'Master Angler',   emoji:'🏅', req:'catch1000'     },
    { id:'myth_hunter',   name:'Myth Hunter',     emoji:'❤️', req:'mythical_first'},
    { id:'secret_keeper', name:'Secret Keeper',   emoji:'🌑', req:'secret_first'  },
    { id:'encyclopedist', name:'Encyclopedist',   emoji:'📖', req:'species_all'   },
    { id:'millionaire',   name:'The Millionaire', emoji:'💰', req:'rich1m'        },
    { id:'legend',        name:'The Legend',      emoji:'🌟', req:'level100'      },
    { id:'reborn',        name:'The Reborn',      emoji:'🔄', req:'prestige1'     },
    { id:'boss_hunter',   name:'Boss Hunter',     emoji:'💀', req:'boss_first'    },
    { id:'scylla_slayer', name:'Scylla Slayer',   emoji:'🦑', req:'scylla'        },
    { id:'dungeon_lord',  name:'Dungeon Lord',    emoji:'🏰', req:'dungeon10'     },
    { id:'veteran',       name:'Veteran',         emoji:'⭐', req:'level50'       },
    { id:'dedicated',     name:'Dedicated',       emoji:'💪', req:'streak30'      },
];

// RPG Classes
const RPG_CLASSES = {
    warrior:  { name:'Warrior',  emoji:'⚔️',  hp:150, atk:25, def:20, mana:50,  desc:'Balanced fighter, high survivability.' },
    mage:     { name:'Mage',     emoji:'🧙',  hp:80,  atk:55, def:8,  mana:150, desc:'Glass cannon with devastating spells.' },
    assassin: { name:'Assassin', emoji:'🗡️',  hp:100, atk:45, def:10, mana:80,  desc:'High crit chance, bleeds enemies.' },
    tank:     { name:'Tank',     emoji:'🛡️',  hp:200, atk:15, def:40, mana:40,  desc:'Near-unkillable wall of defense.' },
};

// Skill trees per class
const SKILL_TREES = {
    warrior:[
        { id:'power_strike', name:'Power Strike',  emoji:'⚡', cost:1, reqLv:1,  effect:'atk+10', desc:'+10 ATK' },
        { id:'iron_skin',    name:'Iron Skin',      emoji:'🛡️', cost:1, reqLv:1,  effect:'def+8',  desc:'+8 DEF' },
        { id:'berserker',    name:'Berserker',      emoji:'😤', cost:2, reqLv:5,  effect:'crit15', desc:'+15% Crit' },
        { id:'whirlwind',    name:'Whirlwind',      emoji:'🌪️', cost:3, reqLv:10, effect:'aoe',    desc:'AOE attack' },
        { id:'warcry',       name:'War Cry',        emoji:'📣', cost:4, reqLv:20, effect:'atk+30', desc:'+30 ATK burst' },
    ],
    mage:[
        { id:'fireball',     name:'Fireball',       emoji:'🔥', cost:1, reqLv:1,  effect:'spell15',desc:'+15 Spell DMG' },
        { id:'ice_wall',     name:'Ice Wall',       emoji:'❄️', cost:1, reqLv:1,  effect:'def+5',  desc:'+5 DEF shield' },
        { id:'arcane_surge', name:'Arcane Surge',   emoji:'💫', cost:2, reqLv:5,  effect:'mana50', desc:'+50 Max Mana' },
        { id:'blink',        name:'Blink',          emoji:'✨', cost:3, reqLv:10, effect:'dodge20',desc:'+20% Dodge' },
        { id:'meteor',       name:'Meteor',         emoji:'☄️', cost:4, reqLv:20, effect:'nuke',   desc:'Massive AOE' },
    ],
    assassin:[
        { id:'shadow_step',  name:'Shadow Step',    emoji:'👣', cost:1, reqLv:1,  effect:'spd10',  desc:'+10% Speed' },
        { id:'poison',       name:'Poison Blade',   emoji:'☠️', cost:1, reqLv:1,  effect:'poison', desc:'Applies Poison' },
        { id:'backstab',     name:'Backstab',       emoji:'🗡️', cost:2, reqLv:5,  effect:'crit25', desc:'+25% Crit' },
        { id:'smokebomb',    name:'Smoke Bomb',     emoji:'💨', cost:3, reqLv:10, effect:'blind',  desc:'Blinds enemies' },
        { id:'death_mark',   name:'Death Mark',     emoji:'💀', cost:4, reqLv:20, effect:'execute',desc:'Execute below 20% HP' },
    ],
    tank:[
        { id:'fortify',      name:'Fortify',        emoji:'🏰', cost:1, reqLv:1,  effect:'def15',  desc:'+15 DEF' },
        { id:'taunt',        name:'Taunt',          emoji:'😤', cost:1, reqLv:1,  effect:'aggro',  desc:'Force enemy focus' },
        { id:'shield_bash',  name:'Shield Bash',    emoji:'🛡️', cost:2, reqLv:5,  effect:'stun',   desc:'Stuns enemies' },
        { id:'juggernaut',   name:'Juggernaut',     emoji:'🚛', cost:3, reqLv:10, effect:'hp100',  desc:'+100 Max HP' },
        { id:'immortal',     name:'Immortal',       emoji:'⭐', cost:5, reqLv:20, effect:'revive', desc:'Auto-revive once' },
    ],
};

// Armor sets
const ARMOR_SETS = [
    { id:'cloth',    name:'Cloth Armor',     emoji:'👕', tier:1, def:5,   price:200,    bonus:'none'             },
    { id:'leather',  name:'Leather Armor',   emoji:'🧥', tier:2, def:12,  price:800,    bonus:'+5% dodge'        },
    { id:'chainmail',name:'Chainmail',       emoji:'⛓️', tier:3, def:22,  price:3000,   bonus:'+10 block'        },
    { id:'plate',    name:'Plate Armor',     emoji:'🛡️', tier:4, def:38,  price:10000,  bonus:'+20 HP'           },
    { id:'void_armor',name:'Void Armor',     emoji:'🌑', tier:5, def:60,  price:80000,  bonus:'+20% all resist'  },
    { id:'celestial',name:'Celestial Armor', emoji:'✴️', tier:6, def:90,  price:300000, bonus:'+60% DEF, +35 ATK'},
];

// Dungeons
const DUNGEONS = [
    { id:'goblin_cave',  name:'Goblin Cave',     emoji:'🟢', minLv:1,  floors:3,  reward:500,    xp:200,   enemies:['Goblin','Cave Rat','Orc']        },
    { id:'spider_lair',  name:'Spider Lair',     emoji:'🕷️', minLv:5,  floors:5,  reward:1500,   xp:600,   enemies:['Spider','Silk Weaver','Queen Spider']},
    { id:'dark_castle',  name:'Dark Castle',     emoji:'🏰', minLv:10, floors:8,  reward:5000,   xp:2000,  enemies:['Skeleton','Vampire','Death Knight']},
    { id:'magma_depths', name:'Magma Depths',    emoji:'🌋', minLv:20, floors:10, reward:18000,  xp:6000,  enemies:['Fire Elemental','Lava Golem','Ifrit']},
    { id:'void_rift',    name:'Void Rift',       emoji:'🌑', minLv:35, floors:15, reward:60000,  xp:25000, enemies:['Void Walker','Shadow Demon','Lich'] },
    { id:'celestial_sp', name:'Celestial Spire', emoji:'✴️', minLv:50, floors:20, reward:250000, xp:100000,enemies:['Angel','Divine Guard','God Slayer'] },
];

const ENEMIES = {
    'Goblin':       {hp:50,  atk:8,   def:2,  xp:20,  gold:10  },
    'Cave Rat':     {hp:30,  atk:5,   def:1,  xp:10,  gold:5   },
    'Orc':          {hp:90,  atk:15,  def:6,  xp:40,  gold:25  },
    'Spider':       {hp:60,  atk:12,  def:3,  xp:25,  gold:15  },
    'Silk Weaver':  {hp:100, atk:20,  def:7,  xp:50,  gold:35  },
    'Queen Spider': {hp:600, atk:40,  def:18, xp:250, gold:200 },
    'Skeleton':     {hp:110, atk:22,  def:12, xp:65,  gold:45  },
    'Vampire':      {hp:220, atk:35,  def:14, xp:130, gold:110 },
    'Death Knight': {hp:450, atk:50,  def:28, xp:280, gold:250 },
    'Fire Elemental':{hp:320,atk:55,  def:22, xp:220, gold:200 },
    'Lava Golem':   {hp:650, atk:65,  def:40, xp:380, gold:350 },
    'Ifrit':        {hp:1800,atk:110, def:55, xp:1200,gold:1000},
    'Void Walker':  {hp:900, atk:90,  def:45, xp:600, gold:600 },
    'Shadow Demon': {hp:1400,atk:120, def:70, xp:900, gold:800 },
    'Lich':         {hp:3500,atk:160, def:90, xp:3500,gold:3000},
    'Angel':        {hp:5500,atk:220, def:110,xp:9000,gold:7000},
    'Divine Guard': {hp:4500,atk:200, def:130,xp:7000,gold:6000},
    'God Slayer':   {hp:12000,atk:320,def:160,xp:25000,gold:20000},
};

// Crafting materials
const CRAFT_MATS = [
    { id:'iron_ore',   name:'Iron Ore',     emoji:'🪨', src:'mine',    val:20  },
    { id:'wood',       name:'Wood',         emoji:'🪵', src:'forest',  val:10  },
    { id:'steel',      name:'Steel',        emoji:'⛓️', src:'dungeon', val:80  },
    { id:'leather',    name:'Leather',      emoji:'🧥', src:'dungeon', val:50  },
    { id:'magic_crys', name:'Magic Crystal',emoji:'💎', src:'dungeon', val:200 },
    { id:'herbs',      name:'Herbs',        emoji:'🌿', src:'explore', val:15  },
    { id:'void_shard', name:'Void Shard',   emoji:'🌑', src:'dungeon', val:500 },
    { id:'fish_scale', name:'Fish Scale',   emoji:'✨', src:'fishing', val:30  },
];

// Battle pass tiers
const BP_TIERS = [
    {tier:1, bpXp:0,   free:{coins:100},        prem:{coins:500,item:'worm_bait'}},
    {tier:2, bpXp:200, free:{coins:200},        prem:{coins:1000,item:'minnow_bait'}},
    {tier:3, bpXp:500, free:{xp:100},           prem:{coins:2000,item:'carbon_rod_key'}},
    {tier:4, bpXp:900, free:{coins:300},        prem:{coins:3000,item:'armor_chest'}},
    {tier:5, bpXp:1400,free:{coins:500},        prem:{coins:5000,item:'cricket_bait'}},
    {tier:6, bpXp:2000,free:{xp:200},           prem:{coins:8000,item:'enchanted_bait'}},
    {tier:7, bpXp:2700,free:{coins:1000},       prem:{coins:12000,item:'epic_chest'}},
    {tier:8, bpXp:3600,free:{coins:1500},       prem:{coins:20000,item:'squid_bait'}},
    {tier:9, bpXp:5000,free:{xp:500},           prem:{coins:35000,item:'void_bait'}},
    {tier:10,bpXp:7000,free:{coins:5000},       prem:{coins:100000,item:'season_title'}},
];
     // ═══════════════════════════════════════════════════════════════
// ♦️ ORIGINAL SHOP CATALOGUE (unchanged)
// ═══════════════════════════════════════════════════════════════
const WEAPONS = [
    { id: 'rusty_sword',   name: 'Rusty Sword',   damage: 25,  price: 500,   rarity: 'Common',    emoji: '🗡️' },
    { id: 'shadow_blade',  name: 'Shadow Blade',  damage: 80,  price: 8000,  rarity: 'Rare',      emoji: '🌙' },
    { id: 'galaxy_hammer', name: 'Galaxy Hammer', damage: 150, price: 50000, rarity: 'Legendary', emoji: '⭐' },
];
const ITEMS = [
    { id: 'health_potion', name: 'Health Potion', price: 100,  type: 'consumable', emoji: '🧪' },
    { id: 'mana_gem',      name: 'Mana Gem',      price: 500,  type: 'crafting',   emoji: '💎' },
    { id: 'lucky_coin',    name: 'Lucky Coin',    price: 1000, type: 'special',    emoji: '🪙' },
];
const PETS = [
    { id: 'dragon',  name: '🐉 Dragon',  price: 5000, bonus: 50 },
    { id: 'phoenix', name: '🔥 Phoenix', price: 7500, bonus: 75 },
    { id: 'wolf',    name: '🐺 Wolf',    price: 2000, bonus: 25 },
];


// ════════════════════════════════════════════════════════════════
// ♦️ DATA STRUCTURE — Extended with full backward compat
// ════════════════════════════════════════════════════════════════
class UserData {
    constructor() {
        // ── ORIGINAL (never changed) ──
        this.coins        = new Map();
        this.bank         = new Map();
        this.xp           = new Map();
        this.weapons      = new Map();
        this.items        = new Map();
        this.pets         = new Map();
        this.achievements = new Map(); // kept but now using achievementsNew
        this.badges       = new Map();
        this.streaks      = new Map();
        this.married      = new Map();
        this.rep          = new Map();
        this.warnings     = new Map();
        // ── NEW: Fishing ──
        this.fishInv      = new Map(); // [{fishId,mutId,weight,value,ts}]
        this.fishCaught   = new Map(); // {fishId:count}
        this.fishStats    = new Map(); // {total,totalVal,biggest,biggestName}
        this.fishStreak   = new Map(); // {streak,lastDay}
        this.rodOwned     = new Map(); // [rodId]
        this.rodEquipped  = new Map(); // rodId
        this.rodEnchants  = new Map(); // [enchId]
        this.baitInv      = new Map(); // {baitId:count}
        this.fishQuest    = new Map(); // {type,target,goal,progress,reward,date,done}
        this.completedQuests = new Map(); // [questId]
        this.favoriteFish = new Map(); // [fishId]
        // ── NEW: RPG ──
        this.rpgClass     = new Map();
        this.rpgStats     = new Map(); // {hp,maxHp,atk,def,mana,maxMana}
        this.skillPoints  = new Map();
        this.skillsLearned= new Map(); // [skillId]
        this.armorEquipped= new Map();
        this.dungeonClears= new Map(); // count
        this.craftMats    = new Map(); // {matId:count}
        // ── NEW: Guilds ──
        this.guilds       = new Map(); // guildId -> {name,owner,members,bank,level,xp,warScore}
        this.guildOf      = new Map(); // userId -> guildId
        // ── NEW: Economy+ ──
        this.marketplace  = new Map(); // listId -> {seller,type,itemId,price,ts}
        this.loginStreak  = new Map(); // {streak,lastLogin}
        this.prestige     = new Map(); // {level,lastPrestige}
        this.battlePass   = new Map(); // {tier,bpXp,premium,season}
        this.joinDate     = new Map(); // userId -> timestamp
        // ── NEW: Pets+ ──
        this.petNew       = new Map(); // {species,level,xp,ability}
        // ── NEW: Progression ──
        this.achievementsNew = new Map(); // [achievementId]
        this.titlesOwned  = new Map(); // [titleId]
        this.titleActive  = new Map(); // titleId
        this.pvpWins      = new Map();
        // ── World state (global) ──
        this.worldEvent   = null;
        this.worldEventEnd= 0;
        this.activeBoss   = null;
        this.activeBossHp = 0;
        this.scyllaActive = false;
    }

    toJSON() {
        const m = m => Object.fromEntries(m);
        return {
            coins:m(this.coins), bank:m(this.bank), xp:m(this.xp),
            weapons:m(this.weapons), items:m(this.items), pets:m(this.pets),
            achievements:m(this.achievements), badges:m(this.badges),
            streaks:m(this.streaks), married:m(this.married),
            rep:m(this.rep), warnings:m(this.warnings),
            fishInv:m(this.fishInv), fishCaught:m(this.fishCaught),
            fishStats:m(this.fishStats), fishStreak:m(this.fishStreak),
            rodOwned:m(this.rodOwned), rodEquipped:m(this.rodEquipped),
            rodEnchants:m(this.rodEnchants), baitInv:m(this.baitInv),
            fishQuest:m(this.fishQuest), completedQuests:m(this.completedQuests),
            favoriteFish:m(this.favoriteFish),
            rpgClass:m(this.rpgClass), rpgStats:m(this.rpgStats),
            skillPoints:m(this.skillPoints), skillsLearned:m(this.skillsLearned),
            armorEquipped:m(this.armorEquipped), dungeonClears:m(this.dungeonClears),
            craftMats:m(this.craftMats),
            guilds:m(this.guilds), guildOf:m(this.guildOf),
            marketplace:m(this.marketplace), loginStreak:m(this.loginStreak),
            prestige:m(this.prestige), battlePass:m(this.battlePass),
            joinDate:m(this.joinDate), petNew:m(this.petNew),
            achievementsNew:m(this.achievementsNew), titlesOwned:m(this.titlesOwned),
            titleActive:m(this.titleActive), pvpWins:m(this.pvpWins),
            worldEvent:this.worldEvent, worldEventEnd:this.worldEventEnd,
            activeBoss:this.activeBoss, activeBossHp:this.activeBossHp,
            scyllaActive:this.scyllaActive,
        };
    }

    fromJSON(obj) {
        if (!obj) return;
        const lo = (map, src, fn) => { if (!src) return; for (const [k,v] of Object.entries(src)) map.set(String(k), fn ? fn(v) : v); };
        lo(this.coins,   obj.coins,   v=>Number(v)||0);
        lo(this.bank,    obj.bank,    v=>Number(v)||0);
        lo(this.xp,      obj.xp,      v=>Number(v)||0);
        lo(this.weapons, obj.weapons, v=>Array.isArray(v)?v:[]);
        lo(this.items,   obj.items,   v=>Array.isArray(v)?v:[]);
        lo(this.pets,    obj.pets,    v=>v);
        lo(this.achievements,obj.achievements,v=>Array.isArray(v)?v:[]);
        lo(this.badges,  obj.badges,  v=>Array.isArray(v)?v:[]);
        lo(this.streaks, obj.streaks, v=>v);
        lo(this.married, obj.married, v=>String(v));
        lo(this.rep,     obj.rep,     v=>Number(v)||0);
        lo(this.warnings,obj.warnings,v=>Array.isArray(v)?v:[]);
        lo(this.fishInv, obj.fishInv, v=>Array.isArray(v)?v:[]);
        lo(this.fishCaught,obj.fishCaught,v=>v||{});
        lo(this.fishStats,obj.fishStats,v=>v||{total:0,totalVal:0,biggest:0,biggestName:''});
        lo(this.fishStreak,obj.fishStreak,v=>v||{streak:0,lastDay:''});
        lo(this.rodOwned,obj.rodOwned,v=>Array.isArray(v)?v:[]);
        lo(this.rodEquipped,obj.rodEquipped,v=>String(v));
        lo(this.rodEnchants,obj.rodEnchants,v=>Array.isArray(v)?v:[]);
        lo(this.baitInv,obj.baitInv,v=>v||{});
        lo(this.fishQuest,obj.fishQuest,v=>v);
        lo(this.completedQuests,obj.completedQuests,v=>Array.isArray(v)?v:[]);
        lo(this.favoriteFish,obj.favoriteFish,v=>Array.isArray(v)?v:[]);
        lo(this.rpgClass,obj.rpgClass,v=>String(v));
        lo(this.rpgStats,obj.rpgStats,v=>v);
        lo(this.skillPoints,obj.skillPoints,v=>Number(v)||0);
        lo(this.skillsLearned,obj.skillsLearned,v=>Array.isArray(v)?v:[]);
        lo(this.armorEquipped,obj.armorEquipped,v=>String(v));
        lo(this.dungeonClears,obj.dungeonClears,v=>Number(v)||0);
        lo(this.craftMats,obj.craftMats,v=>v||{});
        lo(this.guilds,obj.guilds,v=>v);
        lo(this.guildOf,obj.guildOf,v=>String(v));
        lo(this.marketplace,obj.marketplace,v=>v);
        lo(this.loginStreak,obj.loginStreak,v=>v||{streak:0,lastLogin:''});
        lo(this.prestige,obj.prestige,v=>v||{level:0});
        lo(this.battlePass,obj.battlePass,v=>v||{tier:1,bpXp:0,premium:false,season:SEASON});
        lo(this.joinDate,obj.joinDate,v=>Number(v)||Date.now());
        lo(this.petNew,obj.petNew,v=>v);
        lo(this.achievementsNew,obj.achievementsNew,v=>Array.isArray(v)?v:[]);
        lo(this.titlesOwned,obj.titlesOwned,v=>Array.isArray(v)?v:[]);
        lo(this.titleActive,obj.titleActive,v=>String(v));
        lo(this.pvpWins,obj.pvpWins,v=>Number(v)||0);
        this.worldEvent   = obj.worldEvent    || null;
        this.worldEventEnd= obj.worldEventEnd || 0;
        this.activeBoss   = obj.activeBoss    || null;
        this.activeBossHp = obj.activeBossHp  || 0;
        this.scyllaActive = obj.scyllaActive  || false;
    }
}

const userData       = new UserData();
let staffSet         = new Set();
let autoResponses    = new Map();
let welcomeConfig    = {};
let logsConfig       = {};
let ticketConfig     = {};
let suggestionConfig = {};
let levelAnnounceConfig = {};
let boss             = null; // legacy boss fight

// ════════════════════════════════════════════════════════════════
// ♦️ COOLDOWN MANAGER (original, unchanged)
// ════════════════════════════════════════════════════════════════
class CooldownManager {
    constructor() {
        this.cooldowns = new Map();
        this._interval = setInterval(() => this._cleanup(), CLEANUP_INTERVAL);
    }
    set(userId, command, ms) {
        if (!this.cooldowns.has(command)) this.cooldowns.set(command, new Map());
        this.cooldowns.get(command).set(userId, Date.now() + ms);
    }
    get(userId, command) {
        const exp = this.cooldowns.get(command)?.get(userId);
        if (!exp) return null;
        const rem = exp - Date.now();
        return rem > 0 ? rem : null;
    }
    has(userId, command)   { return this.get(userId, command) !== null; }
    clear(userId, command) { this.cooldowns.get(command)?.delete(userId); }
    clearAll(userId)       { for (const map of this.cooldowns.values()) map.delete(userId); }
    _cleanup() {
        const now = Date.now();
        for (const [cmd, map] of this.cooldowns) {
            for (const [uid, exp] of map) if (exp <= now) map.delete(uid);
            if (map.size === 0) this.cooldowns.delete(cmd);
        }
    }
    destroy() { clearInterval(this._interval); }
}
const cooldownManager = new CooldownManager();

// Active game sessions
const wordleGames = new Map();
const fnfGames    = new Map();
const bjGames     = new Map(); // blackjack games in progress (button-based)
const tttGames    = new Map(); // tic tac toe
const c4Games     = new Map(); // connect 4
const hangGames   = new Map(); // hangman

          
        // Rod luck — flat rare multiplier
        if (getRarityIdx(fish.r) >= 2) w *= (1 + rod.luck * 0.02);

        // Weather
        const rIdx = getRarityIdx(fish.r);
        if (rIdx <= 1) w *= weather.commonMult;
        else if (rIdx <= 3) w *= weather.rareMult;
        else w *= weather.legMult;

        // Night bonus
        if (night && rIdx >= 2) w *= 1.5;

        // Bait bonus
        if (bait) {
            const baitBonusMap = {common:'Common',uncommon:'Uncommon',rare:'Rare',epic:'Epic',legendary:'Legendary',mythical:'Mythical'};
            if (bait.bonus === 'mutation') { /* handled below */ }
            else if (baitBonusMap[bait.bonus] === fish.r) w *= bait.mult;
        }

        // World event
        if (event) {
            if (event.effect === 'legend2x' && rIdx >= 4) w *= 2;
            if (event.effect === 'rare3x'   && rIdx >= 2) w *= 3;
            if (event.effect === 'myth_any' && fish.r === 'Mythical') w *= 20;
            if (event.effect === 'secret_chance' && fish.r === 'Secret') w *= 50;
        }

        // Magnetic enchant
        if (enchants.includes('magnetic') && rIdx >= 2) w *= 1.2;

        return { ...fish, weight: Math.max(0.1, w) };
    });

    const caughtFish = weightedRandom(pool, 'weight');
    if (!caughtFish) return null;

    // Mutation roll
    let mutPool = MUTATIONS.map(m => ({ ...m }));
    if (enchants.includes('lucky'))  mutPool = mutPool.map(m => m.id !== 'none' ? {...m, weight: m.weight * 1.5} : m);
    if (enchants.includes('ancient')) mutPool = mutPool.map(m => m.id === 'ancient' ? {...m, weight: m.weight * 5} : m);
    if (bait?.bonus === 'mutation') mutPool = mutPool.map(m => m.id !== 'none' ? {...m, weight: m.weight * bait.mult} : m);
    if (bait?.bonus === 'ancient')  mutPool = mutPool.map(m => m.id === 'ancient' ? {...m, weight: m.weight * bait.mult} : m);
    if (event?.effect === 'mut5x')  mutPool = mutPool.map(m => m.id !== 'none' ? {...m, weight: m.weight * 5} : m);

    const mutation = weightedRandom(mutPool, 'weight');

    // Weight
    const weight = parseFloat((Math.random() * (caughtFish.wMax - caughtFish.wMin) + caughtFish.wMin).toFixed(2));

    // Value
    let value = Math.round(caughtFish.val * mutation.mult * (1 + weight / caughtFish.wMax * 0.5));
    if (enchants.includes('fortune')) value = Math.round(value * 1.3);
    if (event?.effect === 'sell3x')   value = Math.round(value * 3);

    // Store fish
    const inv = userData.fishInv.get(uid) || [];
    inv.push({ fishId: caughtFish.id, mutId: mutation.id, weight, value, ts: Date.now() });
    userData.fishInv.set(uid, inv);

    // Caught count
    const cMap = userData.fishCaught.get(uid) || {};
    cMap[caughtFish.id] = (cMap[caughtFish.id] || 0) + 1;
    userData.fishCaught.set(uid, cMap);

    // Stats
    const stats = userData.fishStats.get(uid) || { total:0, totalVal:0, biggest:0, biggestName:'' };
    stats.total++;
    stats.totalVal += value;
    if (weight > stats.biggest) { stats.biggest = weight; stats.biggestName = caughtFish.name; }
    userData.fishStats.set(uid, stats);

    // Streak
    const today = new Date().toDateString();
    const streak = userData.fishStreak.get(uid) || { streak:0, lastDay:'' };
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (streak.lastDay === today) {
        // same day, no streak change
    } else if (streak.lastDay === yesterday) {
        streak.streak++;
    } else {
        streak.streak = 1;
    }
    streak.lastDay = today;
    userData.fishStreak.set(uid, streak);

    // XP
    const xpGain = Math.round(caughtFish.xp * mutation.mult);
    const xpRes  = addXP(uid, xpGain);

    // Quest progress
    updateFishingQuest(uid, caughtFish, mutation);

    // Achievement checks
    const gained = checkAchievements(uid, caughtFish, mutation, stats);

    // Fish scale drop for crafting
    const mats = userData.craftMats.get(uid) || {};
    if (getRarityIdx(caughtFish.r) >= 2) {
        mats['fish_scale'] = (mats['fish_scale'] || 0) + 1;
        userData.craftMats.set(uid, mats);
    }

    // Treasure chest
    let chestGold = 0;
    const chestChance = event?.effect === 'chest3x' ? 0.15 : 0.05;
    if (Math.random() < chestChance) {
        chestGold = rng(200, 2000);
        addCoins(uid, chestGold);
    }

    return { fish: caughtFish, mutation, weight, value, xpGain, xpRes, weather, night, streak: streak.streak, chestGold, gained };
}

function updateFishingQuest(userId, fish, mutation) {
    const q = userData.fishQuest.get(userId);
    if (!q || q.done) return;
    const today = new Date().toDateString();
    if (q.date !== today) return;
    if (q.type === 'catch_any')    q.progress = (q.progress||0) + 1;
    if (q.type === 'catch_rarity' && fish.r === q.target) q.progress = (q.progress||0) + 1;
    if (q.type === 'catch_fish'   && fish.id === q.target) q.progress = (q.progress||0) + 1;
    if (q.type === 'catch_mutation' && mutation.id !== 'none') q.progress = (q.progress||0) + 1;
    if (q.progress >= q.goal) {
        q.done = true;
        addCoins(userId, q.reward);
        addXP(userId, q.xpReward || 100);
    }
    userData.fishQuest.set(userId, q);
}

function genDailyQuest(userId) {
    const today = new Date().toDateString();
    const existing = userData.fishQuest.get(userId);
    if (existing && existing.date === today) return existing;
    const rarities = ['Rare','Epic','Legendary'];
    const types = [
        { type:'catch_any',    target:null,   goal:rng(5,15),  reward:rng(300,800),  xpReward:150 },
        { type:'catch_rarity', target:rarities[rng(0,2)], goal:rng(2,5), reward:rng(800,2500), xpReward:400 },
        { type:'catch_mutation',target:null,  goal:rng(1,3),   reward:rng(1500,4000),xpReward:600 },
    ];
    const q = { ...types[rng(0,types.length-1)], date:today, progress:0, done:false };
    userData.fishQuest.set(userId, q);
    return q;
}

function checkAchievements(uid, fish, mutation, stats) {
    const owned = userData.achievementsNew.get(uid) || [];
    const gained = [];
    for (const ach of ACHIEVEMENTS) {
        if (owned.includes(ach.id)) continue;
        const c = ach.cond;
        let unlock = false;
        if (c.t === 'catch'    && stats.total >= c.n) unlock = true;
        if (c.t === 'rarity'   && fish.r === c.r)    unlock = true;
        if (c.t === 'mutation' && mutation.id !== 'none') unlock = true;
        if (c.t === 'mut_type' && mutation.id === c.m) unlock = true;
        if (unlock) {
            owned.push(ach.id);
            addCoins(uid, ach.reward);
            // unlock title if tied to this ach
            const title = TITLES.find(t => t.req === ach.id);
            if (title) {
                const tl = userData.titlesOwned.get(uid) || [];
                if (!tl.includes(title.id)) { tl.push(title.id); userData.titlesOwned.set(uid, tl); }
            }
            gained.push(ach);
        }
    }
    if (gained.length) userData.achievementsNew.set(uid, owned);
    return gained;
}

function checkAchievementGeneral(uid, type, value) {
    const owned = userData.achievementsNew.get(uid) || [];
    const gained = [];
    for (const ach of ACHIEVEMENTS) {
        if (owned.includes(ach.id)) continue;
        const c = ach.cond;
        let unlock = false;
        if (c.t === type) {
            if (c.n !== undefined && value >= c.n) unlock = true;
        }
        if (unlock) {
            owned.push(ach.id);
            addCoins(uid, ach.reward);
            const title = TITLES.find(t => t.req === ach.id);
            if (title) {
                const tl = userData.titlesOwned.get(uid) || [];
                if (!tl.includes(title.id)) { tl.push(title.id); userData.titlesOwned.set(uid, tl); }
            }
            gained.push(ach);
        }
    }
    if (gained.length) userData.achievementsNew.set(uid, owned);
    return gained;
              }
  
// ════════════════════════════════════════════════════════════════
// ♦️ ORIGINAL LEVEL + XP UTILITIES (unchanged)
// ════════════════════════════════════════════════════════════════

// ── WORDLE (original) ──
const WORDLE_WORDS = [
    'apple','brave','chess','drive','eight','flair','grace','heart','ivory','jewel',
    'knack','lemon','maple','noble','ocean','piano','quest','raven','solar','tiger',
    'ultra','vivid','wheat','xenon','yacht','zebra','adore','blaze','coral','daisy',
    'ember','flute','gleam','haste','inlet','joker','karma','lance','moose','nerve',
    'opera','prism','quail','reign','spine','torch','usher','vapor','waltz','xeric',
];
function evaluateGuess(word, guess) {
    const result=Array(5).fill('⬛'), wa=word.split(''), used=Array(5).fill(false), ga=guess.split('');
    for (let i=0;i<5;i++) { if(ga[i]===wa[i]){result[i]='🟩';used[i]=true;ga[i]=null;} }
    for (let i=0;i<5;i++) { if(!ga[i])continue; for(let j=0;j<5;j++){if(!used[j]&&ga[i]===wa[j]){result[i]='🟨';used[j]=true;break;}} }
    return result;
}

// ── TRIVIA (original) ──
const TRIVIA_QUESTIONS = [
    { q:'What is the capital of France?',      a:'paris',       options:['london','berlin','paris','madrid']     },
    { q:'What is 2 + 2?',                      a:'4',           options:['3','4','5','6']                        },
    { q:'What is the largest planet?',         a:'jupiter',     options:['mars','saturn','jupiter','neptune']    },
    { q:'Who wrote Romeo and Juliet?',         a:'shakespeare', options:['marlowe','shakespeare','jonson','bacon']},
    { q:'How many sides does a hexagon have?', a:'6',           options:['5','6','7','8']                        },
    { q:'What is the fastest land animal?',    a:'cheetah',     options:['lion','cheetah','horse','leopard']     },
];

// ── SLOTS (original) ──
const SLOT_SYMBOLS = ['🍎','🍊','🍋','🍌','🍉'];
function playSlotsOnce() { return Array(3).fill(0).map(()=>SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)]); }
function calcSlotWin(s, bet) {
    if (s[0]===s[1]&&s[1]===s[2]) return bet*10;
    if (s[0]===s[1]||s[1]===s[2]) return bet*3;
    return 0;
}

// ── BLACKJACK (original) ──
const BJ_DECK=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
function cardVal(c) { if(['J','Q','K'].includes(c))return 10; if(c==='A')return 11; return parseInt(c)||0; }
function handVal(h) { let v=h.reduce((s,c)=>s+cardVal(c),0),a=h.filter(c=>c==='A').length; while(v>21&&a>0){v-=10;a--;} return v; }
function drawCard()  { return BJ_DECK[Math.floor(Math.random()*BJ_DECK.length)]; }

// ── FNF (original, fully preserved) ──
const FNF_DIFFICULTIES = {
    easy:      { arrows:6,  timeMs:4000,missDmg:1,coinMult:1,  xpMult:1,  label:'😊 Easy',    color:0x57F287,maxHealth:3 },
    medium:    { arrows:10, timeMs:3000,missDmg:2,coinMult:2,  xpMult:2,  label:'😐 Medium',  color:0xFEE75C,maxHealth:6 },
    hard:      { arrows:14, timeMs:2000,missDmg:3,coinMult:3.5,xpMult:3,  label:'😤 Hard',    color:0xFFA500,maxHealth:6 },
    erect:     { arrows:18, timeMs:1500,missDmg:4,coinMult:6,  xpMult:5,  label:'🔥 Erect',   color:0xED4245,maxHealth:4 },
    nightmare: { arrows:24, timeMs:1000,missDmg:99,coinMult:12,xpMult:10, label:'💀 Nightmare',color:0x000000,maxHealth:1 },
};
const FNF_ARROWS=['⬅️','⬆️','⬇️','➡️'];
const FNF_SONGS=['Bopeebo','Fresh','Dadbattle','Tutorial','Spookeez','South','Pico','Philly','Blammed','Satin Panties','High','M.I.L.F','Cocoa','Eggnog','Senpai','Roses','Thorns','Ugh','Guns','Stress','Darnell','Lit Up','2hot','Blazin'];
const FNF_RATINGS={perfect:'✨ PERFECT!',great:'🔥 GREAT!',good:'👍 GOOD',okay:'😐 OKAY',bad:'💀 BAD'};
function buildFnfSeq(count){return Array.from({length:count},()=>FNF_ARROWS[Math.floor(Math.random()*4)]);}
function fnfHealthBar(h,max){return '❤️'.repeat(Math.max(0,h))+'🖤'.repeat(Math.max(0,max-h));}
function fnfRating(hits,total){const p=hits/total;if(p===1)return FNF_RATINGS.perfect;if(p>=0.9)return FNF_RATINGS.great;if(p>=0.75)return FNF_RATINGS.good;if(p>=0.5)return FNF_RATINGS.okay;return FNF_RATINGS.bad;}

async function fnfNextArrow(interaction, game, isFollowUp=false) {
    const diff=FNF_DIFFICULTIES[game.difficulty],target=game.sequence[game.currentIndex];
    const embed=new EmbedBuilder().setColor(diff.color).setTitle(`🎵 Friday Night Funkin' — ${diff.label}`)
        .setDescription(`**Song:** ${game.song}\n\n**Hit this arrow!**\n# ${target}\n\n⏱️ **${diff.timeMs/1000}s** to react!\n❤️ Health: ${fnfHealthBar(game.health,diff.maxHealth)}`)
        .addFields({name:'🎯 Progress',value:`${game.currentIndex+1}/${game.sequence.length}`,inline:true},{name:'✅ Hits',value:String(game.hits),inline:true},{name:'❌ Misses',value:String(game.misses),inline:true})
        .setFooter({text:`Score: ${game.score} pts`});
    const row=new ActionRowBuilder().addComponents(FNF_ARROWS.map(a=>new ButtonBuilder().setCustomId(`fnf_${game.gameId}_${a}`).setLabel(a).setStyle(ButtonStyle.Secondary)));
    const msg=isFollowUp?await interaction.followUp({embeds:[embed],components:[row]}):await interaction.editReply({embeds:[embed],components:[row]});
    game.currentMessage=msg;
    game.arrowTimeout=setTimeout(async()=>{await fnfHandleMiss(interaction,game,'timeout');},diff.timeMs);
}
async function fnfHandleMiss(interaction, game, reason) {
    clearTimeout(game.arrowTimeout);
    const diff=FNF_DIFFICULTIES[game.difficulty];
    game.misses++;
    if(game.difficulty==='nightmare'){game.score=0;game.health=0;await fnfEndGame(interaction,game,false,'💀 ONE MISS AND IT\'S OVER.');return;}
    game.health=Math.max(0,game.health-diff.missDmg);
    if(game.health<=0){await fnfEndGame(interaction,game,false,reason==='timeout'?'⏰ Too slow!':'❌ Wrong arrow!');return;}
    const me=new EmbedBuilder().setColor(0xED4245).setTitle('❌ Miss!').setDescription(reason==='timeout'?'⏰ Too slow!':'❌ Wrong arrow!').addFields({name:'❤️ Health',value:fnfHealthBar(game.health,diff.maxHealth)});
    try{await interaction.editReply({embeds:[me],components:[]});}catch(_){}
    await new Promise(r=>setTimeout(r,800));
    game.currentIndex++;
    if(game.currentIndex>=game.sequence.length){await fnfEndGame(interaction,game,true);}
    else{await fnfNextArrow(interaction,game);}
}
async function fnfEndGame(interaction, game, won, reason='') {
    clearTimeout(game.arrowTimeout);
    fnfGames.delete(game.userId);
    const diff=FNF_DIFFICULTIES[game.difficulty];
    const rating=won?fnfRating(game.hits,game.sequence.length):'💀 FAILED';
    const cr=won?Math.floor(game.score*diff.coinMult):Math.floor(game.score*0.1);
    const xr=won?Math.floor(game.hits*10*diff.xpMult):0;
    if(cr>0)addCoins(game.userId,cr);
    if(xr>0)addXP(game.userId,xr);
    await saveData();
    const embed=new EmbedBuilder().setColor(won?diff.color:0x36393f).setTitle(won?`🎵 Song Clear! ${rating}`:`💀 Game Over — ${diff.label}`)
        .setDescription(won?`You cleared **${game.song}**!\n${reason}`:`Failed **${game.song}**.\n${reason}`)
        .addFields({name:'🎯 Hits',value:`${game.hits}/${game.sequence.length}`,inline:true},{name:'❌ Misses',value:String(game.misses),inline:true},{name:'🏆 Score',value:String(game.score),inline:true},{name:'💰 Coins',value:`+${cr}`,inline:true},{name:'⭐ XP',value:`+${xr}`,inline:true},{name:'🎤 Rating',value:rating,inline:true})
        .setFooter({text:won?'GG! Play again?':'Better luck next time!'});
    try{await interaction.editReply({embeds:[embed],components:[]});}
    catch(_){await interaction.followUp({embeds:[embed],components:[]}).catch(()=>{});}
}

// ════════════════════════════════════════════════════════════════
// ♦️ FILE I/O (original structure preserved exactly)
// ════════════════════════════════════════════════════════════════
async function loadData() {
    try {
        if (!fsSync.existsSync(DATA_FILE)) { console.log('📝 No data file, starting fresh'); return; }
        const raw = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        userData.fromJSON(raw.userData || {});
        if (raw.staff)           staffSet         = new Set(raw.staff.map(String));
        if (raw.autoResponses)   autoResponses    = new Map(Object.entries(raw.autoResponses));
        if (raw.welcomeConfig)   welcomeConfig    = raw.welcomeConfig;
        if (raw.logsConfig)      logsConfig       = raw.logsConfig;
        if (raw.ticketConfig)    ticketConfig     = raw.ticketConfig;
        if (raw.suggestionConfig)suggestionConfig = raw.suggestionConfig;
        if (raw.levelAnnounceConfig) levelAnnounceConfig = raw.levelAnnounceConfig;
        console.log('✅ Data loaded');
    } catch (e) { console.error('❌ Load error:', e?.message); }
}

async function saveData() {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify({
            userData:         userData.toJSON(),
            staff:            [...staffSet],
            autoResponses:    Object.fromEntries(autoResponses),
            welcomeConfig, logsConfig, ticketConfig, suggestionConfig, levelAnnounceConfig,
        }, null, 2), 'utf8');
    } catch (e) { console.error('❌ Save error:', e?.message); }
}

async function staffOnly(interaction, isStaff) {
    if (!isStaff) { await interaction.reply({ content:'❌ Staff only!', ephemeral:true }); return false; }
    return true;
}
async function ownerOnly(interaction, isOwner) {
    if (!isOwner) { await interaction.reply({ content:'❌ Owner only!', ephemeral:true }); return false; }
    return true;
}


// ════════════════════════════════════════════════════════════════
// ♦️ SLASH COMMANDS
// ════════════════════════════════════════════════════════════════
const slashCommands = [
    // ── ORIGINAL (all preserved) ──
    new SlashCommandBuilder().setName('ping').setDescription('🏓 Check bot latency'),
    new SlashCommandBuilder().setName('help').setDescription('📖 List all commands'),
    new SlashCommandBuilder().setName('bal').setDescription('💰 Check your coins'),
    new SlashCommandBuilder().setName('bank').setDescription('🏦 Check your bank balance'),
    new SlashCommandBuilder().setName('daily').setDescription('📅 Claim daily reward'),
    new SlashCommandBuilder().setName('work').setDescription('💼 Work for coins'),
    new SlashCommandBuilder().setName('rob').setDescription('🔫 Rob a user')
        .addUserOption(o=>o.setName('target').setDescription('Who to rob').setRequired(true)),
    new SlashCommandBuilder().setName('gamble').setDescription('🎰 Gamble coins')
        .addIntegerOption(o=>o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1)),
    new SlashCommandBuilder().setName('shop').setDescription('🛍️ View the shop'),
    new SlashCommandBuilder().setName('buy').setDescription('🛒 Buy an item')
        .addStringOption(o=>o.setName('item').setDescription('Item name').setRequired(true)),
    new SlashCommandBuilder().setName('sell').setDescription('💵 Sell an item from inventory')
        .addStringOption(o=>o.setName('item').setDescription('Item name').setRequired(true)),
    new SlashCommandBuilder().setName('inventory').setDescription('🎒 View your inventory'),
    new SlashCommandBuilder().setName('transfer').setDescription('💸 Transfer coins to someone')
        .addUserOption(o=>o.setName('target').setDescription('Who to send coins to').setRequired(true))
        .addIntegerOption(o=>o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1)),
    new SlashCommandBuilder().setName('rank').setDescription('⭐ Check your level'),
    new SlashCommandBuilder().setName('profile').setDescription('👤 View your profile')
        .addUserOption(o=>o.setName('user').setDescription('Another user').setRequired(false)),
    new SlashCommandBuilder().setName('leaderboard').setDescription('🏆 Global leaderboard')
        .addStringOption(o=>o.setName('type').setDescription('Leaderboard type').setRequired(false)
            .addChoices(
                {name:'💰 Richest',value:'coins'},
                {name:'⭐ Highest Level',value:'level'},
                {name:'🎣 Most Fish Caught',value:'fish'},
                {name:'💎 Most Fish Value',value:'fishval'},
                {name:'🏰 Dungeon Clears',value:'dungeons'},
                {name:'🔄 Prestige',value:'prestige'},
            )),
    new SlashCommandBuilder().setName('wordle').setDescription('🎮 Play Wordle')
        .addStringOption(o=>o.setName('guess').setDescription('5-letter guess').setRequired(true).setMinLength(5).setMaxLength(5)),
    new SlashCommandBuilder().setName('trivia').setDescription('🧠 Answer a trivia question'),
    new SlashCommandBuilder().setName('slots').setDescription('🎰 Play the slot machine')
        .addIntegerOption(o=>o.setName('bet').setDescription('Bet amount').setRequired(true).setMinValue(10)),
    new SlashCommandBuilder().setName('blackjack').setDescription('🃏 Play blackjack')
        .addIntegerOption(o=>o.setName('bet').setDescription('Bet amount').setRequired(true).setMinValue(10)),
    new SlashCommandBuilder().setName('bossfight').setDescription('👹 Attack the world boss'),
    new SlashCommandBuilder().setName('8ball').setDescription('🎱 Ask the magic 8-ball')
        .addStringOption(o=>o.setName('question').setDescription('Your question').setRequired(true)),
    new SlashCommandBuilder().setName('fnf').setDescription('🎵 Play Friday Night Funkin\'!')
        .addStringOption(o=>o.setName('difficulty').setDescription('Pick your difficulty').setRequired(true)
            .addChoices(
                {name:'😊 Easy      — 6 arrows  | 4s each | 3 misses',value:'easy'},
                {name:'😐 Medium    — 10 arrows | 3s each | 2 misses',value:'medium'},
                {name:'😤 Hard      — 14 arrows | 2s each | 2 misses',value:'hard'},
                {name:'🔥 Erect     — 18 arrows | 1.5s    | 1 miss',  value:'erect'},
                {name:'💀 Nightmare — 24 arrows | 1s each | 0 misses',value:'nightmare'},
            )),
    new SlashCommandBuilder().setName('marry').setDescription('💍 Propose to a user')
        .addUserOption(o=>o.setName('user').setDescription('Who to marry').setRequired(true)),
    new SlashCommandBuilder().setName('divorce').setDescription('💔 Divorce your spouse'),
    new SlashCommandBuilder().setName('rep').setDescription('👍 Give someone reputation')
        .addUserOption(o=>o.setName('user').setDescription('Who to rep').setRequired(true)),
    new SlashCommandBuilder().setName('adopt').setDescription('🐶 Adopt a classic pet')
        .addStringOption(o=>o.setName('pet').setDescription('Pick a pet').setRequired(true)
            .addChoices({name:'Dragon 🐉',value:'dragon'},{name:'Phoenix 🔥',value:'phoenix'},{name:'Wolf 🐺',value:'wolf'})),
    new SlashCommandBuilder().setName('pet').setDescription('🐶 Check on your pet'),
    new SlashCommandBuilder().setName('mine').setDescription('⛏️ Mine for resources'),
    new SlashCommandBuilder().setName('warn').setDescription('⚠️ Warn a user (staff)')
        .addUserOption(o=>o.setName('user').setDescription('Who to warn').setRequired(true))
        .addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(true)),
    new SlashCommandBuilder().setName('warnings').setDescription('📋 Check a users warnings (staff)')
        .addUserOption(o=>o.setName('user').setDescription('Who to check').setRequired(true)),
    new SlashCommandBuilder().setName('mute').setDescription('🤐 Timeout a user (staff)')
        .addUserOption(o=>o.setName('user').setDescription('Who to mute').setRequired(true))
        .addIntegerOption(o=>o.setName('duration').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320)),
    new SlashCommandBuilder().setName('unmute').setDescription('🔊 Remove timeout (staff)')
        .addUserOption(o=>o.setName('user').setDescription('Who to unmute').setRequired(true)),
    new SlashCommandBuilder().setName('setlogs').setDescription('📋 Set mod-log channel (staff)')
        .addChannelOption(o=>o.setName('channel').setDescription('Log channel').setRequired(true).addChannelTypes(ChannelType.GuildText)),
    new SlashCommandBuilder().setName('setwelcome').setDescription('👋 Setup welcome system (staff)')
        .addChannelOption(o=>o.setName('channel').setDescription('Welcome channel').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addRoleOption(o=>o.setName('role').setDescription('Auto-role for new members').setRequired(false)),
    new SlashCommandBuilder().setName('settickets').setDescription('🎫 Setup ticket system (staff)')
        .addChannelOption(o=>o.setName('channel').setDescription('Channel for ticket panel').setRequired(true).addChannelTypes(ChannelType.GuildText)),
    new SlashCommandBuilder().setName('setsuggestions').setDescription('💡 Setup suggestion channel (staff)')
        .addChannelOption(o=>o.setName('channel').setDescription('Suggestion channel').setRequired(true).addChannelTypes(ChannelType.GuildText)),
    new SlashCommandBuilder().setName('suggest').setDescription('💡 Submit a suggestion')
        .addStringOption(o=>o.setName('text').setDescription('Your suggestion').setRequired(true)),
    new SlashCommandBuilder().setName('addxp').setDescription('⭐ Add XP to a user (owner)')
        .addUserOption(o=>o.setName('user').setDescription('Target user').setRequired(true))
        .addIntegerOption(o=>o.setName('amount').setDescription('XP amount').setRequired(true).setMinValue(1)),
    new SlashCommandBuilder().setName('addcoins').setDescription('💰 Add coins to a user (owner)')
        .addUserOption(o=>o.setName('user').setDescription('Target user').setRequired(true))
        .addIntegerOption(o=>o.setName('amount').setDescription('Coin amount').setRequired(true).setMinValue(1)),
    new SlashCommandBuilder().setName('addstaff').setDescription('👮 Promote a user to staff (owner)')
        .addUserOption(o=>o.setName('user').setDescription('Target user').setRequired(true)),
    new SlashCommandBuilder().setName('addresponse').setDescription('🤖 Add an auto-response (owner)')
        .addStringOption(o=>o.setName('trigger').setDescription('Trigger word/phrase').setRequired(true))
        .addStringOption(o=>o.setName('response').setDescription('Response text').setRequired(true)),

  // ── FISHING ──
    new SlashCommandBuilder().setName('fish').setDescription('🎣 Go fishing!')
        .addStringOption(o=>o.setName('biome').setDescription('Where to fish').setRequired(false)
            .addChoices(...BIOMES.map(b=>({name:`${b.emoji} ${b.name} (Lv${b.unlockLv}+)`,value:b.id}))))
        .addStringOption(o=>o.setName('bait').setDescription('Use bait').setRequired(false)
            .addChoices(...BAIT_TYPES.map(b=>({name:`${b.emoji} ${b.name}`,value:b.id})))),
    new SlashCommandBuilder().setName('fishguide').setDescription('🎣 Fishing guide & menu'),
    new SlashCommandBuilder().setName('rodshop').setDescription('🎣 Browse and buy fishing rods'),
    new SlashCommandBuilder().setName('buyrod').setDescription('🎣 Buy a fishing rod')
        .addStringOption(o=>o.setName('rod').setDescription('Rod ID to buy').setRequired(true)),
    new SlashCommandBuilder().setName('equiprod').setDescription('🎣 Equip a fishing rod you own')
        .addStringOption(o=>o.setName('rod').setDescription('Rod ID to equip').setRequired(true)),
    new SlashCommandBuilder().setName('enchantrod').setDescription('✨ Enchant your equipped rod')
        .addStringOption(o=>o.setName('enchant').setDescription('Enchantment ID').setRequired(true)
            .addChoices(...ROD_ENCHANTS.map(e=>({name:`${e.emoji} ${e.name} — ${e.desc}`,value:e.id})))),
    new SlashCommandBuilder().setName('buybait').setDescription('🪱 Buy bait')
        .addStringOption(o=>o.setName('bait').setDescription('Bait type').setRequired(true)
            .addChoices(...BAIT_TYPES.map(b=>({name:`${b.emoji} ${b.name} — ${b.desc}`,value:b.id}))))
        .addIntegerOption(o=>o.setName('amount').setDescription('How many (default 1)').setRequired(false).setMinValue(1).setMaxValue(100)),
    new SlashCommandBuilder().setName('fishinv').setDescription('🐠 View your fish inventory')
        .addIntegerOption(o=>o.setName('page').setDescription('Page number').setRequired(false).setMinValue(1)),
    new SlashCommandBuilder().setName('sellfish').setDescription('💵 Sell fish from your inventory')
        .addStringOption(o=>o.setName('filter').setDescription('What to sell').setRequired(true)
            .addChoices({name:'All fish',value:'all'},{name:'Common fish',value:'Common'},{name:'Uncommon fish',value:'Uncommon'},{name:'Rare fish',value:'Rare'},{name:'Everything below Epic',value:'belowepic'})),
    new SlashCommandBuilder().setName('fishencyclopedia').setDescription('📖 Fish encyclopedia')
        .addStringOption(o=>o.setName('rarity').setDescription('Filter by rarity').setRequired(false)
            .addChoices({name:'Common',value:'Common'},{name:'Uncommon',value:'Uncommon'},{name:'Rare',value:'Rare'},{name:'Epic',value:'Epic'},{name:'Legendary',value:'Legendary'},{name:'Mythical',value:'Mythical'},{name:'Secret',value:'Secret'})),
    new SlashCommandBuilder().setName('fishstats').setDescription('📊 Your fishing statistics'),
    new SlashCommandBuilder().setName('fishquest').setDescription('📋 View/start your daily fishing quest'),
    new SlashCommandBuilder().setName('fishleaderboard').setDescription('🏆 Fishing leaderboard'),
    new SlashCommandBuilder().setName('fishweather').setDescription('🌤️ Current fishing weather & world event'),
    new SlashCommandBuilder().setName('fishboss').setDescription('🦈 Attack the active boss fish'),
    new SlashCommandBuilder().setName('worldevent').setDescription('🌍 Check the current world event'),

    new SlashCommandBuilder().setName('chooseclass').setDescription('⚔️ Choose your RPG class')
        .addStringOption(o=>o.setName('class').setDescription('Class to pick').setRequired(true)
            .addChoices({name:'⚔️ Warrior',value:'warrior'},{name:'🧙 Mage',value:'mage'},{name:'🗡️ Assassin',value:'assassin'},{name:'🛡️ Tank',value:'tank'})),
    new SlashCommandBuilder().setName('rpgstats').setDescription('📊 View your RPG stats'),
    new SlashCommandBuilder().setName('skilltree').setDescription('🌳 View your skill tree'),
    new SlashCommandBuilder().setName('learnskill').setDescription('📚 Learn a skill from your tree')
        .addStringOption(o=>o.setName('skill').setDescription('Skill ID to learn').setRequired(true)),
    new SlashCommandBuilder().setName('dungeon').setDescription('⚔️ Enter a dungeon')
        .addStringOption(o=>o.setName('dungeon').setDescription('Dungeon to enter').setRequired(true)
            .addChoices(...DUNGEONS.map(d=>({name:`${d.emoji} ${d.name} (Lv${d.minLv}+)`,value:d.id})))),
    new SlashCommandBuilder().setName('buyarmor').setDescription('🛡️ Buy armor')
        .addStringOption(o=>o.setName('armor').setDescription('Armor set to buy').setRequired(true)
            .addChoices(...ARMOR_SETS.map(a=>({name:`${a.emoji} ${a.name} — ${fmtN(a.price)} coins`,value:a.id})))),



    new SlashCommandBuilder().setName('createguild').setDescription('🏘️ Create a guild (costs 5,000 coins)')
        .addStringOption(o=>o.setName('name').setDescription('Guild name').setRequired(true)),
    new SlashCommandBuilder().setName('joinguild').setDescription('🏘️ Join an existing guild')
        .addStringOption(o=>o.setName('name').setDescription('Guild name').setRequired(true)),
    new SlashCommandBuilder().setName('leaveguild').setDescription('🚪 Leave your current guild'),
    new SlashCommandBuilder().setName('guildinfo').setDescription('🏘️ View your guild information'),
    new SlashCommandBuilder().setName('guildinvite').setDescription('📨 Invite someone to your guild')
        .addUserOption(o=>o.setName('user').setDescription('User to invite').setRequired(true)),
    new SlashCommandBuilder().setName('guilddeposit').setDescription('💰 Deposit coins to guild bank')
        .addIntegerOption(o=>o.setName('amount').setDescription('Amount to deposit').setRequired(true).setMinValue(1)),
    new SlashCommandBuilder().setName('guildleaderboard').setDescription('🏆 Guild leaderboard'),
    new SlashCommandBuilder().setName('guildwar').setDescription('⚔️ Contribute to the guild war'),

    // ── ECONOMY+ ──
    new SlashCommandBuilder().setName('logindaily').setDescription('📅 Claim your daily login reward'),
    new SlashCommandBuilder().setName('achievements').setDescription('🏆 View your achievements')
        .addUserOption(o=>o.setName('user').setDescription('Another user').setRequired(false)),
    new SlashCommandBuilder().setName('prestige').setDescription('🔄 Prestige — reset level for powerful bonuses'),
    new SlashCommandBuilder().setName('battlepass').setDescription('🎫 View your battle pass'),
    new SlashCommandBuilder().setName('marketplace').setDescription('🏪 Browse the player marketplace'),
    new SlashCommandBuilder().setName('listitem').setDescription('📋 List an item on the marketplace')
        .addStringOption(o=>o.setName('type').setDescription('What to list').setRequired(true)
            .addChoices({name:'Fish',value:'fish'},{name:'Weapon',value:'weapon'},{name:'Item',value:'item'}))
        .addStringOption(o=>o.setName('itemid').setDescription('Item ID').setRequired(true))
        .addIntegerOption(o=>o.setName('price').setDescription('Price in coins').setRequired(true).setMinValue(1)),
    new SlashCommandBuilder().setName('buymarketitem').setDescription('🛒 Buy a marketplace listing')
        .addStringOption(o=>o.setName('listingid').setDescription('Listing ID to purchase').setRequired(true)),

    // ── NEW MINI-GAMES ──
    new SlashCommandBuilder().setName('hangman').setDescription('🔤 Play Hangman'),
    new SlashCommandBuilder().setName('tictactoe').setDescription('❌⭕ Play Tic Tac Toe vs someone')
        .addUserOption(o=>o.setName('opponent').setDescription('Your opponent').setRequired(true)),
    new SlashCommandBuilder().setName('higherlower').setDescription('📈 Play Higher or Lower'),
    new SlashCommandBuilder().setName('coinflip').setDescription('🪙 Flip a coin for coins')
        .addStringOption(o=>o.setName('side').setDescription('heads or tails').setRequired(true).addChoices({name:'Heads',value:'heads'},{name:'Tails',value:'tails'}))
        .addIntegerOption(o=>o.setName('bet').setDescription('Bet amount').setRequired(false).setMinValue(1)),
    new SlashCommandBuilder().setName('connect4').setDescription('🟡 Play Connect 4 vs someone')
        .addUserOption(o=>o.setName('opponent').setDescription('Your opponent').setRequired(true)),

    // ── PROGRESSION ──
    new SlashCommandBuilder().setName('titles').setDescription('🏅 View and manage your titles'),
    new SlashCommandBuilder().setName('settitle').setDescription('🏅 Set your active title')
        .addStringOption(o=>o.setName('title').setDescription('Title ID to set active').setRequired(true)),
    new SlashCommandBuilder().setName('collectionlog').setDescription('📚 View your collection log'),
    new SlashCommandBuilder().setName('milestones').setDescription('🎯 View your milestones'),
    new SlashCommandBuilder().setName('season').setDescription('🌸 View current season info'),

    // ── OWNER/ADMIN ──
    new SlashCommandBuilder().setName('resetcooldowns').setDescription('🔄 Reset your own cooldowns (owner)')
        .addUserOption(o=>o.setName('user').setDescription('User to reset (default: self)').setRequired(false)),



    new SlashCommandBuilder().setName('kick').setDescription('👢 Kick a user (staff)')
        .addUserOption(o=>o.setName('user').setDescription('Who to kick').setRequired(true))
        .addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(false)),
    new SlashCommandBuilder().setName('ban').setDescription('🔨 Ban a user (staff)')
        .addUserOption(o=>o.setName('user').setDescription('Who to ban').setRequired(true))
        .addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(false)),
    new SlashCommandBuilder().setName('removestaff').setDescription('👮 Remove staff from a user (admin)')
        .addUserOption(o=>o.setName('user').setDescription('Who to remove').setRequired(true)),
    new SlashCommandBuilder().setName('liststaffs').setDescription('👮 List all staff in this server'),






    new SlashCommandBuilder().setName('setlevelannounce').setDescription('📢 Set level-up announcement channel')
        .addChannelOption(o=>o.setName('channel').setDescription('Channel to send level-up messages').setRequired(true).addChannelTypes(0)),
    new SlashCommandBuilder().setName('deletelevelannounce').setDescription('🗑️ Disable level-up announcements for this server'),

    // ── ADMIN DELETE / REVERSE COMMANDS ──
    new SlashCommandBuilder().setName('deletecoins').setDescription('🗑️ Remove coins from a user (owner)')
        .addUserOption(o=>o.setName('user').setDescription('Target user').setRequired(true))
        .addIntegerOption(o=>o.setName('amount').setDescription('Amount to remove (leave blank = reset to 0)').setRequired(false).setMinValue(1)),

    new SlashCommandBuilder().setName('resetuser').setDescription('🗑️ Full reset of a users data (owner — use with care!)')
        .addUserOption(o=>o.setName('user').setDescription('Target user').setRequired(true)),


];
  // ════════════════════════════════════════════════════════════════
// ♦️ CLIENT
// ════════════════════════════════════════════════════════════════
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

// ════════════════════════════════════════════════════════════════
// ♦️ READY EVENT
// ════════════════════════════════════════════════════════════════
client.once('clientReady', async () => {
    console.log(`✅ Bot online as ${client.user?.tag}`);
    try {
        const rest = new REST({ version:'10' }).setToken(process.env.TOKEN);
        const cmdJSON = slashCommands.map(c => c.toJSON());
        await rest.put(Routes.applicationCommands(client.user.id), {
            body: cmdJSON,
        });
        console.log(`✅ Registered ${cmdJSON.length} slash commands globally`);
        console.log(`   Commands: ${cmdJSON.map(c=>c.name).join(', ')}`);
    } catch(e) { console.error('❌ Command reg error:', e?.message); }

    // World event ticker — every 30 min
    setInterval(async () => {
        if (!userData.worldEvent || userData.worldEventEnd <= Date.now()) {
            if (Math.random() < 0.20) {
                const ev = WORLD_EVENTS[rng(0, WORLD_EVENTS.length - 1)];
                userData.worldEvent    = ev;
                userData.worldEventEnd = Date.now() + ev.dur;
                console.log(`🌍 World Event: ${ev.name}`);
                for (const [gId, cfg] of Object.entries(logsConfig)) {
                    const g = client.guilds.cache.get(gId);
                    if (!g) continue;
                    const ch = g.channels.cache.get(cfg.channelId);
                    if (!ch) continue;
                    ch.send({ embeds:[new EmbedBuilder().setColor(0xFF9800)
                        .setTitle(`🌍 WORLD EVENT: ${ev.emoji} ${ev.name}!`)
                        .setDescription(ev.desc)
                        .addFields({name:'Duration',value:`${ev.dur/60000} minutes`})
                        .setTimestamp()]
                    }).catch(()=>{});
                }
            } else {
                userData.worldEvent    = null;
                userData.worldEventEnd = 0;
            }
        }
        if (!userData.activeBoss && Math.random() < 0.12) {
            const b = BOSS_FISH[rng(0, BOSS_FISH.length - 1)];
            userData.activeBoss   = b;
            userData.activeBossHp = b.hp;
            console.log(`🦈 Boss spawned: ${b.name}`);
        }
        await saveData();
    }, 1_800_000);
});

// ════════════════════════════════════════════════════════════════
// ♦️ TTT + CONNECT4 HELPERS
// ════════════════════════════════════════════════════════════════
function buildTTTRows(board, p1, p2, gameKey) {
    const rows = [];
    for (let r = 0; r < 3; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < 3; c++) {
            const idx = r * 3 + c;
            const val = board[idx];
            row.addComponents(new ButtonBuilder()
                .setCustomId(`ttt_${gameKey}_${idx}`)
                .setLabel(val === '❌' ? '❌' : val === '⭕' ? '⭕' : '·')
                .setStyle(val === '❌' ? ButtonStyle.Danger : val === '⭕' ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(!!val)
            );
        }
        rows.push(row);
    }
    return rows;
}
function checkTTTWin(board, mark) {
    const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return wins.some(w => w.every(i => board[i] === mark));
}
function renderC4(board) {
    const nums = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣'];
    let s = nums.join('') + '\n';
    for (let r = 0; r < 6; r++) {
        s += board[r].map(c => c === 1 ? '🔴' : c === 2 ? '🟡' : '⚫').join('') + '\n';
    }
    return s;
}
function buildC4Row(p1, p2, gameKey) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 7; c++) {
        row.addComponents(new ButtonBuilder()
            .setCustomId(`c4_${gameKey}_${c}`)
            .setLabel(`${c+1}`)
            .setStyle(ButtonStyle.Primary)
        );
    }
    return row;
}
function checkC4Win(board, player) {
    for (let r = 0; r < 6; r++)
        for (let c = 0; c <= 3; c++)
            if ([0,1,2,3].every(i=>board[r][c+i]===player)) return true;
    for (let r = 0; r <= 2; r++)
        for (let c = 0; c < 7; c++)
            if ([0,1,2,3].every(i=>board[r+i][c]===player)) return true;
    for (let r = 0; r <= 2; r++)
        for (let c = 0; c <= 3; c++)
            if ([0,1,2,3].every(i=>board[r+i][c+i]===player)) return true;
    for (let r = 0; r <= 2; r++)
        for (let c = 3; c < 7; c++)
            if ([0,1,2,3].every(i=>board[r+i][c-i]===player)) return true;
    return false;
                                            }
                     // ════════════════════════════════════════════════════════════════
// ♦️ SLASH COMMAND HANDLER
// ════════════════════════════════════════════════════════════════
client.on('interactionCreate', async interaction => {
    try {
        if (!interaction.isChatInputCommand()) return;
        const userId  = String(interaction.user.id);
        const guildId = String(interaction.guildId || '');
        const isOwner = userId === OWNER_ID;
        const isStaff = staffSet.has(`${guildId}:${userId}`) || staffSet.has(userId) || isOwner
            || !!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers);
        ensureJoinDate(userId);
        const cmd = interaction.commandName;
        try {

if (cmd==='ping') return interaction.reply({content:`🏓 Pong! **${client.ws.ping}ms**`,ephemeral:true});

if (cmd==='help') {
    const embed=new EmbedBuilder().setColor(0x00ff88).setTitle('🤖 Ultimate Bot — Commands')
        .addFields(
            {name:'💰 Economy',      value:'`/bal` `/bank` `/daily` `/work` `/rob` `/gamble` `/shop` `/buy` `/sell` `/inventory` `/transfer` `/logindaily` `/marketplace` `/listitem` `/buymarketitem`'},
            {name:'⭐ Progression',  value:'`/rank` `/profile` `/leaderboard` `/prestige` `/battlepass` `/achievements` `/titles` `/settitle` `/collectionlog` `/milestones` `/season`'},
            {name:'🎮 Games',        value:'`/wordle` `/trivia` `/slots` `/blackjack` `/bossfight` `/8ball` `/fnf` `/hangman` `/tictactoe` `/connect4` `/higherlower` `/coinflip`'},
            {name:'🎣 Fishing',      value:'`/fish` `/fishguide` `/rodshop` `/buyrod` `/equiprod` `/enchantrod` `/buybait` `/fishinv` `/sellfish` `/fishencyclopedia` `/fishstats` `/fishquest` `/fishleaderboard` `/fishweather` `/fishboss` `/worldevent` `/teleport` `/scyllakey` `/craftkey`'},
            {name:'⚔️ RPG',          value:'`/chooseclass` `/rpgstats` `/skilltree` `/learnskill` `/dungeon` `/buyarmor` `/craftingrecipes` `/craftstats` `/gathermaterials`'},
            {name:'🏘️ Guilds',       value:'`/createguild` `/joinguild` `/leaveguild` `/guildinfo` `/guildinvite` `/guilddeposit` `/guildleaderboard` `/guildwar`'},
            {name:'👨‍👩‍👧 Community',   value:'`/marry` `/divorce` `/rep` `/suggest`'},
            {name:'🐾 Pets',         value:'`/adopt` `/pet`'},
            {name:'⚙️ Setup',        value:'`/setwelcome` `/setlogs` `/settickets` `/setsuggestions` `/addstaff` `/removestaff` `/liststaffs`'},
            {name:'🗑️ Delete/Reset', value:'`/deletestaff` `/deletelogs` `/deletewelcome` `/deletetickets` `/deletesuggestions` `/deletemoney` `/resetcooldowns`'},
            {name:'🔧 Owner',        value:'`/addxp` `/addcoins` `/addstaff` `/addresponse` `/giverod` `/forceevent` `/forceboss`'},
            {name:'😂 Fun (prefix)', value:'`!fakeban` `!fakekick` `!fakemute` `!fakewarn` `!roast` `!ship` `!rate` `!mock` `!reverse` `!sus` `!8ball` `!rickroll` `!impersonate` `!say` `!fact` `!joke`'},
        ).setFooter({text:'Prefix commands use ! | Slash commands use /'});
    return interaction.reply({embeds:[embed]});
}

if (cmd==='bal') {
    const t=interaction.options.getUser('user')||interaction.user;
    const tid=String(t.id);
    return interaction.reply({content:`💰 **${t.username}** — Wallet: **${fmtN(coins(tid))}** | Bank: **${fmtN(bank(tid))}**`,ephemeral:true});
}
if (cmd==='bank') return interaction.reply({content:`🏦 Bank: **${fmtN(bank(userId))}** coins`,ephemeral:true});

if (cmd==='daily') {
    const rem=cooldownManager.get(userId,'daily');
    if (rem) return interaction.reply({content:`⏰ Daily claimed! Come back in **${cdStr(rem)}**`,ephemeral:true});
    const reward=rng(500,2000);
    addCoins(userId,reward); addXP(userId,50);
    cooldownManager.set(userId,'daily',86_400_000); await saveData();
    return interaction.reply({content:`💰 Daily claimed! **+${fmtN(reward)} coins** and **+50 XP**! 🎉`});
}

if (cmd==='work') {
    const rem=cooldownManager.get(userId,'work');
    if (rem) return interaction.reply({content:`⏰ Work cooldown: **${cdStr(rem)}**`,ephemeral:true});
    const jobs=['mowed lawns','delivered pizza','coded an app','walked dogs','fixed pipes','drove a bus','baked bread','cleaned offices'];
    const earned=rng(200,600);
    addCoins(userId,earned); addXP(userId,25);
    cooldownManager.set(userId,'work',1_800_000); await saveData();
    return interaction.reply({content:`💼 You ${jobs[rng(0,jobs.length-1)]} and earned **${fmtN(earned)} coins**!`});
}

if (cmd==='rob') {
    const target=interaction.options.getUser('target');
    if (!target||target.bot||target.id===userId) return interaction.reply({content:'❌ Invalid target!',ephemeral:true});
    const tid=String(target.id);
    // Anti-abuse: 6h cooldown
    const robRem=cooldownManager.get(userId,'rob');
    if (robRem) return interaction.reply({content:`⏰ Rob cooldown: **${cdStr(robRem)}**\nRobbing has a 6-hour cooldown to prevent abuse.`,ephemeral:true});
    // Need at least 500 coins to be worth robbing
    if (coins(tid)<500) return interaction.reply({content:'❌ Target needs at least 500 coins to rob!',ephemeral:true});
    // Can't rob if you already have way more than them
    if (coins(userId)>coins(tid)*5&&coins(userId)>10000) return interaction.reply({content:'❌ You already have way more coins than them. Pick on someone your own size!',ephemeral:true});
    const success=Math.random()>0.45;
    cooldownManager.set(userId,'rob',21_600_000); // 6 hours
    if (success) {
        // Cap at 10k max stolen, max 20% of their wallet
        const maxSteal=Math.min(10000, Math.floor(coins(tid)*0.20));
        const stolen=Math.max(1,Math.floor(Math.random()*maxSteal));
        addCoins(tid,-stolen); addCoins(userId,stolen); addXP(userId,30);
        await saveData();
        return interaction.reply({content:`🔫 Robbed **${target.username}** for **${fmtN(stolen)} coins**! (Max steal: ${fmtN(maxSteal)})`});
    } else {
        const fine=Math.min(2000, Math.floor(coins(userId)*0.10))||100;
        addCoins(userId,-fine); await saveData();
        return interaction.reply({content:`🚔 Caught red-handed! Fined **${fmtN(fine)} coins**.`});
    }
}

if (cmd==='gamble') {
    const amount=interaction.options.getInteger('amount');
    if (coins(userId)<amount) return interaction.reply({content:'❌ Not enough coins!',ephemeral:true});
    // Cap single gamble at 50k to prevent all-in griefing
    if (amount>50000) return interaction.reply({content:'❌ Max gamble is **50,000 coins** per bet.',ephemeral:true});
    // 30s cooldown to prevent spam
    const gambRem=cooldownManager.get(userId,'gamble');
    if (gambRem) return interaction.reply({content:`⏰ Gambling cooldown: **${cdStr(gambRem)}**`,ephemeral:true});
    cooldownManager.set(userId,'gamble',30_000);
    const won=Math.random()>0.5;
    addCoins(userId,won?amount:-amount); await saveData();
    return interaction.reply({content:won?`🎰 **WIN!** +${fmtN(amount)} coins! 🎉`:`🎰 **LOSS!** -${fmtN(amount)} coins 😔`});
}

if (cmd==='shop') {
    let t='**⚔️ Weapons:**\n';
    WEAPONS.forEach(w=>{t+=`${w.emoji} **${w.name}** — ⚔️${w.damage} dmg | 💰${fmtN(w.price)}\n`;});
    t+='\n**📦 Items:**\n';
    ITEMS.forEach(i=>{t+=`${i.emoji} **${i.name}** — 💰${fmtN(i.price)}\n`;});
    t+='\n**🐾 Pets:**\n';
    PETS.forEach(p=>{t+=`${p.name} — 💰${fmtN(p.price)}\n`;});
    t+='\n> Use `/buy <name>` to purchase!';
    return interaction.reply({content:t,ephemeral:true});
}

if (cmd==='buy') {
    const query=String(interaction.options.getString('item')).toLowerCase();
    let item=WEAPONS.find(i=>i.name.toLowerCase()===query||i.id===query),type='weapon';
    if (!item){item=ITEMS.find(i=>i.name.toLowerCase()===query||i.id===query);type='item';}
    if (!item){item=PETS.find(i=>i.name.toLowerCase().includes(query)||i.id===query);type='pet';}
    if (!item) return interaction.reply({content:'❌ Item not found. Check `/shop`.',ephemeral:true});
    if (coins(userId)<item.price) return interaction.reply({content:`❌ Need **${fmtN(item.price)}** coins.`,ephemeral:true});
    addCoins(userId,-item.price);
    if (type==='pet') userData.pets.set(userId,{id:item.id,name:item.name,xp:0,level:1});
    else if (type==='weapon'){const w=userData.weapons.get(userId)||[];w.push({...item});userData.weapons.set(userId,w);}
    else{const it=userData.items.get(userId)||[];it.push({...item});userData.items.set(userId,it);}
    await saveData();
    return interaction.reply({content:`✅ Purchased **${item.name}** for **${fmtN(item.price)} coins**!`});
}

if (cmd==='sell') {
    const query=String(interaction.options.getString('item')).toLowerCase();
    const weapons=userData.weapons.get(userId)||[];
    const items=userData.items.get(userId)||[];
    const wi=weapons.findIndex(w=>w.name?.toLowerCase()===query||w.id===query);
    if (wi!==-1){const w=weapons[wi],ref=Math.floor((w.price||0)*0.5);weapons.splice(wi,1);userData.weapons.set(userId,weapons);addCoins(userId,ref);await saveData();return interaction.reply({content:`💵 Sold **${w.name}** for **${fmtN(ref)} coins**`});}
    const ii=items.findIndex(i=>i.name?.toLowerCase()===query||i.id===query);
    if (ii!==-1){const it=items[ii],ref=Math.floor((it.price||0)*0.5);items.splice(ii,1);userData.items.set(userId,items);addCoins(userId,ref);await saveData();return interaction.reply({content:`💵 Sold **${it.name}** for **${fmtN(ref)} coins**`});}
    return interaction.reply({content:'❌ Item not in inventory.',ephemeral:true});
}

if (cmd==='inventory') {
    const weapons=userData.weapons.get(userId)||[];
    const items=userData.items.get(userId)||[];
    const pet=userData.pets.get(userId);
    const rod=userData.rodEquipped.get(userId)||'plastic';
    const baitInv=userData.baitInv.get(userId)||{};
    const fishCt=(userData.fishInv.get(userId)||[]).length;
    const embed=new EmbedBuilder().setColor(0xff00ff).setTitle(`🎒 ${interaction.user.username}'s Inventory`)
        .addFields(
            {name:`⚔️ Weapons (${weapons.length})`,value:weapons.length?weapons.map(w=>`${w.emoji||''} ${w.name}`).join(', '):'Empty',inline:false},
            {name:`📦 Items (${items.length})`,value:items.length?items.map(i=>`${i.emoji||''} ${i.name}`).join(', '):'Empty',inline:false},
            {name:'🐾 Pet',value:pet?`${pet.name} Lv${pet.level}`:'None',inline:true},
            {name:'🎣 Rod',value:rod,inline:true},
            {name:'🐠 Fish',value:`${fishCt} in inventory`,inline:true},
            {name:'🪱 Bait',value:Object.entries(baitInv).map(([k,v])=>`${k}:${v}`).join(', ')||'None',inline:false},
        );
    return interaction.reply({embeds:[embed],ephemeral:true});
}

if (cmd==='transfer') {
    const target=interaction.options.getUser('target');
    const amount=interaction.options.getInteger('amount');
    if (!target||target.bot||target.id===userId) return interaction.reply({content:'❌ Invalid target!',ephemeral:true});
    if (coins(userId)<amount) return interaction.reply({content:'❌ Not enough coins!',ephemeral:true});
    // Cap transfers at 100k per transaction
    if (amount>100000) return interaction.reply({content:'❌ Max transfer is **100,000 coins** per transaction.',ephemeral:true});
    // 5 minute cooldown between transfers
    const tranRem=cooldownManager.get(userId,'transfer');
    if (tranRem) return interaction.reply({content:`⏰ Transfer cooldown: **${cdStr(tranRem)}**`,ephemeral:true});
    cooldownManager.set(userId,'transfer',300_000);
    addCoins(userId,-amount); addCoins(String(target.id),amount);
    await saveData();
    return interaction.reply({content:`💸 Sent **${fmtN(amount)} coins** to **${target.username}**!`});
}

if (cmd==='rank') {
    const info=getLevelInfo(userData.xp.get(userId)||0);
    const bar=buildBar(info.xpInLevel,info.xpRequired,15);
    const pts=userData.skillPoints.get(userId)||0;
    return interaction.reply({content:`⭐ **Level ${info.level}**\n\`${bar}\` ${Math.floor(info.xpInLevel)}/${info.xpRequired} XP\n🎯 Skill Points: **${pts}**`,ephemeral:true});
}

if (cmd==='profile') {
    const t=interaction.options.getUser('user')||interaction.user;
    const tid=String(t.id); ensureJoinDate(tid);
    const info=getLevelInfo(userData.xp.get(tid)||0);
    const mar=userData.married.get(tid);
    const rep=Number(userData.rep.get(tid))||0;
    const pet=userData.pets.get(tid);
    const pres=userData.prestige.get(tid)||{level:0};
    const titleId=userData.titleActive.get(tid)||'newbie';
    const title=TITLES.find(t=>t.id===titleId)||TITLES[0];
    const jd=userData.joinDate.get(tid)||Date.now();
    const cls=userData.rpgClass.get(tid);
    const fStats=userData.fishStats.get(tid)||{total:0};
    const achCount=(userData.achievementsNew.get(tid)||[]).length;
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xff00ff).setTitle(`${t.username}'s Profile`)
        .setThumbnail(t.displayAvatarURL())
        .addFields(
            {name:'🏅 Title',       value:`${title.emoji} ${title.name}`,            inline:true},
            {name:'⭐ Level',       value:String(info.level),                         inline:true},
            {name:'🔄 Prestige',    value:`${pres.level||0}x`,                        inline:true},
            {name:'💰 Coins',       value:fmtN(coins(tid)),                           inline:true},
            {name:'🏦 Bank',        value:fmtN(bank(tid)),                            inline:true},
            {name:'👍 Rep',         value:String(rep),                                inline:true},
            {name:'🎣 Fish Caught', value:fmtN(fStats.total||0),                     inline:true},
            {name:'🏆 Achievements',value:`${achCount}/${ACHIEVEMENTS.length}`,       inline:true},
            {name:`${cls?RPG_CLASSES[cls].emoji:'❓'} Class`,value:cls?RPG_CLASSES[cls].name:'None set',inline:true},
            {name:'💍 Married',     value:mar?'Yes':'Single',                         inline:true},
            {name:'🐾 Pet',         value:pet?`${pet.name} Lv${pet.level}`:'None',    inline:true},
            {name:'📅 Joined Bot',  value:new Date(jd).toLocaleDateString(),          inline:true},
        )
    ]});
}

// ── LEADERBOARD — no pings, join dates shown ──
if (cmd==='leaderboard') {
    const type=interaction.options.getString('type')||'coins';
    await interaction.deferReply();
    const allIds=new Set([...userData.coins.keys(),...userData.xp.keys(),...userData.fishStats.keys()]);
    const entries=[];
    for (const uid of allIds) {
        const jd=userData.joinDate.get(uid)||Date.now();
        const lvInfo=getLevelInfo(userData.xp.get(uid)||0);
        const fs=userData.fishStats.get(uid)||{total:0,totalVal:0};
        const pres=userData.prestige.get(uid)||{level:0};
        const dc=userData.dungeonClears.get(uid)||0;
        const cached=client.users.cache.get(uid);
        entries.push({
            name:cached?cached.username:`User#${uid.slice(-4)}`,
            coins:coins(uid), level:lvInfo.level,
            fish:fs.total||0, fishval:fs.totalVal||0,
            dungeons:dc, prestige:pres.level||0,
            joined:new Date(jd).toLocaleDateString(),
        });
    }
    const sorts={coins:(a,b)=>b.coins-a.coins,level:(a,b)=>b.level-a.level,fish:(a,b)=>b.fish-a.fish,fishval:(a,b)=>b.fishval-a.fishval,dungeons:(a,b)=>b.dungeons-a.dungeons,prestige:(a,b)=>b.prestige-a.prestige};
    const vals={coins:e=>`💰 ${fmtN(e.coins)}`,level:e=>`⭐ Lv${e.level}`,fish:e=>`🐟 ${fmtN(e.fish)}`,fishval:e=>`💎 ${fmtN(e.fishval)}`,dungeons:e=>`🏰 ${e.dungeons}`,prestige:e=>`🔄 ${e.prestige}x`};
    const titles={coins:'💰 Richest',level:'⭐ Highest Level',fish:'🎣 Best Fishers',fishval:'💎 Fish Value',dungeons:'🏰 Dungeon Masters',prestige:'🔄 Most Prestigious'};
    entries.sort(sorts[type]||sorts.coins);
    const medals=['🥇','🥈','🥉'];
    // NO pings — use plain username from cache only
    const lines=entries.slice(0,15).map((e,i)=>`${medals[i]||`**#${i+1}**`} **${e.name}** — ${vals[type](e)} | 📅 ${e.joined}`);
    return interaction.editReply({embeds:[new EmbedBuilder().setColor(0xFFD700)
        .setTitle(`🏆 Global Leaderboard — ${titles[type]||'Richest'}`)
        .setDescription(lines.join('\n')||'No data yet.')
        .setFooter({text:'No users are pinged • Joined date shown • Global rankings'})
    ]});
}

// ── GAMES ──
if (cmd==='wordle') {
    const guess=String(interaction.options.getString('guess')).toLowerCase();
    const chanId=String(interaction.channelId);
    if (!wordleGames.has(chanId)) wordleGames.set(chanId,{word:WORDLE_WORDS[rng(0,WORDLE_WORDS.length-1)],guesses:[],maxGuesses:6,startTime:Date.now()});
    const game=wordleGames.get(chanId);
    if (!/^[a-z]+$/.test(guess)) return interaction.reply({content:'❌ Letters only!',ephemeral:true});
    const result=evaluateGuess(game.word,guess);
    game.guesses.push({guess,result});
    let board='';
    for (const {guess:g,result:r} of game.guesses) board+=r.join('')+'  `'+g.toUpperCase().split('').join(' ')+'`\n';
    const embed=new EmbedBuilder().setTitle('🟩 Wordle').setDescription(board).setColor(guess===game.word?0x57F287:0x7289DA);
    if (guess===game.word){embed.setFooter({text:`🎉 Solved in ${game.guesses.length} guess${game.guesses.length===1?'':'es'}!`});addCoins(userId,500);addXP(userId,250);await saveData();wordleGames.delete(chanId);}
    else if (game.guesses.length>=game.maxGuesses){embed.setFooter({text:`Game over! Word: ${game.word.toUpperCase()}`});wordleGames.delete(chanId);}
    else embed.setFooter({text:`${game.maxGuesses-game.guesses.length} guesses left`});
    return interaction.reply({embeds:[embed]});
}

if (cmd==='trivia') {
    const q=TRIVIA_QUESTIONS[rng(0,TRIVIA_QUESTIONS.length-1)];
    const row=new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId(`trivia_${userId}_${Date.now()}`).setPlaceholder('Choose your answer...')
            .addOptions(q.options.map(opt=>({label:opt.charAt(0).toUpperCase()+opt.slice(1),value:opt}))),
    );
    await interaction.reply({content:`**🧠 ${q.q}**`,components:[row]});
    const msg=await interaction.fetchReply();
    const col=msg.createMessageComponentCollector({time:30_000});
    let answered=false;
    col.on('collect',async sel=>{
        if (!sel.customId.includes(userId)) return sel.reply({content:'❌ Not your question!',ephemeral:true});
        if (answered) return;
        answered=true;
        if (sel.values[0]===q.a){addCoins(userId,250);addXP(userId,100);await saveData();await sel.reply({content:`✅ Correct! **+250 coins** and **+100 XP**!`,ephemeral:true});}
        else await sel.reply({content:`❌ Wrong! Answer: **${q.a}**`,ephemeral:true});
        col.stop();
    });
    col.on('end',async()=>{
        if (!answered) await interaction.editReply({content:`**🧠 ${q.q}**\n⏰ Time up! Answer: **${q.a}**`,components:[]}).catch(()=>{});
        else await interaction.editReply({components:[]}).catch(()=>{});
    });
    return;
}

if (cmd==='slots') {
    const bet=interaction.options.getInteger('bet');
    if (coins(userId)<bet) return interaction.reply({content:'❌ Not enough coins!',ephemeral:true});
    if (bet>25000) return interaction.reply({content:'❌ Max slot bet is **25,000 coins**.',ephemeral:true});
    const slotsRem=cooldownManager.get(userId,'slots');
    if (slotsRem) return interaction.reply({content:`⏰ Slots cooldown: **${cdStr(slotsRem)}**`,ephemeral:true});
    cooldownManager.set(userId,'slots',10_000); // 10s between spins
    const s=playSlotsOnce(),win=calcSlotWin(s,bet);
    addCoins(userId,-bet+win); addXP(userId,Math.floor(bet/10));
    await saveData();
    return interaction.reply({content:win>0?`🎰 **${s.join(' ')}** — 🎉 WIN! **+${fmtN(win)} coins**!`:`🎰 **${s.join(' ')}** — 💸 Loss! -${fmtN(bet)} coins`});
}

if (cmd==='blackjack') {
    const bet=interaction.options.getInteger('bet');
    if (coins(userId)<bet) return interaction.reply({content:'❌ Not enough coins!',ephemeral:true});
    addCoins(userId,-bet);
    const ph=[drawCard(),drawCard()],dh=[drawCard(),drawCard()];
    const pv=handVal(ph);
    bjGames.set(userId,{ph,dh,bet,active:true});
    if (pv===21){addCoins(userId,Math.floor(bet*2.5));bjGames.delete(userId);await saveData();return interaction.reply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle('🃏 Blackjack! Natural 21!').setDescription(`+**${fmtN(Math.floor(bet*2.5))} coins**!`)]});}
    const row=new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bj_hit_${userId}`).setLabel('Hit 🃏').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`bj_stand_${userId}`).setLabel('Stand ✋').setStyle(ButtonStyle.Danger),
    );
    const embed=new EmbedBuilder().setColor(0x2196F3).setTitle('🃏 Blackjack')
        .addFields({name:'Your Hand',value:`${ph.join(' ')} = **${pv}**`,inline:true},{name:"Dealer's Hand",value:`${dh[0]} + ❓`,inline:true});
    return interaction.reply({embeds:[embed],components:[row]});
}

if (cmd==='bossfight') {
    const bossRem=cooldownManager.get(userId,'bossfight');
    if (bossRem) return interaction.reply({content:`⏰ Boss attack cooldown: **${cdStr(bossRem)}**`,ephemeral:true});
    if (!boss) boss={name:'👹 Shadow Demon',health:3000,maxHealth:3000};
    const weapons=userData.weapons.get(userId)||[];

          const best=[...weapons].sort((a,b)=>(Number(b?.damage)||0)-(Number(a?.damage)||0))[0]||{damage:20};
    const cls=userData.rpgClass.get(userId);
    const clsAtk=cls?RPG_CLASSES[cls].atk:0;
    const dmg=Math.max(1,Number(best.damage)+clsAtk+rng(0,50));
    boss.health=Math.max(0,boss.health-dmg);
    // Coin reward capped at 5 per hit to prevent farming, big reward only on kill
    addCoins(userId,Math.min(5,Math.floor(dmg/100)));
    cooldownManager.set(userId,'bossfight',30_000); // 30s per attack
    if (boss.health<=0){const rew=rng(1000,5000);addCoins(userId,rew);addXP(userId,500);await saveData();boss=null;return interaction.reply({content:`🎊 **Boss defeated!** +**${fmtN(rew)} coins**!`});}
    await saveData();
    return interaction.reply({content:`⚔️ Dealt **${dmg}** dmg!\n${boss.name}: \`${buildBar(boss.health,boss.maxHealth,20)}\` ${fmtN(boss.health)}/${fmtN(boss.maxHealth)}`});
}

if (cmd==='8ball') {
    const ans=['Yes!','No.','Definitely!','Ask again later.','Absolutely!','Highly unlikely.','Signs point to yes.',"Don't count on it.",'Outlook good!','Very doubtful.'];
    return interaction.reply({content:`🎱 **${interaction.options.getString('question')}**\n\n${ans[rng(0,ans.length-1)]}`});
}

if (cmd==='fnf') {
    if (fnfGames.has(userId)) return interaction.reply({content:'❌ Already have a FNF game running!',ephemeral:true});
    const difficulty=interaction.options.getString('difficulty');
    const diff=FNF_DIFFICULTIES[difficulty];
    const song=FNF_SONGS[rng(0,FNF_SONGS.length-1)];
    const seq=buildFnfSeq(diff.arrows);
    const gameId=`${userId}-${Date.now()}`;
    const game={userId,gameId,difficulty,song,sequence:seq,currentIndex:0,hits:0,misses:0,score:0,health:diff.maxHealth,arrowTimeout:null,currentMessage:null};
    fnfGames.set(userId,game);
    const startEmbed=new EmbedBuilder().setColor(diff.color).setTitle('🎵 Friday Night Funkin\'!')
        .setDescription(`**Difficulty:** ${diff.label}\n**Song:** ${song}\n\nHit the arrow buttons when shown!\n**${diff.timeMs/1000}s** per arrow\n\nGet ready... GO!`)
        .setFooter({text:`${diff.arrows} arrows total`});
    await interaction.reply({embeds:[startEmbed]});
    await new Promise(r=>setTimeout(r,2000));
    await fnfNextArrow(interaction,game);
    return;
}

if (cmd==='marry') {
    const target=interaction.options.getUser('user');
    if (!target||target.bot||target.id===userId) return interaction.reply({content:'❌ Invalid target!',ephemeral:true});
    if (userData.married.get(userId)) return interaction.reply({content:'❌ Already married! Divorce first with `/divorce`.',ephemeral:true});
    if (userData.married.get(String(target.id))) return interaction.reply({content:`❌ **${target.username}** is already married!`,ephemeral:true});
    // Anti-abuse: marriage cooldown (24h after last divorce)
    const marrRem=cooldownManager.get(userId,'marry');
    if (marrRem) return interaction.reply({content:`⏰ You must wait **${cdStr(marrRem)}** before marrying again.\nThis prevents marry/divorce coin farming.`,ephemeral:true});
    // Marriage costs 500 coins — no free money
    if (coins(userId)<500) return interaction.reply({content:'❌ Marriage costs **500 coins**! Save up first.',ephemeral:true});
    addCoins(userId,-500); addCoins(String(target.id),-Math.min(500,coins(String(target.id))));
    userData.married.set(userId,String(target.id));
    userData.married.set(String(target.id),userId);
    // Small reward — not farmable since cooldown kicks in after divorce
    addCoins(userId,200); addCoins(String(target.id),200);
    checkAchievementGeneral(userId,'married',1);
    await saveData();
    return interaction.reply({content:`💍 **${interaction.user.username}** married **${target.username}**! 🎉\n*(Marriage cost: 500 coins each)*`});
}
if (cmd==='divorce') {
    const spouse=userData.married.get(userId);
    if (!spouse) return interaction.reply({content:'❌ Not married!',ephemeral:true});
    // Divorce penalty — costs coins, prevents remarry spam
    const penalty=Math.min(1000,Math.floor(coins(userId)*0.05))||200;
    addCoins(userId,-penalty);
    userData.married.delete(userId);
    userData.married.delete(spouse);
    // 24h cooldown before remarrying
    cooldownManager.set(userId,'marry',86_400_000);
    cooldownManager.set(spouse,'marry',86_400_000);
    await saveData();
    return interaction.reply({content:`💔 Divorced. Lost **${fmtN(penalty)} coins** (divorce fee).\n⏰ You must wait **24 hours** before marrying again.`});
}
if (cmd==='rep') {
    const target=interaction.options.getUser('user');
    if (!target||target.id===userId) return interaction.reply({content:'❌ Invalid target!',ephemeral:true});
    const rem=cooldownManager.get(userId,'rep');
    if (rem) return interaction.reply({content:`⏰ Rep cooldown: **${cdStr(rem)}**`,ephemeral:true});
    const tid=String(target.id);
    userData.rep.set(tid,(Number(userData.rep.get(tid))||0)+1);
    cooldownManager.set(userId,'rep',86_400_000);
    await saveData();
    return interaction.reply({content:`👍 Gave rep to **${target.username}**! They now have **${userData.rep.get(tid)}** rep.`});
}
if (cmd==='adopt') {
    if (userData.pets.get(userId)) return interaction.reply({content:'❌ Already have a pet! Use `/pet` to check it.',ephemeral:true});
    const pc=interaction.options.getString('pet');
    const pet=PETS.find(p=>p.id===pc);
    if (!pet||coins(userId)<pet.price) return interaction.reply({content:`❌ Need **${fmtN(pet?.price||0)}** coins.`,ephemeral:true});
    addCoins(userId,-pet.price);
    userData.pets.set(userId,{id:pet.id,name:pet.name,xp:0,level:1});
    await saveData();
    return interaction.reply({content:`🐾 You adopted a **${pet.name}**! 🎉`});
}
if (cmd==='pet') {
    const pet=userData.pets.get(userId);
    if (!pet) return interaction.reply({content:'❌ No pet! Use `/adopt`.',ephemeral:true});
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFF69B4).setTitle(pet.name).addFields({name:'Level',value:`⭐ **${pet.level}**`,inline:true},{name:'XP',value:`📊 **${pet.xp||0}**`,inline:true},{name:'Status',value:'😊 Happy',inline:true})]});
}
if (cmd==='mine') {
    const rem=cooldownManager.get(userId,'mine');
    if (rem) return interaction.reply({content:`⏰ Mining cooldown: **${cdStr(rem)}**`,ephemeral:true});
    const found=Math.random()>0.2;
    if (found){addCoins(userId,rng(300,800));addXP(userId,50);}
    const matPool=['iron_ore','wood','herbs'];
    const mat=matPool[rng(0,matPool.length-1)];
    const mats=userData.craftMats.get(userId)||{};
    mats[mat]=(mats[mat]||0)+rng(1,4);
    userData.craftMats.set(userId,mats);
    cooldownManager.set(userId,'mine',900_000);
    await saveData();
    return interaction.reply({content:found?`⛏️ Struck gold! Found resources and **+${rng(300,800)} coins**!`:'⛏️ Hit a dead end, but grabbed some materials.'});
}

// ── MODERATION ──
if (cmd==='warn') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    const reason=interaction.options.getString('reason');
    if (!target) return interaction.reply({content:'❌ User not found',ephemeral:true});
    const tid=String(target.id);
    if (!userData.warnings.has(tid)) userData.warnings.set(tid,[]);
    userData.warnings.get(tid).push({reason,at:new Date().toISOString(),by:interaction.user.username});
    await saveData();
    const logCfg=logsConfig[guildId];
    if (logCfg?.channelId){const lc=await interaction.guild?.channels.fetch(logCfg.channelId).catch(()=>null);if(lc)lc.send({embeds:[new EmbedBuilder().setColor(0xFEE75C).setTitle('⚠️ User Warned').addFields({name:'User',value:target.username,inline:true},{name:'By',value:interaction.user.username,inline:true},{name:'Reason',value:reason}).setTimestamp()]}).catch(()=>{});}
    return interaction.reply({content:`⚠️ Warned **${target.username}** — ${reason}`});
}
if (cmd==='warnings') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    if (!target) return interaction.reply({content:'❌ User not found',ephemeral:true});
    const warns=userData.warnings.get(String(target.id))||[];
    if (!warns.length) return interaction.reply({content:`✅ **${target.username}** has no warnings.`,ephemeral:true});
    const embed=new EmbedBuilder().setColor(0xFEE75C).setTitle(`⚠️ ${target.username}'s Warnings`)
        .setDescription(warns.map((w,i)=>`**${i+1}.** ${w.reason}\n> by ${w.by} on ${w.at.slice(0,10)}`).join('\n\n'));
    return interaction.reply({embeds:[embed],ephemeral:true});
}
if (cmd==='mute') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    const dur=interaction.options.getInteger('duration');
    if (!target) return interaction.reply({content:'❌ User not found',ephemeral:true});
    try {
        const member=await interaction.guild.members.fetch(target.id);
        await member.disableCommunicationUntil(Date.now()+dur*60_000,`Muted by ${interaction.user.username}`);
        const lc=logsConfig[guildId]?.channelId?await interaction.guild.channels.fetch(logsConfig[guildId].channelId).catch(()=>null):null;
        if(lc)lc.send({embeds:[new EmbedBuilder().setColor(0xED4245).setTitle('🤐 Timed Out').addFields({name:'User',value:target.username,inline:true},{name:'By',value:interaction.user.username,inline:true},{name:'Duration',value:`${dur}m`,inline:true}).setTimestamp()]}).catch(()=>{});
        return interaction.reply({content:`🤐 **${target.username}** timed out for **${dur} minutes**`});
    } catch(e){return interaction.reply({content:'❌ Failed. Check permissions.',ephemeral:true});}
}
if (cmd==='unmute') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    if (!target) return interaction.reply({content:'❌ User not found',ephemeral:true});
    try {
        const member=await interaction.guild.members.fetch(target.id);
        await member.disableCommunicationUntil(null);
        return interaction.reply({content:`🔊 **${target.username}** unmuted!`});
    } catch(e){return interaction.reply({content:'❌ Failed.',ephemeral:true});}
}

if (cmd==='kick') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    const reason=interaction.options.getString('reason')||'No reason';
    if (!target) return interaction.reply({content:'❌ User not found',ephemeral:true});
    try {
        const member=await interaction.guild.members.fetch(target.id);
        await member.kick(reason);
        const lc=logsConfig[guildId]?.channelId?await interaction.guild.channels.fetch(logsConfig[guildId].channelId).catch(()=>null):null;
        if(lc)lc.send({embeds:[new EmbedBuilder().setColor(0xFFA500).setTitle('👢 User Kicked').addFields({name:'User',value:target.username,inline:true},{name:'By',value:interaction.user.username,inline:true},{name:'Reason',value:reason}).setTimestamp()]}).catch(()=>{});
        return interaction.reply({content:`👢 **${target.username}** kicked — ${reason}`});
    } catch(e){return interaction.reply({content:'❌ Failed to kick. Check permissions.',ephemeral:true});}
}
if (cmd==='ban') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    const reason=interaction.options.getString('reason')||'No reason';
    if (!target) return interaction.reply({content:'❌ User not found',ephemeral:true});
    try {
        await interaction.guild.members.ban(target.id,{reason});
        const lc=logsConfig[guildId]?.channelId?await interaction.guild.channels.fetch(logsConfig[guildId].channelId).catch(()=>null):null;
        if(lc)lc.send({embeds:[new EmbedBuilder().setColor(0xF44336).setTitle('🔨 User Banned').addFields({name:'User',value:target.username,inline:true},{name:'By',value:interaction.user.username,inline:true},{name:'Reason',value:reason}).setTimestamp()]}).catch(()=>{});
        return interaction.reply({content:`🔨 **${target.username}** banned — ${reason}`});
    } catch(e){return interaction.reply({content:'❌ Failed to ban. Check permissions.',ephemeral:true});}
}

                interaction.reply({content:'❌ Staff only!',ephemeral:true});
    const gStaff=[...staffSet].filter(s=>s.startsWith(`${guildId}:`)).map(s=>s.split(':')[1]);
    if (!gStaff.length) return interaction.reply({content:'No staff set for this server. Use `/addstaff`.',ephemeral:true});
    const lines=gStaff.map(uid=>{const cached=client.users.cache.get(uid);return `• ${cached?cached.username:`User#${uid.slice(-4)}`}`;});
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x2196F3).setTitle('👮 Server Staff').setDescription(lines.join('\n'))],ephemeral:true});
}

// ── DELETE / RESET COMMANDS ──
if (cmd==='deletestaff') {
    if (!isOwner && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator))
        return interaction.reply({content:'❌ Admins only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    if (!target) return interaction.reply({content:'❌ Provide a user.',ephemeral:true});
    staffSet.delete(`${guildId}:${String(target.id)}`);
    await saveData();
    return interaction.reply({content:`✅ Removed **${target.username}** from staff.`,ephemeral:true});
}
if (cmd==='deletelogs') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    delete logsConfig[guildId]; await saveData();
    return interaction.reply({content:'✅ Mod-logs disabled for this server.',ephemeral:true});
}
if (cmd==='deletewelcome') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    delete welcomeConfig[guildId]; await saveData();
    return interaction.reply({content:'✅ Welcome system disabled.',ephemeral:true});
}
if (cmd==='deletetickets') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    delete ticketConfig[guildId]; await saveData();
    return interaction.reply({content:'✅ Ticket system disabled.',ephemeral:true});
}
if (cmd==='deletesuggestions') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    delete suggestionConfig[guildId]; await saveData();
    return interaction.reply({content:'✅ Suggestions disabled.',ephemeral:true});
}
if (cmd==='deletemoney') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    if (!target) return interaction.reply({content:'❌ Provide a user.',ephemeral:true});
    const tid=String(target.id);
    userData.coins.set(tid,0); userData.bank.set(tid,0);
    await saveData();
    return interaction.reply({content:`✅ Reset all money for **${target.username}**.`,ephemeral:true});
}

if (cmd==='setlevelannounce') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    const ch = interaction.options.getChannel('channel');
    levelAnnounceConfig[guildId] = { channelId: ch.id };
    await saveData();
    return interaction.reply({embeds:[new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('📢 Level Announce Channel Set!')
        .setDescription(`Level-up notifications will now be sent to <#${ch.id}>!`)
        .addFields(
            {name:'How it works', value:'Every time someone levels up from chatting or fishing, a level-up embed will appear in that channel.'},
            {name:'Disable it', value:'Use `/deletelevelannounce` to turn it off.'},
        )
    ]});
}
if (cmd==='deletelevelannounce') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    delete levelAnnounceConfig[guildId];
    await saveData();
    return interaction.reply({content:'✅ Level-up announcements disabled for this server.',ephemeral:true});
              }
      // ════════════════════════════════════════════════════════════════
// DELETE / REVERSE COMMANDS
// ════════════════════════════════════════════════════════════════

if (cmd==='deletecoins') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    const amount=interaction.options.getInteger('amount');
    const tid=String(target.id);
    if (amount) {
        const newBal=Math.max(0,coins(tid)-amount);
        userData.coins.set(tid,newBal);
        await saveData();
        return interaction.reply({content:`✅ Removed **${fmtN(amount)} coins** from **${target.username}**. New balance: **${fmtN(newBal)}**`,ephemeral:true});
    } else {
        userData.coins.set(tid,0); userData.bank.set(tid,0);
        await saveData();
        return interaction.reply({content:`✅ Reset all coins (wallet + bank) for **${target.username}** to 0.`,ephemeral:true});
    }
}

if (cmd==='deletexp') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    const amount=interaction.options.getInteger('amount');
    const tid=String(target.id);
    const before=getLevelInfo(userData.xp.get(tid)||0);
    if (amount) {
        const newXp=Math.max(0,(userData.xp.get(tid)||0)-amount);
        userData.xp.set(tid,newXp);
        const after=getLevelInfo(newXp);
        await saveData();
        return interaction.reply({content:`✅ Removed **${fmtN(amount)} XP** from **${target.username}**.
Level: **${before.level}** → **${after.level}**`,ephemeral:true});
    } else {
        userData.xp.set(tid,0);
        await saveData();
        return interaction.reply({content:`✅ Reset XP for **${target.username}** to 0 (back to Level 0).`,ephemeral:true});
    }
}

if (cmd==='deletelevel') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    const tid=String(target.id);
    const before=getLevelInfo(userData.xp.get(tid)||0).level;
    userData.xp.set(tid,0);
    userData.skillPoints.set(tid,0);
    userData.skillsLearned.set(tid,[]);
    await saveData();
    return interaction.reply({content:`✅ Reset **${target.username}** from Level **${before}** back to Level **0**. Skill points and learned skills also cleared.`,ephemeral:true});
}

if (cmd==='deletewarnings') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    const tid=String(target.id);
    const count=(userData.warnings.get(tid)||[]).length;
    if (!count) return interaction.reply({content:`✅ **${target.username}** already has no warnings.`,ephemeral:true});
    userData.warnings.set(tid,[]);
    await saveData();
    const logCfg=logsConfig[guildId];
    if (logCfg?.channelId){
        const lc=await interaction.guild?.channels.fetch(logCfg.channelId).catch(()=>null);
        if(lc) lc.send({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle('🗑️ Warnings Cleared').addFields({name:'User',value:target.username,inline:true},{name:'By',value:interaction.user.username,inline:true},{name:'Warnings Removed',value:String(count),inline:true}).setTimestamp()]}).catch(()=>{});
    }
    return interaction.reply({content:`✅ Cleared **${count}** warning(s) from **${target.username}**.`,ephemeral:true});
}

if (cmd==='deleteresponse') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const trigger=interaction.options.getString('trigger').toLowerCase();
    if (!autoResponses.has(trigger)) return interaction.reply({content:`❌ No auto-response found for trigger: **"${trigger}"**`,ephemeral:true});
    autoResponses.delete(trigger);
    await saveData();
    return interaction.reply({content:`✅ Removed auto-response for trigger: **"${trigger}"**`,ephemeral:true});
}

if (cmd==='clearresponses') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const count=autoResponses.size;
    autoResponses.clear();
    await saveData();
    return interaction.reply({content:`✅ Cleared all **${count}** auto-response(s).`,ephemeral:true});
}

if (cmd==='listresponses') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    if (!autoResponses.size) return interaction.reply({content:'📋 No auto-responses set. Add one with `/addresponse`.',ephemeral:true});
    const lines=[...autoResponses.entries()].map(([k,v])=>`**"${k}"** → ${v.length>60?v.slice(0,60)+'...':v}`);
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x2196F3).setTitle(`📋 Auto-Responses (${autoResponses.size})`).setDescription(lines.join("\n")).setFooter({text:"Remove: /deleteresponse <trigger> | Clear all: /clearresponses"})],ephemeral:true});
}

if (cmd==='deleteinventory') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    const type=interaction.options.getString('type');
    const tid=String(target.id);
    const cleared=[];
    if (type==='weapons'||type==='all')  { userData.weapons.set(tid,[]);  cleared.push('weapons'); }
    if (type==='items'  ||type==='all')  { userData.items.set(tid,[]);    cleared.push('items'); }
    if (type==='fish'   ||type==='all')  { userData.fishInv.set(tid,[]);  userData.fishCaught.set(tid,{}); userData.fishStats.set(tid,{total:0,totalVal:0,biggest:0,biggestName:''}); cleared.push('fish inventory'); }
    if (type==='bait'   ||type==='all')  { userData.baitInv.set(tid,{});  cleared.push('bait'); }
    await saveData();
    return interaction.reply({content:`✅ Cleared **${cleared.join(', ')}** for **${target.username}**.`,ephemeral:true});
}

if (cmd==='deletepet') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    const tid=String(target.id);
    const pet=userData.pets.get(tid);
    if (!pet) return interaction.reply({content:`❌ **${target.username}** has no pet.`,ephemeral:true});
    userData.pets.delete(tid);
    await saveData();
    return interaction.reply({content:`✅ Removed **${pet.name||'pet'}** from **${target.username}**.`,ephemeral:true});
}

if (cmd==='deleterod') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    const tid=String(target.id);
    userData.rodEquipped.set(tid,'plastic');
    userData.rodOwned.set(tid,[]);
    userData.rodEnchants.set(tid,[]);
    await saveData();
    return interaction.reply({content:`✅ Reset **${target.username}**'s rod to Plastic Rod and cleared all owned rods and enchantments.`,ephemeral:true});
}

if (cmd==='resetuser') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    const tid=String(target.id);
    // Confirm step via button
    const row=new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`resetuser_confirm_${tid}_${userId}`).setLabel('⚠️ YES, FULL RESET').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`resetuser_cancel_${userId}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xF44336).setTitle('⚠️ Full User Reset')
        .setDescription(`This will wipe **ALL** data for **${target.username}**:
- Coins & bank
- XP & level
- Fish inventory
- Rods & bait
- Weapons & items
- Pet
- Warnings
- Achievements
- Guild membership

**Are you sure?**`)
    ],components:[row],ephemeral:true});
}

if (cmd==='deleteguild') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const name=interaction.options.getString('name').toLowerCase();
    let foundId=null,foundG=null;
    for (const [gid,g] of userData.guilds){if(g.name.toLowerCase()===name){foundId=gid;foundG=g;break;}}
    if (!foundG) return interaction.reply({content:`❌ Guild **"${name}"** not found.`,ephemeral:true});
    // Remove all members from guild
    for (const memberId of foundG.members) {
        if (userData.guildOf.get(memberId)===foundId) userData.guildOf.delete(memberId);
    }
    userData.guilds.delete(foundId);
    await saveData();
    return interaction.reply({content:`✅ Disbanded guild **${foundG.name}** and removed all **${foundG.members.length}** members.`,ephemeral:true});
}

if (cmd==='marketplace') {
    const listings=[...userData.marketplace.values()].slice(0,15);
    if (!listings.length) return interaction.reply({embeds:[new EmbedBuilder().setColor(0x9E9E9E).setTitle('🏪 Marketplace').setDescription('No listings! Use `/listitem` to sell.')]});
    const lines=listings.map(l=>`\`${l.id.slice(-8)}\` **${l.type}** — \`${l.itemId}\` — 💰${fmtN(l.price)} coins`);
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFF9800).setTitle('🏪 Player Marketplace').setDescription(lines.join(' ')).setFooter({text:'Buy: /buymarketitem <id> | Max 5 listings per player | 1% listing fee'})]});
}
if (cmd==='listitem') {
    const type=interaction.options.getString('type');
    const itemId=interaction.options.getString('itemid');
    const price=interaction.options.getInteger('price');
    // Cap at 5 listings per player
    const myListings=[...userData.marketplace.values()].filter(l=>l.seller===userId);
    if (myListings.length>=5) return interaction.reply({content:'❌ Max 5 active listings. Remove one with `!deletemarketlisting <id>` first.',ephemeral:true});
    // 1% listing fee minimum 10 coins
    const fee=Math.max(10,Math.floor(price*0.01));
    if (coins(userId)<fee) return interaction.reply({content:`❌ Listing fee: **${fmtN(fee)} coins** (1% of price).`,ephemeral:true});
    addCoins(userId,-fee);
    const lid=`list_${userId}_${Date.now()}`;
    userData.marketplace.set(lid,{id:lid,seller:userId,type,itemId,price,ts:Date.now()});
    await saveData();
    return interaction.reply({content:`✅ Listed **${itemId}** for **${fmtN(price)} coins**!
Listing fee: **${fmtN(fee)} coins**
ID: \`${lid}\``});
}
if (cmd==='buymarketitem') {
    const lid=interaction.options.getString('listingid');
    const listing=userData.marketplace.get(lid);
    if (!listing) return interaction.reply({content:'❌ Listing not found! Check `/marketplace` for valid IDs.',ephemeral:true});
    if (listing.seller===userId) return interaction.reply({content:"❌ Can't buy your own listing!",ephemeral:true});
    if (coins(userId)<listing.price) return interaction.reply({content:`❌ Need **${fmtN(listing.price)} coins**!`,ephemeral:true});
    addCoins(userId,-listing.price);
    addCoins(listing.seller,Math.floor(listing.price*0.9)); // 10% marketplace tax
    userData.marketplace.delete(lid);
    const inv=userData.items.get(userId)||[];
    inv.push({id:listing.itemId,name:listing.itemId,price:listing.price,emoji:'📦'});
    userData.items.set(userId,inv); await saveData();
    return interaction.reply({content:`✅ Bought **${listing.itemId}** for **${fmtN(listing.price)} coins**! (Seller gets 90%)`});
}

if (cmd==='deletemarketlisting') {
    const lid=interaction.options.getString('listingid');
    const listing=userData.marketplace.get(lid);
    if (!listing) return interaction.reply({content:'❌ Listing not found!',ephemeral:true});
    // Allow seller OR owner to delete
    if (listing.seller!==userId&&!isOwner) return interaction.reply({content:'❌ You can only remove your own listings!',ephemeral:true});
    userData.marketplace.delete(lid);
    await saveData();
    return interaction.reply({content:`✅ Removed listing \`${lid}\`.`,ephemeral:true});
                        }
      // ── OWNER COMMANDS ──
if (cmd==='addxp') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const t=interaction.options.getUser('user'),a=interaction.options.getInteger('amount');
    addXP(String(t.id),a); await saveData();
    return interaction.reply({content:`⭐ Added **${fmtN(a)} XP** to **${t.username}**`});
}
if (cmd==='addcoins') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const t=interaction.options.getUser('user'),a=interaction.options.getInteger('amount');
    addCoins(String(t.id),a); await saveData();
    return interaction.reply({content:`💰 Added **${fmtN(a)} coins** to **${t.username}**`});
}
if (cmd==='addresponse') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const trigger=String(interaction.options.getString('trigger')).toLowerCase();
    const response=String(interaction.options.getString('response'));
    autoResponses.set(trigger,response); await saveData();
    return interaction.reply({content:`✅ Auto-response set: **"${trigger}"** → "${response}"`,ephemeral:true});
}
if (cmd==='resetcooldowns') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const t=interaction.options.getUser('user')||interaction.user;
    cooldownManager.clearAll(String(t.id));
    return interaction.reply({content:`✅ Cleared all cooldowns for **${t.username}**`,ephemeral:true});
}
if (cmd==='giverod') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const t=interaction.options.getUser('user');
    const rid=interaction.options.getString('rod');
    const rod=FISHING_RODS.find(r=>r.id===rid);
    if (!rod) return interaction.reply({content:'❌ Invalid rod ID',ephemeral:true});
    const owned=userData.rodOwned.get(String(t.id))||[];
    if (!owned.includes(rid)){owned.push(rid);userData.rodOwned.set(String(t.id),owned);}
    await saveData();
    return interaction.reply({content:`✅ Gave **${rod.name}** to **${t.username}**`,ephemeral:true});
}
if (cmd==='forceevent') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const eid=interaction.options.getString('event');
    const ev=WORLD_EVENTS.find(e=>e.id===eid);
    if (!ev) return interaction.reply({content:'❌ Invalid event',ephemeral:true});
    userData.worldEvent=ev; userData.worldEventEnd=Date.now()+ev.dur;
    await saveData();
    return interaction.reply({content:`✅ Forced event: **${ev.emoji} ${ev.name}**\n${ev.desc}`});
}
if (cmd==='forceboss') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const bid=interaction.options.getString('boss');
    const b=BOSS_FISH.find(b=>b.id===bid);
    if (!b) return interaction.reply({content:'❌ Invalid boss',ephemeral:true});
    userData.activeBoss=b; userData.activeBossHp=b.hp;
    await saveData();
    return interaction.reply({content:`✅ Spawned: **${b.emoji} ${b.name}** (${fmtN(b.hp)} HP)`});
      }
// ── OWNER COMMANDS ──
if (cmd==='addxp') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const t=interaction.options.getUser('user'),a=interaction.options.getInteger('amount');
    addXP(String(t.id),a); await saveData();
    return interaction.reply({content:`⭐ Added **${fmtN(a)} XP** to **${t.username}**`});
}
if (cmd==='addcoins') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const t=interaction.options.getUser('user'),a=interaction.options.getInteger('amount');
    addCoins(String(t.id),a); await saveData();
    return interaction.reply({content:`💰 Added **${fmtN(a)} coins** to **${t.username}**`});
}
if (cmd==='addresponse') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const trigger=String(interaction.options.getString('trigger')).toLowerCase();
    const response=String(interaction.options.getString('response'));
    autoResponses.set(trigger,response); await saveData();
    return interaction.reply({content:`✅ Auto-response set: **"${trigger}"** → "${response}"`,ephemeral:true});
}
if (cmd==='resetcooldowns') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const t=interaction.options.getUser('user')||interaction.user;
    cooldownManager.clearAll(String(t.id));
    return interaction.reply({content:`✅ Cleared all cooldowns for **${t.username}**`,ephemeral:true});
}
if (cmd==='giverod') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const t=interaction.options.getUser('user');
    const rid=interaction.options.getString('rod');
    const rod=FISHING_RODS.find(r=>r.id===rid);
    if (!rod) return interaction.reply({content:'❌ Invalid rod ID',ephemeral:true});
    const owned=userData.rodOwned.get(String(t.id))||[];
    if (!owned.includes(rid)){owned.push(rid);userData.rodOwned.set(String(t.id),owned);}
    await saveData();
    return interaction.reply({content:`✅ Gave **${rod.name}** to **${t.username}**`,ephemeral:true});
}
if (cmd==='forceevent') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const eid=interaction.options.getString('event');
    const ev=WORLD_EVENTS.find(e=>e.id===eid);
    if (!ev) return interaction.reply({content:'❌ Invalid event',ephemeral:true});
    userData.worldEvent=ev; userData.worldEventEnd=Date.now()+ev.dur;
    await saveData();
    return interaction.reply({content:`✅ Forced event: **${ev.emoji} ${ev.name}**\n${ev.desc}`});
}
if (cmd==='forceboss') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const bid=interaction.options.getString('boss');
    const b=BOSS_FISH.find(b=>b.id===bid);
    if (!b) return interaction.reply({content:'❌ Invalid boss',ephemeral:true});
    userData.activeBoss=b; userData.activeBossHp=b.hp;
    await saveData();
    return interaction.reply({content:`✅ Spawned: **${b.emoji} ${b.name}** (${fmtN(b.hp)} HP)`});
}
  if (cmd==='buybait') {
    const bid=interaction.options.getString('bait');
    const qty=interaction.options.getInteger('amount')||1;
    const bait=BAIT_TYPES.find(b=>b.id===bid);
    if (!bait) return interaction.reply({content:'❌ Invalid bait.',ephemeral:true});
    const cost=bait.price*qty;
    if (coins(userId)<cost) return interaction.reply({content:`❌ Need **${fmtN(cost)}** coins for ${qty}x ${bait.name}.`,ephemeral:true});
    addCoins(userId,-cost);
    const inv=userData.baitInv.get(userId)||{};
    inv[bid]=(inv[bid]||0)+qty; userData.baitInv.set(userId,inv);
    await saveData();
    return interaction.reply({content:`✅ Bought **${qty}x ${bait.emoji} ${bait.name}** for **${fmtN(cost)} coins**!`});
}

if (cmd==='fishinv') {
    const page=(interaction.options.getInteger('page')||1)-1;
    const inv=userData.fishInv.get(userId)||[];
    if (!inv.length) return interaction.reply({content:'❌ No fish! Go `/fish`!',ephemeral:true});
    const perPage=10,start=page*perPage;
    const slice=inv.slice(start,start+perPage);
    if (!slice.length) return interaction.reply({content:'❌ No fish on this page.',ephemeral:true});
    const lines=slice.map((f,i)=>{
        const spec=FISH_SPECIES.find(s=>s.id===f.fishId);
        const mut=MUTATIONS.find(m=>m.id===f.mutId);
        const mutStr=f.mutId!=='none'?` ${mut?.emoji}${mut?.name}`:'';
        return `**${start+i+1}.** ${spec?.emoji||'🐟'} **${spec?.name||f.fishId}**${mutStr} — ${f.weight}kg — 💰${fmtN(f.value)}`;
    });
    const totalVal=inv.reduce((s,f)=>s+f.value,0);
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x2196F3).setTitle('🐠 Fish Inventory').setDescription(lines.join('\n'))
        .setFooter({text:`Page ${page+1}/${Math.ceil(inv.length/perPage)} • ${inv.length} fish • Total: ${fmtN(totalVal)} coins`})]});
}

if (cmd==='sellfish') {
    const filter=interaction.options.getString('filter');
    const inv=userData.fishInv.get(userId)||[];
    if (!inv.length) return interaction.reply({content:'❌ No fish to sell!',ephemeral:true});
    let toSell=[],keep=[];
    if (filter==='all'){toSell=inv;}
    else if (filter==='belowepic'){
        toSell=inv.filter(f=>{const s=FISH_SPECIES.find(x=>x.id===f.fishId);return s&&['Common','Uncommon','Rare'].includes(s.r);});
        keep=inv.filter(f=>{const s=FISH_SPECIES.find(x=>x.id===f.fishId);return !s||!['Common','Uncommon','Rare'].includes(s.r);});
    } else {
        toSell=inv.filter(f=>{const s=FISH_SPECIES.find(x=>x.id===f.fishId);return s?.r===filter;});
        keep=inv.filter(f=>{const s=FISH_SPECIES.find(x=>x.id===f.fishId);return s?.r!==filter;});
    }
    if (!toSell.length) return interaction.reply({content:'❌ No matching fish!',ephemeral:true});
    const total=toSell.reduce((s,f)=>s+f.value,0);
    addCoins(userId,total); userData.fishInv.set(userId,keep);
    await saveData();
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle('💵 Fish Sold!').setDescription(`Sold **${toSell.length}** fish for **${fmtN(total)} coins**!`)]});
}

if (cmd==='fishencyclopedia') {
    const rarity=interaction.options.getString('rarity');
    const caught=userData.fishCaught.get(userId)||{};
    const pool=rarity?FISH_SPECIES.filter(f=>f.r===rarity):FISH_SPECIES;
    const lines=pool.map(f=>{const cnt=caught[f.id]||0;return `${f.emoji} **${f.name}** [${f.r}] ${cnt>0?`✅ ×${cnt}`:'❓'}`;});
    const shown=lines.slice(0,20);
    if (lines.length>20) shown.push(`*...${lines.length-20} more. Filter by rarity.*`);
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x9C27B0).setTitle('📖 Fish Encyclopedia').setDescription(shown.join('\n'))
        .setFooter({text:`Discovered: ${Object.keys(caught).length}/${FISH_SPECIES.length}`})]});
}

if (cmd==='fishstats') {
    const stats=userData.fishStats.get(userId)||{total:0,totalVal:0,biggest:0,biggestName:''};
    const streak=userData.fishStreak.get(userId)||{streak:0};
    const caught=userData.fishCaught.get(userId)||{};
    const rodId=userData.rodEquipped.get(userId)||'plastic';
    const rod=FISHING_RODS.find(r=>r.id===rodId);
    const enchants=userData.rodEnchants.get(userId)||[];
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFF9800).setTitle('📊 Fishing Statistics')
        .addFields(
            {name:'🐟 Total Caught',  value:fmtN(stats.total),              inline:true},
            {name:'💰 Total Value',   value:`${fmtN(stats.totalVal)} coins`, inline:true},
            {name:'📚 Species Found', value:`${Object.keys(caught).length}/${FISH_SPECIES.length}`,inline:true},
            {name:'⚖️ Biggest',       value:stats.biggest?`${stats.biggestName} (${stats.biggest}kg)`:'None',inline:true},
            {name:'🔥 Streak',        value:`${streak.streak} days`,         inline:true},
            {name:'🎣 Rod',           value:`${rod?.emoji||'🎣'} ${rod?.name||'Plastic'}`,inline:true},
            {name:'✨ Enchants',      value:enchants.length?enchants.join(', '):'None',inline:true},
        )
    ]});
}

if (cmd==='fishquest') {
    const q=genDailyQuest(userId);
    const descs={catch_any:`Catch any **${q.goal}** fish`,catch_rarity:`Catch **${q.goal} ${q.target}** fish`,catch_mutation:`Catch **${q.goal}** mutated fish`};
    const bar=buildBar(q.progress||0,q.goal,15);
    return interaction.reply({embeds:[new EmbedBuilder().setColor(q.done?0x57F287:0x2196F3).setTitle('📋 Daily Fishing Quest')
        .setDescription(descs[q.type]||'Catch fish!')
        .addFields(
            {name:'Progress',value:`\`${bar}\` ${q.progress||0}/${q.goal}`},
            {name:'Reward',  value:`💰 ${fmtN(q.reward)} coins + ⭐ ${q.xpReward||100} XP`},
            {name:'Status',  value:q.done?'✅ Completed!':'⏳ In Progress'},
        )
    ]});
}

if (cmd==='fishleaderboard') {
    const entries=[];
    for (const [uid,stats] of userData.fishStats) {
        const cached=client.users.cache.get(uid);
        const name=cached?cached.username:`User#${uid.slice(-4)}`;
        entries.push({name,total:stats.total||0,totalVal:stats.totalVal||0});
    }
    entries.sort((a,b)=>b.total-a.total);
    const lines=entries.slice(0,10).map((e,i)=>`**#${i+1}** **${e.name}** — 🐟 ${fmtN(e.total)} | 💰 ${fmtN(e.totalVal)}`);
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x2196F3).setTitle('🏆 Fishing Leaderboard').setDescription(lines.join('\n')||'No data yet.')]});
}

if (cmd==='fishweather') {
    const w=getCurrentWeather();
    const ev=userData.worldEvent&&userData.worldEventEnd>Date.now()?userData.worldEvent:null;
    const b=userData.activeBoss;
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x2196F3).setTitle('🌤️ Fishing Forecast')
        .addFields(
            {name:'Weather',        value:`${w.emoji} **${w.name}**`,  inline:true},
            {name:'Time',           value:isNight()?'🌙 Night (+rare)':'☀️ Day',inline:true},
            {name:'Common',         value:`×${w.commonMult}`,           inline:true},
            {name:'Rare',           value:`×${w.rareMult}`,             inline:true},
            {name:'Legendary',      value:`×${w.legMult}`,              inline:true},
            {name:'🌍 World Event', value:ev?`${ev.emoji} **${ev.name}** — ${ev.desc}`:'None',inline:false},
            {name:'🦈 Boss Fish',   value:b?`${b.emoji} **${b.name}** — ${fmtN(userData.activeBossHp)} HP`:'No boss active',inline:false},
        )
    ]});
}

if (cmd==='fishboss') {
    if (!userData.activeBoss) return interaction.reply({content:'❌ No boss fish active! Check `/worldevent`.',ephemeral:true});
    const rem=cooldownManager.get(userId,'fishboss');
    if (rem) return interaction.reply({content:`⏰ Attack cooldown: **${cdStr(rem)}**`,ephemeral:true});
    cooldownManager.set(userId,'fishboss',30_000);
    const cls=userData.rpgClass.get(userId);
    const clsAtk=cls?RPG_CLASSES[cls].atk:0;
    const rod=FISHING_RODS.find(r=>r.id===(userData.rodEquipped.get(userId)||'plastic'))||FISHING_RODS[0];
    const dmg=rng(100,500)+Math.floor(rod.pwr*50)+clsAtk;
    const b=userData.activeBoss;
    userData.activeBossHp=Math.max(0,userData.activeBossHp-dmg);
    if (userData.activeBossHp<=0) {
        addCoins(userId,b.reward); addXP(userId,b.xp);
        checkAchievementGeneral(userId,'boss',1);
        userData.activeBoss=null; userData.activeBossHp=0;
        await saveData();
        return interaction.reply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle(`🎉 Boss Defeated: ${b.emoji} ${b.name}!`).setDescription(`+**${fmtN(b.reward)} coins** and **+${fmtN(b.xp)} XP**!`)]});
    }
    await saveData();
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xF44336).setTitle(`🦈 ${b.emoji} ${b.name}`)
        .addFields({name:'Your Hit',value:`-${fmtN(dmg)} HP`},{name:'Boss HP',value:`\`${buildBar(userData.activeBossHp,b.hp,20)}\` ${fmtN(userData.activeBossHp)}/${fmtN(b.hp)}`})
    ]});
}

if (cmd==='worldevent') {
    const ev=userData.worldEvent,active=ev&&userData.worldEventEnd>Date.now();
    if (!active) return interaction.reply({embeds:[new EmbedBuilder().setColor(0x9E9E9E).setTitle('🌍 World Events').setDescription('No event active.\nPossible events:\n'+WORLD_EVENTS.map(e=>`${e.emoji} **${e.name}** — ${e.desc}`).join('\n'))]});
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFF9800).setTitle(`🌍 ACTIVE: ${ev.emoji} ${ev.name}!`).setDescription(ev.desc).addFields({name:'Time Remaining',value:cdStr(userData.worldEventEnd-Date.now())})]});
}

if (cmd==='teleport') {
    const bid=interaction.options.getString('biome');
    const biome=BIOMES.find(b=>b.id===bid);
    if (!biome) return interaction.reply({content:'❌ Invalid biome.',ephemeral:true});
    const lvInfo=getLevelInfo(userData.xp.get(userId)||0);
    if (lvInfo.level<biome.unlockLv) return interaction.reply({content:`❌ Need **Level ${biome.unlockLv}**! You are Level ${lvInfo.level}.`,ephemeral:true});
    const cost=biome.unlockLv*100;
    if (biome.unlockLv>0&&coins(userId)<cost) return interaction.reply({content:`❌ Travel costs **${fmtN(cost)}** coins!`,ephemeral:true});
    if (biome.unlockLv>0) addCoins(userId,-cost);
    await saveData();
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x2196F3).setTitle(`🗺️ Teleported: ${biome.emoji} ${biome.name}!`).setDescription(`${biome.desc}\n\nNow use \`/fish biome:${biome.id}\`!\nMax rarity: **${biome.maxRarity}**`)]});
}

if (cmd==='scyllakey') {
    const caught=userData.fishCaught.get(userId)||{};
    const hasKey=(userData.completedQuests.get(userId)||[]).includes('scylla_key');
    return interaction.reply({embeds:[new EmbedBuilder().setColor(hasKey?0xFFD700:0x9E9E9E).setTitle('👑 Scylla Key Status')
        .setDescription(hasKey?'✅ **You have the Scylla Key!**':'Obtain all 3 secret fish to craft it.')
        .addFields(
            {name:'👑 Crowned Angler Fish',value:(caught['crowned_anglerfish']||0)>0?'✅':'❌',inline:true},
            {name:'❄️ Frozen Leviathan',   value:(caught['frozen_leviathan']||0)>0?'✅':'❌',inline:true},
            {name:'🌋 Magma Leviathan',    value:(caught['magma_leviathan']||0)>0?'✅':'❌',inline:true},
        ).setFooter({text:"Fish in Mariana's Veil (Lv100+) for secret fish"})
    ]});
}

if (cmd==='craftkey') {
    const caught=userData.fishCaught.get(userId)||{};
    const completed=userData.completedQuests.get(userId)||[];
    if (completed.includes('scylla_key')) return interaction.reply({content:'✅ Already have the Scylla Key!',ephemeral:true});
    if (!(caught['crowned_anglerfish']>0&&caught['frozen_leviathan']>0&&caught['magma_leviathan']>0))
        return interaction.reply({content:"❌ Need all 3 secret fish! Fish in Mariana's Veil (Lv100+).",ephemeral:true});
    completed.push('scylla_key'); userData.completedQuests.set(userId,completed);
    checkAchievementGeneral(userId,'scylla',1); await saveData();
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFFD700).setTitle('🔑 Scylla Key Crafted!').setDescription('You forged the **Scylla Key**! You may now enter the Scylla Chamber for exclusive rewards.')]});
      }

      // ════════════════════════════════════════════════════════════════
// RPG COMMANDS
// ════════════════════════════════════════════════════════════════
if (cmd==='chooseclass') {
    const cid=interaction.options.getString('class');
    const cls=RPG_CLASSES[cid];
  if (!cls) return interaction.reply({content:'❌ Invalid class.',ephemeral:true});
    userData.rpgClass.set(userId,cid);
    userData.rpgStats.set(userId,{hp:cls.hp,maxHp:cls.hp,atk:cls.atk,def:cls.def,mana:cls.mana,maxMana:cls.mana});
    userData.skillPoints.set(userId,(userData.skillPoints.get(userId)||0)+1);
    await saveData();
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFF9800).setTitle(`${cls.emoji} Class: ${cls.name}!`).setDescription(cls.desc).addFields({name:'Stats',value:`❤️ ${cls.hp} HP | ⚔️ ${cls.atk} ATK | 🛡️ ${cls.def} DEF | 💙 ${cls.mana} Mana`})]});
}

if (cmd==='rpgstats') {
    const cid=userData.rpgClass.get(userId);
    if (!cid) return interaction.reply({content:'❌ Choose a class first! `/chooseclass`',ephemeral:true});
    const cls=RPG_CLASSES[cid];
    const stats=userData.rpgStats.get(userId)||{hp:cls.hp,maxHp:cls.hp,atk:cls.atk,def:cls.def,mana:cls.mana,maxMana:cls.mana};
    const armorId=userData.armorEquipped.get(userId);
    const armor=armorId?ARMOR_SETS.find(a=>a.id===armorId):null;
    const skills=userData.skillsLearned.get(userId)||[];
    const pts=userData.skillPoints.get(userId)||0;
    return interaction.reply({embeds:[new EmbedBuilder().setColor(RARITY_COLORS.Rare).setTitle(`${cls.emoji} ${cls.name} Stats`)
        .addFields(
            {name:'❤️ HP',    value:`${stats.hp}/${stats.maxHp}`,              inline:true},
            {name:'⚔️ ATK',   value:String(stats.atk),                         inline:true},
            {name:'🛡️ DEF',   value:`${stats.def}${armor?` (+${armor.def})`:''}`,inline:true},
            {name:'💙 Mana',  value:`${stats.mana}/${stats.maxMana}`,           inline:true},
            {name:'🏰 Dungeons',value:fmtN(userData.dungeonClears.get(userId)||0),inline:true},
            {name:'🎯 Skill Pts',value:String(pts),                             inline:true},
            {name:'🛡️ Armor', value:armor?`${armor.emoji} ${armor.name}`:'None',inline:true},
            {name:'📚 Skills',value:skills.length?skills.join(', '):'None',    inline:false},
        )
    ]});
}

if (cmd==='skilltree') {
    const cid=userData.rpgClass.get(userId);
    if (!cid) return interaction.reply({content:'❌ Choose a class first!',ephemeral:true});
    const tree=SKILL_TREES[cid]||[];
    const learned=userData.skillsLearned.get(userId)||[];
    const pts=userData.skillPoints.get(userId)||0;
    const lvInfo=getLevelInfo(userData.xp.get(userId)||0);
    const lines=tree.map(s=>{
        const own=learned.includes(s.id);
        const canLearn=lvInfo.level>=s.reqLv&&pts>=s.cost&&!own;
        return `${own?'✅':canLearn?`🔓(${s.cost}pt)`:`🔒Lv${s.reqLv}`} ${s.emoji} **${s.name}** — ${s.desc}`;
    });
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x9C27B0).setTitle(`🌳 ${RPG_CLASSES[cid].name} Skill Tree`).setDescription(lines.join('\n')).setFooter({text:`${pts} skill points available | /learnskill <id>`})]});
}

if (cmd==='learnskill') {
    const sid=interaction.options.getString('skill');
    const cid=userData.rpgClass.get(userId);
    if (!cid) return interaction.reply({content:'❌ Choose a class first!',ephemeral:true});
    const skill=SKILL_TREES[cid]?.find(s=>s.id===sid);
    if (!skill) return interaction.reply({content:`❌ Skill not found for your class. Check \`/skilltree\`.`,ephemeral:true});
    const learned=userData.skillsLearned.get(userId)||[];
    if (learned.includes(sid)) return interaction.reply({content:'❌ Already learned!',ephemeral:true});
    const pts=userData.skillPoints.get(userId)||0;
    const lvInfo=getLevelInfo(userData.xp.get(userId)||0);
    if (lvInfo.level<skill.reqLv) return interaction.reply({content:`❌ Need **Level ${skill.reqLv}**!`,ephemeral:true});
    if (pts<skill.cost) return interaction.reply({content:`❌ Need **${skill.cost}** skill points! You have ${pts}.`,ephemeral:true});
    learned.push(sid); userData.skillsLearned.set(userId,learned);
    userData.skillPoints.set(userId,pts-skill.cost); await saveData();
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle(`📚 Learned: ${skill.emoji} ${skill.name}!`).setDescription(skill.desc)]});
}

if (cmd==='dungeon') {
    const did=interaction.options.getString('dungeon');
    const dung=DUNGEONS.find(d=>d.id===did);
    if (!dung) return interaction.reply({content:'❌ Invalid dungeon.',ephemeral:true});
    const cid=userData.rpgClass.get(userId);
    if (!cid) return interaction.reply({content:'❌ Choose a class first!',ephemeral:true});
    const lvInfo=getLevelInfo(userData.xp.get(userId)||0);
    if (lvInfo.level<dung.minLv) return interaction.reply({content:`❌ Need **Level ${dung.minLv}**!`,ephemeral:true});
    const rem=cooldownManager.get(userId,'dungeon');
    if (rem) return interaction.reply({content:`⏰ Dungeon cooldown: **${cdStr(rem)}**`,ephemeral:true});
    await interaction.deferReply();
    cooldownManager.set(userId,'dungeon',3_600_000);
    const cls=RPG_CLASSES[cid];
    const stats=userData.rpgStats.get(userId)||{hp:cls.hp,maxHp:cls.hp,atk:cls.atk,def:cls.def};
    const armorId=userData.armorEquipped.get(userId);
    const armor=armorId?ARMOR_SETS.find(a=>a.id===armorId):null;
    const skills=userData.skillsLearned.get(userId)||[];
    const pAtk=stats.atk+(skills.includes('power_strike')?10:0)+(skills.includes('warcry')?30:0);
    const pDef=stats.def+(armor?.def||0)+(skills.includes('iron_skin')?8:0)+(skills.includes('fortify')?15:0);
    const pHp=stats.maxHp+(skills.includes('juggernaut')?100:0);
    let curHp=pHp,totalGold=0,totalXp=0;const log=[];let cleared=true;
    for (const eName of dung.enemies) {
        const enemy=ENEMIES[eName];
        if (!enemy) continue;
        let eHp=enemy.hp,round=0;
        while (eHp>0&&curHp>0&&round<100) {
            const crit=skills.includes('backstab')?0.25:skills.includes('berserker')?0.15:0.05;
            const pd=Math.max(1,rng(pAtk,pAtk+15)-Math.floor(enemy.def/2));
            const finalDmg=Math.random()<crit?pd*2:pd;
            const ed=Math.max(1,rng(enemy.atk,enemy.atk+5)-Math.floor(pDef/2));
            eHp-=finalDmg; curHp-=ed; round++;
        }
        if (curHp<=0){cleared=false;log.push(`💀 Defeated by **${eName}**`);break;}
        totalGold+=enemy.gold; totalXp+=enemy.xp;
        log.push(`✅ **${eName}** defeated`);
    }
    stats.hp=Math.max(1,curHp); userData.rpgStats.set(userId,stats);
    if (cleared) {
        totalGold+=dung.reward; totalXp+=dung.xp;
        addCoins(userId,totalGold); addXP(userId,totalXp);
        const clears=(userData.dungeonClears.get(userId)||0)+1;
        userData.dungeonClears.set(userId,clears);
        checkAchievementGeneral(userId,'dungeon',clears);
        const mats=userData.craftMats.get(userId)||{};
        const drop=CRAFT_MATS.filter(m=>m.src==='dungeon');
        if (drop.length){const m=drop[rng(0,drop.length-1)];mats[m.id]=(mats[m.id]||0)+rng(1,3);userData.craftMats.set(userId,mats);}
        await saveData();
        return interaction.editReply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle(`🎉 ${dung.emoji} ${dung.name} Cleared!`)
            .setDescription(log.slice(-4).join('\n'))
            .addFields({name:'💰 Gold',value:fmtN(totalGold),inline:true},{name:'⭐ XP',value:fmtN(totalXp),inline:true},{name:'❤️ HP Left',value:`${Math.max(1,curHp)}/${pHp}`,inline:true})
        ]});
    } else {
        await saveData();
        return interaction.editReply({embeds:[new EmbedBuilder().setColor(0xF44336).setTitle(`💀 ${dung.name} Failed`)
            .setDescription(log.slice(-3).join('\n'))
            .addFields({name:'Result',value:'Defeated. Try better armor/skills!'})
        ]});
    }
}

if (cmd==='buyarmor') {
    const aid=interaction.options.getString('armor');
    const armor=ARMOR_SETS.find(a=>a.id===aid);
    if (!armor) return interaction.reply({content:'❌ Invalid armor.',ephemeral:true});
    if (coins(userId)<armor.price) return interaction.reply({content:`❌ Need **${fmtN(armor.price)}** coins!`,ephemeral:true});
    addCoins(userId,-armor.price); userData.armorEquipped.set(userId,aid);
    await saveData();
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle(`${armor.emoji} Armor Equipped!`).setDescription(`**${armor.name}**\nDEF:+${armor.def} | ${armor.bonus}`)]});
}

if (cmd==='craftingrecipes') {
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFF9800).setTitle('Crafting Materials').setDescription('Gather materials with /gathermaterials or /mine.').addFields({name:'Materials',value:CRAFT_MATS.map(m=>m.emoji+' **'+m.name+'** - from: '+m.src).join('\n')})]});
}

if (cmd==='craftstats') {
    const mats=userData.craftMats.get(userId)||{};
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFF9800).setTitle('Your Materials').setDescription(CRAFT_MATS.map(m=>m.emoji+' **'+m.name+'**: '+(mats[m.id]||0)).join('\n'))]});
}
if (cmd==='gathermaterials') {
    const rem=cooldownManager.get(userId,'gather');
    if (rem) return interaction.reply({content:'⏰ Gather cooldown: **'+cdStr(rem)+'**',ephemeral:true});
    cooldownManager.set(userId,'gather',1_800_000);
    const pool=CRAFT_MATS.filter(m=>m.src!=='dungeon');
    const mat=pool[rng(0,pool.length-1)],qty=rng(1,5);
    const mats=userData.craftMats.get(userId)||{};
    mats[mat.id]=(mats[mat.id]||0)+qty; userData.craftMats.set(userId,mats);
    addXP(userId,20); await saveData();
    return interaction.reply({content:'⛏️ Gathered **'+qty+'x '+mat.emoji+' '+mat.name+'**!'});
}

        } catch(cmdErr) {
            console.error('❌ /'+cmd+' error:', cmdErr?.message, cmdErr?.stack?.split('\n')[0]);
            try {
                const errMsg='❌ **Error in /'+cmd+':** '+(cmdErr?.message||'Unknown error')+'\nIf this keeps happening, contact the bot owner.';
                if (!interaction.replied&&!interaction.deferred)
                    await interaction.reply({content:errMsg,ephemeral:true});
                else if (interaction.deferred)
                    await interaction.editReply({content:errMsg});
            } catch(_) {}
        }
    } catch(mainErr) { console.error('❌ Interaction handler error:', mainErr?.message); }
});


  // ════════════════════════════════════════════════════════════════
// ♦️ BUTTON INTERACTION HANDLER
// ════════════════════════════════════════════════════════════════
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    const {customId, user} = interaction;
    const userId = String(user.id);
    try {

        // ── Blackjack ──
        if (customId.startsWith('bj_hit_')||customId.startsWith('bj_stand_')) {
            const owner=customId.split('_')[2];
            if (userId!==owner) return interaction.reply({content:'❌ Not your game!',ephemeral:true});
            const game=bjGames.get(userId);
            if (!game||!game.active) return interaction.reply({content:'❌ No active game!',ephemeral:true});
            if (customId.startsWith('bj_hit_')) {
                game.ph.push(drawCard());
                const pv=handVal(game.ph);
                if (pv>21) {
                    bjGames.delete(userId); await saveData();
                    return interaction.update({embeds:[new EmbedBuilder().setColor(0xF44336).setTitle('Bust!').setDescription('Hand: '+game.ph.join(' ')+' = **'+pv+'**\nLost **'+fmtN(game.bet)+' coins**.')],components:[]});
                }
                const row=new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('bj_hit_'+userId).setLabel('Hit').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('bj_stand_'+userId).setLabel('Stand').setStyle(ButtonStyle.Danger),
                );
                return interaction.update({embeds:[new EmbedBuilder().setColor(0x2196F3).setTitle('Blackjack')
                    .addFields({name:'Your Hand',value:game.ph.join(' ')+' = **'+pv+'**',inline:true},{name:'Dealer',value:game.dh[0]+' + ?',inline:true})
                ],components:[row]});
            } else {
                while (handVal(game.dh)<17) game.dh.push(drawCard());
                const pv=handVal(game.ph),dv=handVal(game.dh);
                bjGames.delete(userId);
                let result,color,payout=0;
                if (dv>21||pv>dv){payout=game.bet*2;result='You win! +**'+fmtN(game.bet)+' coins**';color=0x57F287;}
                else if (pv===dv){payout=game.bet;result='Push! Bet returned.';color=0xFEE75C;}
                else{result='Dealer wins. Lost **'+fmtN(game.bet)+' coins**.';color=0xF44336;}
                addCoins(userId,payout); await saveData();
                return interaction.update({embeds:[new EmbedBuilder().setColor(color).setTitle('Blackjack Result')
                    .addFields(
                        {name:'Your Hand',value:game.ph.join(' ')+' = **'+pv+'**',inline:true},
                        {name:'Dealer',value:game.dh.join(' ')+' = **'+dv+'**',inline:true},
                        {name:'Result',value:result},
                    )
                ],components:[]});
            }
        }

        // ── FNF arrow buttons ──
        if (customId.startsWith('fnf_')) {
            const parts=customId.split('_');
            const gameId=parts[1]+'_'+parts[2];
            const arrow=parts.slice(3).join('_');
            const game=fnfGames.get(userId);
            if (!game||game.gameId!==gameId) return interaction.reply({content:'❌ Not your game!',ephemeral:true});
            clearTimeout(game.arrowTimeout);
            const expected=game.sequence[game.currentIndex];
            if (arrow===expected) {
                game.hits++; game.score+=100;
                await interaction.deferUpdate().catch(()=>{});
                game.currentIndex++;
                if (game.currentIndex>=game.sequence.length) await fnfEndGame(interaction,game,true);
                else await fnfNextArrow(interaction,game);
            } else {
                await interaction.deferUpdate().catch(()=>{});
                await fnfHandleMiss(interaction,game,'wrong');
            }
            return;
        }

        // ── Tic Tac Toe ──
        if (customId.startsWith('ttt_')) {
            const parts=customId.split('_');
            const gameKey=parts[1];
            const idx=parseInt(parts[2]);
            const game=tttGames.get(gameKey);
            if (!game) return interaction.reply({content:'❌ Game expired.',ephemeral:true});
            if (userId!==game.turn) return interaction.reply({content:'❌ Not your turn!',ephemeral:true});
            const mark=userId===game.p1?'❌':'⭕';
            if (game.board[idx]) return interaction.reply({content:'❌ Already taken!',ephemeral:true});
            game.board[idx]=mark;
            if (checkTTTWin(game.board,mark)) {
                tttGames.delete(gameKey);
                addCoins(userId,500); addXP(userId,100); await saveData();
                const rows=buildTTTRows(game.board,game.p1,game.p2,gameKey);
                rows.forEach(r=>r.components.forEach(b=>b.setDisabled(true)));
                return interaction.update({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle(`🎉 ${mark} Wins!`).setDescription(`**${interaction.user.username}** wins! +500 coins`)],components:rows});
            }
            if (game.board.every(c=>c)) {
                tttGames.delete(gameKey);
                const rows=buildTTTRows(game.board,game.p1,game.p2,gameKey);
                rows.forEach(r=>r.components.forEach(b=>b.setDisabled(true)));
                return interaction.update({embeds:[new EmbedBuilder().setColor(0x9E9E9E).setTitle("🤝 It's a Draw!")],components:rows});
            }
            game.turn=userId===game.p1?game.p2:game.p1;
            const nextUser=await client.users.fetch(game.turn).catch(()=>null);
            const rows=buildTTTRows(game.board,game.p1,game.p2,gameKey);
            return interaction.update({embeds:[new EmbedBuilder().setColor(0x2196F3).setTitle('❌⭕ Tic Tac Toe')
                .setDescription(`_${nextUser?.username||'Next player'}'s turn_`)
            ],components:rows});
  }
                // ── Connect 4 ──
        if (customId.startsWith('c4_')) {
            const parts=customId.split('_');
            const gameKey=parts[1];
            const col=parseInt(parts[2]);
            const game=c4Games.get(gameKey);
            if (!game) return interaction.reply({content:'❌ Game expired.',ephemeral:true});
            if (userId!==game.turn) return interaction.reply({content:'❌ Not your turn!',ephemeral:true});
            const playerNum=userId===game.p1?1:2;
            // Drop piece
            let placed=false;
            for (let r=5;r>=0;r--) {
                if (game.board[r][col]===0) {
                    game.board[r][col]=playerNum;
                    placed=true; break;
                }
            }
            if (!placed) return interaction.reply({content:'❌ Column full!',ephemeral:true});
            if (checkC4Win(game.board,playerNum)) {
                c4Games.delete(gameKey);
                addCoins(userId,600); addXP(userId,120); await saveData();
                const emoji=playerNum===1?'🔴':'🟡';
                return interaction.update({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle(`🎉 ${emoji} Wins!`)
                    .setDescription(`${renderC4(game.board)}\n**${interaction.user.username}** wins! +600 coins`)
                ],components:[]});
            }
            if (game.board[0].every(c=>c!==0)) {
                c4Games.delete(gameKey);
                return interaction.update({embeds:[new EmbedBuilder().setColor(0x9E9E9E).setTitle("🤝 Draw!").setDescription(renderC4(game.board))],components:[]});
            }
            game.turn=userId===game.p1?game.p2:game.p1;
            const nextEmoji=game.turn===game.p1?'🔴':'🟡';
            const nextUser=await client.users.fetch(game.turn).catch(()=>null);
            return interaction.update({embeds:[new EmbedBuilder().setColor(0xFFD700).setTitle('🟡 Connect 4')
                .setDescription(`${renderC4(game.board)}\n_${nextUser?.username||'Next'}'s turn_ ${nextEmoji}`)
            ],components:[buildC4Row(game.p1,game.p2,gameKey)]});
        }

        // ── Higher or Lower ──
        if (customId.startsWith('hl_')) {
            const parts=customId.split('_');
            const owner=parts[1];
            if (userId!==owner) return interaction.reply({content:'❌ Not your game!',ephemeral:true});
            const choice=parts[2];
            const nextVal=parseInt(parts[3]);
            const curVal=parseInt(parts[4]);
            const correct=(choice==='higher'&&nextVal>curVal)||(choice==='lower'&&nextVal<curVal);
            if (correct){addCoins(userId,300);await saveData();}
            return interaction.update({embeds:[new EmbedBuilder().setColor(correct?0x57F287:0xF44336)
                .setTitle(correct?'✅ Correct! +300 coins!':'❌ Wrong!')
                .setDescription(`The answer: **${fmtN(nextVal)}** (${nextVal>curVal?'Higher':'Lower'} than ${fmtN(curVal)})`)
            ],components:[]});
                  }
      // ── Suggestion approve/deny (staff only) ──
        if (customId.startsWith('sug_approve_')||customId.startsWith('sug_deny_')) {
            const guildId=String(interaction.guildId||'');
            const isOwner=userId===OWNER_ID;
            const isStaff=staffSet.has(`${guildId}:${userId}`)||staffSet.has(userId)||isOwner
                ||!!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers);
            if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
            const approved=customId.startsWith('sug_approve_');
            const embed=EmbedBuilder.from(interaction.message.embeds[0])
                .setColor(approved?0x57F287:0xF44336)
                .spliceFields(1,1,{name:'Status',value:approved?`✅ Approved by ${interaction.user.username}`:`❌ Denied by ${interaction.user.username}`,inline:true});
            return interaction.update({embeds:[embed],components:[]});
        }

        // ── Open ticket ──
        if (customId==='open_ticket') {
            try {
                const name=`ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,20)}-${Date.now().toString().slice(-4)}`;
                const channel=await interaction.guild.channels.create({
                    name,
                    type:ChannelType.GuildText,
                    permissionOverwrites:[
                        {id:interaction.guild.id,deny:[PermissionFlagsBits.ViewChannel]},
                        {id:user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},
                    ],
                });
                const closeRow=new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger)
                );
                await channel.send({
                    embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle('🎫 Support Ticket').setDescription(`Welcome ${user}! Describe your issue and staff will assist you.`)],
                    components:[closeRow],
                });
                return interaction.reply({content:`✅ Ticket opened: ${channel}`,ephemeral:true});
            } catch(e) {
                return interaction.reply({content:'❌ Failed to create ticket. Check bot permissions.',ephemeral:true});
            }
        }

        // ── Reset user confirm/cancel ──
        if (customId.startsWith('resetuser_confirm_')) {
            const parts=customId.split('_');
            const targetId=parts[2];
            const requesterId=parts[3];
            if (userId!==requesterId) return interaction.reply({content:'❌ Not your action!',ephemeral:true});
            if (userId!==OWNER_ID) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
            // Wipe everything
            userData.coins.set(targetId,0);
            userData.bank.set(targetId,0);
            userData.xp.set(targetId,0);
            userData.weapons.set(targetId,[]);
            userData.items.set(targetId,[]);
            userData.pets.delete(targetId);
            userData.fishInv.set(targetId,[]);
            userData.fishCaught.set(targetId,{});
            userData.fishStats.set(targetId,{total:0,totalVal:0,biggest:0,biggestName:''});
            userData.fishStreak.set(targetId,{streak:0,lastDay:''});
            userData.rodOwned.set(targetId,[]);
            userData.rodEquipped.set(targetId,'plastic');
            userData.rodEnchants.set(targetId,[]);
            userData.baitInv.set(targetId,{});
            userData.warnings.set(targetId,[]);
            userData.achievements.set(targetId,[]);
            userData.achievementsNew.set(targetId,[]);
            userData.titlesOwned.set(targetId,[]);
            userData.titleActive.set(targetId,'newbie');
            userData.skillPoints.set(targetId,0);
            userData.skillsLearned.set(targetId,[]);
            userData.rpgClass.delete(targetId);
            userData.rpgStats.delete(targetId);
            userData.armorEquipped.delete(targetId);
            userData.dungeonClears.set(targetId,0);
            userData.craftMats.set(targetId,{});
            userData.prestige.set(targetId,{level:0});
            userData.battlePass.set(targetId,{tier:1,bpXp:0,premium:false,season:SEASON});
            userData.loginStreak.set(targetId,{streak:0,lastLogin:''});
            userData.married.delete(targetId);
            userData.rep.set(targetId,0);
            userData.pvpWins.set(targetId,0);
            // Remove from guild
            const gid=userData.guildOf.get(targetId);
            if (gid){const g=userData.guilds.get(gid);if(g)g.members=g.members.filter(m=>m!==targetId);userData.guildOf.delete(targetId);}
            await saveData();
            const cached=client.users.cache.get(targetId);
            return interaction.update({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle('✅ User Fully Reset').setDescription(`All data for **${cached?.username||targetId}** has been wiped.`)],components:[]});
        }
        if (customId.startsWith('resetuser_cancel_')) {
            return interaction.update({embeds:[new EmbedBuilder().setColor(0x9E9E9E).setTitle('❌ Reset Cancelled').setDescription('No data was changed.')],components:[]});
        }

        // ── Close ticket ──
        if (customId==='close_ticket') {
            await interaction.reply({content:'🔒 Closing ticket in 5 seconds...'});
            setTimeout(()=>interaction.channel.delete().catch(()=>{}),5000);
        }

    } catch(e) {
        console.error('❌ Button error:', e?.message);
        interaction.reply({content:'❌ Button error! Try again.',ephemeral:true}).catch(()=>{});
    }
});

// ════════════════════════════════════════════════════════════════
// ♦️ SELECT MENU HANDLER (trivia handled via collector above)
// ════════════════════════════════════════════════════════════════
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    // Trivia is handled by the collector in the trivia command
});

// ════════════════════════════════════════════════════════════════
// ♦️ MESSAGE HANDLER — XP, auto-responses, hangman, prefix cmds
// ════════════════════════════════════════════════════════════════
client.on('messageCreate', async message => {
    try {
        if (message.author.bot) return;
        const userId = String(message.author.id);
        const content = message.content;
        const lower   = content.toLowerCase();
        const guildId = String(message.guildId||'');
        ensureJoinDate(userId);

        // ── XP on message (cooldown 10s) ──
        if (!cooldownManager.has(userId,'msg_xp')) {
            const res=addXP(userId,5);
            cooldownManager.set(userId,'msg_xp',10_000);
            if (res.leveledUp) {
                checkAchievementGeneral(userId,'level',res.newLevel);
                const lvlCfg = levelAnnounceConfig[String(message.guildId||'')];
                const lvlMsg = new EmbedBuilder()
                    .setColor(0xFFD700)
                    .setTitle('🎉 Level Up!')
                    .setDescription(`**${message.author.username}** reached **Level ${res.newLevel}**!`)
                    .addFields(
                        {name:'⭐ New Level', value:String(res.newLevel), inline:true},
                        {name:'💡 Tip', value:res.newLevel%5===0?`You earned a skill point! Use \`/skilltree\`.`:'Keep chatting and fishing!', inline:true},
                    )
                    .setThumbnail(message.author.displayAvatarURL())
                    .setTimestamp();
                if (lvlCfg?.channelId) {
                    const annCh = message.guild?.channels.cache.get(lvlCfg.channelId);
                    if (annCh) annCh.send({embeds:[lvlMsg]}).catch(()=>{});
                    else message.channel.send({embeds:[lvlMsg]}).catch(()=>{});
                } else {
                    message.channel.send({embeds:[lvlMsg]}).catch(()=>{});
                }
                checkAchievementGeneral(userId,'level',res.newLevel);
            }
            // Battle pass XP
            const bp=userData.battlePass.get(userId)||{tier:1,bpXp:0,premium:false,season:SEASON};
            bp.bpXp=(bp.bpXp||0)+1;
            const nextTier=BP_TIERS.find(t=>t.tier===bp.tier+1);
            if (nextTier&&bp.bpXp>=nextTier.bpXp&&bp.tier<10){bp.tier++;}
            userData.battlePass.set(userId,bp);
            await saveData();
        }

        // ── Auto-responses ──
        for (const [trigger,response] of autoResponses) {
            if (lower.includes(trigger.toLowerCase())) {
                message.reply(response).catch(()=>{});
                break;
            }
        }

        // ── Hangman guesses ──
        if (hangGames.has(userId)&&content.length===1&&/^[a-zA-Z]$/.test(content)) {
            const game=hangGames.get(userId);
            const letter=content.toLowerCase();
            if (!game.guessed.includes(letter)) {
                game.guessed.push(letter);
                if (!game.word.includes(letter)) game.wrong++;
            }
            const disp=game.word.split('').map(l=>game.guessed.includes(l)?l:'_').join(' ');
            const won=!disp.includes('_');
            const lost=game.wrong>=6;
            const hangFrames=['```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========```','```\n  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========```','```\n  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========```','```\n  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========```','```\n  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========```','```\n  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========```','```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========```'];
            const embed=new EmbedBuilder()
                .setColor(won?0x57F287:lost?0xF44336:0x9C27B0)
                .setTitle('🔤 Hangman')
                .setDescription(`${hangFrames[game.wrong]}\n\nWord: \`${disp}\`\nGuessed: ${game.guessed.join(', ')||'none'}\nWrong: ${game.wrong}/6`);
            if (won){embed.addFields({name:'🎉 You Win!',value:`Word was **${game.word}**! +400 coins`});addCoins(userId,400);addXP(userId,80);hangGames.delete(userId);await saveData();}
            else if (lost){embed.addFields({name:'💀 Game Over!',value:`Word was **${game.word}**`});hangGames.delete(userId);}
            message.reply({embeds:[embed]}).catch(()=>{});
            return;
        }

        // ── PREFIX COMMANDS ──
        const prefix='!';
        if (!content.startsWith(prefix)) return;
        const args=content.slice(prefix.length).trim().split(/\s+/);
        const cmd=args[0].toLowerCase();
        const rest=args.slice(1).join(' ');

        // ── Fun / Troll commands (obviously fake, no real actions) ──
        if (cmd==='fakeban') {
            const target=message.mentions.users.first();
            const reason=args.slice(2).join(' ')||'No reason';
            return message.channel.send(`🔨 **[FAKE]** ${target?target.username:'User'} has been banned for: *${reason}*\n*(This is not a real ban — just for laughs!)*`).catch(()=>{});
        }
        if (cmd==='fakekick') {
            const target=message.mentions.users.first();
            return message.channel.send(`👢 **[FAKE]** ${target?target.username:'User'} was kicked from the server!\n*(Totally fake, chill!)*`).catch(()=>{});
        }
        if (cmd==='fakemute') {
            const target=message.mentions.users.first();
            return message.channel.send(`🤐 **[FAKE]** ${target?target.username:'User'} has been muted for 69 years!\n*(Not real — no permissions were harmed.)*`).catch(()=>{});
        }
        if (cmd==='fakewarn') {
            const target=message.mentions.users.first();
            const reason=args.slice(2).join(' ')||'existing';
            return message.channel.send(`⚠️ **[FAKE WARNING]** ${target?target.username:'User'} warned for: *${reason}*\n*(This does absolutely nothing.)*`).catch(()=>{});
        }
        if (cmd==='roast') {
            const target=message.mentions.users.first();
            const roasts=[
                `${target?target.username:'You'} is so slow, even dial-up modems feel sorry for them.`,
                `${target?target.username:'You'}'s brain cells are on a strict no-thinking diet.`,
                `${target?target.username:'You'} brings everyone so much joy — by leaving the room.`,
                `I'd roast ${target?target.username:'you'} but my mom told me not to burn trash.`,
                `${target?target.username:'You'} is proof that even evolution makes mistakes sometimes.`,
                `${target?target.username:'You'}'s wifi password is probably "password123".`,
            ];
            return message.reply(roasts[rng(0,roasts.length-1)]).catch(()=>{});
        }
        if (cmd==='ship') {
            const users=message.mentions.users;
            const names=users.size>=2?[...users.values()].slice(0,2).map(u=>u.username):[message.author.username, rest.split(' ')[0]||'Mystery Person'];
            const pct=rng(1,100);
            const bar='❤️'.repeat(Math.floor(pct/10))+'🖤'.repeat(10-Math.floor(pct/10));
            return message.reply(`💕 **${names[0]}** + **${names[1]}**\n${bar} **${pct}%** compatibility!`).catch(()=>{});
        }
        if (cmd==='rate') {
            const thing=rest||message.mentions.users.first()?.username||'that';
            return message.reply(`📊 I rate **${thing}** a solid **${rng(0,10)}/10** ✨`).catch(()=>{});
        }
        if (cmd==='mock') {
            if (!rest) return message.reply('❌ Provide text to mock!').catch(()=>{});
            const mocked=rest.split('').map((c,i)=>i%2===0?c.toLowerCase():c.toUpperCase()).join('');
            return message.reply(`🗣️ ${mocked}`).catch(()=>{});
        }
        if (cmd==='reverse') {
            if (!rest) return message.reply('❌ Provide text to reverse!').catch(()=>{});
            return message.reply(rest.split('').reverse().join('')).catch(()=>{});
        }
        if (cmd==='sus') {
            const target=message.mentions.users.first()?.username||rest||message.author.username;
            return message.reply(`📯 **${target}** is acting kinda sus... 🔴 *emergency meeting*`).catch(()=>{});
        }
        if (cmd==='8ball') {
            const answers=['Yes!','No.','Definitely!','Ask again later.','Absolutely!','Highly unlikely.','Signs point to yes.',"Don't count on it.",'Outlook good!','Very doubtful.','It is certain.','My sources say no.'];
            return message.reply(`🎱 ${answers[rng(0,answers.length-1)]}`).catch(()=>{});
        }
        if (cmd==='rickroll') {
            return message.reply('https://www.youtube.com/watch?v=dQw4w9WgXcQ\n*Never gonna give you up... 🎵*').catch(()=>{});
        }
        if (cmd==='fact') {
            const facts=[
                'A group of flamingos is called a flamboyance. 🦩',
                'Honey never expires. Archaeologists found 3000-year-old honey in Egyptian tombs. 🍯',
                "Octopuses have three hearts and blue blood. 🐙",
                'Bananas are slightly radioactive. 🍌',
                'A day on Venus is longer than a year on Venus. 🪐',
                'Sharks are older than trees. 🦈',
                'The Eiffel Tower grows 6 inches taller in summer due to heat. 🗼',
            ];
            return message.reply(`💡 **Fun Fact:** ${facts[rng(0,facts.length-1)]}`).catch(()=>{});
        }
        if (cmd==='joke') {
            const jokes=[
                "Why don't scientists trust atoms? Because they make up everything!",
                "Why did the scarecrow win an award? He was outstanding in his field!",
                "I'm reading a book about anti-gravity. It's impossible to put down.",
                "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them!",
                "Why did the bicycle fall over? Because it was two-tired!",
                "What do you call a fake noodle? An impasta!",
            ];
            return message.reply(`😂 ${jokes[rng(0,jokes.length-1)]}`).catch(()=>{});
        }
        if (cmd==='impersonate'||cmd==='say') {
            if (!rest) return message.reply('❌ Provide text!').catch(()=>{});
            message.delete().catch(()=>{});
            return message.channel.send(rest).catch(()=>{});
        }
        if (cmd==='coinflip') {
            return message.reply(`🪙 ${Math.random()<0.5?'Heads!':'Tails!'}`).catch(()=>{});
        }
        if (cmd==='animequote') {
            const quotes=[
                '"It\'s not the face that makes someone a monster, it\'s the choices they make." — Naruto',
                '"Whatever you lose, you\'ll find it again. But what you throw away you\'ll never get back." — FMA',
                '"Fear is not evil. It tells you what your weakness is." — Fairy Tail',
                '"The world is not beautiful, therefore it is." — Kino\'s Journey',
                '"If you don\'t take risks, you can\'t create a future." — One Piece',
            ];
            return message.reply(`📖 ${quotes[rng(0,quotes.length-1)]}`).catch(()=>{});
        }
        if (cmd==='waifu') {
            const waifus=['Zero Two 💗','Rem 💙','Asuna ⚔️','Mikasa 🗡️','Nezuko 🎋','Hinata 💜','Tohru 🐉','Megumin 💥'];
            return message.reply(`Your waifu is: **${waifus[rng(0,waifus.length-1)]}**`).catch(()=>{});
        }
        if (cmd==='husbando') {
            const husbandos=['Levi Ackerman 🗡️','Kakashi 🍃','Gojo Satoru 🔵','Itachi 👁️','Todoroki 🔥❄️','Killua ⚡','Yato ☁️','Hisoka 🃏'];
            return message.reply(`Your husbando is: **${husbandos[rng(0,husbandos.length-1)]}**`).catch(()=>{});
        }
        if (cmd==='meme') {
            const memes=['https://i.imgur.com/example.jpg','This meme machine is temporarily out of memes. Try `/fish` instead! 🎣'];
            return message.reply('😂 Meme: https://memegen.link/buzz/when_you_fish_a_secret_fish/the_whole_server_goes_crazy.jpg').catch(()=>{});
                }

  
        // ════════════════════════════════════════════════════════
        // OWNER/ADMIN PREFIX COMMANDS (converted from slash)
        // Use: !command
        // ════════════════════════════════════════════════════════
        const isOwnerMsg  = userId === OWNER_ID;
        const guildIdMsg  = String(message.guildId||'');
        const isStaffMsg  = staffSet.has(guildIdMsg+':'+userId) || staffSet.has(userId) || isOwnerMsg
            || !!message.member?.permissions?.has(PermissionFlagsBits.ModerateMembers);

        if (cmd==='deletestaff') {
            if (!isStaffMsg) return message.reply('❌ Staff only!').catch(()=>{});
            const target=message.mentions.users.first();
            if (!target) return message.reply('❌ Usage: !deletestaff @user').catch(()=>{});
            staffSet.delete(guildIdMsg+':'+String(target.id));
            await saveData();
            return message.reply('✅ Removed **'+target.username+'** from staff.').catch(()=>{});
        }
        if (cmd==='deletelogs') {
            if (!isStaffMsg) return message.reply('❌ Staff only!').catch(()=>{});
            delete logsConfig[guildIdMsg]; await saveData();
            return message.reply('✅ Mod-logs disabled for this server.').catch(()=>{});
        }
        if (cmd==='deletewelcome') {
            if (!isStaffMsg) return message.reply('❌ Staff only!').catch(()=>{});
            delete welcomeConfig[guildIdMsg]; await saveData();
            return message.reply('✅ Welcome system disabled.').catch(()=>{});
        }
        if (cmd==='deletetickets') {
            if (!isStaffMsg) return message.reply('❌ Staff only!').catch(()=>{});
            delete ticketConfig[guildIdMsg]; await saveData();
            return message.reply('✅ Ticket system disabled.').catch(()=>{});
        }
        if (cmd==='deletesuggestions') {
            if (!isStaffMsg) return message.reply('❌ Staff only!').catch(()=>{});
            delete suggestionConfig[guildIdMsg]; await saveData();
            return message.reply('✅ Suggestions disabled.').catch(()=>{});
        }
        if (cmd==='deletewarnings') {
            if (!isStaffMsg) return message.reply('❌ Staff only!').catch(()=>{});
            const target=message.mentions.users.first();
            if (!target) return message.reply('❌ Usage: !deletewarnings @user').catch(()=>{});
            const count=(userData.warnings.get(String(target.id))||[]).length;
            userData.warnings.set(String(target.id),[]); await saveData();
            return message.reply('✅ Cleared **'+count+'** warning(s) from **'+target.username+'**.').catch(()=>{});
        }
        if (cmd==='listresponses') {
            if (!isStaffMsg) return message.reply('❌ Staff only!').catch(()=>{});
            if (!autoResponses.size) return message.reply('📋 No auto-responses set.').catch(()=>{});
            const lines=[...autoResponses.entries()].map(([k,v])=>'"'+k+'" -> '+(v.length>60?v.slice(0,60)+'...':v));
            const respSep='\n'; return message.reply('\xf0\x9f\x93\x8b **Auto-Responses ('+autoResponses.size+'):**'+respSep+lines.join(respSep)+respSep+'Remove: !deleteresponse <trigger> | Clear: !clearresponses').catch(()=>{});
        }
        if (cmd==='deletelevel') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first();
            if (!target) return message.reply('❌ Usage: !deletelevel @user').catch(()=>{});
            const tid=String(target.id);
            const before=getLevelInfo(userData.xp.get(tid)||0).level;
            userData.xp.set(tid,0); userData.skillPoints.set(tid,0); userData.skillsLearned.set(tid,[]);
            await saveData();
            return message.reply('✅ Reset **'+target.username+'** from Level **'+before+'** to Level **0**.').catch(()=>{});
        }
        if (cmd==='deleteresponse') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const trigger=args.slice(1).join(' ').toLowerCase();
            if (!trigger) return message.reply('❌ Usage: !deleteresponse <trigger>').catch(()=>{});
            if (!autoResponses.has(trigger)) return message.reply('❌ No auto-response for: "'+trigger+'"').catch(()=>{});
            autoResponses.delete(trigger); await saveData();
            return message.reply('✅ Removed auto-response for: "'+trigger+'"').catch(()=>{});
        }
        if (cmd==='clearresponses') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const count=autoResponses.size; autoResponses.clear(); await saveData();
            return message.reply('✅ Cleared all **'+count+'** auto-response(s).').catch(()=>{});
        }
        if (cmd==='deletepet') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first();
            if (!target) return message.reply('❌ Usage: !deletepet @user').catch(()=>{});
            const pet=userData.pets.get(String(target.id));
            if (!pet) return message.reply('❌ **'+target.username+'** has no pet.').catch(()=>{});
            userData.pets.delete(String(target.id)); await saveData();
            return message.reply('✅ Removed **'+(pet.name||'pet')+'** from **'+target.username+'**.').catch(()=>{});
        }
        if (cmd==='deleterod') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first();
            if (!target) return message.reply('❌ Usage: !deleterod @user').catch(()=>{});
            const tid=String(target.id);
            userData.rodEquipped.set(tid,'plastic'); userData.rodOwned.set(tid,[]); userData.rodEnchants.set(tid,[]);
            await saveData();
            return message.reply('✅ Reset **'+target.username+"'s** rod to Plastic Rod.").catch(()=>{});
        }
        if (cmd==='deleteguild') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const gname=args.slice(1).join(' ').toLowerCase();
            if (!gname) return message.reply('❌ Usage: !deleteguild <name>').catch(()=>{});
            let fId=null,fG=null;
            for (const [gid,g] of userData.guilds){if(g.name.toLowerCase()===gname){fId=gid;fG=g;break;}}
            if (!fG) return message.reply('❌ Guild "'+gname+'" not found.').catch(()=>{});
            for (const mId of fG.members){if(userData.guildOf.get(mId)===fId)userData.guildOf.delete(mId);}
            userData.guilds.delete(fId); await saveData();
            return message.reply('✅ Disbanded **'+fG.name+'** ('+fG.members.length+' members removed).').catch(()=>{});
        }
        if (cmd==='deletemarketlisting') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const lid=args[1];
            if (!lid) return message.reply('❌ Usage: !deletemarketlisting <id>').catch(()=>{});
            if (!userData.marketplace.has(lid)) return message.reply('❌ Listing not found!').catch(()=>{});
            userData.marketplace.delete(lid); await saveData();
            return message.reply('✅ Removed listing `'+lid+'`.').catch(()=>{});
        }
        if (cmd==='deleteinventory') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first();
            const type=args[2]||'all';
            if (!target) return message.reply('❌ Usage: !deleteinventory @user [weapons|items|fish|bait|all]').catch(()=>{});
            const tid=String(target.id); const cleared=[];
            if (type==='weapons'||type==='all'){userData.weapons.set(tid,[]);cleared.push('weapons');}
            if (type==='items'  ||type==='all'){userData.items.set(tid,[]);cleared.push('items');}
            if (type==='fish'   ||type==='all'){userData.fishInv.set(tid,[]);userData.fishCaught.set(tid,{});userData.fishStats.set(tid,{total:0,totalVal:0,biggest:0,biggestName:''});cleared.push('fish');}
            if (type==='bait'   ||type==='all'){userData.baitInv.set(tid,{});cleared.push('bait');}
            await saveData();
            return message.reply('✅ Cleared **'+cleared.join(', ')+'** for **'+target.username+'**.').catch(()=>{});
        }
        if (cmd==='deletexp') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first();
            const amount=parseInt(args[2])||0;
            if (!target) return message.reply('❌ Usage: !deletexp @user [amount]').catch(()=>{});
            const tid=String(target.id);
            const before=getLevelInfo(userData.xp.get(tid)||0);
            const newXp=amount?Math.max(0,(userData.xp.get(tid)||0)-amount):0;
            userData.xp.set(tid,newXp);
            const after=getLevelInfo(newXp);
            await saveData();
            return message.reply('✅ '+(amount?'Removed '+fmtN(amount)+' XP':'Reset XP')+' from **'+target.username+'**. Level: **'+before.level+'** → **'+after.level+'**').catch(()=>{});
        }
        if (cmd==='deletemoney') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first();
            if (!target) return message.reply('❌ Usage: !deletemoney @user').catch(()=>{});
            userData.coins.set(String(target.id),0); userData.bank.set(String(target.id),0);
            await saveData();
            return message.reply('✅ Reset all money for **'+target.username+'**.').catch(()=>{});
        }
        if (cmd==='gathermaterials') {
            const rem=cooldownManager.get(userId,'gather');
            if (rem) return message.reply('⏰ Gather cooldown: **'+cdStr(rem)+'**').catch(()=>{});
            cooldownManager.set(userId,'gather',1_800_000);
            const pool=CRAFT_MATS.filter(m=>m.src!=='dungeon');
            const mat=pool[rng(0,pool.length-1)],qty=rng(1,5);
            const mats=userData.craftMats.get(userId)||{};
            mats[mat.id]=(mats[mat.id]||0)+qty; userData.craftMats.set(userId,mats);
            addXP(userId,20); await saveData();
            return message.reply('⛏️ Gathered **'+qty+'x '+mat.emoji+' '+mat.name+'**!').catch(()=>{});
        }
        if (cmd==='craftingrecipes') {
            return message.reply('🔨 **Crafting Materials:** '+CRAFT_MATS.map(m=>m.emoji+' **'+m.name+'** — from: '+m.src).join(' ')+' Gather with !gathermaterials or /mine').catch(()=>{});
        }
        if (cmd==='craftstats') {
            const mats=userData.craftMats.get(userId)||{};
            return message.reply('📦 **Your Materials:** '+CRAFT_MATS.map(m=>m.emoji+' **'+m.name+'**: '+(mats[m.id]||0)).join(' ')).catch(()=>{});
        }
        if (cmd==='scyllakey') {
            const caught=userData.fishCaught.get(userId)||{};
            const hasKey=(userData.completedQuests.get(userId)||[]).includes('scylla_key');
            return message.reply('👑 **Scylla Key** '+(hasKey?'✅ You have it!':'❌ Not crafted.')+' 👑 Crowned Angler Fish: '+((caught['crowned_anglerfish']||0)>0?'✅':'❌')+' ❄️ Frozen Leviathan: '+((caught['frozen_leviathan']||0)>0?'✅':'❌')+' 🌋 Magma Leviathan: '+((caught['magma_leviathan']||0)>0?'✅':'❌')+' Craft with !craftkey').catch(()=>{});
        }
        if (cmd==='craftkey') {
            const caught=userData.fishCaught.get(userId)||{};
            const completed=userData.completedQuests.get(userId)||[];
            if (completed.includes('scylla_key')) return message.reply('✅ Already have the Scylla Key!').catch(()=>{});
            if (!(caught['crowned_anglerfish']>0&&caught['frozen_leviathan']>0&&caught['magma_leviathan']>0))
                return message.reply('❌ Need all 3 secret fish! Fish in Marianas Veil (Lv100+).').catch(()=>{});
            completed.push('scylla_key'); userData.completedQuests.set(userId,completed);
            checkAchievementGeneral(userId,'scylla',1); await saveData();
            return message.reply('🔑 **Scylla Key Crafted!** You may now enter the Scylla Chamber!').catch(()=>{});
        }
        if (cmd==='teleport') {
            const bid=args[1];
            const biome=BIOMES.find(b=>b.id===bid);
            if (!biome) return message.reply('❌ Usage: !teleport <biomeid> Biomes: '+BIOMES.map(b=>b.id).join(', ')).catch(()=>{});
            const lvInfo=getLevelInfo(userData.xp.get(userId)||0);
            if (lvInfo.level<biome.unlockLv) return message.reply('❌ Need Level **'+biome.unlockLv+'**! You are Level '+lvInfo.level+'.').catch(()=>{});
            const cost=biome.unlockLv*100;
            if (biome.unlockLv>0&&coins(userId)<cost) return message.reply('❌ Travel costs **'+fmtN(cost)+'** coins!').catch(()=>{});
            if (biome.unlockLv>0) addCoins(userId,-cost);
            await saveData();
            return message.reply('🗺️ Teleported to **'+biome.emoji+' '+biome.name+'**! '+biome.desc+' Now use /fish with biome:'+biome.id).catch(()=>{});
        }
        if (cmd==='giverod') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first();
            const rid=args[2];
            if (!target||!rid) return message.reply('❌ Usage: !giverod @user <rodid>').catch(()=>{});
            const rod=FISHING_RODS.find(r=>r.id===rid);
            if (!rod) return message.reply('❌ Invalid rod. IDs: '+FISHING_RODS.map(r=>r.id).join(', ')).catch(()=>{});
            const owned=userData.rodOwned.get(String(target.id))||[];
            if (!owned.includes(rid)){owned.push(rid);userData.rodOwned.set(String(target.id),owned);}
            await saveData();
            return message.reply('✅ Gave **'+rod.name+'** to **'+target.username+'**.').catch(()=>{});
        }
        if (cmd==='forceevent') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const ev=WORLD_EVENTS.find(e=>e.id===args[1]);
            if (!ev) return message.reply('❌ Invalid event. IDs: '+WORLD_EVENTS.map(e=>e.id).join(', ')).catch(()=>{});
            userData.worldEvent=ev; userData.worldEventEnd=Date.now()+ev.dur;
            await saveData();
            return message.reply('✅ Forced event: **'+ev.emoji+' '+ev.name+'** '+ev.desc).catch(()=>{});
        }
        if (cmd==='forceboss') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const b=BOSS_FISH.find(b=>b.id===args[1]);
            if (!b) return message.reply('❌ Invalid boss. IDs: '+BOSS_FISH.map(b=>b.id).join(', ')).catch(()=>{});
            userData.activeBoss=b; userData.activeBossHp=b.hp;
            await saveData();
            return message.reply('✅ Spawned **'+b.emoji+' '+b.name+'** ('+fmtN(b.hp)+' HP)! Use /fishboss to attack.').catch(()=>{});
        }
        if (cmd==='adminhelp') {
            const help='**Admin Prefix Commands**\n\nStaff: !deletestaff @user | !deletelogs | !deletewelcome | !deletetickets | !deletesuggestions | !deletewarnings @user | !listresponses\n\nOwner: !deletelevel @user | !deletexp @user [amt] | !deletemoney @user | !deleteresponse <trigger> | !clearresponses | !deletepet @user | !deleterod @user | !deleteinventory @user [type] | !deleteguild <name> | !deletemarketlisting <id> | !giverod @user <id> | !forceevent <id> | !forceboss <id> | !teleport <id> | !gathermaterials | !craftingrecipes | !craftstats | !scyllakey | !craftkey';
            return message.reply(help).catch(()=>{});
        }

    } catch(e) { console.error('❌ Message handler error:', e?.message); }
});
              // ════════════════════════════════════════════════════════════════
// ♦️ WELCOME SYSTEM
// ════════════════════════════════════════════════════════════════
client.on('guildMemberAdd', async member => {
    try {
        const guildId=String(member.guild.id);
        const cfg=welcomeConfig[guildId];
        if (!cfg) return;
        if (cfg.roleId) await member.roles.add(cfg.roleId).catch(()=>{});
        const ch=await member.guild.channels.fetch(cfg.channelId).catch(()=>null);
        if (!ch) return;
        await ch.send({embeds:[new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('👋 Welcome!')
            .setDescription(`Welcome to **${member.guild.name}**, ${member.user.username}!`)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields({name:'Members',value:`#${member.guild.memberCount}`})
            .setTimestamp()
        ]}).catch(()=>{});
    } catch(e) { console.error('Welcome error:', e?.message); }
});

// ════════════════════════════════════════════════════════════════
// ♦️ GAME SESSION CLEANUP
// ════════════════════════════════════════════════════════════════
setInterval(() => {
    const now=Date.now();
    for (const [id,g] of wordleGames) if (now-g.startTime>WORDLE_TIMEOUT) wordleGames.delete(id);
    for (const [id,g] of hangGames)   if (now-g.ts>GAME_TIMEOUT)          hangGames.delete(id);
    for (const [id,g] of tttGames)    if (now-g.ts>GAME_TIMEOUT)          tttGames.delete(id);
    for (const [id,g] of c4Games)     if (now-g.ts>GAME_TIMEOUT)          c4Games.delete(id);
    for (const [id,g] of bjGames)     if (!g.active)                       bjGames.delete(id);
}, CLEANUP_INTERVAL);

// ════════════════════════════════════════════════════════════════
// ♦️ ERROR HANDLERS
// ════════════════════════════════════════════════════════════════
process.on('unhandledRejection', err => console.error('⚠️ Unhandled:', err?.message||err));
process.on('uncaughtException',  err => console.error('⚠️ Uncaught:', err?.message||err));
client.on('error', err => console.error('⚠️ Client error:', err?.message||err));
client.on('warn', info => console.warn('⚠️ Client warn:', info));

// ════════════════════════════════════════════════════════════════
// ♦️ GRACEFUL SHUTDOWN
// ════════════════════════════════════════════════════════════════
async function gracefulShutdown(signal) {
    console.log(`\n🔴 ${signal} received — saving data and shutting down...`);
    try {
        await saveData();
        cooldownManager.destroy();
        client.destroy();
        console.log('✅ Shutdown complete.');
        process.exit(0);
    } catch(e) {
        console.error('❌ Shutdown error:', e?.message);
        process.exit(1);
    }
}
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ════════════════════════════════════════════════════════════════
// ♦️ BOOT
// ════════════════════════════════════════════════════════════════
if (!process.env.TOKEN) {
    console.error('❌ TOKEN environment variable not set! Add it to your .env file.');
    process.exit(1);
}

(async () => {
    await loadData();
    // Autosave every 5 minutes
    setInterval(saveData, 300_000);
    await client.login(process.env.TOKEN).catch(err => {
        console.error('❌ Login failed:', err?.message);
        process.exit(1);
    });
})();
