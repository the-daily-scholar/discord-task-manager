//commands/task.js

const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
const { getTasks } = require('../utils/googleSheets');

function formatDueDate(due) {
  if (due === 'No deadline') return due;
  const today = moment().startOf('day');
  const dueDate = moment(due, 'YYYY-MM-DD');
  const diffDays = dueDate.diff(today, 'days');
  if (diffDays === 0) return '🟠 **TODAY**';
  if (diffDays < 0) return `🔴 ${due} (${Math.abs(diffDays)} days overdue)`;
  if (diffDays <= 3) return `🟡 ${due} (in ${diffDays} days)`;
  return due;
}

module.exports = {
  data: {
    name: 'mytasks',
    description: 'Show your assigned tasks',
    options: [
      {
        name: 'status',
        description: 'Filter tasks by status',
        type: 3, // STRING
        required: false,
        choices: [
          { name: '🟡 Pending', value: '🟡 Pending' },
          { name: '🟠 In Progress', value: '🟠 In Progress' },
          { name: '✅ Completed', value: '✅ Completed' }
        ]
      }
    ]
  },

  async execute(interaction) {
    try {
      const filterStatus = interaction.options.getString('status');
      let tasks = (await getTasks()).filter(t => t.assignee === interaction.user.id);

      // Apply status filter if provided
      if (filterStatus) tasks = tasks.filter(t => t.status === filterStatus);

      // Sort tasks
      const sortedTasks = tasks.sort((a, b) => {
        if (a.due === 'No deadline') return 1;
        if (b.due === 'No deadline') return -1;
        return new Date(a.due) - new Date(b.due);
      });

      let taskDescriptions = sortedTasks.map(t => 
        `**#${t.id}** ${t.description}\nDue: ${formatDueDate(t.due)} | Group: ${t.group} | Status: ${t.status}`
      );

      if (taskDescriptions.join('\n\n').length > 4000) {
        taskDescriptions = taskDescriptions.slice(0, 50);
        taskDescriptions.push('...and more tasks. Please refine your filters.');
      }

      const embed = new EmbedBuilder()
        .setTitle(`📌 Your Tasks (${tasks.length}${filterStatus ? ` - ${filterStatus}` : ''})`)
        .setDescription(taskDescriptions.join('\n\n') || "No tasks found.");

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('MyTasks command error:', error);
      await interaction.reply({ content: "❌ Unable to fetch your tasks right now.", ephemeral: true });
    }
  }
};
