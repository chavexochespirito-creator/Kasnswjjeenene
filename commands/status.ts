import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { GuildStatusConfig } from '../models/GuildStatusConfig';
import { buildStarsStatusPayload } from '../utils/starsStatusBuilder';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Mostra o status completo do servidor SA:MP / open.mp')
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const guildId = interaction.guildId!;
  let config = await GuildStatusConfig.findOne({ guildId });
  if (!config) {
    config = await GuildStatusConfig.create({ guildId });
  }

  const payload = await buildStarsStatusPayload(config);

  // Adiciona informacoes extras completas no comando manual /status
  const extraEmbed = EmbedBuilder.from(payload.embeds[0]).addFields(
    {
      name: '🎮 Modo de Jogo',
      value: `\`${payload.meta.gamemode}\``,
      inline: true,
    },
    {
      name: '👥 Vagas',
      value: `\`${payload.meta.playersCount}/${payload.meta.maxPlayers}\``,
      inline: true,
    },
    {
      name: '⚙️ Versão',
      value: `\`${payload.meta.version}\``,
      inline: true,
    }
  );

  await interaction.editReply({
    embeds: [extraEmbed],
    components: payload.components,
  });
}
