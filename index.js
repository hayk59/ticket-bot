const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");
require("dotenv").config();

/* ================= CLIENT ================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

/* ================= CONFIG ================= */

// Salons où le bouton ticket doit être présent
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

// Catégories de tickets
const CATEGORY_1 = "1448788857490509924";
const CATEGORY_2 = "1448788432645132318";

// Rôles ping à l’ouverture
const PING_ROLES = [
  "1448780493150617681",
  "1448780389589188648"
];

// Rôles autorisés à voir / fermer le ticket
const ALLOWED_ROLES = [
  "1448780389589188648",
  "1448780493150617681",
  "1448780658259398656",
  "1448734987900944606"
];

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
      console.log(`📩 Message ticket envoyé dans ${channel.name}`);
    } else {
      console.log(`✔ Message déjà présent dans ${channel.name}`);
    }
  }

  for (const id of OPEN_CHANNELS_1) {
    await ensureTicketMessage(id);
  }

  await ensureTicketMessage(OPEN_CHANNEL_2);
});

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  /* ---------- OUVERTURE ---------- */
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
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        },
        ...ALLOWED_ROLES.map(role => ({
          id: role,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
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
      content:
        `${PING_ROLES.map(r => `<@&${r}>`).join(" ")}\n` +
        `🎫 Ticket ouvert par ${interaction.user}`,
      components: [closeButtonRow]
    });

    return interaction.reply({
      content: "✅ Ton ticket a été créé",
      ephemeral: true
    });
  }

  /* ---------- FERMETURE ---------- */
  if (interaction.customId === "close_ticket") {
    const member = interaction.member;

    const allowed =
      interaction.channel.permissionOverwrites.cache.has(member.id) ||
      ALLOWED_ROLES.some(r => member.roles.cache.has(r));

    if (!allowed) {
      return interaction.reply({
        content: "❌ Tu n’as pas l’autorisation",
        ephemeral: true
      });
    }

    await interaction.reply("🔒 Fermeture du ticket...");
    setTimeout(() => interaction.channel.delete().catch(() => {}), 4000);
  }
});

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);
