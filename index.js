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

            // ════════════════════════════════════════════════════════════════
// ♦️ HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

// ── Original helpers ──
function coins(userId)  { return Number(userData.coins.get(userId))  || 0; }
function bank(userId)   { return Number(userData.bank.get(userId))   || 0; }
function addCoins(userId, amount) {
    userData.coins.set(userId, Math.max(0, coins(userId) + amount));
}

function xpForLevel(n)       { return Math.max(1, 5*n*n + 50*n + 100); }
function getLevelInfo(total) {
    let level = 0, rem = Math.max(0, Number(total)||0);
    const totalXP = rem;
    while (rem >= xpForLevel(level)) { rem -= xpForLevel(level); level++; }
    return { level, xpInLevel: rem, xpRequired: xpForLevel(level), totalXP };
}
function buildBar(cur, max, len=10) {
    const pct  = Math.max(0, Math.min(1, Number(cur)/Number(max)));
    const fill = Math.floor(pct * len);
    return '█'.repeat(fill) + '░'.repeat(len - fill);
}
function addXP(userId, amount) {
    const cur  = Number(userData.xp.get(userId)) || 0;
    const next = cur + amount;
    userData.xp.set(userId, next);
    const oldLv = getLevelInfo(cur).level;
    const newLv = getLevelInfo(next).level;
    // Grant skill point per 5 levels
    if (newLv > oldLv) {
        const pts = Math.floor(newLv / 5) - Math.floor(oldLv / 5);
        if (pts > 0) userData.skillPoints.set(userId, (userData.skillPoints.get(userId)||0) + pts);
    }
    return { leveledUp: newLv > oldLv, newLevel: newLv };
}

// ── New helpers ──
function fmtN(n) { return Number(n||0).toLocaleString(); }

function cdStr(ms) {
    const s = Math.ceil(ms / 1000);
    if (s < 60)   return `${s}s`;
    if (s < 3600) return `${Math.floor(s/60)}m ${s%60}s`;
    return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
}

function ensureJoinDate(userId) {
    if (!userData.joinDate.has(userId)) userData.joinDate.set(userId, Date.now());
}

function weightedRandom(items, wKey = 'weight') {
    const total = items.reduce((s, i) => s + (i[wKey]||1), 0);
    let r = Math.random() * total;
    for (const item of items) { r -= (item[wKey]||1); if (r <= 0) return item; }
    return items[items.length - 1];
}

function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function getCurrentWeather() {
    // Deterministic per 2h block — same for all users
    const block = Math.floor(Date.now() / 7200000);
    return WEATHER_EFFECTS[block % WEATHER_EFFECTS.length];
}

function isNight() {
    const h = new Date().getUTCHours();
    return h >= 20 || h < 6;
}

function getRarityIdx(r) { return RARITY_ORDER.indexOf(r); }

// Get the fish pool filtered for a biome
function getBiomeFishPool(biomeId) {
    const biome = BIOMES.find(b => b.id === biomeId) || BIOMES[0];
    const maxIdx = getRarityIdx(biome.maxRarity);
    return FISH_SPECIES.filter(f => getRarityIdx(f.r) <= maxIdx);
}

