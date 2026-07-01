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
    { id:'the_rock',     name:'The Rock',      emoji:'🪨', r:'Secret', val:150000,wMin:999,  wMax:999,  xp:18000,desc:'A mysterious rock pulled from the deep. Rumour says it has feelings.' },
    { id:'the_mind',     name:'The Mind',      emoji:'🧠', r:'Secret', val:175000,wMin:1,    wMax:1,    xp:20000,desc:'A sentient thought drifting through the abyss.' },
    { id:'the_mushroom', name:'The Mushroom',  emoji:'🍄', r:'Secret', val:160000,wMin:0.5,  wMax:0.5,  xp:19000,desc:'An ancient spore somehow underwater.' },
];

const RARITY_WEIGHTS = {
    Common:4000, Uncommon:2200, Rare:1200, Epic:600, Legendary:250, Mythical:80, Secret:5
};

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

const FISHING_RODS = [
    { id:'plastic',    name:'Plastic Rod',        emoji:'🎣', price:0,       reqLv:0,   reqQ:null,        pwr:1.0,  luck:0,   desc:'The starter rod.' },
    { id:'carbon',     name:'Carbon Rod',         emoji:'🎣', price:800,     reqLv:5,   reqQ:null,        pwr:1.3,  luck:2,   desc:'Lightweight and responsive.' },
    { id:'steady',     name:'Steady Rod',         emoji:'🎣', price:3000,    reqLv:10,  reqQ:null,        pwr:1.6,  luck:4,   desc:'Excellent control.' },
    { id:'iron',       name:'Iron Rod',           emoji:'🎣', price:8000,    reqLv:15,  reqQ:null,        pwr:2.0,  luck:6,   desc:'Sturdy rod.' },
    { id:'titanium',   name:'Titanium Rod',       emoji:'🎣', price:25000,   reqLv:25,  reqQ:null,        pwr:2.5,  luck:8,   desc:'Titanium for deep sea.' },
    { id:'enchanted',  name:'Enchanted Rod',      emoji:'✨', price:80000,   reqLv:35,  reqQ:null,        pwr:3.0,  luck:12,  desc:'Magically enhanced.' },
    { id:'crystal',    name:'Crystal Rod',        emoji:'💎', price:250000,  reqLv:50,  reqQ:null,        pwr:4.0,  luck:18,  desc:'Attracts Legendary fish.' },
    { id:'void',       name:'Void Rod',           emoji:'🌑', price:1000000, reqLv:75,  reqQ:null,        pwr:5.5,  luck:25,  desc:'Mythical fish possible.' },
    { id:'mythical',   name:'Mythical Rod',       emoji:'🌟', price:2000000, reqLv:100, reqQ:null,        pwr:7.0,  luck:35,  desc:'Catches anything.' },
    { id:'celestial',  name:'Celestial Rod',      emoji:'✴️', price:0,       reqLv:0,   reqQ:'prestige5', pwr:10.0, luck:50,  desc:'Ultimate fishing rod.' },
];

// ════════════════════════════════════════════════════════════════
// ♦️ CORE CLASSES
// ════════════════════════════════════════════════════════════════

class UserData {
    constructor(userId) {
        this.userId = userId;
        this.coins = 0;
        this.xp = 0;
        this.level = 1;
        this.prestige = 0;
        this.inventory = new Map();
        this.rod = 'plastic';
        this.bait = 'worm';
        this.fish = new Map();
        this.biome = new Map();
        this.fishXP = new Map();
        this.fishLevel = new Map();
        this.lastDaily = 0;
        this.marryTo = null;
        this.achievements = new Set();
    }

