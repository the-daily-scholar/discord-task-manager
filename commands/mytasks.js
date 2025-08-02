
const { EmbedBuilder } = require('discord.js');
const { getTasks } = require('../utils/googleSheets');

module.exports = {
  data: {
    name: 'mytasks',
    description: 'Show your assigned tasks'
  },
  async execute(interaction) {
    const tasks = (await getTasks()).filter(t => t.assignee === interaction.user.id);
    
    const embed = new EmbedBuilder()
      .setTitle(`📌 Your Tasks (${tasks.length})`)
      .setDescription(tasks.map(t => 
        `**#${t.id}** ${t.description}\n` +
        `Due: ${t.due} | Group: ${t.group}`
      ).join('\n\n') || "No tasks assigned!");

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};