// ── FISHING ENGINE ──
function doFish(userId, biomeId = 'pond', baitId = null) {
    const uid  = String(userId);
    ensureJoinDate(uid);

    const rodId    = userData.rodEquipped.get(uid) || 'plastic';
    const rod      = FISHING_RODS.find(r => r.id === rodId) || FISHING_RODS[0];
    const enchants = userData.rodEnchants.get(uid) || [];
    const weather  = getCurrentWeather();
    const night    = isNight();
    const bait     = baitId ? BAIT_TYPES.find(b => b.id === baitId) : null;
    const event    = (userData.worldEvent && userData.worldEventEnd > Date.now()) ? userData.worldEvent : null;

    // Consume bait
    if (bait) {
        const inv = userData.baitInv.get(uid) || {};
        if ((inv[bait.id]||0) > 0) { inv[bait.id]--; if (!inv[bait.id]) delete inv[bait.id]; }
        userData.baitInv.set(uid, inv);
    }

    let pool = getBiomeFishPool(biomeId).map(fish => {
        let w = RARITY_WEIGHTS[fish.r] || 100;

        // Rod power boost (higher = more rare fish weight)
        const rarityBonus = getRarityIdx(fish.r);
        w *= (1 + (rod.pwr - 1) * 0.1 * rarityBonus);

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
    new SlashCommandBuilder().setName('teleport').setDescription('🗺️ Teleport to a fishing biome')
        .addStringOption(o=>o.setName('biome').setDescription('Biome to travel to').setRequired(true)
            .addChoices(...BIOMES.map(b=>({name:`${b.emoji} ${b.name}`,value:b.id})))),
    new SlashCommandBuilder().setName('scyllakey').setDescription('👑 Check your Scylla Key status'),
    new SlashCommandBuilder().setName('craftkey').setDescription('🔑 Craft the Scylla Key (requires secret fish)'),

    // ── RPG ──
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
    new SlashCommandBuilder().setName('craftingrecipes').setDescription('🔨 View all crafting recipes'),
    new SlashCommandBuilder().setName('craftstats').setDescription('📦 View your crafting materials'),
    new SlashCommandBuilder().setName('gathermaterials').setDescription('⛏️ Gather crafting materials'),

    // ── GUILDS ──
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
    new SlashCommandBuilder().setName('giverod').setDescription('🎣 Give a rod to a user (owner)')
        .addUserOption(o=>o.setName('user').setDescription('Target').setRequired(true))
        .addStringOption(o=>o.setName('rod').setDescription('Rod ID').setRequired(true)),
    new SlashCommandBuilder().setName('forceevent').setDescription('🌍 Force a world event (owner)')
        .addStringOption(o=>o.setName('event').setDescription('Event ID').setRequired(true)
            .addChoices(...WORLD_EVENTS.map(e=>({name:`${e.emoji} ${e.name}`,value:e.id})))),
    new SlashCommandBuilder().setName('forceboss').setDescription('🦈 Force a boss fish spawn (owner)')
        .addStringOption(o=>o.setName('boss').setDescription('Boss ID').setRequired(true)
            .addChoices(...BOSS_FISH.map(b=>({name:`${b.emoji} ${b.name}`,value:b.id})))),

    // ── Missing slash command definitions ──
    new SlashCommandBuilder().setName('kick').setDescription('👢 Kick a user (staff)')
        .addUserOption(o=>o.setName('user').setDescription('Who to kick').setRequired(true))
        .addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(false)),
    new SlashCommandBuilder().setName('ban').setDescription('🔨 Ban a user (staff)')
        .addUserOption(o=>o.setName('user').setDescription('Who to ban').setRequired(true))
        .addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(false)),
    new SlashCommandBuilder().setName('removestaff').setDescription('👮 Remove staff from a user (admin)')
        .addUserOption(o=>o.setName('user').setDescription('Who to remove').setRequired(true)),
    new SlashCommandBuilder().setName('liststaffs').setDescription('👮 List all staff in this server'),
    new SlashCommandBuilder().setName('deletestaff').setDescription('🗑️ Remove staff role from user (admin)')
        .addUserOption(o=>o.setName('user').setDescription('User to remove').setRequired(true)),
    new SlashCommandBuilder().setName('deletelogs').setDescription('🗑️ Disable mod-logs for this server'),
    new SlashCommandBuilder().setName('deletewelcome').setDescription('🗑️ Disable welcome system for this server'),
    new SlashCommandBuilder().setName('deletetickets').setDescription('🗑️ Disable ticket system for this server'),
    new SlashCommandBuilder().setName('deletesuggestions').setDescription('🗑️ Disable suggestions for this server'),
    new SlashCommandBuilder().setName('deletemoney').setDescription('🗑️ Reset a users money (owner)')
        .addUserOption(o=>o.setName('user').setDescription('Target user').setRequired(true)),
    new SlashCommandBuilder().setName('setlevelannounce').setDescription('📢 Set level-up announcement channel')
        .addChannelOption(o=>o.setName('channel').setDescription('Channel to send level-up messages').setRequired(true).addChannelTypes(0)),
    new SlashCommandBuilder().setName('deletelevelannounce').setDescription('🗑️ Disable level-up announcements for this server'),

    // ── ADMIN DELETE / REVERSE COMMANDS ──
    new SlashCommandBuilder().setName('deletecoins').setDescription('🗑️ Remove coins from a user (owner)')
        .addUserOption(o=>o.setName('user').setDescription('Target user').setRequired(true))
        .addIntegerOption(o=>o.setName('amount').setDescription('Amount to remove (leave blank = reset to 0)').setRequired(false).setMinValue(1)),
    new SlashCommandBuilder().setName('deletexp').setDescription('🗑️ Remove XP / reset level of a user (owner)')
        .addUserOption(o=>o.setName('user').setDescription('Target user').setRequired(true))
        .addIntegerOption(o=>o.setName('amount').setDescription('Amount of XP to remove (leave blank = full reset)').setRequired(false).setMinValue(1)),
    new SlashCommandBuilder().setName('deletelevel').setDescription('🗑️ Reset a user back to Level 0 (owner)')
        .addUserOption(o=>o.setName('user').setDescription('Target user').setRequired(true)),
    new SlashCommandBuilder().setName('deletewarnings').setDescription('🗑️ Clear all warnings from a user (staff)')
        .addUserOption(o=>o.setName('user').setDescription('Target user').setRequired(true)),
    new SlashCommandBuilder().setName('deleteresponse').setDescription('🗑️ Remove an auto-response trigger (owner)')
        .addStringOption(o=>o.setName('trigger').setDescription('Trigger word to remove').setRequired(true)),
    new SlashCommandBuilder().setName('clearresponses').setDescription('🗑️ Clear ALL auto-responses (owner)'),
    new SlashCommandBuilder().setName('listresponses').setDescription('📋 List all auto-responses (staff)'),
    new SlashCommandBuilder().setName('deleteinventory').setDescription('🗑️ Clear a users inventory (owner)')
        .addUserOption(o=>o.setName('user').setDescription('Target user').setRequired(true))
        .addStringOption(o=>o.setName('type').setDescription('What to clear').setRequired(true)
            .addChoices(
                {name:'Weapons',value:'weapons'},
                {name:'Items',value:'items'},
                {name:'Fish',value:'fish'},
                {name:'Bait',value:'bait'},
                {name:'Everything',value:'all'},
            )),
    new SlashCommandBuilder().setName('deletepet').setDescription('🗑️ Remove a users pet (owner)')
        .addUserOption(o=>o.setName('user').setDescription('Target user').setRequired(true)),
    new SlashCommandBuilder().setName('deleterod').setDescription('🗑️ Remove a users fishing rod (owner)')
        .addUserOption(o=>o.setName('user').setDescription('Target user').setRequired(true)),
    new SlashCommandBuilder().setName('resetuser').setDescription('🗑️ Full reset of a users data (owner — use with care!)')
        .addUserOption(o=>o.setName('user').setDescription('Target user').setRequired(true)),
    new SlashCommandBuilder().setName('deleteguild').setDescription('🗑️ Disband a guild (owner)')
        .addStringOption(o=>o.setName('name').setDescription('Guild name to disband').setRequired(true)),
    new SlashCommandBuilder().setName('deletemarketlisting').setDescription('🗑️ Remove a marketplace listing (owner/seller)')
        .addStringOption(o=>o.setName('listingid').setDescription('Listing ID to remove').setRequired(true)),
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
client.once('ready', async () => {
    console.log(`✅ Bot online as ${client.user?.tag}`);
    try {
        const rest = new REST({ version:'10' }).setToken(process.env.TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), {
            body: slashCommands.map(c => c.toJSON()),
        });
        console.log(`✅ Registered ${slashCommands.length} slash commands`);
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
    if (coins(tid)<100) return interaction.reply({content:'❌ Target has less than 100 coins!',ephemeral:true});
    const success=Math.random()>0.4;
    if (success) {
        const stolen=Math.floor(Math.random()*coins(tid)*0.3)+1;
        addCoins(tid,-stolen); addCoins(userId,stolen); addXP(userId,30);
        await saveData();
        return interaction.reply({content:`🔫 Robbed **${target.username}** for **${fmtN(stolen)} coins**!`});
    } else {
        const fine=Math.floor(coins(userId)*0.1)||50;
        addCoins(userId,-fine); await saveData();
        return interaction.reply({content:`🚔 Caught! Fined **${fmtN(fine)} coins**.`});
    }
}

if (cmd==='gamble') {
    const amount=interaction.options.getInteger('amount');
    if (coins(userId)<amount) return interaction.reply({content:'❌ Not enough coins!',ephemeral:true});
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
