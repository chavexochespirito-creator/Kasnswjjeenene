import http from 'http';
import mongoose from 'mongoose';
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  TextChannel,
  VoiceChannel,
  ChannelType,
} from 'discord.js';
import { config } from 'dotenv';
import * as statusCmd from './commands/status';
import * as playersCmd from './commands/players';
import * as painelCmd from './commands/painel';
import { GuildStatusConfig } from './models/GuildStatusConfig';
import { buildStarsStatusPayload } from './utils/starsStatusBuilder';

config();

const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || process.env.APPLICATION_ID;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!TOKEN || !CLIENT_ID || !MONGO_URI) {
  console.error('❌ Faltam variáveis no Render: TOKEN, CLIENT_ID ou MONGO_URI');
  process.exit(1);
}

// Servidor HTTP simples para o Render Web Service não dar timeout de porta
const port = Number(process.env.PORT) || 3000;
http
  .createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bot Status SAMP Online!');
  })
  .listen(port, () => {
    console.log(`🌐 HTTP Keep-Alive rodando na porta ${port}`);
  });

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commandsMap = new Collection<string, any>();
commandsMap.set(statusCmd.data.name, statusCmd);
commandsMap.set(playersCmd.data.name, playersCmd);
commandsMap.set(painelCmd.data.name, painelCmd);

async function deploySlashCommands() {
  const rest = new REST().setToken(TOKEN!);
  const body = [
    statusCmd.data.toJSON(),
    playersCmd.data.toJSON(),
    painelCmd.data.toJSON(),
  ];

  await rest.put(Routes.applicationCommands(CLIENT_ID!), { body });
  console.log('✅ Comandos registrados (/status, /players, /painel)!');
}

let lastVoiceRename = 0;

async function updateAllGuildStatuses() {
  const configs = await GuildStatusConfig.find({ enabled: true });

  for (const cfg of configs) {
    if (!cfg.statusChannelId) continue;

    try {
      const channel = (await client.channels
        .fetch(cfg.statusChannelId)
        .catch(() => null)) as TextChannel | null;

      if (!channel) continue;

      const payload = await buildStarsStatusPayload(cfg);

      if (cfg.statusMessageId) {
        try {
          const msg = await channel.messages.fetch(cfg.statusMessageId);
          await msg.edit({
            embeds: payload.embeds,
            components: payload.components,
          });
        } catch {
          const newMsg = await channel.send({
            embeds: payload.embeds,
            components: payload.components,
          });
          cfg.statusMessageId = newMsg.id;
          await cfg.save();
        }
      } else {
        const newMsg = await channel.send({
          embeds: payload.embeds,
          components: payload.components,
        });
        cfg.statusMessageId = newMsg.id;
        await cfg.save();
      }

      // Atualiza canal de voz a cada 5 minutos (limite da API do Discord para rename)
      if (
        cfg.playerVoiceChannelId &&
        Date.now() - lastVoiceRename > 5 * 60 * 1000
      ) {
        const vChannel = await client.channels
          .fetch(cfg.playerVoiceChannelId)
          .catch(() => null);
        if (vChannel && vChannel.type === ChannelType.GuildVoice) {
          const voice = vChannel as VoiceChannel;
          const desiredName = payload.meta.isOnline
            ? `🟢 Players: ${payload.meta.playersCount}/${payload.meta.maxPlayers}`
            : '🔴 Servidor Offline';
          if (voice.name !== desiredName) {
            await voice.setName(desiredName).catch(() => {});
          }
        }
        lastVoiceRename = Date.now();
      }
    } catch (err) {
      console.error(`Erro ao atualizar status da guild ${cfg.guildId}:`, err);
    }
  }
}

client.once(Events.ClientReady, async c => {
  console.log(`🚀 Bot Online como ${c.user.tag}`);
  await deploySlashCommands();

  // Primeira atualizacao imediata e depois a cada 30 segundos
  await updateAllGuildStatuses();
  setInterval(updateAllGuildStatuses, 30 * 1000);
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = commandsMap.get(interaction.commandName);
      if (cmd) {
        await cmd.execute(interaction);
      }
      return;
    }

    if (
      interaction.isButton() ||
      interaction.isChannelSelectMenu() ||
      interaction.isModalSubmit()
    ) {
      await painelCmd.handlePainelComponent(interaction);
    }
  } catch (error) {
    console.error('Erro na interação:', error);
  }
});

async function bootstrap() {
  try {
    await mongoose.connect(MONGO_URI!);
    console.log('✅ MongoDB Conectado!');
    await client.login(TOKEN);
  } catch (error) {
    console.error('❌ Erro fatal ao iniciar:', error);
    process.exit(1);
  }
}

void bootstrap();
