const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");
require("dotenv").config();

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

/* ================= CONFIG TICKETS ================= */

const OPEN_CHANNELS_1 = [
  "1448739344100626502",
  "1448741008090071071",
  "1448739404397940857",
  "1448739699484004422",
  "1448740044163518669",
  "1448766581499887767",
  "1449166856844742686"
];

const OPEN_CHANNEL_2 = "1449182593009319936";

const CATEGORY_1 = "1448788857490509924";
const CATEGORY_2 = "1448788432645132318";

const PING_ROLES = [
  "1448780493150617681",
  "1448780389589188648"
];

const ALLOWED_ROLES = [
  "1448780389589188648",
  "1448780493150617681",
  "1448780658259398656",
  "1448734987900944606"
];

/* ================= CONFIG VOCAUX BDA ================= */

const BDA_TRIGGER_VOICE = "1450478737765437471";
const BDA_CATEGORY_ID = "1448784723991072889";
const BDA_CHANNEL_NAME = "attente moov ⚠️";

/* ================= CONFIG ROLE REACTION ================= */

const REACTION_ROLE_ID = "1448779499545034983";
const REACTION_MESSAGE_ID = "1450541390571507772";
const REACTION_CHANNEL_ID = "1448736176801452222";

/* ================= READY ================= */

client.once("ready", async () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);

  const openButtonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_ticket")
      .setLabel("🎫 Ouvrir un ticket")
      .setStyle(ButtonStyle.Primary)
  );

  async function ensureTicketMessage(channelId) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const messages = await channel.messages.fetch({ limit: 50 });
    const exists = messages.some(m =>
      m.author.id === client.user.id &&
      m.components.some(row =>
        row.components.some(c => c.customId === "open_ticket")
      )
    );

    if (!exists) {
      await channel.send({
        content: "🎟️ Support — cliquez ci-dessous pour ouvrir un ticket",
        components: [openButtonRow]
      });
    }
  }

  for (const id of OPEN_CHANNELS_1) {
    await ensureTicketMessage(id);
  }
  await ensureTicketMessage(OPEN_CHANNEL_2);
});

/* ================= INTERACTIONS TICKETS ================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "open_ticket") {
    const category =
      interaction.channel.id === OPEN_CHANNEL_2
        ? CATEGORY_2
        : CATEGORY_1;

    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: category,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        },
        ...ALLOWED_ROLES.map(role => ({
          id: role,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }))
      ]
    });

    const closeButtonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒 Fermer le ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({
      content: `${PING_ROLES.map(r => `<@&${r}>`).join(" ")}\n🎫 Ticket ouvert par ${interaction.user}`,
      components: [closeButtonRow]
    });

    return interaction.reply({ content: "✅ Ticket créé", ephemeral: true });
  }

  if (interaction.customId === "close_ticket") {
    const member = interaction.member;
    const allowed =
      interaction.channel.permissionOverwrites.cache.has(member.id) ||
      ALLOWED_ROLES.some(r => member.roles.cache.has(r));

    if (!allowed) {
      return interaction.reply({ content: "❌ Accès refusé", ephemeral: true });
    }

    await interaction.reply("🔒 Fermeture du ticket...");
    setTimeout(() => interaction.channel.delete().catch(() => {}), 4000);
  }
});

/* ================= VOCAUX TEMPORAIRES BDA ================= */

client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member;
  const guild = newState.guild;

  // 🔹 Rejoint le salon déclencheur
  if (newState.channelId === BDA_TRIGGER_VOICE) {
    try {
      const tempChannel = await guild.channels.create({
        name: BDA_CHANNEL_NAME,
        type: ChannelType.GuildVoice,
        parent: BDA_CATEGORY_ID,
        userLimit: 1,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.Connect]
          },
          {
            id: member.id,
            allow: [
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak
            ]
          }
        ]
      });

      await member.voice.setChannel(tempChannel);
    } catch (err) {
      console.error("Erreur création vocal BDA :", err);
    }
  }

  // 🔹 Suppression automatique quand vide
  if (oldState.channel) {
    const channel = oldState.channel;

    if (
      channel.parentId === BDA_CATEGORY_ID &&
      channel.name === BDA_CHANNEL_NAME &&
      channel.members.size === 0
    ) {
      channel.delete().catch(() => {});
    }
  }
});


/* ================= ROLE PAR REACTION ================= */

const REACTION_EMOJI = "✅";

client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();

  if (
    reaction.message.id === REACTION_MESSAGE_ID &&
    reaction.message.channel.id === REACTION_CHANNEL_ID &&
    reaction.emoji.name === REACTION_EMOJI
  ) {
    const member = await reaction.message.guild.members.fetch(user.id);
    await member.roles.add(REACTION_ROLE_ID).catch(() => {});
  }
});

client.on("messageReactionRemove", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();

  if (
    reaction.message.id === REACTION_MESSAGE_ID &&
    reaction.message.channel.id === REACTION_CHANNEL_ID &&
    reaction.emoji.name === REACTION_EMOJI
  ) {
    const member = await reaction.message.guild.members.fetch(user.id);
    await member.roles.remove(REACTION_ROLE_ID).catch(() => {});
  }
});

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);