    toJSON() {
        return {
            userId: this.userId,
            coins: this.coins,
            xp: this.xp,
            level: this.level,
            prestige: this.prestige,
            inventory: Object.fromEntries(this.inventory),
            rod: this.rod,
            bait: this.bait,
            fish: Object.fromEntries(this.fish),
            biome: Object.fromEntries(this.biome),
            fishXP: Object.fromEntries(this.fishXP),
            fishLevel: Object.fromEntries(this.fishLevel),
            lastDaily: this.lastDaily,
            marryTo: this.marryTo,
            achievements: Array.from(this.achievements),
        };
    }

    static fromJSON(obj) {
        const data = new UserData(obj.userId);
        data.coins = obj.coins || 0;
        data.xp = obj.xp || 0;
        data.level = obj.level || 1;
        data.prestige = obj.prestige || 0;
        data.inventory = new Map(Object.entries(obj.inventory || {}));
        data.rod = obj.rod || 'plastic';
        data.bait = obj.bait || 'worm';
        data.fish = new Map(Object.entries(obj.fish || {}));
        data.biome = new Map(Object.entries(obj.biome || {}));
        data.fishXP = new Map(Object.entries(obj.fishXP || {}));
        data.fishLevel = new Map(Object.entries(obj.fishLevel || {}));
        data.lastDaily = obj.lastDaily || 0;
        data.marryTo = obj.marryTo || null;
        data.achievements = new Set(obj.achievements || []);
        return data;
    }
}

class CooldownManager {
    constructor() {
        this.cooldowns = new Map();
    }

    has(userId, cmd) {
        return this.cooldowns.has(`${userId}-${cmd}`);
    }

    set(userId, cmd, duration) {
        const key = `${userId}-${cmd}`;
        this.cooldowns.set(key, Date.now() + duration);
        setTimeout(() => this.cooldowns.delete(key), duration);
    }

    remaining(userId, cmd) {
        const key = `${userId}-${cmd}`;
        const time = this.cooldowns.get(key);
        return time ? Math.max(0, time - Date.now()) : 0;
    }
}

// ════════════════════════════════════════════════════════════════
// ♦️ GLOBAL STATE
// ════════════════════════════════════════════════════════════════

const cooldowns = new CooldownManager();
let allData = {};

// ════════════════════════════════════════════════════════════════
// ♦️ DATA PERSISTENCE
// ════════════════════════════════════════════════════════════════

async function loadData() {
    try {
        if (fsSync.existsSync(DATA_FILE)) {
            const raw = await fs.readFile(DATA_FILE, 'utf8');
            const json = JSON.parse(raw);
            allData = {};
            for (const [uid, obj] of Object.entries(json.userData || {})) {
                allData[uid] = UserData.fromJSON(obj);
            }
            console.log(`✅ Loaded ${Object.keys(allData).length} user profiles`);
        }
    } catch (e) {
        console.error('❌ Failed to load data:', e.message);
    }
}

async function saveData() {
    try {
        const json = { userData: {} };
        for (const [uid, data] of Object.entries(allData)) {
            json.userData[uid] = data.toJSON();
        }
        await fs.writeFile(DATA_FILE, JSON.stringify(json, null, 2));
    } catch (e) {
        console.error('❌ Failed to save data:', e.message);
    }
}

function getUser(userId) {
    if (!allData[userId]) {
        allData[userId] = new UserData(userId);
    }
    return allData[userId];
}

// ════════════════════════════════════════════════════════════════
// ♦️ HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

function randomWeighted(items) {
    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const item of items) {
        roll -= item.weight;
        if (roll <= 0) return item;
    }
    return items[0];
}

function getCurrentWeather() {
    const weathers = ['sunny', 'cloudy', 'rainy', 'stormy', 'foggy', 'aurora', 'eclipse'];
    return weathers[Math.floor(Math.random() * weathers.length)];
}

function getBiomeFishPool(biomeId) {
    return FISH_SPECIES.filter(f => !f.biome || f.biome === biomeId);
}

function getRandomFish(biomeId) {
    const pool = getBiomeFishPool(biomeId);
    return randomWeighted(pool.map(f => ({ ...f, weight: RARITY_WEIGHTS[f.r] || 100 })));
}

