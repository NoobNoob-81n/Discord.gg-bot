/**
 * 🤖 DISCORD.JS v14 BOT — ULTIMATE EDITION v4.0.0
 * =================================================
 * Railway-ready | All bugs fixed | Massive Fisch-style update
 * 6 new biomes | 56 new fish | New bosses | Owner cooldown system
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
const rngState = require('./rng/core/rngState');
const { startDashboardServer } = require('./server/api');
const rngCommandRouter = require('./rng/core/commandRouter');
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
const DATA_DIR         = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const DATA_FILE        = path.join(DATA_DIR, 'data.json');
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
    // ── SPECIAL SECRET FISH (shiny mutation renames) ──
    { id:'the_rock',     name:'The Rock',      emoji:'🪨', r:'Secret', val:150000,wMin:999,  wMax:999,  xp:18000,desc:'A mysterious rock pulled from the deep. Rumour says it has feelings. (Shiny → Not Me Pls)', shinyName:'Not Me Pls',    shinyEmoji:'😭' },
    { id:'the_mind',     name:'The Mind',      emoji:'🧠', r:'Secret', val:175000,wMin:1,    wMax:1,    xp:20000,desc:'A sentient thought drifting through the abyss. (Shiny → Mindless)',                        shinyName:'Mindless',      shinyEmoji:'🫥' },
    { id:'the_mushroom', name:'The Mushroom',  emoji:'🍄', r:'Secret', val:160000,wMin:0.5,  wMax:0.5,  xp:19000,desc:'An ancient spore that somehow ended up underwater. (Shiny → Mushrimeeee)',                shinyName:'Mushrimeeee',   shinyEmoji:'🍄‍🟫' },
// ── NEW BIOME FISH — CRYSTAL CAVERNS ──
    { id:'crystal_bass',       name:'Crystal Bass',          emoji:'💎', r:'Uncommon',  val:110,   wMin:0.5, wMax:4,    xp:38,   biome:'crystal_caverns', desc:'A bass with crystalline scales that refract light beautifully.' },
    { id:'prism_trout',        name:'Prism Trout',           emoji:'🌈', r:'Rare',      val:380,   wMin:1,   wMax:8,    xp:95,   biome:'crystal_caverns', desc:'Its scales split light into every color of the spectrum.' },
    { id:'gem_carp',           name:'Gem Carp',              emoji:'💠', r:'Rare',      val:450,   wMin:0.8, wMax:6,    xp:105,  biome:'crystal_caverns', desc:'Covered in gem-like scales that shimmer in the dark.' },
    { id:'quartz_eel',         name:'Quartz Eel',            emoji:'🔷', r:'Epic',      val:1400,  wMin:2,   wMax:15,   xp:320,  biome:'crystal_caverns', desc:'An eel whose body is partially crystallized.' },
    { id:'diamond_pike',       name:'Diamond Pike',          emoji:'💎', r:'Epic',      val:1800,  wMin:3,   wMax:20,   xp:380,  biome:'crystal_caverns', desc:'Razor-sharp diamond-tipped teeth. Extremely dangerous.' },
    { id:'sapphire_ray',       name:'Sapphire Ray',          emoji:'🔵', r:'Legendary', val:7500,  wMin:40,  wMax:200,  xp:1000, biome:'crystal_caverns', desc:'A ray whose wings are made of living sapphire crystal.' },
    { id:'crystal_leviathan',  name:'Crystal Leviathan',     emoji:'💎', r:'Mythical',  val:45000, wMin:800, wMax:4000, xp:4800, biome:'crystal_caverns', desc:'An ancient leviathan encased in crystal for millennia.' },
    { id:'the_prism',          name:'The Prism',             emoji:'🔮', r:'Secret',    val:220000,wMin:0.1, wMax:0.1,  xp:22000,biome:'crystal_caverns', desc:'A perfect crystalline entity. It contains every color and none.', shinyName:'The Void Prism', shinyEmoji:'🌑' },
    // ── NEW BIOME FISH — SUNKEN METROPOLIS ──
    { id:'rust_perch',         name:'Rust Perch',            emoji:'🟤', r:'Common',    val:25,    wMin:0.2, wMax:2,    xp:8,    biome:'sunken_metropolis', desc:'A perch that nests in rusted pipes and old cars.' },
    { id:'sewer_catfish',      name:'Sewer Catfish',         emoji:'🐟', r:'Common',    val:30,    wMin:1,   wMax:9,    xp:10,   biome:'sunken_metropolis', desc:'Thrives in the murky flooded streets below.' },
    { id:'neon_tetra',         name:'Neon Tetra',            emoji:'🔵', r:'Uncommon',  val:70,    wMin:0.01,wMax:0.1,  xp:22,   biome:'sunken_metropolis', desc:'Schools of neon tetras light up the sunken corridors.' },
    { id:'urban_shark',        name:'Urban Shark',           emoji:'🦈', r:'Rare',      val:500,   wMin:20,  wMax:150,  xp:120,  biome:'sunken_metropolis', desc:'Adapted to city life. Has been seen using traffic lights as landmarks.' },
    { id:'metro_eel',          name:'Metro Eel',             emoji:'⚡', r:'Rare',      val:420,   wMin:3,   wMax:25,   xp:100,  biome:'sunken_metropolis', desc:'Lives in the old subway tunnels. Generates electricity from the rails.' },
    { id:'skyscraper_whale',   name:'Skyscraper Whale',      emoji:'🏙️', r:'Epic',      val:2200,  wMin:200, wMax:800,  xp:480,  biome:'sunken_metropolis', desc:'A whale that has made a skyscraper its home. Somehow.' },
    { id:'ghost_diver',        name:'Ghost Diver Fish',      emoji:'👻', r:'Legendary', val:8000,  wMin:5,   wMax:30,   xp:1100, biome:'sunken_metropolis', desc:'The spirit of a diver who never surfaced. Now swims forever.' },
    { id:'the_mayor',          name:'The Mayor',             emoji:'🏛️', r:'Secret',    val:280000,wMin:100, wMax:100,  xp:28000,biome:'sunken_metropolis', desc:'Nobody knows how it got elected. It governs the sunken city with an iron fin.', shinyName:'The Golden Mayor', shinyEmoji:'🥇' },
    // ── NEW BIOME FISH — VOID OCEAN ──
    { id:'null_fish',          name:'Null Fish',             emoji:'⬛', r:'Rare',      val:600,   wMin:0.001,wMax:1,   xp:130,  biome:'void_ocean', desc:'A fish that exists and does not exist simultaneously.' },
    { id:'shadow_manta',       name:'Shadow Manta',          emoji:'🌑', r:'Epic',      val:2500,  wMin:80,  wMax:400,  xp:550,  biome:'void_ocean', desc:'A manta ray made entirely of shadow matter.' },
    { id:'void_shark',         name:'Void Shark',            emoji:'🦈', r:'Epic',      val:3000,  wMin:100, wMax:600,  xp:620,  biome:'void_ocean', desc:'Tears through reality itself to ambush prey.' },
    { id:'oblivion_whale',     name:'Oblivion Whale',        emoji:'🌊', r:'Legendary', val:12000, wMin:500, wMax:3000, xp:1500, biome:'void_ocean', desc:'A whale so large it bends space around it.' },
    { id:'void_serpent',       name:'Void Serpent',          emoji:'🐍', r:'Mythical',  val:60000, wMin:2000,wMax:10000,xp:6000, biome:'void_ocean', desc:'The serpent that circles the void between worlds.' },
    { id:'the_nothing',        name:'The Nothing',           emoji:'🕳️', r:'Secret',    val:350000,wMin:0,   wMax:0,    xp:35000,biome:'void_ocean', desc:'You caught nothing. But nothing caught you back.', shinyName:'The Everything', shinyEmoji:'✨' },
    // ── NEW BIOME FISH — MOLTEN DEPTHS ──
    { id:'lava_carp',          name:'Lava Carp',             emoji:'🔴', r:'Uncommon',  val:120,   wMin:0.5, wMax:5,    xp:40,   biome:'molten_depths', desc:'Swims through liquid rock. Its scales are constantly glowing.' },
    { id:'magma_bass',         name:'Magma Bass',            emoji:'🌋', r:'Rare',      val:550,   wMin:2,   wMax:18,   xp:125,  biome:'molten_depths', desc:'A bass that feeds on volcanic minerals. Extremely hot to the touch.' },
    { id:'ember_eel',          name:'Ember Eel',             emoji:'🔥', r:'Rare',      val:480,   wMin:1,   wMax:12,   xp:110,  biome:'molten_depths', desc:'Leaves a trail of embers as it swims through lava.' },
    { id:'inferno_shark',      name:'Inferno Shark',         emoji:'🦈', r:'Epic',      val:2800,  wMin:50,  wMax:300,  xp:580,  biome:'molten_depths', desc:'The apex predator of the lava seas. Its bite ignites.' },
    { id:'volcanic_ray',       name:'Volcanic Ray',          emoji:'🌋', r:'Epic',      val:2400,  wMin:30,  wMax:200,  xp:500,  biome:'molten_depths', desc:'A ray that glides through magma channels with ease.' },
    { id:'magma_dragon',       name:'Magma Dragon',          emoji:'🐉', r:'Legendary', val:14000, wMin:200, wMax:1000, xp:1800, biome:'molten_depths', desc:'A dragon-like fish that erupts from volcanoes.' },
    { id:'core_leviathan',     name:'Core Leviathan',        emoji:'🌋', r:'Mythical',  val:70000, wMin:1500,wMax:8000, xp:7000, biome:'molten_depths', desc:"Born in the planet's core. Older than the ocean itself." },
    { id:'the_flame',          name:'The Flame',             emoji:'🔥', r:'Secret',    val:320000,wMin:0.001,wMax:0.001,xp:32000,biome:'molten_depths', desc:'A fish made entirely of fire. It burns everything it touches except you.', shinyName:'The Eternal Flame', shinyEmoji:'🕯️' },
    // ── NEW BIOME FISH — CELESTIAL SEA ──
    { id:'star_bass',          name:'Star Bass',             emoji:'⭐', r:'Uncommon',  val:130,   wMin:0.5, wMax:4,    xp:42,   biome:'celestial_sea_new', desc:'A bass whose scales glow like distant stars.' },
    { id:'nebula_trout',       name:'Nebula Trout',          emoji:'🌌', r:'Rare',      val:600,   wMin:1,   wMax:8,    xp:130,  biome:'celestial_sea_new', desc:'Swims through nebulae as easily as water.' },
    { id:'comet_eel',          name:'Comet Eel',             emoji:'☄️', r:'Rare',      val:520,   wMin:2,   wMax:20,   xp:115,  biome:'celestial_sea_new', desc:'Leaves a glowing trail like a comet across the sky.' },
    { id:'galaxy_manta',       name:'Galaxy Manta',          emoji:'🌌', r:'Epic',      val:3200,  wMin:100, wMax:500,  xp:680,  biome:'celestial_sea_new', desc:'A manta ray whose wingspan contains an entire galaxy.' },
    { id:'aurora_whale',       name:'Aurora Whale',          emoji:'🌌', r:'Legendary', val:16000, wMin:400, wMax:2000, xp:2000, biome:'celestial_sea_new', desc:'Its song creates auroras across the night sky.' },
    { id:'supernova_shark',    name:'Supernova Shark',       emoji:'💥', r:'Mythical',  val:75000, wMin:500, wMax:3000, xp:7500, biome:'celestial_sea_new', desc:'When it dies, it explodes with the force of a star.' },
    { id:'celestial_dragon',   name:'Celestial Dragon',      emoji:'🐉', r:'Mythical',  val:80000, wMin:1000,wMax:5000, xp:8000, biome:'celestial_sea_new', desc:'The guardian of the Celestial Sea. Ancient beyond measure.' },
    { id:'the_star',           name:'The Star',              emoji:'🌟', r:'Secret',    val:400000,wMin:1,   wMax:1,    xp:40000,biome:'celestial_sea_new', desc:'You caught a literal star. The universe is confused.', shinyName:'The Dead Star', shinyEmoji:'💀' },
    // ── NEW BIOME FISH — FORGOTTEN ABYSS ──
    { id:'forgotten_carp',     name:'Forgotten Carp',        emoji:'🌑', r:'Common',    val:35,    wMin:0.3, wMax:3,    xp:10,   biome:'forgotten_abyss', desc:'A carp so old it has forgotten what light looks like.' },
    { id:'memory_eel',         name:'Memory Eel',            emoji:'🧠', r:'Uncommon',  val:95,    wMin:1,   wMax:10,   xp:35,   biome:'forgotten_abyss', desc:'Absorbs the memories of those who fish it. Handle with care.' },
    { id:'ancient_pike',       name:'Ancient Pike',          emoji:'🏛️', r:'Rare',      val:700,   wMin:5,   wMax:40,   xp:150,  biome:'forgotten_abyss', desc:'A pike from before recorded history. It remembers everything.' },
    { id:'relic_shark',        name:'Relic Shark',           emoji:'🦈', r:'Epic',      val:3500,  wMin:80,  wMax:500,  xp:720,  biome:'forgotten_abyss', desc:'A shark species thought extinct for 500 million years.' },
    { id:'time_whale',         name:'Time Whale',            emoji:'⏰', r:'Legendary', val:18000, wMin:600, wMax:3000, xp:2200, biome:'forgotten_abyss', desc:'Swims through time as easily as water. Has seen everything.' },
    { id:'oblivion_serpent',   name:'Oblivion Serpent',      emoji:'🐍', r:'Mythical',  val:85000, wMin:2000,wMax:10000,xp:8500, biome:'forgotten_abyss', desc:'The last memory of a forgotten god. It should not exist.' },
    { id:'blob_fish',          name:'Blob Fish',             emoji:'🫠', r:'Secret',    val:500000,wMin:0.5, wMax:0.5,  xp:50000,biome:'forgotten_abyss', desc:'A legendary blob fish from the deepest abyss. Unlock: fish in Forgotten Abyss during Eclipse weather with Void Rod or better.', shinyName:'The Golden No Teeth Fish', shinyEmoji:'🐡' },
    { id:'the_forgotten',      name:'The Forgotten',         emoji:'❓', r:'Secret',    val:450000,wMin:1,   wMax:1,    xp:45000,biome:'forgotten_abyss', desc:'Something that was erased from existence. You found it anyway.', shinyName:'The Remembered', shinyEmoji:'💡' },
    // ── EXTRA LEGENDARY/MYTHICAL (general biomes) ──
    { id:'thunder_bass',       name:'Thunder Bass',          emoji:'⚡', r:'Rare',      val:480,   wMin:2,   wMax:15,   xp:115,  desc:'A bass that crackles with electrical energy during storms.' },
    { id:'frost_pike',         name:'Frost Pike',            emoji:'❄️', r:'Rare',      val:510,   wMin:3,   wMax:18,   xp:120,  desc:'A pike whose body temperature is below freezing.' },
    { id:'storm_tuna',         name:'Storm Tuna',            emoji:'⛈️', r:'Epic',      val:2600,  wMin:15,  wMax:200,  xp:540,  desc:'Only appears during storms. Feeds on lightning.' },
    { id:'golden_manta',       name:'Golden Manta',          emoji:'✨', r:'Legendary', val:9500,  wMin:100, wMax:600,  xp:1200, desc:'A manta ray made of living gold. Extremely rare.' },
    { id:'phantom_whale',      name:'Phantom Whale',         emoji:'👻', r:'Legendary', val:11000, wMin:300, wMax:2000, xp:1400, desc:'A whale that phases in and out of reality.' },
    { id:'ancient_coelacanth', name:'Ancient Coelacanth',    emoji:'🏛️', r:'Epic',      val:2100,  wMin:25,  wMax:100,  xp:460,  desc:'An even older coelacanth. Unchanged for 600 million years.' },
    { id:'rainbow_leviathan',  name:'Rainbow Leviathan',     emoji:'🌈', r:'Mythical',  val:65000, wMin:1200,wMax:7000, xp:6500, desc:'A leviathan whose scales display every color. Said to grant wishes.' },
    { id:'iron_sturgeon',      name:'Iron Sturgeon',         emoji:'⚙️', r:'Epic',      val:1900,  wMin:30,  wMax:200,  xp:420,  desc:'A sturgeon with iron-hard scales. Ancient and powerful.' },
    { id:'deep_angler',        name:'Deep Angler',           emoji:'🔦', r:'Epic',      val:2000,  wMin:2,   wMax:25,   xp:440,  desc:'An anglerfish from the deepest trenches. Its lure never goes out.' },
    { id:'cosmic_koi',         name:'Cosmic Koi',            emoji:'🌌', r:'Legendary', val:10000, wMin:2,   wMax:15,   xp:1300, desc:'A koi fish that swims through the cosmos. Extremely rare.' },
    { id:'obsidian_catfish',   name:'Obsidian Catfish',      emoji:'🌑', r:'Rare',      val:600,   wMin:5,   wMax:30,   xp:140,  desc:'A catfish with skin as hard and dark as obsidian.' },
    { id:'glacier_shark',      name:'Glacier Shark',         emoji:'🦈', r:'Epic',      val:3200,  wMin:150, wMax:800,  xp:680,  desc:'A shark that has been frozen in a glacier for thousands of years.' },
    { id:'spectral_swordfish', name:'Spectral Swordfish',    emoji:'🗡️', r:'Legendary', val:12000, wMin:20,  wMax:180,  xp:1600, desc:'A ghostly swordfish that can phase through solid objects.' },
    { id:'titanic_tuna',       name:'Titanic Tuna',          emoji:'🐟', r:'Epic',      val:2800,  wMin:500, wMax:2000, xp:600,  desc:'A tuna of truly massive proportions.' },
    { id:'emerald_eel',        name:'Emerald Eel',           emoji:'🐍', r:'Rare',      val:750,   wMin:5,   wMax:35,   xp:160,  desc:'An eel with vibrant emerald scales that glow in the dark.' },
    { id:'void_manta',         name:'Void Manta',            emoji:'🌑', r:'Mythical',  val:45000, wMin:100, wMax:1000, xp:5000, desc:'A manta ray born from the void itself.' },
    { id:'solar_salmon',       name:'Solar Salmon',          emoji:'☀️', r:'Rare',      val:800,   wMin:3,   wMax:25,   xp:180,  desc:'A salmon that thrives in the warmest waters, its scales reflecting sunlight.' },
    { id:'lunar_lobst',        name:'Lunar Lobster',         emoji:'🦞', r:'Rare',      val:900,   wMin:1,   wMax:10,   xp:200,  desc:'A lobster that is only active during the full moon.' },
    { id:'abyssal_angler',     name:'Abyssal Angler',        emoji:'🏮', r:'Epic',      val:3500,  wMin:5,   wMax:50,   xp:750,  desc:'The largest of all anglerfish, its lure can be seen from miles away.' },
    { id:'diamond_dolphin',    name:'Diamond Dolphin',       emoji:'🐬', r:'Legendary', val:15000, wMin:100, wMax:500,  xp:2000, desc:'A dolphin with a body made of solid diamond.' },
    { id:'ruby_ray',           name:'Ruby Ray',              emoji:'🔴', r:'Rare',      val:850,   wMin:10,  wMax:80,   xp:190,  desc:'A ray with brilliant ruby-red wings.' },
    { id:'topaz_trout',        name:'Topaz Trout',           emoji:'🔶', r:'Uncommon',  val:150,   wMin:1,   wMax:10,   xp:50,   desc:'A trout with golden topaz-colored scales.' },
    { id:'pearl_perch',        name:'Pearl Perch',           emoji:'⚪', r:'Common',    val:40,    wMin:0.5, wMax:5,    xp:15,   desc:'A perch with scales that have a pearlescent sheen.' },
    { id:'shadow_squid',       name:'Shadow Squid',          emoji:'🦑', r:'Epic',      val:4000,  wMin:50,  wMax:300,  xp:850,  desc:'A squid that can disappear into shadows at will.' },
    { id:'plasma_pike',        name:'Plasma Pike',           emoji:'⚡', r:'Legendary', val:18000, wMin:10,  wMax:100,  xp:2500, desc:'A pike made of pure plasma energy.' },
    { id:'nebula_narwhal',     name:'Nebula Narwhal',        emoji:'🦄', r:'Mythical',  val:55000, wMin:500, wMax:2000, xp:6000, desc:'A narwhal that swims through the nebulae of the cosmos.' },
    { id:'quantum_koi',        name:'Quantum Koi',           emoji:'⚛️', r:'Secret',    val:300000,wMin:1,   wMax:1,    xp:30000,desc:'A koi that exists in multiple places at once.', shinyName:'The Singular Koi', shinyEmoji:'🌌' },
    { id:'infinity_whale',     name:'Infinity Whale',        emoji:'♾️', r:'Secret',    val:500000,wMin:9999,wMax:9999, xp:50000,desc:'A whale that represents the infinite nature of the ocean.', shinyName:'The Zero Whale', shinyEmoji:'⭕' },
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
    // ── NEW RODS ──
    { id:'crystal_rod',   name:'Crystal Cavern Rod', emoji:'💎', price:500000,  reqLv:60,  reqQ:null,           pwr:6.0,  luck:28,  desc:'Crafted from Crystal Cavern minerals. Excellent for crystal biomes.' },
    { id:'void_rod_mk2',  name:'Void Rod Mk.II',     emoji:'🌑', price:3000000, reqLv:90,  reqQ:null,           pwr:8.0,  luck:40,  desc:'Upgraded void rod. Secret fish chance greatly increased.' },
    { id:'abyss_rod',     name:'Abyss Rod',          emoji:'❓', price:0,       reqLv:90,  reqQ:'abyss_key',    pwr:9.0,  luck:45,  desc:'Forged from forgotten memories. Required for Forgotten Abyss secrets.' },
    { id:'celestial_mk2', name:'Celestial Rod Mk.II',emoji:'🌟', price:0,       reqLv:0,   reqQ:'prestige10',   pwr:15.0, luck:75,  desc:'The ultimate prestige reward. Catches anything, anywhere.' },
    { id:'lava_rod',      name:'Lava Rod',           emoji:'🌋', price:750000,  reqLv:70,  reqQ:null,           pwr:7.0,  luck:32,  desc:'Forged in volcanic fire. Perfect for Molten Depths.' },
];

// Rod enchantments
const ROD_ENCHANTS = [
    { id:'lucky',    name:'Lucky',     emoji:'🍀', cost:2000,  desc:'+10% mutation chance' },
    { id:'swift',    name:'Swift',     emoji:'⚡', cost:5000,  desc:'-25% fishing cooldown' },
    { id:'magnetic', name:'Magnetic',  emoji:'🧲', cost:12000, desc:'+20% rare fish rate'  },
    { id:'deep',     name:'Deep Sea',  emoji:'🌊', cost:30000, desc:'Enables deep biomes'  },
    { id:'fortune',  name:'Fortune',   emoji:'💰', cost:50000, desc:'+30% sell value'      },
    { id:'ancient',  name:'Ancient',   emoji:'🏛️', cost:150000,desc:'+ancient mutation chance' },
    // ── NEW ENCHANTS ──
    { id:'void_touch',  name:'Void Touch',   emoji:'🌑', cost:500000, desc:'+50% Secret fish chance in void biomes' },
    { id:'crystal',     name:'Crystalline',  emoji:'💎', cost:200000, desc:'+30% mutation chance in Crystal Caverns' },
    { id:'blazing',     name:'Blazing',      emoji:'🔥', cost:300000, desc:'+40% catch rate in Molten Depths' },
    { id:'starlight',   name:'Starlight',    emoji:'🌟', cost:400000, desc:'+25% all fish rates during aurora/starfall' },
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
    // ── 6 NEW BIOMES ──
    { id:'crystal_caverns',   name:'Crystal Caverns',   emoji:'💎', unlockLv:30,  maxRarity:'Mythical',  desc:'Glittering underground caverns with crystalline fish.', weather:['aurora','foggy','sunny'], secret:'the_prism' },
    { id:'sunken_metropolis', name:'Sunken Metropolis',  emoji:'🏙️', unlockLv:40,  maxRarity:'Secret',    desc:'A drowned city teeming with adapted urban fish.', weather:['rainy','stormy','cloudy'], secret:'the_mayor' },
    { id:'void_ocean',        name:'Void Ocean',         emoji:'🕳️', unlockLv:60,  maxRarity:'Secret',    desc:'An ocean that exists outside of reality.', weather:['eclipse','foggy'], secret:'the_nothing' },
    { id:'molten_depths',     name:'Molten Depths',      emoji:'🌋', unlockLv:45,  maxRarity:'Secret',    desc:'Volcanic underwater vents of liquid fire.', weather:['stormy','sunny'], secret:'the_flame' },
    { id:'celestial_sea_new', name:'Celestial Sea II',   emoji:'🌌', unlockLv:120, maxRarity:'Secret',    desc:'Beyond the first Celestial Sea — pure starlight.', weather:['aurora','eclipse'], secret:'the_star' },
    { id:'forgotten_abyss',   name:'Forgotten Abyss',    emoji:'❓', unlockLv:90,  maxRarity:'Secret',    desc:'A place erased from maps. Only the lost find it.', weather:['eclipse','foggy'], secret:'blob_fish', blobFishUnlock:true },
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
    { id:'eclipse',    name:'Eclipse',       emoji:'🌑',  commonMult:0.3, rareMult:2.5, legMult:5.0  },
    // ── NEW WEATHER EVENTS ──
    { id:'meteor_shower', name:'Meteor Shower', emoji:'☄️',  commonMult:0.5, rareMult:2.0, legMult:4.0, secretMult:2.0 },
    { id:'void_tide',     name:'Void Tide',     emoji:'🕳️',  commonMult:0.2, rareMult:1.5, legMult:3.0, secretMult:5.0 },
    { id:'crystal_rain',  name:'Crystal Rain',  emoji:'💎',  commonMult:0.8, rareMult:1.8, legMult:2.5, mutMult:3.0    },
    { id:'lava_surge',    name:'Lava Surge',    emoji:'🌋',  commonMult:0.4, rareMult:2.2, legMult:3.5, secretMult:1.5 },
    { id:'starfall',      name:'Starfall',      emoji:'🌟',  commonMult:0.6, rareMult:2.8, legMult:6.0, mutMult:2.0    },
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
    // ── NEW WORLD EVENTS ──
    { id:'crystal_storm',  name:'Crystal Storm',     emoji:'💎', dur:2700000, desc:'Crystal rain falls! Rare mutations x3 and Legendary fish x2!',  effect:'crystal_storm' },
    { id:'void_rift',      name:'Void Rift',          emoji:'🕳️', dur:1800000, desc:'A rift opens! Secret fish chance everywhere for 30 minutes!',   effect:'secret_chance' },
    { id:'lava_eruption',  name:'Lava Eruption',      emoji:'🌋', dur:2700000, desc:'Volcanic eruption! Epic+ fish x4 for 45 minutes!',              effect:'epic4x'        },
    { id:'starfall_event', name:'Starfall',           emoji:'🌟', dur:3600000, desc:'Stars fall into the sea! All XP x3 and sell value x2!',         effect:'starfall'      },
    { id:'forgotten_tide', name:'Forgotten Tide',     emoji:'❓', dur:1800000, desc:'Ancient fish resurface! Mythical fish possible everywhere!',     effect:'myth_any'      },
    { id:'blob_sighting',  name:'Blob Fish Sighting', emoji:'🫠', dur:900000,  desc:'A Blob Fish was spotted! Eclipse weather forced for 15 minutes!', effect:'blob_hint'     },
];

// Boss fish
const BOSS_FISH = [
    { id:'ancient_shark',  name:'Ancient Shark',    emoji:'🦈', hp:15000,  reward:25000,  xp:6000,   desc:'A prehistoric megalodon fragment.' },
    { id:'thunder_whale',  name:'Thunder Whale',    emoji:'🐋', hp:40000,  reward:80000,  xp:15000,  desc:'A whale that controls lightning!' },
    { id:'kraken_lord',    name:'Kraken Lord',      emoji:'🦑', hp:100000, reward:250000, xp:50000,  desc:'The immortal Kraken itself!' },
    { id:'void_leviathan',    name:'Void Leviathan',     emoji:'🌑', hp:500000,  reward:1000000, xp:200000, desc:'An entity from outside existence.' },
    // ── NEW BOSSES ──
    { id:'crystal_colossus',  name:'Crystal Colossus',   emoji:'💎', hp:80000,   reward:150000,  xp:30000,  desc:'A titan of living crystal from the Crystal Caverns.' },
    { id:'sunken_behemoth',   name:'Sunken Behemoth',    emoji:'🏙️', hp:120000,  reward:250000,  xp:50000,  desc:'The ancient guardian of the Sunken Metropolis.' },
    { id:'void_devourer',     name:'Void Devourer',      emoji:'🕳️', hp:300000,  reward:600000,  xp:120000, desc:'A creature that consumes reality itself.' },
    { id:'magma_titan',       name:'Magma Titan',        emoji:'🌋', hp:200000,  reward:400000,  xp:80000,  desc:"Born from the planet's molten core. Unstoppable." },
    { id:'celestial_guardian',name:'Celestial Guardian', emoji:'🌟', hp:750000,  reward:2000000, xp:400000, desc:'The guardian of the Celestial Sea. Ancient and divine.' },
    { id:'the_forgotten_god', name:'The Forgotten God',  emoji:'❓', hp:2000000, reward:5000000, xp:1000000,desc:'A god erased from existence. It wants to be remembered.' },
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
    // ── NEW ACHIEVEMENTS ──
    { id:'catch5000',      name:'Obsessed',          emoji:'🎣', desc:'Catch 5,000 fish',                   reward:50000, cond:{t:'catch',   n:5000}     },
    { id:'catch10000',     name:'Fishing God',       emoji:'🌊', desc:'Catch 10,000 fish',                  reward:200000,cond:{t:'catch',   n:10000}    },
    { id:'crystal_first',  name:'Crystal Diver',     emoji:'💎', desc:'Catch your first Crystal Caverns fish',reward:5000, cond:{t:'biome',   b:'crystal_caverns'}},
    { id:'void_first',     name:'Void Walker',       emoji:'🕳️', desc:'Catch your first Void Ocean fish',   reward:10000, cond:{t:'biome',   b:'void_ocean'}},
    { id:'molten_first',   name:'Lava Fisher',       emoji:'🌋', desc:'Catch your first Molten Depths fish', reward:8000,  cond:{t:'biome',   b:'molten_depths'}},
    { id:'abyss_first',    name:'Abyss Diver',       emoji:'❓', desc:'Catch your first Forgotten Abyss fish',reward:15000,cond:{t:'biome',   b:'forgotten_abyss'}},
    { id:'blob_caught',    name:'Blob Whisperer',    emoji:'🫠', desc:'Catch the legendary Blob Fish',       reward:1000000,cond:{t:'fish_id', id:'blob_fish'}},
    { id:'golden_no_teeth',name:'No Teeth Legend',   emoji:'🐡', desc:'Obtain The Golden No Teeth Fish',     reward:2000000,cond:{t:'fish_id', id:'blob_fish', mut:'shiny'}},
    { id:'boss5',          name:'Boss Hunter',       emoji:'💀', desc:'Defeat 5 boss fish',                  reward:25000, cond:{t:'boss',    n:5}        },
    { id:'boss_all',       name:'Boss Slayer Supreme',emoji:'👑',desc:'Defeat every type of boss fish',      reward:500000,cond:{t:'boss_all',n:1}        },
    { id:'species50',      name:'Expert Collector',  emoji:'📚', desc:'Discover 50 unique species',          reward:20000, cond:{t:'species', n:50}       },
    { id:'species100',     name:'Grand Encyclopedist',emoji:'📖',desc:'Discover 100 unique species',         reward:100000,cond:{t:'species', n:100}      },
    { id:'prestige5',      name:'Five Lives',        emoji:'🔄', desc:'Prestige 5 times',                    reward:500000,cond:{t:'prestige',n:5}        },
    { id:'rich10m',        name:'Billionaire',       emoji:'💰', desc:'Accumulate 10,000,000 coins',         reward:100000,cond:{t:'coins',   n:10000000} },
    { id:'streak100',      name:'Centurion',         emoji:'💯', desc:'100-day login streak',                reward:100000,cond:{t:'streak',  n:100}      },
    { id:'crystal_storm_surv',name:'Storm Survivor', emoji:'⛈️', desc:'Fish during a Crystal Storm event',   reward:3000,  cond:{t:'event',   e:'crystal_storm'}},
    { id:'void_rift_surv', name:'Rift Walker',       emoji:'🌀', desc:'Fish during a Void Rift event',       reward:5000,  cond:{t:'event',   e:'void_rift'}},
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
    // ── NEW TITLES ──
    { id:'obsessed',       name:'The Obsessed',    emoji:'🎣', req:'catch5000'     },
    { id:'fishing_god',    name:'Fishing God',     emoji:'🌊', req:'catch10000'    },
    { id:'crystal_diver',  name:'Crystal Diver',   emoji:'💎', req:'crystal_first' },
    { id:'void_walker',    name:'Void Walker',     emoji:'🕳️', req:'void_first'    },
    { id:'lava_fisher',    name:'Lava Fisher',     emoji:'🌋', req:'molten_first'  },
    { id:'abyss_diver',    name:'Abyss Diver',     emoji:'❓', req:'abyss_first'   },
    { id:'blob_whisperer', name:'Blob Whisperer',  emoji:'🫠', req:'blob_caught'   },
    { id:'no_teeth',       name:'No Teeth Legend', emoji:'🐡', req:'golden_no_teeth'},
    { id:'boss_supreme',   name:'Boss Slayer Supreme',emoji:'👑',req:'boss_all'   },
    { id:'grand_enc',      name:'Grand Encyclopedist',emoji:'📖',req:'species100' },
    { id:'five_lives',     name:'Five Lives',      emoji:'🔄', req:'prestige5'     },
    { id:'billionaire',    name:'The Billionaire', emoji:'💰', req:'rich10m'       },
    { id:'centurion',      name:'Centurion',       emoji:'💯', req:'streak100'     },
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
        // No-cooldown override system (owner command)
        this.noCooldown   = new Map(); // userId → expiry timestamp
        this.wordleTokens = new Map(); // userId → token count
        this.dashboardTheme = new Map(); // userId → 'monochrome'|'discord'|'light'
        // ── NEW: Biome & Fish Leveling (previously missing — caused crashes) ──
        this.biome        = new Map(); // userId -> current biome id
        this.fishXP       = new Map(); // userId -> fishing XP
        this.fishLevel    = new Map(); // userId -> fishing level
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
            noCooldown:   Object.fromEntries(this.noCooldown),
            wordleTokens: Object.fromEntries(this.wordleTokens),
            dashboardTheme: Object.fromEntries(this.dashboardTheme),
            biome:m(this.biome), fishXP:m(this.fishXP), fishLevel:m(this.fishLevel),
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
        // Restore no-cooldown map; filter expired entries on load
        if (obj.noCooldown) {
            const now = Date.now();
            for (const [uid, exp] of Object.entries(obj.noCooldown)) {
                if (exp > now) this.noCooldown.set(String(uid), Number(exp));
            }
        }
        // Restore Wordle Token balances
        lo(this.wordleTokens, obj.wordleTokens, v=>Number(v)||0);
        lo(this.dashboardTheme, obj.dashboardTheme, v=>String(v));
        lo(this.biome,     obj.biome,     v=>String(v));
        lo(this.fishXP,    obj.fishXP,    v=>Number(v)||0);
        lo(this.fishLevel, obj.fishLevel, v=>Number(v)||1);
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
let guildPrefixes = {};
let advancedLogsConfig= {};

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
const WORDLE_BANNED_WORDS = new Set(['end','check']);
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
// BUG FIX: New biomes now return their specific fish + general fish up to maxRarity
function getBiomeFishPool(biomeId) {
    const biome = BIOMES.find(b => b.id === biomeId) || BIOMES[0];
    const maxIdx = getRarityIdx(biome.maxRarity);
    // New biomes: include biome-specific fish + general fish (no biome tag)
    const newBiomeIds = ['crystal_caverns','sunken_metropolis','void_ocean','molten_depths','celestial_sea_new','forgotten_abyss'];
    if (newBiomeIds.includes(biomeId)) {
        return FISH_SPECIES.filter(f => {
            if (getRarityIdx(f.r) > maxIdx) return false;
            // Include fish tagged for this biome OR fish with no biome tag (general)
            return !f.biome || f.biome === biomeId;
        });
    }
    // Original biomes: all fish without a biome tag, up to maxRarity
    return FISH_SPECIES.filter(f => getRarityIdx(f.r) <= maxIdx && !f.biome);
}

// ── FISHING ENGINE ──
function doFish(userId, biomeId = 'pond', baitId = null) {
    const uid  = String(userId);
    ensureJoinDate(uid);

    const rodId    = userData.rodEquipped.get(uid) || 'plastic';
    const rod      = FISHING_RODS.find(r => r.id === rodId) || FISHING_RODS[0];
    const enchants = userData.rodEnchants.get(uid) || [];
    // Bug 7 fix: respect weather override from admin abuse system
    const weather  = getAbuseWeather() || getCurrentWeather();
    const night    = isNight();
    const bait     = baitId ? BAIT_TYPES.find(b => b.id === baitId) : null;
    const event    = (userData.worldEvent && userData.worldEventEnd > Date.now()) ? userData.worldEvent : null;

    // Consume bait
    if (bait) {
        const inv = userData.baitInv.get(uid) || {};
        if ((inv[bait.id]||0) > 0) { inv[bait.id]--; if (!inv[bait.id]) delete inv[bait.id]; }
        userData.baitInv.set(uid, inv);
    }

    // Bug 1 fix: use abuse-adjusted rarity weights
    const adjustedWeights = getAdjustedRarityWeights();

    let pool = getBiomeFishPool(biomeId).map(fish => {
        let w = adjustedWeights[fish.r] || 100;

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
        // New weather: secretMult for secret fish
        if (fish.r === 'Secret' && weather.secretMult) w *= weather.secretMult;

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
            if (event.effect === 'legend2x'     && rIdx >= 4)            w *= 2;
            if (event.effect === 'rare3x'        && rIdx >= 2)            w *= 3;
            if (event.effect === 'myth_any'      && fish.r === 'Mythical')w *= 20;
            if (event.effect === 'secret_chance' && fish.r === 'Secret')  w *= 50;
            // New event effects
            if (event.effect === 'crystal_storm' && rIdx >= 2)            w *= 2;
            if (event.effect === 'epic4x'        && rIdx >= 3)            w *= 4;
            if (event.effect === 'starfall'      && rIdx >= 4)            w *= 3;
            if (event.effect === 'forgotten_tide'&& fish.r === 'Mythical')w *= 20;
            if (event.effect === 'blob_hint'     && fish.id === 'blob_fish') w *= 10;
        }

        // Enchant effects
        if (enchants.includes('magnetic') && rIdx >= 2) w *= 1.2;
        if (enchants.includes('void_touch') && fish.r === 'Secret' && ['void_ocean','forgotten_abyss'].includes(biomeId)) w *= 1.5;
        if (enchants.includes('crystal') && fish.biome === 'crystal_caverns') w *= 1.3;
        if (enchants.includes('blazing') && fish.biome === 'molten_depths') w *= 1.4;
        if (enchants.includes('starlight') && (weather.id === 'aurora' || weather.id === 'starfall')) w *= 1.25;

        return { ...fish, weight: Math.max(0.1, w) };
    });
          // FEATURE: Blob Fish special unlock — only catchable in Forgotten Abyss during Eclipse with Void Rod+
    pool = pool.filter(f => {
        if (f.id === 'blob_fish') {
            const isForgetAbyss = biomeId === 'forgotten_abyss';
            const isEclipseWeather = weather.id === 'eclipse' || weather.id === 'void_tide';
            const hasVoidRod = ['void','void_rod_mk2','abyss_rod','mythical','celestial','celestial_mk2','scylla'].includes(rodId);
            return isForgetAbyss && isEclipseWeather && hasVoidRod;
        }
        return true;
    });

    const caughtFish = weightedRandom(pool, 'weight');
    if (!caughtFish) return null;

    // Bug 1 fix: use abuse-adjusted mutation weights
    let mutPool = getAdjustedMutationWeights();
    if (enchants.includes('lucky'))  mutPool = mutPool.map(m => m.id !== 'none' ? {...m, weight: m.weight * 1.5} : m);
    if (enchants.includes('ancient')) mutPool = mutPool.map(m => m.id === 'ancient' ? {...m, weight: m.weight * 5} : m);
    if (bait?.bonus === 'mutation') mutPool = mutPool.map(m => m.id !== 'none' ? {...m, weight: m.weight * bait.mult} : m);
    if (bait?.bonus === 'ancient')  mutPool = mutPool.map(m => m.id === 'ancient' ? {...m, weight: m.weight * bait.mult} : m);
    if (event?.effect === 'mut5x')         mutPool = mutPool.map(m => m.id !== 'none' ? {...m, weight: m.weight * 5} : m);
    if (event?.effect === 'crystal_storm') mutPool = mutPool.map(m => m.id !== 'none' ? {...m, weight: m.weight * 3} : m);
    // Bug 8 fix: chaos mode forces a random non-none mutation
    if (abuseConfig.chaosMode) {
        const nonNone = mutPool.filter(m => m.id !== 'none');
        mutPool = nonNone.length ? nonNone : mutPool;
    }

    const mutation = weightedRandom(mutPool, 'weight');

// Weight
    const weight = parseFloat((Math.random() * (caughtFish.wMax - caughtFish.wMin) + caughtFish.wMin).toFixed(2));

    // Value — Bug 10 fix: apply abuse sell/coin multipliers
    const sellMult = getAbuseMultiplier('sell') * (abuseConfig.sellMult || 1);
    let value = Math.round(caughtFish.val * mutation.mult * (1 + weight / caughtFish.wMax * 0.5) * sellMult);
    if (enchants.includes('fortune')) value = Math.round(value * 1.3);
    if (event?.effect === 'sell3x')   value = Math.round(value * 3);
    if (event?.effect === 'starfall') value = Math.round(value * 2);

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

    // XP — Bug 10 fix: apply abuse xpMult
    const xpMult = getAbuseMultiplier('xp');
    const xpGain = Math.round(caughtFish.xp * mutation.mult * xpMult);
    const xpRes  = addXP(uid, xpGain);

    // Quest progress
    updateFishingQuest(uid, caughtFish, mutation, biomeId);

    // Achievement checks
    const gained = checkAchievements(uid, caughtFish, mutation, stats, biomeId, event?.id || null);

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

function updateFishingQuest(userId, fish, mutation, biomeId) {
    const q = userData.fishQuest.get(userId);
    if (!q || q.done) return;
    const today = new Date().toDateString();
    if (q.date !== today) return;
    if (q.type === 'catch_any')    q.progress = (q.progress||0) + 1;
    if (q.type === 'catch_rarity' && fish.r === q.target) q.progress = (q.progress||0) + 1;
    if (q.type === 'catch_fish'   && fish.id === q.target) q.progress = (q.progress||0) + 1;
    if (q.type === 'catch_mutation' && mutation.id !== 'none') q.progress = (q.progress||0) + 1;
    // BUG FIX: New quest type — catch fish in specific biome
    if (q.type === 'catch_biome'  && biomeId === q.target) q.progress = (q.progress||0) + 1;
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
    // Pick a random common/uncommon fish for catch_fish type
    const catchableFish = FISH_SPECIES.filter(f=>['Common','Uncommon','Rare'].includes(f.r));
    const targetFish = catchableFish[rng(0, catchableFish.length-1)];
    const biomeTargets = ['pond','river','lake','ocean','crystal_caverns','molten_depths','forgotten_abyss'];
    const biomePick = biomeTargets[rng(0, biomeTargets.length-1)];
    const biomeName = BIOMES.find(b=>b.id===biomePick)?.name || biomePick;
    const types = [
        { type:'catch_any',      target:null,              goal:rng(5,15),  reward:rng(300,800),   xpReward:150,  label:'Catch any fish' },
        { type:'catch_rarity',   target:rarities[rng(0,2)],goal:rng(2,5),   reward:rng(800,2500),  xpReward:400,  label:`Catch ${rarities[rng(0,2)]} fish` },
        { type:'catch_mutation', target:null,              goal:rng(1,3),   reward:rng(1500,4000), xpReward:600,  label:'Catch mutated fish' },
        { type:'catch_fish',     target:targetFish?.id,    goal:rng(1,3),   reward:rng(500,1500),  xpReward:300,  label:`Catch ${targetFish?.name||'a specific fish'}` },
        { type:'catch_biome',    target:biomePick,         goal:rng(3,8),   reward:rng(600,2000),  xpReward:350,  label:`Catch fish in ${biomeName}` },
    ];
    const q = { ...types[rng(0,types.length-1)], date:today, progress:0, done:false };
    userData.fishQuest.set(userId, q);
    return q;
}

function checkAchievements(uid, fish, mutation, stats, biomeId, eventId) {
    const owned = userData.achievementsNew.get(uid) || [];
    const gained = [];
    const caughtMap = userData.fishCaught.get(uid) || {};
    for (const ach of ACHIEVEMENTS) {
        if (owned.includes(ach.id)) continue;
        const c = ach.cond;
        let unlock = false;
        if (c.t === 'catch'    && stats.total >= c.n) unlock = true;
        if (c.t === 'rarity'   && fish.r === c.r)    unlock = true;
        if (c.t === 'mutation' && mutation.id !== 'none') unlock = true;
        if (c.t === 'mut_type' && mutation.id === c.m) unlock = true;
        // New condition types
        if (c.t === 'biome'   && biomeId === c.b)    unlock = true;
        if (c.t === 'fish_id' && fish.id === c.id)   {
            if (c.mut) { if (mutation.id === c.mut) unlock = true; }
            else unlock = true;
        }
        if (c.t === 'event'   && eventId === c.e)    unlock = true;
        if (c.t === 'species' && Object.keys(caughtMap).length >= c.n) unlock = true;
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

// ── WORDLE — variable-length evaluator for the staff-hosted system ──
function evaluateWordleGuess(word, guess) {
    const len = word.length;
    const result = Array(len).fill('⬛');
    const wordLetters = word.split('');
    const guessLetters = guess.split('');
    for (let i = 0; i < len; i++) {
        if (guessLetters[i] === wordLetters[i]) {
            result[i] = '🟩';
            wordLetters[i] = null;
            guessLetters[i] = null;
        }
    }
    for (let i = 0; i < len; i++) {
        if (guessLetters[i] === null) continue;
        const idx = wordLetters.indexOf(guessLetters[i]);
        if (idx !== -1) {
            result[i] = '🟨';
            wordLetters[idx] = null;
        }
    }
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
        if (raw.guildPrefixes)   guildPrefixes = raw.guildPrefixes;
        if (raw.abuseConfig)     Object.assign(abuseConfig, raw.abuseConfig);
        if (raw.webhookConfig)   Object.assign(webhookConfig, raw.webhookConfig);
        if (raw.advancedLogsConfig) Object.assign(advancedLogsConfig, raw.advancedLogsConfig);
        console.log('✅ Data loaded');
    } catch (e) { console.error('❌ Load error:', e?.message); }
}

let saveTimeout = null;
const SAVE_DELAY = 5000; // Save every 5 seconds, or after 5 seconds of inactivity

async function saveData(force = false) {
    const data = JSON.stringify({
        userData:         userData.toJSON(),
        staff:            [...staffSet],
        autoResponses:    Object.fromEntries(autoResponses),
        welcomeConfig, logsConfig, ticketConfig, suggestionConfig, levelAnnounceConfig,
        guildPrefixes,
        abuseConfig, webhookConfig, advancedLogsConfig,
    }, null, 2);

    if (force) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
        try {
            await fs.writeFile(DATA_FILE, data, 'utf8');
            console.log('💾 Data force-saved successfully.');
        } catch (e) {
            console.error('❌ Force Save error:', e?.message);
            throw e; // Rethrow so graceful shutdown can detect failure
        }
        return;
    }

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        try {
            await fs.writeFile(DATA_FILE, data, 'utf8');
            saveTimeout = null;
        } catch (e) { console.error('❌ Save error:', e?.message); }
    }, SAVE_DELAY);
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
    new SlashCommandBuilder().setName('wordle').setDescription('🎮 Start or end a staff-hosted Wordle game')
    .addStringOption(o=>o.setName('word').setDescription('Word for the wordle, or "end" to end it').setRequired(true).setMinLength(2).setMaxLength(10))
    .addChannelOption(o=>o.setName('channel').setDescription('Channel for the wordle (defaults to current channel)').setRequired(false))
    .addIntegerOption(o=>o.setName('reward').setDescription('Wordle Tokens to give the winner (max 10000)').setRequired(false).setMinValue(0).setMaxValue(10000))
    .addIntegerOption(o=>o.setName('coins').setDescription('Bonus coins to give the winner (max 10000)').setRequired(false).setMinValue(0).setMaxValue(10000)),
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
    // addxp, addcoins, addstaff, deletecoins are prefix-only (!addxp !addcoins !addstaff !deletecoins)
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
    new SlashCommandBuilder().setName('resetuser').setDescription('🗑️ Full reset of a users data (owner — use with care!)')
        .addUserOption(o=>o.setName('user').setDescription('Target user').setRequired(true)),

    new SlashCommandBuilder().setName('botinfo').setDescription('ℹ️ Info and credits for this bot'),
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
    console.log(`╔══════════════════════════════════════════════╗`);
    console.log(`║  🤖 Ultimate Discord Bot — by noobnoob_81    ║`);
    console.log(`║  Nothing is AI'ly made. All was made by      ║`);
    console.log(`║  noobnoob_81. All others who claim to have   ║`);
    console.log(`║  this bot are wrong!                         ║`);
    console.log(`╚══════════════════════════════════════════════╝`);
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

    // ── Start the dashboard API server ──
startDashboardServer(client, {
    userData,
    logsConfig, welcomeConfig, ticketConfig, suggestionConfig,
    autoResponses, staffSet,
    wordleGames, abuseConfig,
    guildPrefixes,
    OWNER_ID,
    saveData,
    addCoins, addXP,
    fmtN, getLevelInfo,
    BIOMES, RARITY_WEIGHTS,
});

    // ── Initialize the Aura RNG system ──
    await rngState.init();
    console.log('✨ Aura RNG system ready.');
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
    const row1 = new ActionRowBuilder();
    const row2 = new ActionRowBuilder();
    for (let c = 0; c < 7; c++) {
        const btn = new ButtonBuilder()
            .setCustomId(`c4_${gameKey}_${c}`)
            .setLabel(`${c+1}`)
            .setStyle(ButtonStyle.Primary);
        if (c < 4) row1.addComponents(btn);
        else row2.addComponents(btn);
    }
    return [row1, row2];
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

if (cmd==='botinfo') {
    return interaction.reply({embeds:[new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🤖 Ultimate Discord Bot — Credits')
        .setDescription(
            '> *"Nothing is AI\'ly made. All was made by **noobnoob_81**.\n' +
            '> All others who claim to have this bot are wrong!"*'
        )
        .addFields(
            {name:'👑 Created by',   value:'**noobnoob_81**',                          inline:true},
            {name:'📦 Version',      value:'**v3.0.0**',                               inline:true},
            {name:'🛠️ Framework',   value:'Discord.js v14',                            inline:true},
            {name:'🎣 Fishing',      value:'Full rarity/mutation/biome/boss system',   inline:false},
            {name:'⚔️ RPG',         value:'Classes, dungeons, skills, armor, crafting',inline:false},
            {name:'🏘️ Guilds',      value:'Bank, leaderboard, wars',                  inline:false},
            {name:'🎮 Games',        value:'Wordle, FNF, Blackjack, TTT, Connect4 & more',inline:false},
            {name:'⚠️ Ownership',   value:'This bot was built by **noobnoob_81**. Anyone claiming ownership without credit is lying.',inline:false},
        )
        .setFooter({text:'Built with ❤️ by noobnoob_81 • Not AI-generated'})
        .setTimestamp()
    ]});
}

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
            {name:'😂 Fun (prefix)', value:'`!fakeban` `!fakekick` `!fakemute` `!fakewarn` `!roast` `!ship` `!ownership` `!rate` `!mock` `!reverse` `!sus` `!8ball` `!rickroll` `!impersonate` `!say` `!fact` `!joke`'},
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
// ── GAMES ─_

console.log("=== WORDLE DEBUG ===");
console.log("interaction.commandName:", interaction.commandName);
console.log("cmd:", cmd);
    
if (cmd === 'wordle') {
    try {
        const isStaffSlash = staffSet.has(`${guildId}:${userId}`) || staffSet.has(userId) || userId === OWNER_ID;
        if (!isStaffSlash) {
            return interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
        }

        const wordRaw = String(interaction.options.getString('word') || '').trim();
        const wordLower = wordRaw.toLowerCase();

        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        const chanId = String(targetChannel.id);

        const rewardTokens = Math.min(
            10000,
            Math.max(0, interaction.options.getInteger('reward') ?? 0)
        );

        const rewardCoins = Math.min(
            10000,
            Math.max(0, interaction.options.getInteger('coins') ?? 0)
        );

        const botMember = targetChannel.guild?.members?.me;
        const perms = botMember ? targetChannel.permissionsFor(botMember) : null;

        if (!perms || !perms.has('SendMessages') || !perms.has('ReadMessageHistory') || !perms.has('ViewChannel')) {
            return interaction.reply({
                content: '⚠️ The bot is missing permissions in that channel.',
                ephemeral: true
            });
        }

        if (wordLower === 'end') {
            if (!wordleGames.has(chanId)) {
                return interaction.reply({
                    content: '❌ There is no active wordle in that channel.',
                    ephemeral: true
                });
            }

            wordleGames.delete(chanId);

            await targetChannel.send(
                `## Wordle ended by ${interaction.user} in <#${chanId}>`
            ).catch(() => {});

            return interaction.reply({
                content: '✅ Wordle ended.',
                ephemeral: false
            });
        }

        if (wordLower === 'check') {
            if (userId !== OWNER_ID) {
                return interaction.reply({
                    content: '❌ Owner only.',
                    ephemeral: true
                });
            }

            const g = wordleGames.get(chanId);

            if (!g) {
                return interaction.reply({
                    content: '❌ No active wordle.',
                    ephemeral: true
                });
            }

            return interaction.reply({
                content: `🔎 Current word: \`${g.word}\``,
                ephemeral: true
            });
        }

        if (wordRaw.length < 2 || wordRaw.length > 10 || !/^[a-zA-Z]+$/.test(wordRaw)) {
            return interaction.reply({
                content: '❌ Word must be 2-10 letters.',
                ephemeral: true
            });
        }

        if (WORDLE_BANNED_WORDS.has(wordLower)) {
            return interaction.reply({
                content: '❌ That word is not allowed.',
                ephemeral: true
            });
        }

        if (wordleGames.has(chanId)) {
            return interaction.reply({
                content: '❌ A wordle is already running there.',
                ephemeral: true
            });
        }

        wordleGames.set(chanId, {
            word: wordLower,
            reward: rewardTokens,
            coinReward: rewardCoins,
            hostId: userId,
            guildId,
            startedAt: Date.now(),
        });

        const rewardText =
            (rewardTokens > 0 || rewardCoins > 0)
                ? ` with a reward of ${
                    rewardTokens > 0
                        ? `**${rewardTokens}** Wordle Token${rewardTokens === 1 ? '' : 's'}`
                        : ''
                }${
                    rewardTokens > 0 && rewardCoins > 0 ? ' and ' : ''
                }${
                    rewardCoins > 0
                        ? `**${fmtN(rewardCoins)}** coins`
                        : ''
                }`
                : '';

        await interaction.reply({
            content: `✅ Wordle started${rewardText}`,
            ephemeral: true
        });

        await targetChannel.send(
            `## 🎮 New Wordle Game!\n\nWord length: **${wordLower.length}**\n\nType your guesses in this channel!`
        ).catch(() => {});

    } catch (err) {
        console.error("❌ WORDLE ERROR:", err);

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({
                content: "❌ An internal Wordle error occurred."
            }).catch(() => {});
        } else {
            await interaction.reply({
                content: "❌ An internal Wordle error occurred.",
                ephemeral: true
            }).catch(() => {});
        }
    }

    return;
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
        if(lc)lc.send({embeds:[new EmbedBuilder().setColor(0xED4245).setTitle('🔨 User Banned').addFields({name:'User',value:target.username,inline:true},{name:'By',value:interaction.user.username,inline:true},{name:'Reason',value:reason}).setTimestamp()]}).catch(()=>{});
        return interaction.reply({content:`🔨 **${target.username}** banned — ${reason}`});
    } catch(e){return interaction.reply({content:'❌ Failed to ban. Check permissions.',ephemeral:true});}
}

if (cmd==='setlogs') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    const channel=interaction.options.getChannel('channel');
    logsConfig[guildId]={channelId:String(channel.id)};
    await saveData();
    return interaction.reply({content:`✅ Mod-logs will now be sent to ${channel}.`,ephemeral:true});
}
if (cmd==='deletelogs') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    delete logsConfig[guildId]; await saveData();
    return interaction.reply({content:'✅ Mod-logs disabled for this server.',ephemeral:true});
}
if (cmd==='setwelcome') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    const channel=interaction.options.getChannel('channel');
    const role=interaction.options.getRole('role');
    welcomeConfig[guildId]={channelId:String(channel.id),roleId:role?String(role.id):null};
    await saveData();
    return interaction.reply({content:`✅ Welcome messages will be sent to ${channel}${role?` with auto-role ${role}`:''}.`,ephemeral:true});
}
if (cmd==='deletewelcome') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    delete welcomeConfig[guildId]; await saveData();
    return interaction.reply({content:'✅ Welcome system disabled.',ephemeral:true});
}
if (cmd==='settickets') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    const channel=interaction.options.getChannel('channel');
    ticketConfig[guildId]={channelId:String(channel.id)};
    await saveData();
    return interaction.reply({content:`✅ Ticket panel channel set to ${channel}.`,ephemeral:true});
}
if (cmd==='deletetickets') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    delete ticketConfig[guildId]; await saveData();
    return interaction.reply({content:'✅ Ticket system disabled.',ephemeral:true});
}
if (cmd==='setsuggestions') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    const channel=interaction.options.getChannel('channel');
    suggestionConfig[guildId]={channelId:String(channel.id)};
    await saveData();
    return interaction.reply({content:`✅ Suggestions will now be sent to ${channel}.`,ephemeral:true});
}
if (cmd==='deletesuggestions') {
    if (!isStaff) return interaction.reply({content:'❌ Staff only!',ephemeral:true});
    delete suggestionConfig[guildId]; await saveData();
    return interaction.reply({content:'✅ Suggestions disabled.',ephemeral:true});
}
if (cmd==='suggest') {
    const text=interaction.options.getString('text');
    const cfg=suggestionConfig[guildId];
    if (!cfg?.channelId) return interaction.reply({content:'❌ Suggestions are not set up in this server. Ask staff to run `/setsuggestions`.',ephemeral:true});
    const ch=await interaction.guild.channels.fetch(cfg.channelId).catch(()=>null);
    if (!ch) return interaction.reply({content:'❌ Suggestion channel not found. Ask staff to reconfigure it.',ephemeral:true});
    const embed=new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('💡 New Suggestion')
        .setDescription(text)
        .setFooter({text:`Suggested by ${interaction.user.username}`})
        .setTimestamp();
    const sent=await ch.send({embeds:[embed]}).catch(()=>null);
    if (sent) { sent.react('👍').catch(()=>{}); sent.react('👎').catch(()=>{}); }
    return interaction.reply({content:'✅ Your suggestion has been submitted!',ephemeral:true});
}
if (cmd==='removestaff') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const target=interaction.options.getUser('user');
    if (!target) return interaction.reply({content:'❌ Provide a user.',ephemeral:true});
    const key=`${guildId}:${String(target.id)}`;
    if (!staffSet.has(key)) return interaction.reply({content:`❌ **${target.username}** is not staff.`,ephemeral:true});
    staffSet.delete(key);
    await saveData();
    return interaction.reply({content:`✅ **${target.username}** is no longer staff.`,ephemeral:true});
}
if (cmd==='liststaffs') {
    const prefix=`${guildId}:`;
    const staffIds=[...staffSet].filter(s=>s.startsWith(prefix)).map(s=>s.slice(prefix.length));
    if (!staffIds.length) return interaction.reply({content:'📋 No staff have been added in this server yet.',ephemeral:true});
    const embed=new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('👮 Server Staff')
        .setDescription(staffIds.map(id=>`<@${id}>`).join('\n'))
        .setFooter({text:`${staffIds.length} staff member(s)`});
    return interaction.reply({embeds:[embed],ephemeral:true});
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
    if (myListings.length>=5) return interaction.reply({content:'❌ Max 5 active listings. Remove one with `/deletemarketlisting <id>` first.',ephemeral:true});
    // Validate item exists before listing
    let itemToSell = null;
    if (type === 'weapon') itemToSell = WEAPONS.find(w => w.id === itemId);
    else if (type === 'item') itemToSell = ITEMS.find(i => i.id === itemId);
    else if (type === 'pet') itemToSell = PETS.find(p => p.id === itemId);
    else if (type === 'rod') itemToSell = FISHING_RODS.find(r => r.id === itemId);
    else if (type === 'bait') itemToSell = BAIT_TYPES.find(b => b.id === itemId);
    else if (type === 'enchant') itemToSell = ROD_ENCHANTS.find(e => e.id === itemId);
    else if (type === 'craftmat') itemToSell = CRAFT_MATS.find(c => c.id === itemId);

    if (!itemToSell) return interaction.reply({content:'❌ Invalid item ID or type. Cannot list a non-existent item.',ephemeral:true});

    // Check if user actually owns the item they are trying to list
    let userOwnsItem = false;
    if (type === 'weapon') userOwnsItem = (userData.weapons.get(userId) || []).some(w => w.id === itemId);
    else if (type === 'item') userOwnsItem = (userData.items.get(userId) || []).some(i => i.id === itemId);
    else if (type === 'pet') userOwnsItem = (userData.pets.get(userId) || {}).id === itemId;
    else if (type === 'rod') userOwnsItem = (userData.rodOwned.get(userId) || []).includes(itemId);
    else if (type === 'bait') userOwnsItem = ((userData.baitInv.get(userId) || {})[itemId] || 0) > 0;
    else if (type === 'enchant') userOwnsItem = (userData.rodEnchants.get(userId) || []).includes(itemId);
    else if (type === 'craftmat') userOwnsItem = ((userData.craftMats.get(userId) || {})[itemId] || 0) > 0;

        if (!userOwnsItem) return interaction.reply({content:'❌ You do not own this item or enough of it to list.',ephemeral:true});

    // 1% listing fee minimum 10 coins
    const fee=Math.max(10,Math.floor(price*0.01));
    if (coins(userId)<fee) return interaction.reply({content:`❌ Listing fee: **${fmtN(fee)} coins** (1% of price).`,ephemeral:true});
    
    // Remove item from seller's inventory if it's a single-instance item (weapon, item, pet, rod, enchant)
    if (type === 'weapon') {
        const weapons = userData.weapons.get(userId) || [];
        const idx = weapons.findIndex(w => w.id === itemId);
        if (idx !== -1) weapons.splice(idx, 1);
        userData.weapons.set(userId, weapons);
    }
    else if (type === 'item') {
        const items = userData.items.get(userId) || [];
        const idx = items.findIndex(i => i.id === itemId);
        if (idx !== -1) items.splice(idx, 1);
        userData.items.set(userId, items);
    }
    else if (type === 'pet') userData.pets.delete(userId);
    else if (type === 'rod') {
        const ownedRods = userData.rodOwned.get(userId) || [];
        userData.rodOwned.set(userId, ownedRods.filter(r => r !== itemId));
        if (userData.rodEquipped.get(userId) === itemId) userData.rodEquipped.set(userId, 'plastic'); // Unequip if listed
    }
    else if (type === 'enchant') {
        const ownedEnchants = userData.rodEnchants.get(userId) || [];
        userData.rodEnchants.set(userId, ownedEnchants.filter(e => e !== itemId));
    }
    else if (type === 'bait') {
        const baitInv = userData.baitInv.get(userId) || {};
        baitInv[itemId]--;
        if (baitInv[itemId] <= 0) delete baitInv[itemId];
        userData.baitInv.set(userId, baitInv);
    }
    else if (type === 'craftmat') {
        const craftMats = userData.craftMats.get(userId) || {};
        craftMats[itemId]--;
        if (craftMats[itemId] <= 0) delete craftMats[itemId];
        userData.craftMats.set(userId, craftMats);
    }

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
    // Validate itemId against known item types
    let itemExists = false;
    if (listing.type === 'weapon') itemExists = WEAPONS.some(w => w.id === listing.itemId);
    else if (listing.type === 'item') itemExists = ITEMS.some(i => i.id === listing.itemId);
    else if (listing.type === 'pet') itemExists = PETS.some(p => p.id === listing.itemId);
    else if (listing.type === 'rod') itemExists = FISHING_RODS.some(r => r.id === listing.itemId);
    else if (listing.type === 'bait') itemExists = BAIT_TYPES.some(b => b.id === listing.itemId);
    else if (listing.type === 'enchant') itemExists = ROD_ENCHANTS.some(e => e.id === listing.itemId);
    else if (listing.type === 'craftmat') itemExists = CRAFT_MATS.some(c => c.id === listing.itemId);

    if (!itemExists) {
        userData.marketplace.delete(lid); // Remove invalid listing
        await saveData();
        return interaction.reply({content:'❌ This listing is for an invalid or non-existent item and has been removed.',ephemeral:true});
    }
    if (listing.seller===userId) return interaction.reply({content:"❌ Can't buy your own listing!",ephemeral:true});
    if (coins(userId)<listing.price) return interaction.reply({content:`❌ Need **${fmtN(listing.price)} coins**!`,ephemeral:true});
    addCoins(userId,-listing.price);
    addCoins(listing.seller,Math.floor(listing.price*0.9)); // 10% marketplace tax
    userData.marketplace.delete(lid);
    const inv=userData.items.get(userId)||[];
    // Create a proper item object based on type
    let purchasedItem = null;
    if (listing.type === 'weapon') purchasedItem = WEAPONS.find(w => w.id === listing.itemId);
    else if (listing.type === 'item') purchasedItem = ITEMS.find(i => i.id === listing.itemId);
    else if (listing.type === 'pet') purchasedItem = PETS.find(p => p.id === listing.itemId);
    else if (listing.type === 'rod') purchasedItem = FISHING_RODS.find(r => r.id === listing.itemId);
    else if (listing.type === 'bait') purchasedItem = BAIT_TYPES.find(b => b.id === listing.itemId);
    else if (listing.type === 'enchant') purchasedItem = ROD_ENCHANTS.find(e => e.id === listing.itemId);
    else if (listing.type === 'craftmat') purchasedItem = CRAFT_MATS.find(c => c.id === listing.itemId);

    if (!purchasedItem) { // Should not happen if itemExists check passed, but for safety
        userData.marketplace.delete(lid);
        await saveData();
        return interaction.reply({content:'❌ An error occurred while processing the item. Listing removed.',ephemeral:true});
    }

    if (listing.type === 'pet') userData.pets.set(userId, {id:purchasedItem.id,name:purchasedItem.name,xp:0,level:1});
    else if (listing.type === 'rod') {
        const ownedRods = userData.rodOwned.get(userId) || [];
        if (!ownedRods.includes(purchasedItem.id)) ownedRods.push(purchasedItem.id);
        userData.rodOwned.set(userId, ownedRods);
        userData.rodEquipped.set(userId, purchasedItem.id);
    }
    else if (listing.type === 'enchant') {
        const ownedEnchants = userData.rodEnchants.get(userId) || [];
        if (!ownedEnchants.includes(purchasedItem.id)) ownedEnchants.push(purchasedItem.id);
        userData.rodEnchants.set(userId, ownedEnchants);
    }
    else if (listing.type === 'bait') {
        const baitInv = userData.baitInv.get(userId) || {};
        baitInv[purchasedItem.id] = (baitInv[purchasedItem.id] || 0) + 1;
        userData.baitInv.set(userId, baitInv);
    }
    else if (listing.type === 'craftmat') {
        const craftMats = userData.craftMats.get(userId) || {};
        craftMats[purchasedItem.id] = (craftMats[purchasedItem.id] || 0) + 1;
        userData.craftMats.set(userId, craftMats);
    }
    else if (listing.type === 'weapon') {
        const weapons = userData.weapons.get(userId) || [];
        weapons.push({...purchasedItem});
        userData.weapons.set(userId, weapons);
    }
    else { // Generic items
        const items = userData.items.get(userId) || [];
        items.push({...purchasedItem});
        userData.items.set(userId, items);
    }
    await saveData();
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

// ════════════════════════════════════════════════════════════════
// FISHING COMMANDS
// ════════════════════════════════════════════════════════════════
if (cmd==='fish') {
    // BUG FIX + FEATURE: Check no-cooldown override before enforcing cooldown
    const ncExp = userData.noCooldown.get(userId);
    const hasNoCooldown = ncExp && ncExp > Date.now();
    if (!hasNoCooldown) {
        const rem=cooldownManager.get(userId,'fish');
        if (rem) return interaction.reply({content:`⏰ Fishing cooldown: **${cdStr(rem)}**`,ephemeral:true});
    }
    const biomeId=interaction.options.getString('biome')||'pond';
    const baitId=interaction.options.getString('bait')||null;
    const biome=BIOMES.find(b=>b.id===biomeId)||BIOMES[0];
    const lvInfo=getLevelInfo(userData.xp.get(userId)||0);
    if (lvInfo.level<biome.unlockLv) return interaction.reply({content:`❌ Need **Level ${biome.unlockLv}** to fish in ${biome.name}! You are Level ${lvInfo.level}.`,ephemeral:true});
    if (baitId){const inv=userData.baitInv.get(userId)||{};if (!inv[baitId]||inv[baitId]<=0) return interaction.reply({content:`❌ No ${baitId} bait! Buy with \`/buybait\`.`,ephemeral:true});}
    await interaction.deferReply();
    await new Promise(r=>setTimeout(r,1500));
    const res=doFish(userId,biomeId,baitId);
    if (!res) return interaction.editReply({content:'❌ Something went wrong. Try again!'});
    const {fish,mutation,weight,value,xpGain,xpRes,weather,night,streak,chestGold,gained}=res;
    // Bug 5 fix: transform name/emoji for special secret fish with shiny mutation
    const isShiny = mutation.id === 'shiny';
    let displayName  = (isShiny && fish.shinyName)  ? fish.shinyName  : fish.name;
    let displayEmoji = (isShiny && fish.shinyEmoji) ? fish.shinyEmoji : fish.emoji;

    // Special: Blob Fish Shiny Transformation
    if (fish.id === 'blob_fish' && isShiny) {
        displayName = "The Golden No Teeth Fish";
        displayEmoji = "✨🐡";
    }
    const enchants=userData.rodEnchants.get(userId)||[];
    cooldownManager.set(userId,'fish',enchants.includes('swift')?22_000:30_000);
    const pet=userData.pets.get(userId);
    if (pet){pet.xp=(pet.xp||0)+10;if(pet.xp>=(pet.level||1)*100){pet.level=(pet.level||1)+1;pet.xp=0;}userData.pets.set(userId,pet);}
    // Battle pass XP
    const bp=userData.battlePass.get(userId)||{tier:1,bpXp:0,premium:false,season:SEASON};
    bp.bpXp=(bp.bpXp||0)+5;
    const nextTier=BP_TIERS.find(t=>t.tier===bp.tier+1);
    if (nextTier&&bp.bpXp>=nextTier.bpXp&&bp.tier<10){bp.tier++;if(nextTier.free.coins)addCoins(userId,nextTier.free.coins);if(nextTier.free.xp)addXP(userId,nextTier.free.xp);}
    userData.battlePass.set(userId,bp);
    const color=RARITY_COLORS[fish.r]||0x9E9E9E;
    const mutStr=mutation.id!=='none'?` ${mutation.emoji} **${mutation.name}**`:'';
    const embed=new EmbedBuilder().setColor(color)
        .setTitle(`🎣 Caught a${mutStr} **${displayName}**!`)
        .setDescription(`${displayEmoji} *${fish.desc}*`)
        .addFields(
            {name:'🏷️ Rarity', value:fish.r,             inline:true},
            {name:'⚖️ Weight', value:`${weight} kg`,      inline:true},
            {name:'💰 Value',  value:`${fmtN(value)} coins`,inline:true},
            {name:'⭐ XP',     value:`+${fmtN(xpGain)}`,  inline:true},
            {name:'🌤️ Weather',value:`${weather.emoji} ${weather.name}`,inline:true},
            {name:'🔥 Streak', value:`${streak} day(s)`,  inline:true},
        )
        .setFooter({text:`${biome.emoji} ${biome.name} • Use /sellfish to sell`});
    if (mutation.id!=='none') embed.addFields({name:`${mutation.emoji} Mutation!`,value:`**${mutation.name}** — ${mutation.mult}x value multiplier!`});
    if (isShiny && fish.shinyName) embed.addFields({name:'✨ Secret Transform!',value:`This fish transformed into **${fish.shinyEmoji} ${fish.shinyName}** due to its Shiny mutation!`});
    if (chestGold>0) embed.addFields({name:'💰 Treasure Chest!',value:`Found **${fmtN(chestGold)} coins**!`});
    if (xpRes.leveledUp) embed.addFields({name:'🎉 Level Up!',value:`You reached **Level ${xpRes.newLevel}**!`});
    if (gained.length) embed.addFields({name:'🏆 Achievement!',value:gained.map(a=>`${a.emoji} **${a.name}** +${fmtN(a.reward)}c`).join('\n')});
    if (night) embed.addFields({name:'🌙 Night Bonus',value:'Rare fish rate increased!'});
    const sellMult2 = getAbuseMultiplier('sell');
    const xpMult2   = getAbuseMultiplier('xp');
    if (sellMult2>1||xpMult2>1) embed.addFields({name:'🚨 Abuse Boost Active!',value:[sellMult2>1?`💰 Sell x${sellMult2}`:'',xpMult2>1?`⭐ XP x${xpMult2}`:''].filter(Boolean).join(' | ')});
    // Fisch Webhook logic
    try {
        const guildId = String(interaction.guildId);
        const hookCfg = webhookConfig['fish_webhook_' + guildId];
        if (hookCfg) {
            const hook = await interaction.channel.createWebhook({
                name: `${interaction.user.username}'s Fisch`,
                avatar: interaction.user.displayAvatarURL(),
                reason: 'Fisch Webhook System'
            }).catch(() => null);

            if (hook) {
                await hook.send({ embeds: [embed] }).catch(() => {});
                await hook.delete().catch(() => {});
                // Original reply becomes ephemeral if webhook works
                return interaction.editReply({ content: '✅ Caught!', ephemeral: true });
            }
        }
    } catch (e) { console.error('Fisch Webhook error:', e?.message); }

    // Webhook fish log
    await sendWebhookLog('fish', new EmbedBuilder().setColor(RARITY_COLORS[fish.r]||0x9E9E9E)
        .setTitle(`[CATCH] ${displayEmoji} ${displayName}`)
        .setDescription(`**User:** ${interaction.user.tag}\n**Rarity:** ${fish.r}\n**Mutation:** ${mutation.name}\n**Value:** ${fmtN(value)} coins\n**Biome:** ${biomeId}`)
        .setTimestamp());
    await saveData();
    return interaction.editReply({embeds:[embed]});
}

if (cmd==='fishguide') {
    const embed=new EmbedBuilder().setColor(0x2196F3).setTitle('🎣 Fishing Guide')
        .addFields(
            {name:'📍 Biomes',    value:BIOMES.map(b=>`${b.emoji} **${b.name}** (Lv${b.unlockLv}+) — ${b.desc}`).join('\n')},
            {name:'🌤️ Weather',  value:'Changes every 2h. Storm = rare fish. Eclipse = legendary surge.'},
            {name:'🌙 Night',    value:'Night (20:00–06:00 UTC) = +50% rare fish chance.'},
            {name:'🧬 Mutations',value:'Multiply fish value. Prismatic = 15x! Use lucky bait or Lucky enchant.'},
            {name:'💰 Selling',  value:'`/sellfish all` sells everything. Keep Legendary+!'},
            {name:'📋 Quests',   value:'Daily quests give bonus coins. Use `/fishquest`.'},
            {name:'🦈 Bosses',   value:'Boss fish spawn randomly. Use `/fishboss` to attack!'},
            {name:'👑 Scylla',   value:'Catch all 3 secret fish to craft the Scylla Key!'},
        );
    return interaction.reply({embeds:[embed]});
}

if (cmd==='rodshop') {
    const owned=userData.rodOwned.get(userId)||[];
    const equip=userData.rodEquipped.get(userId)||'plastic';
    const lvInfo=getLevelInfo(userData.xp.get(userId)||0);
    const lines=FISHING_RODS.map(r=>{
        const isOwned=owned.includes(r.id)||(r.id==='plastic');
        const isEquip=equip===r.id;
        const canBuy=lvInfo.level>=r.reqLv&&!r.reqQ&&r.price>0;
        const status=isEquip?'✅ Equipped':isOwned?'📦 Owned':canBuy?`💰 ${fmtN(r.price)}c`:(r.reqQ?`🔒 Quest: ${r.reqQ}`:`🔒 Lv${r.reqLv}`);
        return `${r.emoji} **${r.name}** [Lv${r.reqLv}] — ${status}\n  └ Power:x${r.pwr} Luck:+${r.luck} | ${r.desc}`;
    });
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x2196F3).setTitle('🎣 Rod Shop').setDescription(lines.join('\n\n')).setFooter({text:'Buy: /buyrod <id> | Equip: /equiprod <id>'})]});
}

if (cmd==='buyrod') {
    const rid=interaction.options.getString('rod');
    const rod=FISHING_RODS.find(r=>r.id===rid);
    if (!rod) return interaction.reply({content:'❌ Invalid rod ID. Check `/rodshop`.',ephemeral:true});
    if (!rod.price) return interaction.reply({content:'❌ This rod cannot be purchased directly.',ephemeral:true});
    const owned=userData.rodOwned.get(userId)||[];
    if (owned.includes(rid)) return interaction.reply({content:'❌ Already own this rod!',ephemeral:true});
    const lvInfo=getLevelInfo(userData.xp.get(userId)||0);
    if (lvInfo.level<rod.reqLv) return interaction.reply({content:`❌ Need **Level ${rod.reqLv}**! You are Level ${lvInfo.level}.`,ephemeral:true});
    if (rod.reqQ) return interaction.reply({content:`❌ Requires quest: **${rod.reqQ}**`,ephemeral:true});
    if (coins(userId)<rod.price) return interaction.reply({content:`❌ Need **${fmtN(rod.price)}** coins!`,ephemeral:true});
    addCoins(userId,-rod.price);
    owned.push(rid); userData.rodOwned.set(userId,owned);
    userData.rodEquipped.set(userId,rid);
    await saveData();
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle(`${rod.emoji} Rod Purchased & Equipped!`).setDescription(`**${rod.name}**\n${rod.desc}`)]});
}

if (cmd==='equiprod') {
    const rid=interaction.options.getString('rod');
    const rod=FISHING_RODS.find(r=>r.id===rid);
    if (!rod) return interaction.reply({content:'❌ Invalid rod ID.',ephemeral:true});
    const owned=userData.rodOwned.get(userId)||[];
    if (!owned.includes(rid)&&rid!=='plastic') return interaction.reply({content:"❌ Don't own this rod! Buy with `/buyrod`.",ephemeral:true});
    userData.rodEquipped.set(userId,rid); await saveData();
    return interaction.reply({content:`✅ Equipped **${rod.emoji} ${rod.name}**!`,ephemeral:true});
}

if (cmd==='enchantrod') {
    const eid=interaction.options.getString('enchant');
    const ench=ROD_ENCHANTS.find(e=>e.id===eid);
    if (!ench) return interaction.reply({content:'❌ Invalid enchantment.',ephemeral:true});
    const enchants=userData.rodEnchants.get(userId)||[];
    if (enchants.includes(eid)) return interaction.reply({content:'❌ Rod already has this enchantment!',ephemeral:true});
    if (coins(userId)<ench.cost) return interaction.reply({content:`❌ Need **${fmtN(ench.cost)}** coins!`,ephemeral:true});
    addCoins(userId,-ench.cost); enchants.push(eid); userData.rodEnchants.set(userId,enchants);
    await saveData();
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x9C27B0).setTitle(`${ench.emoji} Enchantment Applied!`).setDescription(`**${ench.name}** — ${ench.desc}`)]});
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
    const sellBoost = getAbuseMultiplier('sell');
    const total=Math.round(toSell.reduce((s,f)=>s+f.value,0) * sellBoost);
    addCoins(userId,total); userData.fishInv.set(userId,keep);
    await saveData();
    await sendWebhookLog('economy', new EmbedBuilder().setColor(0x57F287)
        .setTitle('[SELL] Fish Sold')
        .setDescription(`**User:** ${interaction.user.tag}\n**Count:** ${toSell.length}\n**Total:** ${fmtN(total)} coins${sellBoost>1?`\n**Boost:** ${sellBoost}x sell active`:''}`)
        .setTimestamp());
    const boostNote = sellBoost > 1 ? ` *(${sellBoost}x sell boost active!)*` : '';
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle('💵 Fish Sold!').setDescription(`Sold **${toSell.length}** fish for **${fmtN(total)} coins**!${boostNote}`)]});
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
        // Apply leviathan_rampage boss reward boost
        const bossRewardMult = abuseConfig.activeEvents['leviathan_rampage'] ? 2 : 1;
        const finalReward = b.reward * bossRewardMult;
        const finalXp = b.xp * bossRewardMult;
        addCoins(userId, finalReward); addXP(userId, finalXp);
        checkAchievementGeneral(userId,'boss',1);
        // Bug 9 fix: update fishing quest on boss kill
        const q = userData.fishQuest.get(userId);
        if (q && !q.done && q.date === new Date().toDateString() && q.type === 'catch_any') {
            q.progress = (q.progress||0) + 1;
            if (q.progress >= q.goal) { q.done=true; addCoins(userId,q.reward); addXP(userId,q.xpReward||100); }
            userData.fishQuest.set(userId, q);
        }
        userData.activeBoss=null; userData.activeBossHp=0;
        await saveData();
        // Webhook log
        await sendWebhookLog('boss', new EmbedBuilder().setColor(0x57F287)
            .setTitle(`[BOSS DEFEATED] ${b.emoji} ${b.name}`)
            .setDescription(`Defeated by **${interaction.user.tag}**\nReward: 💰 ${fmtN(finalReward)} | ⭐ ${fmtN(finalXp)} XP${bossRewardMult>1?' *(2x Leviathan Rampage!)*':''}`)
            .setTimestamp());
        return interaction.reply({embeds:[new EmbedBuilder().setColor(0x57F287)
            .setTitle(`🎉 Boss Defeated: ${b.emoji} ${b.name}!`)
            .setDescription(`+**${fmtN(finalReward)} coins** and **+${fmtN(finalXp)} XP**!${bossRewardMult>1?'\n🌊 **Leviathan Rampage** doubled your rewards!':''}`)
        ]});
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
        }// ════════════════════════════════════════════════════════════════
// GUILD COMMANDS
// ════════════════════════════════════════════════════════════════
if (cmd==='createguild') {
    const existing=userData.guildOf.get(userId);
    if (existing) return interaction.reply({content:'❌ Already in a guild! Leave with `/leaveguild` first.',ephemeral:true});
    if (coins(userId)<5000) return interaction.reply({content:'❌ Need **5,000 coins** to create a guild!',ephemeral:true});
    const name=interaction.options.getString('name').trim().slice(0,32);
    for (const [,g] of userData.guilds) if (g.name.toLowerCase()===name.toLowerCase()) return interaction.reply({content:'❌ Guild name already taken!',ephemeral:true});
    addCoins(userId,-5000);
    const guildId2=`guild_${Date.now()}_${userId}`;
    const newGuild={name,owner:userId,members:[userId],bank:0,level:1,xp:0,warScore:0};
    userData.guilds.set(guildId2,newGuild);
    userData.guildOf.set(userId,guildId2);
    await saveData();
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle('🏘️ Guild Created!')
        .setDescription(`**${name}** is now open! Invite members with \`/guildinvite\`.`)
        .addFields({name:'Owner',value:interaction.user.username,inline:true},{name:'Members',value:'1',inline:true},{name:'Bank',value:'0 coins',inline:true})
    ]});
}

if (cmd==='joinguild') {
    const existing=userData.guildOf.get(userId);
    if (existing) return interaction.reply({content:'❌ Already in a guild! Leave first with `/leaveguild`.',ephemeral:true});
    const name=interaction.options.getString('name').trim();
    let foundId=null,foundG=null;
    for (const [gid,g] of userData.guilds) if (g.name.toLowerCase()===name.toLowerCase()){foundId=gid;foundG=g;break;}
    if (!foundG) return interaction.reply({content:'❌ Guild not found. Check the name.',ephemeral:true});
    if (!foundG.open&&!foundG.invited?.includes(userId)) return interaction.reply({content:'❌ This guild is invite-only! Ask the owner to use `/guildinvite`.',ephemeral:true});
    foundG.members.push(userId);
    if (foundG.invited) foundG.invited=foundG.invited.filter(id=>id!==userId);
    userData.guildOf.set(userId,foundId);
    await saveData();
    return interaction.reply({content:`✅ Joined **${foundG.name}**! Welcome! (${foundG.members.length} members)`});
}

if (cmd==='leaveguild') {
    const gid=userData.guildOf.get(userId);
    if (!gid) return interaction.reply({content:'❌ Not in a guild!',ephemeral:true});
    const g=userData.guilds.get(gid);
    if (!g) { userData.guildOf.delete(userId); return interaction.reply({content:'❌ Guild data missing. Removed you.',ephemeral:true}); }
    if (g.owner===userId&&g.members.length>1) return interaction.reply({content:'❌ Transfer ownership or kick all members before leaving as owner.',ephemeral:true});
    g.members=g.members.filter(m=>m!==userId);
    userData.guildOf.delete(userId);
    if (g.members.length===0) userData.guilds.delete(gid);
    await saveData();
    return interaction.reply({content:`✅ Left **${g.name}**.`,ephemeral:true});
}

if (cmd==='guildinfo') {
    const gid=userData.guildOf.get(userId);
    if (!gid) return interaction.reply({content:'❌ Not in a guild! Create one with `/createguild` or join with `/joinguild`.',ephemeral:true});
    const g=userData.guilds.get(gid);
    if (!g) return interaction.reply({content:'❌ Guild data missing.',ephemeral:true});
    const ownerUser=await client.users.fetch(g.owner).catch(()=>null);
    const memberNames=g.members.slice(0,10).map(id=>{const u=client.users.cache.get(id);return u?u.username:`User#${id.slice(-4)}`;});
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x2196F3).setTitle(`🏘️ ${g.name}`)
        .addFields(
            {name:'👑 Owner',   value:ownerUser?.username||'Unknown',           inline:true},
            {name:'👥 Members', value:`${g.members.length}`,                   inline:true},
            {name:'🏦 Bank',    value:`${fmtN(g.bank||0)} coins`,              inline:true},
            {name:'⭐ Level',   value:`${g.level||1}`,                         inline:true},
            {name:'⚔️ War Score',value:`${fmtN(g.warScore||0)}`,               inline:true},
            {name:'🆔 Guild ID',value:`\`${gid.slice(-12)}\``,                 inline:true},
            {name:`Members (${Math.min(g.members.length,10)}/${g.members.length})`,value:memberNames.join(', ')||'None'},
        )
    ]});
}

if (cmd==='guildinvite') {
    const gid=userData.guildOf.get(userId);
    if (!gid) return interaction.reply({content:'❌ Not in a guild!',ephemeral:true});
    const g=userData.guilds.get(gid);
    if (g.owner!==userId) return interaction.reply({content:'❌ Only the guild owner can invite!',ephemeral:true});
    const target=interaction.options.getUser('user');
    if (!target||target.bot||target.id===userId) return interaction.reply({content:'❌ Invalid user.',ephemeral:true});
    if (userData.guildOf.get(String(target.id))) return interaction.reply({content:'❌ **'+target.username+'** is already in a guild!',ephemeral:true});
    if (!g.invited) g.invited=[];
    if (g.invited.includes(String(target.id))) return interaction.reply({content:'❌ Already invited!',ephemeral:true});
    g.invited.push(String(target.id));
    await saveData();
    return interaction.reply({content:`✅ Invited **${target.username}** to **${g.name}**! They can join with \`/joinguild ${g.name}\`.`});
}

if (cmd==='guilddeposit') {
    const gid=userData.guildOf.get(userId);
    if (!gid) return interaction.reply({content:'❌ Not in a guild!',ephemeral:true});
    const amount=interaction.options.getInteger('amount');
    if (coins(userId)<amount) return interaction.reply({content:'❌ Not enough coins!',ephemeral:true});
    const g=userData.guilds.get(gid);
    
    // FIX: Basic locking mechanism for guild bank deposits
    const lockKey = `guild_deposit_lock_${gid}`;
    if (global[lockKey]) return interaction.reply({content:'❌ Another deposit is in progress. Please try again in a moment.',ephemeral:true});
    global[lockKey] = true; 

    try {
        addCoins(userId,-amount);
        g.bank=(g.bank||0)+amount;
        g.xp=(g.xp||0)+Math.floor(amount/100);
        const xpNeeded=(g.level||1)*1000;
        if (g.xp>=xpNeeded&&(g.level||1)<20){g.level=(g.level||1)+1;g.xp=0;}
        await saveData();
        return interaction.reply({content:`✅ Deposited **${fmtN(amount)} coins** to **${g.name}** bank. Total: **${fmtN(g.bank)} coins** | Level: ${g.level}`});
    } finally {
        delete global[lockKey]; 
    }
}

if (cmd==='guildleaderboard') {
    const entries=[...userData.guilds.entries()].map(([,g])=>({name:g.name,bank:g.bank||0,members:g.members.length,level:g.level||1,warScore:g.warScore||0}));
    entries.sort((a,b)=>b.bank-a.bank);
    const lines=entries.slice(0,10).map((g,i)=>`**#${i+1}** **${g.name}** — 🏦 ${fmtN(g.bank)}c | ⭐ Lv${g.level} | 👥 ${g.members} | ⚔️ ${fmtN(g.warScore)}`);
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFFD700).setTitle('🏆 Guild Leaderboard').setDescription(lines.join('\n')||'No guilds yet.')]});
}

if (cmd==='guildwar') {
    const gid=userData.guildOf.get(userId);
    if (!gid) return interaction.reply({content:'❌ Not in a guild!',ephemeral:true});
    const rem=cooldownManager.get(userId,'guildwar');
    if (rem) return interaction.reply({content:`⏰ War contribution cooldown: **${cdStr(rem)}**`,ephemeral:true});
    const g=userData.guilds.get(gid);
    const cls=userData.rpgClass.get(userId);
    const stats=cls?userData.rpgStats.get(userId):null;
    const contribution=rng(50,200)+(stats?.atk||0);
    g.warScore=(g.warScore||0)+contribution;
    cooldownManager.set(userId,'guildwar',3_600_000);
    await saveData();
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xF44336).setTitle('⚔️ War Contribution!')
        .setDescription(`**${interaction.user.username}** contributed **${fmtN(contribution)}** war score to **${g.name}**!`)
        .addFields({name:'Guild War Score',value:fmtN(g.warScore),inline:true},{name:'Cooldown',value:'1 hour',inline:true})
    ]});
}

// ════════════════════════════════════════════════════════════════
// ECONOMY+ COMMANDS
// ════════════════════════════════════════════════════════════════
if (cmd==='logindaily') {
    const rem=cooldownManager.get(userId,'logindaily');
    if (rem) return interaction.reply({content:`⏰ Already claimed today! Come back in **${cdStr(rem)}**`,ephemeral:true});
    const ls=userData.loginStreak.get(userId)||{streak:0,lastLogin:''};
    const today=new Date().toDateString();
    const yesterday=new Date(Date.now()-86400000).toDateString();
    if (ls.lastLogin===yesterday) ls.streak++;
    else if (ls.lastLogin!==today) ls.streak=1;
    ls.lastLogin=today;
    userData.loginStreak.set(userId,ls);
    const base=500+ls.streak*50;
    const bonus=ls.streak>=30?5000:ls.streak>=7?1000:0;
    const reward=Math.min(base+bonus,10000);
    addCoins(userId,reward); addXP(userId,100);
    checkAchievementGeneral(userId,'streak',ls.streak);
    cooldownManager.set(userId,'logindaily',86_400_000);
    await saveData();
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFFD700).setTitle('📅 Daily Login Reward!')
        .addFields(
            {name:'💰 Coins',   value:`+${fmtN(reward)}`,   inline:true},
            {name:'⭐ XP',      value:'+100',                inline:true},
            {name:'🔥 Streak',  value:`${ls.streak} days`,   inline:true},
        )
        .setFooter({text:ls.streak>=7?'🔥 On fire! Come back tomorrow!':'Come back tomorrow to keep your streak!'})
    ]});
}

if (cmd==='achievements') {
    const t=interaction.options.getUser('user')||interaction.user;
    const tid=String(t.id);
    const owned=userData.achievementsNew.get(tid)||[];
    const lines=ACHIEVEMENTS.map(a=>{
        const has=owned.includes(a.id);
        return `${has?'✅':'❌'} ${a.emoji} **${a.name}** — ${a.desc}${has?'':` *(+${fmtN(a.reward)}c on unlock)*`}`;
    });
    const chunks=[];
    let cur='';
    for (const l of lines){if ((cur+l+'\n').length>1000){chunks.push(cur);cur='';}cur+=l+'\n';}
    if (cur) chunks.push(cur);
    const embed=new EmbedBuilder().setColor(0xFFD700).setTitle(`🏆 ${t.username}'s Achievements`)
        .setDescription(chunks[0]||'None')
        .setFooter({text:`${owned.length}/${ACHIEVEMENTS.length} unlocked`});
    return interaction.reply({embeds:[embed]});
}

if (cmd==='prestige') {
    const lvInfo=getLevelInfo(userData.xp.get(userId)||0);
    if (lvInfo.level<50) return interaction.reply({content:'❌ Need **Level 50** to prestige! You are Level '+lvInfo.level+'.',ephemeral:true});
    const pres=userData.prestige.get(userId)||{level:0};
    const prestigeLevel=(pres.level||0)+1;
    // Reset XP and level
    userData.xp.set(userId,0);
    userData.skillPoints.set(userId,0);
    userData.skillsLearned.set(userId,[]);
    // BUG FIX: also reset fishing progression on prestige
    userData.fishXP.set(userId, 0);
    userData.fishLevel.set(userId, 1);
    userData.fishCaught.set(userId, {});
    userData.fishInv.set(userId, []);
    // FIX: Reset rodOwned and rodEnchants to prevent exploit
    userData.rodOwned.set(userId, ['plastic']); // Only keep the basic rod
    userData.rodEquipped.set(userId, 'plastic');
    userData.rodEnchants.set(userId, []);
    // Prestige bonuses
    const bonus=prestigeLevel*500;
    addCoins(userId,bonus);
    pres.level=prestigeLevel; pres.lastPrestige=Date.now();
    userData.prestige.set(userId,pres);
    checkAchievementGeneral(userId,'prestige',prestigeLevel);
    await saveData();
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFF69B4).setTitle('🔄 Prestige!')
        .setDescription(`You have prestiged to **${prestigeLevel}x Prestige**! Your level has been reset, but you grow stronger.`)
        .addFields(
            {name:'🔄 Prestige Level', value:String(prestigeLevel),          inline:true},
            {name:'💰 Bonus Coins',    value:`+${fmtN(bonus)}`,              inline:true},
            {name:'📊 XP Reset',       value:'Back to Level 0',              inline:true},
            {name:'🎣 Fishing Reset',  value:'Rods, Enchants, Fish Inventory', inline:true},
        )
        .setFooter({text:'Each prestige makes future rewards stronger!'})
    ]});

}

if (cmd==='battlepass') {
    const bp=userData.battlePass.get(userId)||{tier:1,bpXp:0,premium:false,season:SEASON};
    if (bp.season!==SEASON){bp.tier=1;bp.bpXp=0;bp.season=SEASON;userData.battlePass.set(userId,bp);}
    const lines=BP_TIERS.map(t=>{
        const done=bp.tier>t.tier;const current=bp.tier===t.tier;
        const freeR=t.free.coins?`${fmtN(t.free.coins)}c`:t.free.xp?`${t.free.xp}xp`:'?';
        const premR=t.prem.coins?`${fmtN(t.prem.coins)}c + ${t.prem.item||''}`:t.prem.item||'';
        return `${done?'✅':current?'▶️':'🔒'} **Tier ${t.tier}** — Free: ${freeR}${bp.premium?` | 💎 ${premR}`:''}`;
    });
    const curTier=BP_TIERS.find(t=>t.tier===bp.tier)||BP_TIERS[0];
    const nextTier=BP_TIERS.find(t=>t.tier===bp.tier+1);
    const prog=nextTier?bp.bpXp+'/'+nextTier.bpXp+' BP XP':'MAX TIER';
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x9C27B0).setTitle(`🎫 Battle Pass — Season ${SEASON}`)
        .setDescription(lines.join('\n'))
        .addFields(
            {name:'Current Tier',  value:String(bp.tier),            inline:true},
            {name:'Progress',      value:prog,                        inline:true},
            {name:'Premium',       value:bp.premium?'✅ Active':'❌ Not active',inline:true},
        )
        .setFooter({text:'Earn BP XP by fishing, chatting, and completing quests!'})
    ]});
}
        // ════════════════════════════════════════════════════════════════
// MINI-GAME COMMANDS
// ════════════════════════════════════════════════════════════════
if (cmd==='hangman') {
    if (hangGames.has(userId)) return interaction.reply({content:'❌ Already have a Hangman game! Guess letters by typing them.',ephemeral:true});
    const words=['discord','javascript','fishing','dungeon','legendary','mutation','enchant','prestige','battlepass','champion','kingdom','symphony','adventure','telescope','whirlpool'];
    const word=words[rng(0,words.length-1)];
    hangGames.set(userId,{word,guessed:[],wrong:0,ts:Date.now()});
    const disp=word.split('').map(()=>'_').join(' ');
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x9C27B0).setTitle('🔤 Hangman Started!')
        .setDescription('```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========```\n\nWord: `'+disp+'`\nGuess letters by typing a single letter in chat!\n\nWrong: 0/6 | +400 coins on win')
    ]});
}

if (cmd==='tictactoe') {
    const opponent=interaction.options.getUser('opponent');
    if (!opponent||opponent.bot||opponent.id===userId) return interaction.reply({content:'❌ Invalid opponent!',ephemeral:true});
    const gameKey=`${userId}_${Date.now()}`;
    tttGames.set(gameKey,{p1:userId,p2:String(opponent.id),board:Array(9).fill(null),turn:userId,ts:Date.now()});
    const rows=buildTTTRows(Array(9).fill(null),userId,String(opponent.id),gameKey);
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x2196F3).setTitle('❌⭕ Tic Tac Toe')
        .setDescription(`**${interaction.user.username}** (❌) vs **${opponent.username}** (⭕)\n\n_${interaction.user.username}'s turn_`)
    ],components:rows});
}

if (cmd==='higherlower') {
    const val1=rng(1,100),val2=rng(1,100);
    const row=new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`hl_${userId}_higher_${val2}_${val1}`).setLabel('📈 Higher').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`hl_${userId}_lower_${val2}_${val1}`).setLabel('📉 Lower').setStyle(ButtonStyle.Danger),
    );
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFF9800).setTitle('📈 Higher or Lower!')
        .setDescription(`The number is **${fmtN(val1)}**\n\nIs the next number **Higher** or **Lower**?\n*Correct = +300 coins!*`)
    ],components:[row]});
}

if (cmd==='coinflip') {
    const side=interaction.options.getString('side');
    const bet=interaction.options.getInteger('bet')||0;
    if (bet>0&&coins(userId)<bet) return interaction.reply({content:'❌ Not enough coins!',ephemeral:true});
    if (bet>50000) return interaction.reply({content:'❌ Max bet is **50,000 coins**.',ephemeral:true});
    const result=Math.random()<0.5?'heads':'tails';
    const won=result===side;
    if (bet>0){if(won)addCoins(userId,bet);else addCoins(userId,-bet);}
    await saveData();
    return interaction.reply({embeds:[new EmbedBuilder().setColor(won?0x57F287:0xF44336)
        .setTitle(`🪙 ${result.toUpperCase()}!`)
        .setDescription(`You called **${side}** — it landed **${result}**!\n${won?(bet>0?`🎉 You win **${fmtN(bet)} coins**!`:'✅ Correct!'):(bet>0?`💸 You lose **${fmtN(bet)} coins**.`:'❌ Wrong!')}`)
    ]});
}

if (cmd==='connect4') {
    const opponent=interaction.options.getUser('opponent');
    if (!opponent||opponent.bot||opponent.id===userId) return interaction.reply({content:'❌ Invalid opponent!',ephemeral:true});
    const gameKey=`${userId}_${Date.now()}`;
    const board=Array(6).fill(null).map(()=>Array(7).fill(0));
    c4Games.set(gameKey,{p1:userId,p2:String(opponent.id),board,turn:userId,ts:Date.now()});
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFFD700).setTitle('🟡 Connect 4')
        .setDescription(`**${interaction.user.username}** 🔴 vs **${opponent.username}** 🟡\n\n${renderC4(board)}\n_${interaction.user.username}'s turn_ 🔴`)
    ],components:buildC4Row(userId,String(opponent.id),gameKey)});
}

// ════════════════════════════════════════════════════════════════
// PROGRESSION COMMANDS
// ════════════════════════════════════════════════════════════════
if (cmd==='titles') {
    const owned=userData.titlesOwned.get(userId)||[];
    if (!owned.includes('newbie')) owned.unshift('newbie');
    const active=userData.titleActive.get(userId)||'newbie';
    const lines=TITLES.map(t=>{
        const has=owned.includes(t.id)||t.id==='newbie';
        const isActive=t.id===active;
        return `${isActive?'▶️':has?'✅':'🔒'} ${t.emoji} **${t.name}**${has&&!isActive?' — `/settitle '+t.id+'`':''}${t.req&&!has?' *(unlock: '+t.req+')*':''}`;
    });
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFF9800).setTitle('🏅 Your Titles')
        .setDescription(lines.join('\n'))
        .setFooter({text:`Active: ${TITLES.find(t=>t.id===active)?.name||'Newbie'} | Set with /settitle <id>`})
    ]});
}

if (cmd==='settitle') {
    const tid2=interaction.options.getString('title');
    const title=TITLES.find(t=>t.id===tid2);
    if (!title) return interaction.reply({content:'❌ Unknown title ID. Check `/titles`.',ephemeral:true});
    const owned=userData.titlesOwned.get(userId)||[];
    if (tid2!=='newbie'&&!owned.includes(tid2)) return interaction.reply({content:'❌ You have not unlocked this title yet!',ephemeral:true});
    userData.titleActive.set(userId,tid2);
    await saveData();
    return interaction.reply({content:`✅ Active title set to **${title.emoji} ${title.name}**!`,ephemeral:true});
}

if (cmd==='collectionlog') {
    const caught=userData.fishCaught.get(userId)||{};
    const weapons=userData.weapons.get(userId)||[];
    const achCount=(userData.achievementsNew.get(userId)||[]).length;
    const titles=(userData.titlesOwned.get(userId)||[]).length+1;
    const dungeons=userData.dungeonClears.get(userId)||0;
    const species=Object.keys(caught).length;
    const rareCount=Object.entries(caught).filter(([id])=>{const f=FISH_SPECIES.find(x=>x.id===id);return f&&getRarityIdx(f.r)>=2;}).length;
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x9C27B0).setTitle('📚 Collection Log')
        .addFields(
            {name:'🐟 Fish Species',   value:`${species}/${FISH_SPECIES.length}`,    inline:true},
            {name:'💙 Rare+ Species',  value:`${rareCount}`,                          inline:true},
            {name:'🏆 Achievements',   value:`${achCount}/${ACHIEVEMENTS.length}`,    inline:true},
            {name:'🏅 Titles',         value:`${titles}/${TITLES.length}`,            inline:true},
            {name:'🏰 Dungeons',       value:`${fmtN(dungeons)} clears`,              inline:true},
            {name:'⚔️ Weapons',        value:`${weapons.length}`,                     inline:true},
        )
        .setFooter({text:'Fish every day to complete your collection!'})
    ]});
}

if (cmd==='milestones') {
    const lvInfo=getLevelInfo(userData.xp.get(userId)||0);
    const stats=userData.fishStats.get(userId)||{total:0};
    const pres=userData.prestige.get(userId)||{level:0};
    const dungeons=userData.dungeonClears.get(userId)||0;
    const achCount=(userData.achievementsNew.get(userId)||[]).length;
    const milestones=[
        {name:'🐟 Fish 10',     done:stats.total>=10,     goal:'Catch 10 fish'},
        {name:'🐟 Fish 100',    done:stats.total>=100,    goal:'Catch 100 fish'},
        {name:'🐟 Fish 1000',   done:stats.total>=1000,   goal:'Catch 1,000 fish'},
        {name:'⭐ Level 10',    done:lvInfo.level>=10,    goal:'Reach Level 10'},
        {name:'⭐ Level 50',    done:lvInfo.level>=50,    goal:'Reach Level 50'},
        {name:'⭐ Level 100',   done:lvInfo.level>=100,   goal:'Reach Level 100'},
        {name:'🏰 Dungeon 10',  done:dungeons>=10,        goal:'Clear 10 dungeons'},
        {name:'🔄 Prestige',    done:(pres.level||0)>=1,  goal:'Prestige once'},
        {name:'🏆 10 Achs',     done:achCount>=10,        goal:'Unlock 10 achievements'},
        {name:'🏆 All Achs',    done:achCount>=ACHIEVEMENTS.length,goal:'Unlock all achievements'},
    ];
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFFD700).setTitle('🎯 Milestones')
        .setDescription(milestones.map(m=>`${m.done?'✅':'❌'} **${m.name}** — ${m.goal}`).join('\n'))
    ]});
}

if (cmd==='season') {
    const bp=userData.battlePass.get(userId)||{tier:1,bpXp:0,premium:false,season:SEASON};
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFF69B4).setTitle(`🌸 Season ${SEASON}`)
        .setDescription(`**Current Season:** ${SEASON}\nEarn Battle Pass XP by fishing, chatting, and completing quests!`)
        .addFields(
            {name:'🎫 Your BP Tier',  value:`${bp.tier}/10`,       inline:true},
            {name:'💎 Premium',        value:bp.premium?'Yes':'No', inline:true},
            {name:'📊 BP XP',          value:fmtN(bp.bpXp||0),     inline:true},
            {name:'🎁 Free Rewards',   value:'Coins & XP per tier', inline:false},
        )
        .setFooter({text:'Claim your Battle Pass rewards with /battlepass!'})
    ]});
}

if (cmd==='resetcooldowns') {
    if (!isOwner) return interaction.reply({content:'❌ Owner only!',ephemeral:true});
    const target=interaction.options.getUser('user')||interaction.user;
    cooldownManager.clearAll(String(target.id));
    return interaction.reply({content:`✅ All cooldowns reset for **${target.username}**.`,ephemeral:true});
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
            // customId format: fnf_{userId}-{timestamp}_{arrow}
            // gameId = "{userId}-{timestamp}" (contains dash, not underscore)
            const firstUnderscore=customId.indexOf('_');
            const rest=customId.slice(firstUnderscore+1); // "{userId}-{timestamp}_{arrow}"
            const lastUnderscore=rest.lastIndexOf('_');
            const gameId=rest.slice(0,lastUnderscore);    // "{userId}-{timestamp}"
            const arrow=rest.slice(lastUnderscore+1);      // the arrow emoji
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
            const rest=customId.slice('ttt_'.length);
            const lastUnderscore=rest.lastIndexOf('_');
            const gameKey=rest.slice(0,lastUnderscore);
            const idx=parseInt(rest.slice(lastUnderscore+1));
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
            const rest=customId.slice('c4_'.length);
            const lastUnderscore=rest.lastIndexOf('_');
            const gameKey=rest.slice(0,lastUnderscore);
            const col=parseInt(rest.slice(lastUnderscore+1));
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
            ],components:buildC4Row(game.p1,game.p2,gameKey)});
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
// ♦️ MESSAGE HANDLER — XP, auto-responses, hangman, prefix cmds
// ════════════════════════════════════════════════════════════════
client.on('messageCreate', async message => {
    try {
        if (message.author.bot) return;

        // ── RNG system gets first look at every message ──
        const rngHandled = await rngCommandRouter.handleMessage(message, {
            rngData: rngState.getRngData(),
            OWNER_ID,
            client,
        });
        
        if (rngHandled) return;
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

        // ── Auto-responses (skip if prefix command) ──
        const currentPrefix = guildPrefixes[guildId] || '!';
        if (!content.startsWith(currentPrefix)) {
            for (const [trigger,response] of autoResponses) {
                if (lower.includes(trigger.toLowerCase())) {
                    message.reply(response).catch(()=>{});
                    break;
                }
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
        const prefix = guildPrefixes[guildId] || '!';
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
            const users=[...message.mentions.users.values()];
            const u1=users[0]||message.author;
            const u2=users[1];
            if (!u2) return message.reply('❌ Mention 2 people to ship! `!ship @user1 @user2`').catch(()=>{});
            if (u1.id===u2.id) return message.reply('❌ You can\'t ship someone with themselves!').catch(()=>{});
            const pair=[u1.id,u2.id].sort().join('-');
            let hash=0;
            for (let i=0;i<pair.length;i++) hash=(hash*31+pair.charCodeAt(i))>>>0;
            const pct=hash%101;
            const filled=Math.round(pct/10);
            const bar='🟪'.repeat(filled)+'⬜'.repeat(10-filled);
            const shipName=u1.username.slice(0,Math.ceil(u1.username.length/2))+u2.username.slice(Math.floor(u2.username.length/2));
            const verdict=pct>=90?'💍 Soulmates!':pct>=70?'💕 Great match!':pct>=40?'🙂 Could work...':pct>=15?'😬 Rocky road':'💀 Run away';
            const embed=new EmbedBuilder()
                .setColor(0xFF6FA5)
                .setTitle(`${u1.username} 💞 ${u2.username}`)
                .setDescription(`${bar}\n**${pct}% love**\n${verdict}`)
                .setThumbnail(u1.displayAvatarURL())
                .setImage(u2.displayAvatarURL({size:256}))
                .setFooter({text:`${shipName} • Result is fixed for this pair!`});
            return message.reply({embeds:[embed]}).catch(()=>{});
        }
        if (cmd==='ownership'||cmd==='ownship') {
            if (userId!==OWNER_ID) return message.reply('❌ Owner only!').catch(()=>{});
            const users=[...message.mentions.users.values()];
            const u1=users[0];
            const u2=users[1];
            if (!u1||!u2) return message.reply('❌ Mention 2 people! `!ownership @user1 @user2`').catch(()=>{});
            const bar='🟪'.repeat(10);
            const shipName=u1.username.slice(0,Math.ceil(u1.username.length/2))+u2.username.slice(Math.floor(u2.username.length/2));
            const embed=new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle(`${u1.username} 💞 ${u2.username}`)
                .setDescription(`${bar}\n**100% love**\n💍 Soulmates! *(owner's word is final)*`)
                .setThumbnail(u1.displayAvatarURL())
                .setImage(u2.displayAvatarURL({size:256}))
                .setFooter({text:`${shipName} • Owner-certified, always 100%`});
            return message.reply({embeds:[embed]}).catch(()=>{});
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

        if (cmd==='setprefix') {
            if (!isStaffMsg) return message.reply('❌ Staff only!').catch(()=>{});
            const newPrefix = args[1];
            if (!newPrefix || newPrefix.length > 5) return message.reply('❌ Usage: `!setprefix <prefix>` (max 5 chars)').catch(()=>{});
            guildPrefixes[guildId] = newPrefix;
            await saveData();
            return message.reply(`✅ Prefix for this server set to: \`${newPrefix}\``).catch(()=>{});
        }
        if (cmd==='setfischwebhook') {
            if (!isStaffMsg) return message.reply('❌ Staff only!').catch(()=>{});
            const val = args[1]?.toLowerCase();
            if (val === 'on') {
                webhookConfig['fish_webhook_' + guildId] = true;
                await saveData();
                return message.reply('✅ Fisch Webhook system **ENABLED** for this server. Fishing results will now appear as "User\'s Fisch".').catch(()=>{});
            } else if (val === 'off') {
                delete webhookConfig['fish_webhook_' + guildId];
                await saveData();
                return message.reply('✅ Fisch Webhook system **DISABLED** for this server.').catch(()=>{});
            } else {
                return message.reply('❌ Usage: `!setfischwebhook <on|off>`').catch(()=>{});
            }
        }
          if (cmd === 'impersonate') {
    // Allow Owner + Staff
    if (!isStaffMsg)
        return message.reply('❌ Staff only!').catch(() => {});

    const target = message.mentions.users.first();
    const msg = args.slice(2).join(' ');

    if (!target || !msg)
        return message.reply('❌ Usage: impersonate @user <message>').catch(() => {});

    message.delete().catch(() => {});

    const hook = await message.channel.createWebhook({
        name: target.username,
        avatar: target.displayAvatarURL()
    }).catch(() => null);

    if (!hook)
        return message.channel.send(msg).catch(() => {});

    await hook.send(msg).catch(() => {});
    await hook.delete().catch(() => {});

    return;
                                                     }
        
        if (cmd==='say') {
            if (!isStaffMsg) return message.reply('❌ Staff only!').catch(()=>{});
            message.delete().catch(()=>{});
            return message.channel.send(rest).catch(()=>{});
        }
        if (cmd==='announce') {
            if (!isStaffMsg) return message.reply('❌ Staff only!').catch(()=>{});
            const ch=message.mentions.channels.first()||message.channel;
            const txt=args.slice(2).join(' ');
            if (!txt) return message.reply('❌ Usage: !announce #channel <msg>').catch(()=>{});
            const embed=new EmbedBuilder().setColor(0x3498DB).setTitle('📢 Announcement').setDescription(txt).setTimestamp().setFooter({text:'Sent by '+message.author.username});
            return ch.send({embeds:[embed]}).catch(()=>{});
        }
        if (cmd==='broadcast') {
            if (!isStaffMsg) return message.reply('❌ Staff only!').catch(()=>{});
            const txt=args.slice(1).join(' ');
            if (!txt) return message.reply('❌ Usage: !broadcast <msg>').catch(()=>{});
            const embed=new EmbedBuilder().setColor(0xFF4500).setTitle('🛰️ Global Broadcast').setDescription(txt).setTimestamp();
            client.guilds.cache.forEach(g=>{
                const ch=g.systemChannel||g.channels.cache.find(c=>c.type===ChannelType.GuildText);
                if (ch) ch.send({embeds:[embed]}).catch(()=>{});
            });
            return message.reply('✅ Broadcast sent to '+client.guilds.cache.size+' servers.').catch(()=>{});
        }
        if (cmd==='staff') {
            if (!isStaffMsg) return message.reply('❌ Staff only!').catch(()=>{});
            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle('🛠️ Staff Control Panel')
                .setDescription('Access to administrative and moderation tools.')
                .addFields(
                    { name: '📢 Communication', value: '`!say`, `!announce`, `!broadcast`' },
                    { name: '🛡️ Moderation', value: '`!warn`, `!listwarnings`, `!deletewarnings`' },
                    { name: '⚙️ Config', value: '`!setprefix`, `!listresponses`, `!logstatus`' },
                    { name: '👑 Owner Only', value: '`!impersonate`, `!nocooldown`, `!ownerpanel`' }
                )
                .setTimestamp();
            return message.reply({ embeds: [embed] }).catch(()=>{});
        }

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
        if (cmd==='addxp') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first();
            const amount=parseInt(args[2])||0;
            if (!target||!amount) return message.reply('❌ Usage: !addxp @user <amount>').catch(()=>{});
            const tid=String(target.id);
            const before=getLevelInfo(userData.xp.get(tid)||0);
            userData.xp.set(tid,(userData.xp.get(tid)||0)+amount);
            const after=getLevelInfo(userData.xp.get(tid));
            await saveData();
            return message.reply('✅ Added **'+fmtN(amount)+' XP** to **'+target.username+'**. Level: **'+before.level+'** → **'+after.level+'**').catch(()=>{});
        }
        if (cmd==='addcoins') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first();
            const amount=parseInt(args[2])||0;
            if (!target||amount<=0) return message.reply('❌ Usage: !addcoins @user <amount> (must be > 0)').catch(()=>{});
            addCoins(String(target.id),amount); await saveData();
            return message.reply('✅ Added **'+fmtN(amount)+' coins** to **'+target.username+'**.').catch(()=>{});
        }
        if (cmd==='addstaff') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first();
            if (!target) return message.reply('❌ Usage: !addstaff @user').catch(()=>{});
            staffSet.add(guildIdMsg+':'+String(target.id)); await saveData();
            return message.reply('✅ **'+target.username+'** is now staff!').catch(()=>{});
        }
        if (cmd==='deletecoins') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first();
            const amount=parseInt(args[2])||0;
            if (!target) return message.reply('❌ Usage: !deletecoins @user [amount]').catch(()=>{});
            const tid=String(target.id);
            if (amount>0) {
                const walletBal=userData.coins.get(tid)||0;
                const bankBal=userData.bank.get(tid)||0;
                const fromWallet=Math.min(amount,walletBal);
                const fromBank=Math.min(amount-fromWallet,bankBal);
                userData.coins.set(tid,walletBal-fromWallet);
                userData.bank.set(tid,bankBal-fromBank);
            } else { userData.coins.set(tid,0); userData.bank.set(tid,0); }
            await saveData();
            return message.reply('✅ '+(amount>0?'Removed **'+fmtN(amount)+' coins**':'Reset all money')+' from **'+target.username+'**.').catch(()=>{});
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
        if (cmd === 'teleport') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first()||message.author;
            const tid=String(target.id);
            const bid=args[1] || (message.mentions.users.first() ? args[2] : args[1]);
            const biome=BIOMES.find(b=>b.id===bid);
            if (!biome) return message.reply('❌ Usage: !teleport [@user] <biomeid>\nBiomes: '+BIOMES.map(b=>b.id).join(', ')).catch(()=>{});
            userData.biome.set(tid, biome.id);
            await saveData();
            return message.reply(`🗺️ Teleported **${target.username}** to **${biome.emoji} ${biome.name}**!`).catch(()=>{});
        }
        if (cmd === 'forceevent') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const ev=WORLD_EVENTS.find(e=>e.id===args[1]);
            if (!ev) return message.reply('❌ Invalid event. IDs: '+WORLD_EVENTS.map(e=>e.id).join(', ')).catch(()=>{});
            userData.worldEvent=ev; userData.worldEventEnd=Date.now()+ev.dur;
            await saveData();
            // Clear any active abuse event effects that might conflict
            abuseConfig.activeEvents = {};
            return message.reply('✅ Forced event: **'+ev.emoji+' '+ev.name+'** '+ev.desc).catch(()=>{});
        }
        if (cmd === 'forceboss') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const b=BOSS_FISH.find(b=>b.id===args[1]);
            if (!b) return message.reply('❌ Invalid boss. IDs: '+BOSS_FISH.map(b=>b.id).join(', ')).catch(()=>{});
            userData.activeBoss=b; 
            userData.activeBossHp=b.hp;
            userData.activeBossSpawnedAt = Date.now();
            await saveData();
            return message.reply('✅ Spawned **'+b.emoji+' '+b.name+'** ('+fmtN(b.hp)+' HP)!').catch(()=>{});
        }
        if (cmd === 'scyllakey' || cmd === 'craftkey') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first()||message.author;
            const tid=String(target.id);
            const keyId = cmd === 'scyllakey' ? 'scylla_key' : 'abyss_key';
            const completed=userData.completedQuests.get(tid)||[];
            if (completed.includes(keyId)) return message.reply(`✅ Already has the ${keyId.replace('_',' ')}!`).catch(()=>{});
            completed.push(keyId); userData.completedQuests.set(tid,completed);
            await saveData();
            return message.reply(`🔑 **${keyId.replace('_',' ')} Granted** to **${target.username}**!`).catch(()=>{});
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
        if (cmd==='deleterod') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first();
            if (!target) return message.reply('❌ Usage: !deleterod @user').catch(()=>{});
            const tid=String(target.id);
            userData.rodEquipped.set(tid,'plastic'); userData.rodOwned.set(tid,[]); userData.rodEnchants.set(tid,[]);
            await saveData();
            return message.reply('✅ Reset **'+target.username+"'s** rod to Plastic Rod.").catch(()=>{});
        }
        if (cmd === 'teleport') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first()||message.author;
            const tid=String(target.id);
            const bid=args[1] || (message.mentions.users.first() ? args[2] : args[1]);
            const biome=BIOMES.find(b=>b.id===bid);
            if (!biome) return message.reply('❌ Usage: !teleport [@user] <biomeid>\nBiomes: '+BIOMES.map(b=>b.id).join(', ')).catch(()=>{});
            userData.biome.set(tid, biome.id);
            await saveData();
            return message.reply(`🗺️ Teleported **${target.username}** to **${biome.emoji} ${biome.name}**!`).catch(()=>{});
        }
        if (cmd === 'forceevent') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const ev=WORLD_EVENTS.find(e=>e.id===args[1]);
            if (!ev) return message.reply('❌ Invalid event. IDs: '+WORLD_EVENTS.map(e=>e.id).join(', ')).catch(()=>{});
            userData.worldEvent=ev; userData.worldEventEnd=Date.now()+ev.dur;
            await saveData();
            // Clear any active abuse event effects that might conflict
            abuseConfig.activeEvents = {};
            return message.reply('✅ Forced event: **'+ev.emoji+' '+ev.name+'** '+ev.desc).catch(()=>{});
        }
        if (cmd === 'forceboss') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const b=BOSS_FISH.find(b=>b.id===args[1]);
            if (!b) return message.reply('❌ Invalid boss. IDs: '+BOSS_FISH.map(b=>b.id).join(', ')).catch(()=>{});
            userData.activeBoss=b; 
            userData.activeBossHp=b.hp;
            userData.activeBossSpawnedAt = Date.now();
            await saveData();
            return message.reply('✅ Spawned **'+b.emoji+' '+b.name+'** ('+fmtN(b.hp)+' HP)!').catch(()=>{});
        }
        if (cmd === 'scyllakey' || cmd === 'craftkey') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const target=message.mentions.users.first()||message.author;
            const tid=String(target.id);
            const keyId = cmd === 'scyllakey' ? 'scylla_key' : 'abyss_key';
            const completed=userData.completedQuests.get(tid)||[];
            if (completed.includes(keyId)) return message.reply(`✅ Already has the ${keyId.replace('_',' ')}!`).catch(()=>{});
            completed.push(keyId); userData.completedQuests.set(tid,completed);
            await saveData();
            return message.reply(`🔑 **${keyId.replace('_',' ')} Granted** to **${target.username}**!`).catch(()=>{});
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
// ════════════════════════════════════════════════════════
        // 🚨 ADMIN ABUSE COMMANDS — OWNER ONLY
        // ════════════════════════════════════════════════════════
        if (!isOwnerMsg && [
            'activate','deactivate','minorabuse','majorabuse','catastrophicabuse','developermeltdown',
            'chaosmode','broadcast','eventannounce','spawnfish','spawnfishall','spawnboss','despawnboss',
            'doublexp','triplexp','doublemoney','triplemoney','boostall',
            'setsecretmultiplier','setlegendarymultiplier','setmutationmultiplier',
            'setfishwebhook','seteconomywebhook','setbosswebhook','setadminabusewebhook',
            'seteventwebhook','setguildwebhook','seterrorwebhook','testwebhook','webhookstatus',
            'setmessagelog','setmemberlog','setrolelog','setmodlog','setserverlog','setvoicelog',
            'logstatus','enablelog','disablelog','ownerpanel','appraise',
        ].includes(cmd)) {
            await sendWebhookLog('adminabuse', new EmbedBuilder()
                .setColor(0xFF0000).setTitle('⛔ Unauthorized Owner Command Attempt')
                .setDescription(`**User:** ${message.author.tag} (${userId})\n**Command:** !${cmd}\n**Server:** ${message.guild?.name||'DM'}`)
                .setTimestamp());
            return message.reply('❌ Owner only! This attempt has been logged.').catch(()=>{});
        }

        if (cmd==='activate') {
            const id=args[1];
            const ev=ABUSE_EVENTS[id];
            if (!ev) return message.reply('❌ Unknown abuse event. IDs: '+Object.keys(ABUSE_EVENTS).join(', ')).catch(()=>{});
            abuseConfig.activeEvents[id]={id, endTime:Date.now()+ev.dur};
            await saveData();
            await abuseAnnounce(message.channel, `${ev.emoji} ${ev.name} ACTIVATED!`, ev.desc, 0xFF4500);
            return;
        }

        if (cmd==='deactivate') {
            const id=args[1];
            if (!abuseConfig.activeEvents[id]) return message.reply('❌ That event is not active.').catch(()=>{});
            delete abuseConfig.activeEvents[id];
            await saveData();
            return message.reply(`✅ Deactivated **${id}**.`).catch(()=>{});
        }

        if (cmd==='minorabuse') {
            abuseConfig.activeEvents['mutation_madness']={id:'mutation_madness',endTime:Date.now()+1800000};
            abuseConfig.activeEvents['golden_tide']={id:'golden_tide',endTime:Date.now()+1800000};
            await saveData();
            await abuseAnnounce(message.channel,'⚠️ MINOR ABUSE ACTIVATED!',
                '**Mutation Madness x8** + **Golden Tide x5** are now active for 30 minutes!\n🧬 Mutations are going crazy! 💰 Fish value boosted!', 0xFFAA00);
            return;
        }

        if (cmd==='majorabuse') {
            abuseConfig.activeEvents['mutation_madness']={id:'mutation_madness',endTime:Date.now()+3600000};
            abuseConfig.activeEvents['golden_tide']={id:'golden_tide',endTime:Date.now()+3600000};
            abuseConfig.activeEvents['celestial_surge']={id:'celestial_surge',endTime:Date.now()+3600000};
            abuseConfig.activeEvents['secret_frenzy']={id:'secret_frenzy',endTime:Date.now()+3600000};
            await saveData();
            await abuseAnnounce(message.channel,'🔥 MAJOR ABUSE ACTIVATED!',
                '**4 events** are now live for **1 hour**!\n🧬 Mutations x8 | 💰 Sell x5 | ✴️ Legendary x20 | 🌑 Secret x10\n**THIS IS HUGE!**', 0xFF6600);
            return;
        }

        if (cmd==='catastrophicabuse') {
            Object.keys(ABUSE_EVENTS).forEach(id => {
                abuseConfig.activeEvents[id]={id,endTime:Date.now()+3600000};
            });
            abuseConfig.secretMult=20; abuseConfig.legendaryMult=30; abuseConfig.mutationMult=15;
            abuseConfig.xpMult=10; abuseConfig.coinMult=10; abuseConfig.sellMult=10;
            await saveData();
            await abuseAnnounce(message.channel,'💀 ☠️ CATASTROPHIC ABUSE ☠️ 💀',
                '**ALL ABUSE EVENTS ACTIVATED + ALL MULTIPLIERS AT MAXIMUM!**\n\n🌑 Secret x20 | ✴️ Legendary x30 | 🧬 Mutation x15\n💰 Sell x10 | ⭐ XP x10 | 💎 Coins x10\n\n**THE SERVER IS ON FIRE. EVERYONE FISH NOW.**', 0xFF0000);
            return;
        }

        if (cmd==='developermeltdown') {
            // The ultimate event — stacks everything, locks weather, spawns boss, announces massively
            Object.keys(ABUSE_EVENTS).forEach(id => {
                abuseConfig.activeEvents[id]={id,endTime:Date.now()+7200000};
            });
            abuseConfig.secretMult=50; abuseConfig.legendaryMult=50; abuseConfig.mutationMult=25;
            abuseConfig.xpMult=20; abuseConfig.coinMult=20; abuseConfig.sellMult=20;
            abuseConfig.weatherOverride='eclipse'; abuseConfig.weatherOverrideEnd=Date.now()+7200000;
            const boss=BOSS_FISH[BOSS_FISH.length-1];
            userData.activeBoss=boss; userData.activeBossHp=boss.hp;
            await saveData();
            await abuseAnnounce(message.channel,
                '🌋 ⚠️ D E V E L O P E R   M E L T D O W N ⚠️ 🌋',
                [
                    '```',
                    'THE DEVELOPER HAS LOST CONTROL.',
                    'EVERYTHING IS BROKEN.',
                    'EVERYTHING IS AMAZING.',
                    '```',
                    '',
                    '🌑 **Eclipse weather LOCKED** for 2 hours',
                    '💀 **Void Leviathan** has been spawned!',
                    '🧬 Mutations: **x25** | 🌑 Secret: **x50**',
                    '✴️ Legendary: **x50** | 💰 Sell: **x20**',
                    '⭐ XP: **x20** | 💎 Coins: **x20**',
                    '',
                    '**ALL 10 ABUSE EVENTS ACTIVE FOR 2 HOURS.**',
                    '',
                    '🎣 **EVERYONE FISH. RIGHT NOW. NO EXCUSES.**',
                ].join('\n'), 0xFF0000);
            return;
        }

        if (cmd==='chaosmode') {
            abuseConfig.chaosMode = !abuseConfig.chaosMode;
            await saveData();
            await abuseAnnounce(message.channel,
                abuseConfig.chaosMode ? '🌀 CHAOS MODE ENABLED!' : '🌀 Chaos Mode Disabled',
                abuseConfig.chaosMode
                    ? 'Every fish caught has a random mutation applied. Nothing is safe.'
                    : 'Chaos mode is off. Things are... normal again.',
                abuseConfig.chaosMode ? 0x9B59B6 : 0x95A5A6);
            return;
        }

        if (cmd==='broadcast') {
            if (!rest) return message.reply('❌ Usage: !broadcast <message>').catch(()=>{});
            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle('📢 Server Broadcast')
                .setDescription(rest)
                .setTimestamp()
                .setFooter({text:`Sent by ${message.author.tag}`});
            await message.channel.send({embeds:[embed]}).catch(()=>{});
            await sendWebhookLog('adminabuse', embed);
            return;
        }

        if (cmd==='eventannounce') {
            const evId=args[1]; const ev=WORLD_EVENTS.find(e=>e.id===evId)||ABUSE_EVENTS[evId];
            if (!ev) return message.reply('❌ Unknown event ID.').catch(()=>{});
            await abuseAnnounce(message.channel, `${ev.emoji} ${ev.name}!`, ev.desc, 0xFF9800);
            return;
        }

        if (cmd==='spawnfish') {
            const fishId=args[1];
            const fish=FISH_SPECIES.find(f=>f.id===fishId);
            if (!fish) return message.reply('❌ Unknown fish ID. Check /fishinfo for IDs.').catch(()=>{});
            const embed = new EmbedBuilder()
                .setColor(RARITY_COLORS[fish.r]||0x9E9E9E)
                .setTitle(`🎣 ${fish.emoji} ${fish.name} Spotted!`)
                .setDescription(`A wild **${fish.name}** (${fish.r}) has appeared in the waters!\nBe the first to catch it with \`/fish\`!`)
                .addFields({name:'Base Value',value:`💰 ${fmtN(fish.val)} coins`,inline:true},{name:'Rarity',value:fish.r,inline:true})
                .setTimestamp();
            await message.channel.send({embeds:[embed]}).catch(()=>{});
            return;
        }

        if (cmd==='spawnfishall') {
            const fishId=args[1];
            const fish=FISH_SPECIES.find(f=>f.id===fishId);
            if (!fish) return message.reply('❌ Unknown fish ID.').catch(()=>{});
            const embed = new EmbedBuilder()
                .setColor(RARITY_COLORS[fish.r]||0x9E9E9E)
                .setTitle(`🌊 ${fish.emoji} ${fish.name} EVERYWHERE!`)
                .setDescription(`**${fish.name}** has flooded ALL fishing spots!\nEveryone fishing right now will catch one! Use \`/fish\` immediately!`)
                .setTimestamp();
            await message.channel.send({embeds:[embed]}).catch(()=>{});
            // Temporarily boost secret/legendary so this fish appears
            if (fish.r==='Secret') { abuseConfig.secretMult=1000; setTimeout(()=>{abuseConfig.secretMult=1;},60000); }
            if (fish.r==='Legendary') { abuseConfig.legendaryMult=1000; setTimeout(()=>{abuseConfig.legendaryMult=1;},60000); }
            return;
        }

        if (cmd==='spawnboss') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            const b=BOSS_FISH.find(b=>b.id===args[1]);
            if (!b) return message.reply('❌ Invalid boss. IDs: '+BOSS_FISH.map(b=>b.id).join(', ')).catch(()=>{});
            userData.activeBoss=b; userData.activeBossHp=b.hp;
            await saveData();
            await abuseAnnounce(message.channel, `${b.emoji} ${b.name} SPAWNED!`,
                `**${b.name}** has appeared with **${fmtN(b.hp)} HP**!\nUse \`/fishboss\` to attack!\nReward: 💰 ${fmtN(b.reward)} coins | ⭐ ${fmtN(b.xp)} XP`, 0xFF4444);
            await sendWebhookLog('boss', new EmbedBuilder().setColor(0xFF4444)
                .setTitle(`[BOSS] ${b.emoji} ${b.name} Spawned`)
                .setDescription(`HP: ${fmtN(b.hp)} | Reward: ${fmtN(b.reward)} | Spawned by: ${message.author.tag}`)
                .setTimestamp());
            return;
        }

        if (cmd==='despawnboss') {
            userData.activeBoss=null; userData.activeBossHp=0;
            await saveData();
            return message.reply('✅ Boss despawned.').catch(()=>{});
        }

        if (cmd==='doublexp') {
            abuseConfig.xpMult=2; abuseConfig.coinMult=abuseConfig.coinMult||1;
            setTimeout(async()=>{abuseConfig.xpMult=1;await saveData();},3600000);
            await saveData();
            await abuseAnnounce(message.channel,'⭐ Double XP!','All XP gains are **2x** for 1 hour! Get fishing!',0x57F287);
            return;
        }
        if (cmd==='triplexp') {
            abuseConfig.xpMult=3;
            setTimeout(async()=>{abuseConfig.xpMult=1;await saveData();},3600000);
            await saveData();
            await abuseAnnounce(message.channel,'⭐⭐ TRIPLE XP!','All XP gains are **3x** for 1 hour! GO GO GO!',0x57F287);
            return;
        }
        if (cmd==='doublemoney') {
            abuseConfig.sellMult=2;
            setTimeout(async()=>{abuseConfig.sellMult=1;await saveData();},3600000);
            await saveData();
            await abuseAnnounce(message.channel,'💰 Double Money!','All fish sell for **2x** their value for 1 hour!',0xFFD700);
            return;
        }
        if (cmd==='triplemoney') {
            abuseConfig.sellMult=3;
            setTimeout(async()=>{abuseConfig.sellMult=1;await saveData();},3600000);
            await saveData();
            await abuseAnnounce(message.channel,'💰💰 TRIPLE MONEY!','All fish sell for **3x** their value for 1 hour!',0xFFD700);
            return;
        }
        if (cmd==='boostall') {
            abuseConfig.xpMult=3; abuseConfig.coinMult=3; abuseConfig.sellMult=3;
            abuseConfig.mutationMult=5; abuseConfig.legendaryMult=5;
            setTimeout(async()=>{abuseConfig.xpMult=1;abuseConfig.coinMult=1;abuseConfig.sellMult=1;abuseConfig.mutationMult=1;abuseConfig.legendaryMult=1;await saveData();},3600000);
            await saveData();
            await abuseAnnounce(message.channel,'🚀 BOOST ALL!',
                '**XP x3 | Coins x3 | Sell x3 | Mutations x5 | Legendary x5**\nAll active for 1 hour!',0xFF9800);
            return;
        }

        if (cmd==='setsecretmultiplier') {
            const v=parseFloat(args[1]);
            if (isNaN(v)||v<1) return message.reply('❌ Usage: !setsecretmultiplier <number ≥ 1>').catch(()=>{});
            abuseConfig.secretMult=v; await saveData();
            return message.reply(`✅ Secret fish multiplier set to **${v}x**.`).catch(()=>{});
        }
        if (cmd==='setlegendarymultiplier') {
            const v=parseFloat(args[1]);
            if (isNaN(v)||v<1) return message.reply('❌ Usage: !setlegendarymultiplier <number ≥ 1>').catch(()=>{});
            abuseConfig.legendaryMult=v; await saveData();
            return message.reply(`✅ Legendary fish multiplier set to **${v}x**.`).catch(()=>{});
        }
        if (cmd==='setmutationmultiplier') {
            const v=parseFloat(args[1]);
            if (isNaN(v)||v<1) return message.reply('❌ Usage: !setmutationmultiplier <number ≥ 1>').catch(()=>{});
            abuseConfig.mutationMult=v; await saveData();
            return message.reply(`✅ Mutation multiplier set to **${v}x**.`).catch(()=>{});
                                                    }
        // ════════════════════════════════════════════════════════
        // 🔗 WEBHOOK COMMANDS — OWNER ONLY
        // ════════════════════════════════════════════════════════
        if (cmd==='setfishwebhook')       { webhookConfig.fish=args[1]||null;       await saveData(); return message.reply(`✅ Fish webhook ${args[1]?'set':'cleared'}.`).catch(()=>{}); }
        if (cmd==='seteconomywebhook')    { webhookConfig.economy=args[1]||null;    await saveData(); return message.reply(`✅ Economy webhook ${args[1]?'set':'cleared'}.`).catch(()=>{}); }
        if (cmd==='setbosswebhook')       { webhookConfig.boss=args[1]||null;       await saveData(); return message.reply(`✅ Boss webhook ${args[1]?'set':'cleared'}.`).catch(()=>{}); }
        if (cmd==='setadminabusewebhook') { webhookConfig.adminabuse=args[1]||null; await saveData(); return message.reply(`✅ Admin Abuse webhook ${args[1]?'set':'cleared'}.`).catch(()=>{}); }
        if (cmd==='seteventwebhook')      { webhookConfig.event=args[1]||null;      await saveData(); return message.reply(`✅ Event webhook ${args[1]?'set':'cleared'}.`).catch(()=>{}); }
        if (cmd==='setguildwebhook')      { webhookConfig.guild=args[1]||null;      await saveData(); return message.reply(`✅ Guild webhook ${args[1]?'set':'cleared'}.`).catch(()=>{}); }
        if (cmd==='seterrorwebhook')      { webhookConfig.error=args[1]||null;      await saveData(); return message.reply(`✅ Error webhook ${args[1]?'set':'cleared'}.`).catch(()=>{}); }

        if (cmd==='testwebhook') {
            const type=args[1]||'fish';
            if (!webhookConfig[type]) return message.reply(`❌ No webhook set for **${type}**. Use !set${type}webhook <url>`).catch(()=>{});
            await sendWebhookLog(type, new EmbedBuilder()
                .setColor(0x57F287).setTitle('✅ Webhook Test').setDescription(`Test from **${message.author.tag}** — this webhook is working!`).setTimestamp());
            return message.reply(`✅ Test embed sent to **${type}** webhook!`).catch(()=>{});
        }

        if (cmd==='webhookstatus') {
            const lines=Object.entries(webhookConfig).map(([k,v])=>`**${k}:** ${v?'✅ Set':'❌ Not set'}`);
            const embed=new EmbedBuilder().setColor(0x3498DB).setTitle('🔗 Webhook Status').setDescription(lines.join('\n')).setTimestamp();
            return message.reply({embeds:[embed]}).catch(()=>{});
        }

        // ════════════════════════════════════════════════════════
        // 📋 ADVANCED LOG SETUP COMMANDS — OWNER ONLY
        // ════════════════════════════════════════════════════════
        const logTypes=['message','member','role','mod','server','voice'];
        const logCmds={setmessagelog:'message',setmemberlog:'member',setrolelog:'role',setmodlog:'mod',setserverlog:'server',setvoicelog:'voice'};
        if (logCmds[cmd]) {
            const cat=logCmds[cmd];
            const chId=message.mentions.channels.first()?.id||args[1];
            if (!chId) return message.reply(`❌ Usage: !${cmd} #channel`).catch(()=>{});
            if (!advancedLogsConfig[cat]) advancedLogsConfig[cat]={};
            advancedLogsConfig[cat][message.guildId]={channelId:chId,enabled:true};
            await saveData();
            return message.reply(`✅ **${cat}** logs → <#${chId}>`).catch(()=>{});
        }

        if (cmd==='enablelog') {
            const cat=args[1];
            if (!logTypes.includes(cat)) return message.reply('❌ Categories: '+logTypes.join(', ')).catch(()=>{});
            if (!advancedLogsConfig[cat]) advancedLogsConfig[cat]={};
            if (!advancedLogsConfig[cat][message.guildId]) return message.reply('❌ Set a channel first with !set'+cat+'log').catch(()=>{});
            advancedLogsConfig[cat][message.guildId].enabled=true;
            await saveData();
            return message.reply(`✅ **${cat}** logs enabled.`).catch(()=>{});
        }

        if (cmd==='disablelog') {
            const cat=args[1];
            if (!logTypes.includes(cat)) return message.reply('❌ Categories: '+logTypes.join(', ')).catch(()=>{});
            if (advancedLogsConfig[cat]?.[message.guildId]) advancedLogsConfig[cat][message.guildId].enabled=false;
            await saveData();
            return message.reply(`✅ **${cat}** logs disabled.`).catch(()=>{});
        }

        if (cmd==='logstatus') {
            const lines=logTypes.map(cat=>{
                const cfg=advancedLogsConfig[cat]?.[message.guildId];
                return `**${cat}:** ${cfg?.channelId?`<#${cfg.channelId}> ${cfg.enabled?'✅':'⏸️'}`:'❌ Not set'}`;
            });
            const embed=new EmbedBuilder().setColor(0x3498DB).setTitle('📋 Log Status').setDescription(lines.join('\n')).setTimestamp();
            return message.reply({embeds:[embed]}).catch(()=>{});
        }

        // ════════════════════════════════════════════════════════
        // 🏆 OWNER PANEL
        // ════════════════════════════════════════════════════════
        // ════════════════════════════════════════════════════════
        // 🚫⏰ OWNER COOLDOWN OVERRIDE COMMANDS
        // ════════════════════════════════════════════════════════

        if (cmd==='nocooldown') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            // Usage: !nocooldown <@user|userId> [minutes]
            // Grants a user no-cooldown override for fishing (default: permanent until removed)
            const target = message.mentions.users.first() || (args[1] ? await client.users.fetch(args[1]).catch(()=>null) : null);
            if (!target) return message.reply('❌ Usage: `!nocooldown <@user|userId> [minutes]`').catch(()=>{});
            const mins = parseInt(args[2]);
            const expiry = (!isNaN(mins) && mins > 0) ? Date.now() + mins * 60000 : Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year = "permanent"
            userData.noCooldown.set(String(target.id), expiry);
            await saveData();
            const expiryStr = (!isNaN(mins) && mins > 0) ? `for **${mins} minute(s)**` : '**permanently** (until removed)';
            const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('🚫⏰ No-Cooldown Override Granted')
                .setDescription(`${target} now has **no fishing cooldown** ${expiryStr}.`)
                .addFields(
                    { name: 'User', value: `${target.tag} (\`${target.id}\`)`, inline: true },
                    { name: 'Expires', value: (!isNaN(mins) && mins > 0) ? `<t:${Math.floor(expiry/1000)}:R>` : 'Never (manual removal required)', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Granted by ${message.author.tag}` });
            return message.reply({ embeds: [embed] }).catch(()=>{});
        }

        if (cmd==='removenocooldown') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            // Usage: !removenocooldown <@user|userId>
            const target = message.mentions.users.first() || (args[1] ? await client.users.fetch(args[1]).catch(()=>null) : null);
            if (!target) return message.reply('❌ Usage: `!removenocooldown <@user|userId>`').catch(()=>{});
            const had = userData.noCooldown.has(String(target.id));
            userData.noCooldown.delete(String(target.id));
            await saveData();
            const embed = new EmbedBuilder()
                .setColor(had ? 0xFF4500 : 0x9E9E9E)
                .setTitle('⏰ No-Cooldown Override Removed')
                .setDescription(had
                    ? `${target}'s no-cooldown override has been **removed**. Normal cooldowns apply.`
                    : `${target} did not have a no-cooldown override.`)
                .setTimestamp()
                .setFooter({ text: `Removed by ${message.author.tag}` });
            return message.reply({ embeds: [embed] }).catch(()=>{});
        }

        if (cmd==='nocooldownlist') {
            if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});
            // Lists all users with active no-cooldown overrides
            const now = Date.now();
            const active = [];
            for (const [uid, exp] of userData.noCooldown.entries()) {
                if (exp > now) {
                    const isPerm = exp > now + 364 * 24 * 60 * 60 * 1000;
                    active.push({ uid, exp, isPerm });
                } else {
                    // Clean up expired entries
                    userData.noCooldown.delete(uid);
                }
            }
            if (active.length === 0) {
                return message.reply('📋 No users currently have a no-cooldown override.').catch(()=>{});
            }
            const lines = await Promise.all(active.map(async ({ uid, exp, isPerm }) => {
                const user = await client.users.fetch(uid).catch(()=>null);
                const tag = user ? `**${user.tag}** (\`${uid}\`)` : `\`${uid}\``;
                const expStr = isPerm ? '♾️ Permanent' : `<t:${Math.floor(exp/1000)}:R>`;
                return `• ${tag} — ${expStr}`;
            }));
            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle('🚫⏰ No-Cooldown Override List')
                .setDescription(lines.join('\n') || 'None')
                .setFooter({ text: `${active.length} active override(s)` })
                .setTimestamp();
            return message.reply({ embeds: [embed] }).catch(()=>{});
        }

    
    if (cmd === 'resetall') {
    if (!isOwnerMsg) return message.reply('❌ Owner only!').catch(()=>{});

    // Clear all active abuse events
    abuseConfig.activeEvents = {};

    // Reset all multipliers
    abuseConfig.secretMult    = 1;
    abuseConfig.legendaryMult = 1;
    abuseConfig.mutationMult  = 1;
    abuseConfig.xpMult        = 1;
    abuseConfig.coinMult      = 1;
    abuseConfig.sellMult      = 1;

    // Clear weather override
    abuseConfig.weatherOverride    = null;
    abuseConfig.weatherOverrideEnd = 0;

    // Disable chaos mode
    abuseConfig.chaosMode = false;

    // Clear world event
    userData.worldEvent    = null;
    userData.worldEventEnd = 0;

    // Clear active boss
    userData.activeBoss   = null;
    userData.activeBossHp = 0;

    await saveData();

    return message.reply({ embeds: [
        new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Full Reset Complete')
            .setDescription(
`Everything has been wiped back to normal.

• ✅ All abuse events cleared
• ✅ All multipliers → 1x
• ✅ Weather override cleared
• ✅ Chaos mode disabled
• ✅ World event cleared
• ✅ Active boss cleared`
            )
            .setTimestamp()
            .setFooter({ text: `Reset by ${message.author.tag}` })
    ]}).catch(()=>{});
        }

        if (cmd==='ownerpanel') {
            const activeAbuse=Object.entries(abuseConfig.activeEvents)
                .map(([id,ae])=>`• **${ABUSE_EVENTS[id]?.name||id}** — ends <t:${Math.floor(ae.endTime/1000)}:R>`)
                .join('\n')||'None';
            const embed=new EmbedBuilder()
                .setColor(0xFF4500)
                .setTitle('👑 Owner Panel — Fisch Admin Abuse System')
                .addFields(
                    {name:'🌀 Active Abuse Events',  value:activeAbuse},
                    {name:'🔢 Multipliers',value:[
                        `🌑 Secret: **${abuseConfig.secretMult||1}x**`,
                        `✴️ Legendary: **${abuseConfig.legendaryMult||1}x**`,
                        `🧬 Mutation: **${abuseConfig.mutationMult||1}x**`,
                        `⭐ XP: **${abuseConfig.xpMult||1}x**`,
                        `💰 Sell: **${abuseConfig.sellMult||1}x**`,
                    ].join(' | ')},
                    {name:'🌤️ Weather Override', value:abuseConfig.weatherOverride&&abuseConfig.weatherOverrideEnd>Date.now()?`${abuseConfig.weatherOverride} until <t:${Math.floor(abuseConfig.weatherOverrideEnd/1000)}:R>`:'None'},
                    {name:'🌀 Chaos Mode',value:abuseConfig.chaosMode?'✅ ENABLED':'❌ Off'},
                    {name:'🔗 Webhooks',value:Object.entries(webhookConfig).map(([k,v])=>`**${k}:** ${v?'✅':'❌'}`).join(' | ')},
                )
                .setTimestamp()
                .addFields({name:'🚫⏰ No-Cooldown Overrides', value:`**${userData.noCooldown.size}** active override(s)`})
                .setFooter({text:'Visible to owner only'});
            return message.reply({embeds:[embed]}).catch(()=>{});
                }

    // ════════════════════════════════════════════════════════
        // 🎲 APPRAISAL COMMAND
        // ════════════════════════════════════════════════════════
        if (cmd==='appraise') {
            // BUG FIX: appraise now works on actual inventory fish by slot number
            const idxArg = parseInt(args[1]);
            const inv = userData.fishInv.get(userId) || [];
            if (!args[1] || isNaN(idxArg) || idxArg < 1 || idxArg > inv.length) {
                return message.reply(`❌ Usage: \`!appraise <slot#>\`\nYou have **${inv.length}** fish in inventory. Appraisal gambles the fish's stored value!`).catch(()=>{});
            }
            const slot = inv[idxArg - 1];
            const fish = FISH_SPECIES.find(f => f.id === slot.fishId);
            if (!fish) return message.reply('❌ Fish data not found for that slot.').catch(()=>{});
            const baseVal = slot.value;
            const outcome = weightedRandom(APPRAISAL_OUTCOMES);
            const newVal = Math.round(baseVal * outcome.coinMult);
            const diff = newVal - baseVal;
            const color = outcome.coinMult >= 2 ? 0x57F287 : outcome.coinMult >= 1 ? 0xFFA500 : 0xFF0000;
            let mutNote = '';
            const curMut = MUTATIONS.find(m => m.id === slot.mutId) || MUTATIONS[0];
            if (outcome.mutUpgrade && curMut.id === 'none') {
                const nonNone = MUTATIONS.filter(m => m.id !== 'none');
                const newMut = weightedRandom(nonNone);
                slot.mutId = newMut.id;
                mutNote = `\n🧬 **Mutation gained!** Fish is now **${newMut.name}** (${newMut.mult}x)!`;
            } else if (outcome.mutLoss && curMut.id !== 'none') {
                slot.mutId = 'none';
                mutNote = '\n💔 **Mutation lost!** The appraisal stripped your fish\'s mutation.';
            }
            slot.value = newVal;
            inv[idxArg - 1] = slot;
            userData.fishInv.set(userId, inv);
            await saveData();
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`🎲 Fish Appraisal — ${fish.emoji} ${fish.name}`)
                .setDescription([
                    `**Result:** ${outcome.label}`,
                    `${outcome.desc}${mutNote}`,
                    '',
                    `**Base Value:** 💰 ${fmtN(baseVal)}`,
                    `**New Value:** 💰 ${fmtN(newVal)} (${diff >= 0 ? '+' : ''}${fmtN(diff)})`,
                    `**Multiplier:** ${outcome.coinMult}x`,
                ].join('\n'))
                .setTimestamp()
                .setFooter({text: 'Appraisal results are final. Gamble responsibly!'});
            return message.reply({embeds: [embed]}).catch(()=>{});
        }

    } catch(e) { console.error('❌ Message handler error:', e?.message); }
});
// ════════════════════════════════════════════════════════════════
// ♦️ GAME SESSION CLEANUP
// ════════════════════════════════════════════════════════════════
setInterval(() => {
    const now=Date.now();
    for (const [id,g] of hangGames)   if (now-(g.ts||g.startTime||0)>GAME_TIMEOUT) hangGames.delete(id);
    for (const [id,g] of tttGames)    if (now-(g.ts||g.startTime||0)>GAME_TIMEOUT) tttGames.delete(id);
    for (const [id,g] of c4Games)     if (now-(g.ts||g.startTime||0)>GAME_TIMEOUT) c4Games.delete(id);
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
        await saveData(true); // Force immediate save
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
// ♦️ ADMIN ABUSE SYSTEM
// ════════════════════════════════════════════════════════════════
const ABUSE_EVENTS = {
    secret_frenzy:    { name:'Secret Frenzy',      emoji:'🌑', desc:'Secret fish rates x10 for 30 minutes!',         secretMult:10, dur:1800000 },
    mutation_madness: { name:'Mutation Madness',   emoji:'🧬', desc:'All mutation rates x8 for 30 minutes!',          mutMult:8,    dur:1800000 },
    boss_rush:        { name:'Boss Rush',           emoji:'💀', desc:'Boss spawns x5 for 1 hour!',                    bossSpawn:5,  dur:3600000 },
    golden_tide:      { name:'Golden Tide',         emoji:'✨', desc:'All fish sell for 5x value for 1 hour!',        sellMult:5,   dur:3600000 },
    celestial_surge:  { name:'Celestial Surge',    emoji:'✴️', desc:'Legendary fish rates x20 for 30 minutes!',      legMult:20,   dur:1800000 },
    void_corruption:  { name:'Void Corruption',    emoji:'🌀', desc:'Mythical fish rates x15 for 30 minutes!',       mythMult:15,  dur:1800000 },
    leviathan_rampage:{ name:'Leviathan Rampage',  emoji:'🌊', desc:'All boss HP halved, rewards doubled for 1 hour!',bossReward:2, dur:3600000 },
    kraken_takeover:  { name:'Kraken Takeover',    emoji:'🦑', desc:'Kraken mutation x20, rare fish everywhere!',    mutMult:20,   dur:1800000 },
    eternal_eclipse:  { name:'Eternal Eclipse',    emoji:'🌑', desc:'Eclipse weather locked for 1 hour!',            weather:'eclipse', dur:3600000 },
    storm_of_riches:  { name:'Storm of Riches',    emoji:'💰', desc:'XP x5, coins x5 for 1 hour!',                  xpMult:5, coinMult:5, dur:3600000 },
};

// Global abuse state — persists via abuseConfig in saveData
let abuseConfig = {
    activeEvents: {},   // id → { event, endTime }
    secretMult: 1,
    legendaryMult: 1,
    mutationMult: 1,
    xpMult: 1,
    coinMult: 1,
    sellMult: 1,
    weatherOverride: null,
    weatherOverrideEnd: 0,
    chaosMode: false,
};

function getAbuseMultiplier(type) {
    // Clean expired events first
    const now = Date.now();
    for (const [id, ae] of Object.entries(abuseConfig.activeEvents)) {
        if (ae.endTime < now) delete abuseConfig.activeEvents[id];
    }
    let mult = 1;
    for (const ae of Object.values(abuseConfig.activeEvents)) {
        const ev = ABUSE_EVENTS[ae.id];
        if (!ev) continue;
        if (type === 'secret'    && ev.secretMult) mult *= ev.secretMult;
        if (type === 'legendary' && ev.legMult)    mult *= ev.legMult;
        if (type === 'mythical'  && ev.mythMult)   mult *= ev.mythMult;
        if (type === 'mutation'  && ev.mutMult)    mult *= ev.mutMult;
        if (type === 'sell'      && ev.sellMult)   mult *= ev.sellMult;
        if (type === 'xp'        && ev.xpMult)     mult *= ev.xpMult;
        if (type === 'coin'      && ev.coinMult)   mult *= ev.coinMult;
    }
    if (type === 'secret')    mult *= abuseConfig.secretMult   || 1;
    if (type === 'legendary') mult *= abuseConfig.legendaryMult|| 1;
    if (type === 'mutation')  mult *= abuseConfig.mutationMult || 1;
    if (type === 'xp')        mult *= abuseConfig.xpMult       || 1;
    if (type === 'coin')      mult *= abuseConfig.coinMult     || 1;
    if (type === 'sell')      mult *= abuseConfig.sellMult     || 1;
    return mult;
}

function getAbuseWeather() {
    if (abuseConfig.weatherOverride && abuseConfig.weatherOverrideEnd > Date.now())
        return WEATHER_EFFECTS.find(w=>w.id===abuseConfig.weatherOverride) || null;
    return null;
}

async function abuseAnnounce(channel, title, desc, color=0xFF4500) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`🚨 ${title}`)
        .setDescription(desc)
        .setTimestamp()
        .setFooter({text:'Admin Abuse System • Owner-Certified Event'});
    await channel.send({embeds:[embed]}).catch(()=>{});
    await sendWebhookLog('adminabuse', new EmbedBuilder()
        .setColor(color).setTitle(`[ABUSE LOG] ${title}`).setDescription(desc).setTimestamp());
            }

// ════════════════════════════════════════════════════════════════
// ♦️ WEBHOOK AUDIT SYSTEM
// ════════════════════════════════════════════════════════════════
let webhookConfig = {
    fish:       null,   // webhook URL
    economy:    null,
    boss:       null,
    adminabuse: null,
    event:      null,
    guild:      null,
    error:      null,
};

async function sendWebhookLog(type, embed) {
    const url = webhookConfig[type];
    if (!url) return;
    try {
        const body = {
            username: 'Fisch Audit Log',
            avatar_url: 'https://media.discordapp.net/attachments/1340069836096667859/fisch_icon.png',
            embeds: [embed.toJSON()],
        };
        await fetch(url, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(body),
        });
    } catch(e) { console.error('Webhook error:', e?.message); }
}

// ════════════════════════════════════════════════════════════════
// ♦️ ADVANCED LOGGING SYSTEM (Carl-bot style)
// ════════════════════════════════════════════════════════════════
// (guildPrefixes and advancedLogsConfig already declared at top)

// Message cache for edit/delete logs
const messageCache = new Map(); // messageId → {content, author, channel}

async function sendAdvLog(guild, category, embed) {
    try {
        const cfg = advancedLogsConfig[category]?.[guild.id];
        if (!cfg || !cfg.enabled || !cfg.channelId) return;
        const ch = await guild.channels.fetch(cfg.channelId).catch(()=>null);
        // BUG FIX: verify channel is text-based before sending
        if (!ch || !ch.isTextBased()) return;
        await ch.send({embeds:[embed]}).catch(()=>{});
    } catch(e) {}
         }
// ════════════════════════════════════════════════════════════════
// 🎮 WORDLE — Guess listener (standalone, top-level — do NOT nest this
// inside any other client.on('messageCreate', ...) block)
// ════════════════════════════════════════════════════════════════
client.on('messageCreate', async message => {
    try {
        if (message.author?.bot) return;
        const chanId = String(message.channelId);
        const game = wordleGames.get(chanId);
        if (!game) return;

        const guess = message.content.toLowerCase();
        if (guess.length !== game.word.length || !/^[a-z]+$/.test(guess)) return;

        const result = evaluateWordleGuess(game.word, guess);
        const emojiLine = result.join(' ');
        const isCorrect = guess === game.word;

        if (isCorrect) {
            wordleGames.delete(chanId);
            const userId = String(message.author.id);
            let rewardLine = '';
            if (game.reward > 0) {
                const current = userData.wordleTokens.get(userId) || 0;
                userData.wordleTokens.set(userId, current + game.reward);
                rewardLine += `\n${message.author} got **${game.reward}** Wordle Token${game.reward===1?'':'s'} and now has **${current+game.reward}**!`;
            }
            if (game.coinReward > 0) {
                addCoins(userId, game.coinReward);
                rewardLine += `\n${message.author} also got **${fmtN(game.coinReward)}** coins!`;
            }
            await saveData();
            await message.reply(`# ${emojiLine}\n${message.author} guessed the correct word!${rewardLine}`).catch(()=>{});
        } else {
            await message.reply(emojiLine).catch(()=>{});
        }
    } catch (e) {
        console.error('Wordle guess listener error:', e?.message);
    }
});

// Message events
client.on('messageCreate', msg => {
    if (msg.author?.bot) return;
    const now = Date.now();
    if (msg.content)         messageCache.set(msg.id, {
            content: msg.content,
            author: msg.author?.tag,
            authorId: msg.author?.id,
            channel: msg.channel?.name,
            channelId: msg.channelId,
            guildId: msg.guildId,
            attachments: [...(msg.attachments?.values()||[])].map(a=>a.url),
            timestamp: now, // Add timestamp for age-based cleanup
        });
    // Limit cache size and implement time-based cleanup
    const MESSAGE_CACHE_MAX_AGE = 3600 * 1000; // 1 hour
    if (messageCache.size > 2000) {
        // Remove oldest entry if over size limit
        const first = messageCache.keys().next().value;
        messageCache.delete(first);
    }
    // Periodically clean up old messages (e.g., every 100 messages added)
    if (Math.random() < 0.01) { // 1% chance to run cleanup on message add
        for (const [id, msgData] of messageCache.entries()) {
            if (now - (msgData.timestamp || 0) > MESSAGE_CACHE_MAX_AGE) {
                messageCache.delete(id);
            }
        }
    }
});

client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (!newMsg.guild || newMsg.author?.bot) return;
    const cached = messageCache.get(newMsg.id);
    const oldContent = cached?.content || oldMsg.content || '*Unknown*';
    const newContent = newMsg.content || '*Empty*';
    if (oldContent === newContent) return;
    if (cached) cached.content = newContent;
    const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('✏️ Message Edited')
        .addFields(
            {name:'Author', value:`<@${newMsg.author?.id}> (${newMsg.author?.tag})`, inline:true},
            {name:'Channel', value:`<#${newMsg.channelId}>`, inline:true},
            {name:'Before', value:oldContent.slice(0,1000)||'*Empty*'},
            {name:'After',  value:newContent.slice(0,1000)||'*Empty*'},
        )
        .setTimestamp();
    await sendAdvLog(newMsg.guild, 'message', embed);
});

client.on('messageDelete', async msg => {
    if (!msg.guild) return;
    const cached = messageCache.get(msg.id);
    const content = cached?.content || msg.content || '*Unknown (not cached)*';
    const author = cached?.author || msg.author?.tag || '*Unknown*';
    const attachments = cached?.attachments || [];
    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🗑️ Message Deleted')
        .addFields(
            {name:'Author', value:`${author} (<@${cached?.authorId||msg.author?.id||'?'}>)`, inline:true},
            {name:'Channel', value:`<#${msg.channelId}>`, inline:true},
            {name:'Content', value:content.slice(0,1000)||'*Empty*'},
        )
        .setTimestamp();
    if (attachments.length) embed.addFields({name:'Attachments', value:attachments.join('\n').slice(0,500)});
    await sendAdvLog(msg.guild, 'message', embed);
    messageCache.delete(msg.id);
});

// Member events (guildMemberAdd is handled at the bottom of the file)

client.on('guildMemberRemove', async member => {
    const embed = new EmbedBuilder()
        .setColor(0xFF6600)
        .setTitle('📤 Member Left')
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
            {name:'User', value:`${member.user.tag} (<@${member.id}>)`, inline:true},
            {name:'Joined', value:member.joinedAt?cdStr(Date.now()-member.joinedTimestamp)+' ago':'Unknown', inline:true},
        )
        .setTimestamp();
    await sendAdvLog(member.guild, 'member', embed);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const changes = [];
    if (oldMember.nickname !== newMember.nickname)
        changes.push(`**Nickname:** \`${oldMember.nickname||'None'}\` → \`${newMember.nickname||'None'}\``);
    const addedRoles  = newMember.roles.cache.filter(r=>!oldMember.roles.cache.has(r.id));
    const removedRoles= oldMember.roles.cache.filter(r=>!newMember.roles.cache.has(r.id));
    if (addedRoles.size)   changes.push(`**Roles Added:** ${addedRoles.map(r=>`<@&${r.id}>`).join(', ')}`);
    if (removedRoles.size) changes.push(`**Roles Removed:** ${removedRoles.map(r=>`<@&${r.id}>`).join(', ')}`);
    if (!changes.length) return;
    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('👤 Member Updated')
        .setDescription(`<@${newMember.id}> (${newMember.user.tag})\n${changes.join('\n')}`)
        .setTimestamp();
    await sendAdvLog(newMember.guild, 'member', embed);
    if (addedRoles.size || removedRoles.size) await sendAdvLog(newMember.guild, 'role', embed);
});

// Role events
client.on('roleCreate', async role => {
    const embed = new EmbedBuilder().setColor(0x00FF7F).setTitle('✅ Role Created')
        .addFields({name:'Role', value:`<@&${role.id}> (${role.name})`, inline:true}).setTimestamp();
    await sendAdvLog(role.guild, 'role', embed);
});
client.on('roleDelete', async role => {
    const embed = new EmbedBuilder().setColor(0xFF0000).setTitle('❌ Role Deleted')
        .addFields({name:'Role', value:role.name, inline:true}).setTimestamp();
    await sendAdvLog(role.guild, 'role', embed);
});
client.on('roleUpdate', async (oldRole, newRole) => {
    const changes = [];
    if (oldRole.name !== newRole.name) changes.push(`**Name:** \`${oldRole.name}\` → \`${newRole.name}\``);
    if (oldRole.color !== newRole.color) changes.push(`**Color:** \`#${oldRole.color.toString(16)}\` → \`#${newRole.color.toString(16)}\``);
    if (!changes.length) return;
    const embed = new EmbedBuilder().setColor(0xFFA500).setTitle('🔄 Role Updated')
        .setDescription(`<@&${newRole.id}>\n${changes.join('\n')}`).setTimestamp();
    await sendAdvLog(newRole.guild, 'role', embed);
});

// Server events
client.on('channelCreate', async ch => {
    if (!ch.guild) return;
    const embed = new EmbedBuilder().setColor(0x00FF00).setTitle('📢 Channel Created')
        .addFields({name:'Channel', value:`<#${ch.id}> (${ch.name})`, inline:true}).setTimestamp();
    await sendAdvLog(ch.guild, 'server', embed);
});
client.on('channelDelete', async ch => {
    if (!ch.guild) return;
    const embed = new EmbedBuilder().setColor(0xFF0000).setTitle('🗑️ Channel Deleted')
        .addFields({name:'Channel', value:ch.name, inline:true}).setTimestamp();
    await sendAdvLog(ch.guild, 'server', embed);
});

// Voice events
client.on('voiceStateUpdate', async (oldState, newState) => {
    const user = newState.member?.user || oldState.member?.user;
    const guild = newState.guild || oldState.guild;
    if (!guild || !user) return;
    let action = '';
    if (!oldState.channelId && newState.channelId) action = `🔊 **${user.tag}** joined <#${newState.channelId}>`;
    else if (oldState.channelId && !newState.channelId) action = `🔇 **${user.tag}** left <#${oldState.channelId}>`;
    else if (oldState.channelId !== newState.channelId) action = `🔀 **${user.tag}** moved from <#${oldState.channelId}> to <#${newState.channelId}>`;
    if (!action) return;
    const embed = new EmbedBuilder().setColor(0x9B59B6).setTitle('🎙️ Voice Activity').setDescription(action).setTimestamp();
    await sendAdvLog(guild, 'voice', embed);
});


// ════════════════════════════════════════════════════════════════
// ♦️ APPRAISAL SYSTEM
// ════════════════════════════════════════════════════════════════
const APPRAISAL_OUTCOMES = [
    // outcome, weight, label, coinMult, description
    { id:'jackpot',      weight:2,   label:'💎 JACKPOT!',          coinMult:5.0,  mutUpgrade:true,  mutLoss:false, desc:'Incredible! Fish value and mutation both upgraded!' },
    { id:'great',        weight:8,   label:'✨ Great Appraisal!',   coinMult:2.5,  mutUpgrade:false, mutLoss:false, desc:'Fish appraised brilliantly! Big value boost!' },
    { id:'good',         weight:20,  label:'👍 Good',               coinMult:1.5,  mutUpgrade:false, mutLoss:false, desc:'Solid result. Value increased.' },
    { id:'neutral',      weight:30,  label:'😐 Unchanged',          coinMult:1.0,  mutUpgrade:false, mutLoss:false, desc:'Appraiser shrugged. Nothing changed.' },
    { id:'bad',          weight:20,  label:'👎 Bad Appraisal',      coinMult:0.6,  mutUpgrade:false, mutLoss:false, desc:'Appraiser found flaws. Value dropped.' },
    { id:'terrible',     weight:12,  label:'💸 Terrible!',          coinMult:0.3,  mutUpgrade:false, mutLoss:true,  desc:'Disaster! Mutation lost and value tanked.' },
    { id:'catastrophic', weight:8,   label:'💀 CATASTROPHIC!',      coinMult:0.1,  mutUpgrade:false, mutLoss:true,  desc:'The fish was ruined. You lost almost everything.' },
];

// ════════════════════════════════════════════════════════════════
// ♦️ INJECT ABUSE MULTIPLIERS INTO EXISTING CATCH LOGIC
// ════════════════════════════════════════════════════════════════
// Patch RARITY_WEIGHTS to respect abuse multipliers at runtime
function getAdjustedRarityWeights() {
    const w = {...RARITY_WEIGHTS};
    const secMult   = getAbuseMultiplier('secret');
    const legMult   = getAbuseMultiplier('legendary');
    const mythMult  = getAbuseMultiplier('mythical');
    if (secMult  > 1) w.Secret    = Math.min(w.Secret    * secMult,  w.Mythical * 0.8);
    if (legMult  > 1) w.Legendary = Math.min(w.Legendary * legMult,  w.Mythical * 0.5);
    if (mythMult > 1) w.Mythical  = Math.min(w.Mythical  * mythMult, w.Secret   * 0.5);
    return w;
}

function getAdjustedMutationWeights() {
    const mutMult = getAbuseMultiplier('mutation');
    return MUTATIONS.map(m => ({
        ...m,
        weight: m.id === 'none' ? Math.max(100, m.weight / mutMult) : m.weight * mutMult,
    }));
}


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

// Combined guildMemberAdd listener (Welcome + AdvLog)
client.on("guildMemberAdd", async member => {
    // 1. Welcome system logic
    try {
        const guildId=String(member.guild.id);
        const cfg=welcomeConfig[guildId];
        if (cfg) {
            if (cfg.roleId) await member.roles.add(cfg.roleId).catch(()=>{});
            const ch=await member.guild.channels.fetch(cfg.channelId).catch(()=>null);
            if (ch) {
                await ch.send({embeds:[new EmbedBuilder()
                    .setColor(0x57F287)
                    .setTitle("👋 Welcome!")
                    .setDescription(`Welcome to **${member.guild.name}**, ${member.user.username}!`)
                    .setThumbnail(member.user.displayAvatarURL())
                    .addFields({name:"Members",value:`#${member.guild.memberCount}`})
                    .setTimestamp()
                ]}).catch(()=>{});
            }
        }
    } catch(e) { console.error("Welcome error:", e?.message); }

    // 2. Advanced logging logic
    try {
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle("📥 Member Joined")
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                {name:"User", value:`${member.user.tag} (<@${member.id}>)`, inline:true},
                {name:"Account Age", value:cdStr(Date.now()-member.user.createdTimestamp), inline:true},
                {name:"Members", value:`${member.guild.memberCount}`, inline:true},
            )
            .setTimestamp();
        await sendAdvLog(member.guild, "member", embed);
    } catch(e) { console.error("Member log error:", e?.message); }
});
