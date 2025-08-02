const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { updateTaskStatus, getTask } = require('../utils/googleSheets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('Update task status')
    .addIntegerOption(option => 
      option.setName('id')
        .setDescription('Task ID to update')
        .setRequired(true)
    )
    .addStringOption(option => 
      option.setName('status')
        .setDescription('New status')
        .setRequired(true)
        .addChoices(
          { name: '🟡 Pending', value: '🟡 Pending' },
          { name: '🟠 In Progress', value: '🟠 In Progress' },
          { name: '✅ Completed', value: '✅ Completed' }
        )
    ),
  
  async execute(interaction) {
    const taskId = interaction.options.getInteger('id');
    const newStatus = interaction.options.getString('status');
    
    try {
      // Get current task details
      const task = await getTask(taskId);
      
      if (!task) {
        return interaction.reply({
          content: `❌ Task #${taskId} not found!`,
          ephemeral: true
        });
      }
      
      // Update status in Google Sheets
      await updateTaskStatus(taskId, newStatus);
      
      // Create confirmation embed
      const embed = new EmbedBuilder()
        .setTitle(`📝 Task #${taskId} Updated`)
        .setDescription(task.description)
        .addFields(
          { name: 'New Status', value: newStatus, inline: true },
          { name: 'Assignee', value: `<@${task.assignee}>`, inline: true },
          { name: 'Group', value: task.group, inline: true }
        )
        .setColor(0x5865F2)
        .setFooter({ text: `Updated by ${interaction.user.tag}` });
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Update error:', error);
      await interaction.reply({
        content: '❌ Failed to update task!',
        ephemeral: true
      });
    }
  }
};