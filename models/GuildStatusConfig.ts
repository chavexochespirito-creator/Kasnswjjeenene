import mongoose, { Schema, Document } from 'mongoose';

export interface IGuildStatusConfig extends Document {
  guildId: string;
  enabled: boolean;
  serverName: string;
  description: string;
  ip: string;
  port: number;
  statusChannelId?: string;
  statusMessageId?: string;
  playerVoiceChannelId?: string;
  ipVoiceChannelId?: string;
  mobileUrl: string;
  pcUrl: string;
  thumbnailUrl: string;
  bannerUrl: string;
  updateSeconds: number;
}

const GuildStatusConfigSchema = new Schema<IGuildStatusConfig>({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: true },
  serverName: {
    type: String,
    default: process.env.DEFAULT_SERVER_NAME || 'BRASIL PLAY STARS',
  },
  description: {
    type: String,
    default: 'Conecte-se à cidade e comece a construir sua história.',
  },
  ip: {
    type: String,
    default: process.env.DEFAULT_SERVER_IP || '151.242.227.85',
  },
  port: {
    type: Number,
    default: Number(process.env.DEFAULT_SERVER_PORT) || 7777,
  },
  statusChannelId: { type: String, default: '' },
  statusMessageId: { type: String, default: '' },
  playerVoiceChannelId: { type: String, default: '' },
  ipVoiceChannelId: { type: String, default: '' },
  mobileUrl: {
    type: String,
    default: process.env.DEFAULT_MOBILE_URL || 'https://discord.com',
  },
  pcUrl: {
    type: String,
    default: process.env.DEFAULT_PC_URL || 'https://discord.com',
  },
  thumbnailUrl: {
    type: String,
    default: process.env.DEFAULT_THUMBNAIL_URL || '',
  },
  bannerUrl: {
    type: String,
    default: process.env.DEFAULT_BANNER_URL || '',
  },
  updateSeconds: {
    type: Number,
    default: Number(process.env.UPDATE_INTERVAL_SECONDS) || 30,
  },
});

export const GuildStatusConfig = mongoose.model<IGuildStatusConfig>(
  'GuildStatusConfig',
  GuildStatusConfigSchema
);
