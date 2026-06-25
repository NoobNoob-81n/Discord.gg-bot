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