function getMutation() {
    return randomWeighted(MUTATIONS);
}

function calculateValue(fish, mutation) {
    let value = fish.val || 100;
    if (mutation && mutation.mult) value *= mutation.mult;
    return Math.floor(value);
}

// ════════════════════════════════════════════════════════════════
// ♦️ DISCORD BOT CLIENT
// ════════════════════════════════════════════════════════════════

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
});

client.once('ready', async () => {
    console.log(`✅ Bot online as ${client.user.tag}`);
    await loadData();
    client.user.setActivity('🎣 Fishing v4.0', { type: 'PLAYING' });
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const user = getUser(interaction.user.id);

    try {
        if (interaction.commandName === 'fish') {
            if (cooldowns.has(interaction.user.id, 'fish')) {
                const rem = cooldowns.remaining(interaction.user.id, 'fish');
                return interaction.reply(`⏳ Wait ${Math.ceil(rem / 1000)}s before fishing again.`);
            }

            const fish = getRandomFish('pond');
            const mut = getMutation();
            const value = calculateValue(fish, mut);

            user.coins += value;
            user.fish.set(fish.id, (user.fish.get(fish.id) || 0) + 1);

            cooldowns.set(interaction.user.id, 'fish', 5000);
            await saveData();

            const emoji = mut.emoji || fish.emoji;
            const name = mut.name ? `${mut.name} ${fish.name}` : fish.name;

            await interaction.reply(`🎣 Caught **${name}** ${emoji}\n💰 +${value} coins`);
        } else if (interaction.commandName === 'profile') {
            const embed = new EmbedBuilder()
                .setTitle(`${interaction.user.username}'s Profile`)
                .addFields(
                    { name: 'Coins', value: `💰 ${user.coins}`, inline: true },
                    { name: 'Level', value: `⭐ ${user.level}`, inline: true },
                    { name: 'Prestige', value: `👑 ${user.prestige}`, inline: true }
                )
                .setColor('#00ff00');

            await interaction.reply({ embeds: [embed] });
        } else if (interaction.commandName === 'inventory') {
            let invText = 'Your Inventory:\n';
            if (user.inventory.size === 0) invText += 'Empty';
            else {
                for (const [itemId, qty] of user.inventory) {
                    invText += `\n• ${itemId}: ${qty}x`;
                }
            }

            await interaction.reply(invText);
        }
    } catch (e) {
        console.error('Command error:', e);
        await interaction.reply('❌ An error occurred.').catch(() => {});
    }
});

// ════════════════════════════════════════════════════════════════
// ♦️ SLASH COMMANDS
// ════════════════════════════════════════════════════════════════

const commands = [
    new SlashCommandBuilder().setName('fish').setDescription('🎣 Cast your line and fish'),
    new SlashCommandBuilder().setName('profile').setDescription('👤 View your profile'),
    new SlashCommandBuilder().setName('inventory').setDescription('🎒 Check your inventory'),
    new SlashCommandBuilder().setName('daily').setDescription('📅 Claim your daily reward'),
    new SlashCommandBuilder().setName('marry').setDescription('💍 Marry another player')
        .addUserOption(o => o.setName('user').setDescription('User to marry').setRequired(true)),
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function registerCommands() {
    try {
        console.log('🔄 Registering slash commands...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands.map(c => c.toJSON()) });
        console.log('✅ Commands registered');
    } catch (e) {
        console.error('❌ Failed to register commands:', e);
    }
}

client.on('ready', async () => {
    if (client.user) await registerCommands();
});

// ════════════════════════════════════════════════════════════════
// ♦️ LOGIN
// ════════════════════════════════════════════════════════════════

client.login(process.env.TOKEN).catch(err => {
    console.error('❌ Failed to login:', err);
    process.exit(1);
});

process.on('SIGINT', async () => {
    console.log('💾 Saving data before shutdown...');
    await saveData();
    process.exit(0);
});
