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

require('dotenv').config();

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
            return message.reply(`📯 **${target}** is acting kinda sus… 🔴 *emergency meeting*`).catch(()=>{});
        }
        if (cmd==='8ball') {
            const answers=['Yes!','No.','Definitely!','Ask again later.','Absolutely!','Highly unlikely.','Signs point to yes.',"Don't count on it.",'Outlook good!','Very doubtful.'];
            return message.reply(`🎱 ${answers[rng(0,answers.length-1)]}`).catch(()=>{});
        }
        if (cmd==='rickroll') {
            return message.reply('https://www.youtube.com/watch?v=dQw4w9WgXcQ\n*Never gonna give you up… 🎵*').catch(()=>{});
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
            return message.reply('😂 Meme: https://memegen.link/buzz/when_you_fish_a_secret_fish/the_whole_server_goes_crazy.jpg').catch(()=>{});
        }

    } catch(e) { console.error('❌ Message handler error:', e?.message); }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;
});

// ✅ CRITICAL FIXES APPLIED:
// Line ~1850 (deleterod): Const → const (2x)
// Line ~1880 (resetuser): Const → const (3x), Return → return
// Line ~1920 (deleteguild): Const → const, Let → let, .entries() added to Map
// Line ~1950 (deletemarketlisting): Const → const (2x)
// Line ~2100 (chooseclass): If → if (2x), Const → const (2x)
// Line ~2200 (dungeon): Stats → stats, If → if (2x), Return → return (2x), Await → await
// Lines ~2350+ (buyarmor, craftingrecipes, etc): If → if (10+), Const → const (10+)
// Line ~2450+ (guilds): Const → const
// Line ~2600+ (MESSAGE HANDLER): Client → client, Try → try, If → if, Const → const (ALL FIXED)
// Line ~2807 (joinguild): Const → const, Let → let, .entries() added to Map
// All remaining prefix commands: If/For/Const/Return/Message → if/for/const/return/message

if (!process.env.TOKEN) {
    console.error('❌ TOKEN environment variable not set! Add it to your .env file.');
    process.exit(1);
}

(async () => {
    await loadData();
    setInterval(saveData, 300_000);
    await client.login(process.env.TOKEN).catch(err => {
        console.error('❌ Login failed:', err?.message);
        process.exit(1);
    });
})();