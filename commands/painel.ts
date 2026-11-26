import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ButtonInteraction,
  ModalSubmitInteraction,
  ChannelSelectMenuInteraction,
  TextChannel,
} from 'discord.js';
import { GuildStatusConfig } from '../models/GuildStatusConfig';
import { buildStarsStatusPayload } from '../utils/starsStatusBuilder';

export const data = new SlashCommandBuilder()
  .setName('painel')
  .setDescription('Configura o painel de status pelo celular (IP, canal, links, logo)')
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildId = interaction.guildId!;
  let config = await GuildStatusConfig.findOne({ guildId });
  if (!config) {
    config = await GuildStatusConfig.create({ guildId });
  }

  await renderPainel(interaction, config);
}

async function renderPainel(
  interaction: ChatInputCommandInteraction | ButtonInteraction | ChannelSelectMenuInteraction | ModalSubmitInteraction,
  config: any
) {
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('⚙️ Painel de Controle — Status SAMP')
    .setDescription('Toque nos botões abaixo para configurar direto pelo celular:')
    .addFields(
      {
        name: '🖥️ Servidor',
        value: `**Nome:** ${config.serverName}
**IP:** \`${config.ip}:${config.port}\``,
        inline: true,
      },
      {
        name: '📢 Canal Fixo (30s)',
        value: config.statusChannelId ? `<#${config.statusChannelId}>` : '`Não definido`',
        inline: true,
      },
      {
        name: '🔗 Links & Visual',
        value: `**Mobile:** [Link](${config.mobileUrl})
**PC:** [Link](${config.pcUrl})
**Logo:** ${config.thumbnailUrl ? 'Configurada ✅' : 'Padrão'}`,
        inline: false,
      }
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('cfg_server_modal')
      .setLabel('Editar IP e Nome')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('cfg_links_modal')
      .setLabel('Links e Logo')
      .setEmoji('🔗')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('cfg_send_now')
      .setLabel('Postar / Atualizar Agora')
      .setEmoji('🚀')
      .setStyle(ButtonStyle.Success)
  );

  const row2 = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('cfg_select_channel')
      .setPlaceholder('Escolha o canal de texto para o status automático...')
      .setChannelTypes(ChannelType.GuildText)
  );

  const row3 = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('cfg_select_voice')
      .setPlaceholder('Opcional: Canal de Voz para contador de Players...')
      .setChannelTypes(ChannelType.GuildVoice)
  );

  await interaction.editReply({
    embeds: [embed],
    components: [row1, row2, row3],
  });
}

export async function handlePainelComponent(interaction: any) {
  const guildId = interaction.guildId!;
  let config = await GuildStatusConfig.findOne({ guildId });
  if (!config) {
    config = await GuildStatusConfig.create({ guildId });
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'cfg_server_modal') {
      const modal = new ModalBuilder()
        .setCustomId('modal_server_info')
        .setTitle('Configurar Servidor SAMP');

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('inp_name')
            .setLabel('Nome do Servidor (Título)')
            .setStyle(TextInputStyle.Short)
            .setValue(config.serverName)
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('inp_ip')
            .setLabel('IP e Porta (ex: 151.242.227.85:7777)')
            .setStyle(TextInputStyle.Short)
            .setValue(`${config.ip}:${config.port}`)
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('inp_desc')
            .setLabel('Descrição abaixo do título')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(config.description)
            .setRequired(true)
        )
      );

      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === 'cfg_links_modal') {
      const modal = new ModalBuilder()
        .setCustomId('modal_links_info')
        .setTitle('Links dos Botões e Logo');

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('inp_mobile')
            .setLabel('Link do botão BAIXAR MOBILE')
            .setStyle(TextInputStyle.Short)
            .setValue(config.mobileUrl)
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('inp_pc')
            .setLabel('Link do botão BAIXAR PC')
            .setStyle(TextInputStyle.Short)
            .setValue(config.pcUrl)
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('inp_thumb')
            .setLabel('URL da Logo (canto direito do embed)')
            .setStyle(TextInputStyle.Short)
            .setValue(config.thumbnailUrl || '')
            .setRequired(false)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('inp_banner')
            .setLabel('URL do Banner grande (opcional)')
            .setStyle(TextInputStyle.Short)
            .setValue(config.bannerUrl || '')
            .setRequired(false)
        )
      );

      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === 'cfg_send_now') {
      await interaction.deferUpdate();
      if (!config.statusChannelId) {
        await interaction.followUp({
          content: '⚠️ Escolha primeiro o canal de texto no menu abaixo!',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const channel = (await interaction.client.channels
        .fetch(config.statusChannelId)
        .catch(() => null)) as TextChannel | null;

      if (!channel) {
        await interaction.followUp({
          content: '❌ Não consegui acessar o canal selecionado. Verifique as permissões do bot.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const payload = await buildStarsStatusPayload(config);

      if (config.statusMessageId) {
        try {
          const oldMsg = await channel.messages.fetch(config.statusMessageId);
          await oldMsg.edit({
            embeds: payload.embeds,
            components: payload.components,
          });
          await renderPainel(interaction, config);
          return;
        } catch {
          // Mensagem foi apagada, cria uma nova abaixo
        }
      }

      const sent = await channel.send({
        embeds: payload.embeds,
        components: payload.components,
      });
      config.statusMessageId = sent.id;
      await config.save();
      await renderPainel(interaction, config);
      return;
    }
  }

  if (interaction.isChannelSelectMenu()) {
    await interaction.deferUpdate();
    const selectedId = interaction.values[0];

    if (interaction.customId === 'cfg_select_channel') {
      config.statusChannelId = selectedId;
      config.statusMessageId = '';
      await config.save();
    } else if (interaction.customId === 'cfg_select_voice') {
      config.playerVoiceChannelId = selectedId;
      await config.save();
    }

    await renderPainel(interaction, config);
    return;
  }

  if (interaction.isModalSubmit()) {
    await interaction.deferUpdate();

    if (interaction.customId === 'modal_server_info') {
      config.serverName = interaction.fields.getTextInputValue('inp_name').trim();
      const rawIp = interaction.fields.getTextInputValue('inp_ip').trim();
      const [ipPart, portPart] = rawIp.split(':');
      config.ip = ipPart.trim();
      config.port = Number(portPart) || 7777;
      config.description = interaction.fields.getTextInputValue('inp_desc').trim();
      await config.save();
    } else if (interaction.customId === 'modal_links_info') {
      config.mobileUrl = interaction.fields.getTextInputValue('inp_mobile').trim();
      config.pcUrl = interaction.fields.getTextInputValue('inp_pc').trim();
      config.thumbnailUrl = interaction.fields.getTextInputValue('inp_thumb').trim();
      config.bannerUrl = interaction.fields.getTextInputValue('inp_banner').trim();
      await config.save();
    }

    await renderPainel(interaction, config);
  }
  }
