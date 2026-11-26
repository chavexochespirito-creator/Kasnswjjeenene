import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { SAMPQuery } from './sampQuery';
import { IGuildStatusConfig } from '../models/GuildStatusConfig';
import { ServerConfig } from '../types';

const sampQuery = new SAMPQuery();

function formatTimeBR(): string {
  const now = new Date();
  const brTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const hh = String(brTime.getUTCHours()).padStart(2, '0');
  const mm = String(brTime.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export async function buildStarsStatusPayload(config: IGuildStatusConfig) {
  const serverObj: ServerConfig = {
    id: 'main',
    name: config.serverName,
    ip: config.ip,
    port: config.port,
    addedBy: 'system',
    addedAt: Date.now(),
  };

  const info = await sampQuery.getServerInfo(serverObj, config.guildId, true);
  const rules = info
    ? await sampQuery.getServerRules(serverObj, config.guildId, true)
    : {};

  const isOnline = Boolean(info);
  const playersCount = info ? info.players : 0;
  const maxPlayers = info ? info.maxplayers : 0;
  const gamemode = info?.gamemode || 'RPG';
  const version = rules?.version || rules?.Ver || '0.3.7';

  // Cor lateral verde quando Online (#2ECC71) e vermelha quando Offline (#ED4245) igual na imagem
  const embedColor = isOnline ? 0x2ecc71 : 0xed4245;

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(config.serverName.toUpperCase())
    .setDescription(config.description)
    .addFields(
      {
        name: '👥 Jogadores',
        value: `\`\`\`
${playersCount}
\`\`\``,
        inline: false,
      },
      {
        name: 'Status',
        value: isOnline
          ? '```
🟢 Online
```'
          : '```
🔴 Offline
```',
        inline: false,
      },
      {
        name: '🔗 Conecte-se com o IP',
        value: `\`\`\`
${config.ip}:${config.port}
\`\`\``,
        inline: false,
      }
    )
    .setFooter({
      text: `Atualiza a cada ${config.updateSeconds}s | Hoje às ${formatTimeBR()}`,
    });

  if (config.thumbnailUrl && config.thumbnailUrl.startsWith('http')) {
    embed.setThumbnail(config.thumbnailUrl);
  }

  if (config.bannerUrl && config.bannerUrl.startsWith('http')) {
    embed.setImage(config.bannerUrl);
  }

  // Botoes exatamente como na imagem: "BAIXAR MOBILE" e "BAIXAR PC"
  const rowMobile = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('BAIXAR MOBILE')
      .setEmoji('📱')
      .setStyle(ButtonStyle.Link)
      .setURL(
        config.mobileUrl && config.mobileUrl.startsWith('http')
          ? config.mobileUrl
          : 'https://discord.com'
      )
  );

  const rowPc = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('BAIXAR PC')
      .setEmoji('🖥️')
      .setStyle(ButtonStyle.Link)
      .setURL(
        config.pcUrl && config.pcUrl.startsWith('http')
          ? config.pcUrl
          : 'https://discord.com'
      )
  );

  return {
    embeds: [embed],
    components: [rowMobile, rowPc],
    meta: {
      isOnline,
      playersCount,
      maxPlayers,
      gamemode,
      version,
      hostname: info?.hostname || config.serverName,
    },
  };
}
