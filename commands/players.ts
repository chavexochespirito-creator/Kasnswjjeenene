import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { GuildStatusConfig } from '../models/GuildStatusConfig';
import { SAMPQuery } from '../utils/sampQuery';
import { ServerConfig } from '../types';

const sampQuery = new SAMPQuery();

export const data = new SlashCommandBuilder()
  .setName('players')
  .setDescription('Lista os jogadores conectados agora no servidor')
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const guildId = interaction.guildId!;
  let config = await GuildStatusConfig.findOne({ guildId });
  if (!config) {
    config = await GuildStatusConfig.create({ guildId });
  }

  const serverObj: ServerConfig = {
    id: 'main',
    name: config.serverName,
    ip: config.ip,
    port: config.port,
    addedBy: 'system',
    addedAt: Date.now(),
  };

  const info = await sampQuery.getServerInfo(serverObj, guildId, false);
  if (!info) {
    await interaction.editReply('❌ O servidor está offline ou não respondeu.');
    return;
  }

  const detailed = await sampQuery.getDetailedPlayers(serverObj, guildId);
  const basic =
    detailed.length === 0
      ? await sampQuery.getPlayers(serverObj, guildId)
      : [];

  const list =
    detailed.length > 0
      ? detailed.map(p => `[ID ${p.id}] ${p.name} | Nível: ${p.score} | Ping: ${p.ping}ms`)
      : basic.map(p => `${p.name} | Nível: ${p.score}`);

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`👥 Jogadores Online — ${config.serverName}`)
    .setDescription(
      list.length > 0
        ? `\`\`\`
${list.slice(0, 35).join('
')}
\`\`\``
        : `**${info.players}/${info.maxplayers}** jogadores online (lista detalhada bloqueada acima de 100 players).`
    )
    .setFooter({ text: `${info.players}/${info.maxplayers} conectados • ${config.ip}:${config.port}` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
    }
