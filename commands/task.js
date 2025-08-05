const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
const { addTask, getTasks, updateTaskStatus } = require('../utils/googleSheets');
const { parseDueDate } = require('../utils/dateHelper');


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

function isValidDate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && moment(dateStr, 'YYYY-MM-DD', true).isValid();
}

module.exports = {
  data: {
    name: 'task',
    description: 'Manage tasks',
    options: [
      {
        type: 1, // SUB_COMMAND
        name: 'add',
        description: 'Add new task',
        options: [
          { name: 'description', type: 3, required: true, description: 'Detailed explanation of the task' },
          { name: 'due', type: 3, description: 'Deadline (format: YYYY-MM-DD)' },
          { name: 'assignee', type: 6, description: 'Team member responsible (@username)' }
        ]
      },
      {
        type: 1,
        name: 'list',
        description: 'List tasks',
        options: [
          { 
            name: 'group', type: 3, description: 'Select team to filter tasks',
            choices: [
              { name: 'Alpha', value: 'alpha' },
              { name: 'Beta', value: 'beta' },
              { name: 'Gamma', value: 'gamma' }
            ]
          }
        ]
      },
      {
        type: 1,
        name: 'update',
        description: 'Update task status',
        options: [
          { name: 'id', description: 'Task ID to update', type: 4, required: true },
          { 
            name: 'status', description: 'New status', type: 3, required: true,
            choices: [
              { name: '🟡 Pending', value: '🟡 Pending' },
              { name: '🟠 In Progress', value: '🟠 In Progress' },
              { name: '✅ Completed', value: '✅ Completed' }
            ]
          }
        ]
      },
      {
        name: 'group',
        description: 'Select task group',
        type: 3,      // STRING
        required: true,
        choices: [
          { name: 'General', value: 'general' },
          { name: 'Alpha',   value: 'alpha'   },
          { name: 'Beta',    value: 'beta'    },
          { name: 'Gamma',   value: 'gamma'   },
          { name: 'Delta',   value: 'delta'   }
          // …add more as needed…
          // Add Channel names here or remove them as required

        ]
      }
      
    ]
  },

  async execute(interaction) {
    try {
      const subCmd = interaction.options.getSubcommand();
      const group = detectGroup(interaction.channel.name);

      if (!group) {
        await interaction.reply({ 
          content: `❌ This channel (**${interaction.channel.name}**) is not mapped to any group. Please use a valid task channel.`,
          ephemeral: true 
        });
        return;
      }

      if (subCmd === 'add') {
        const description = interaction.options.getString('description');
        const group = interaction.options.getString('group');
        const assignee = interaction.options.getUser('assignee') || interaction.user;

        // Validate due date
        const rawDue = interaction.options.getString('due') || 'No deadline';
const { date: due, error } = parseDueDate(rawDue);

if (error) {
  return await interaction.reply({
    content: `❌ ${error}`,
    ephemeral: true
  });
}

        await addTask({ description, due, assignee: assignee.id, creator: interaction.user.tag, group });
        await interaction.reply(`✅ Task added for <@${assignee.id}> in ${group}`);
      }


      else if (subCmd === 'list') {
        const filterGroup = interaction.options.getString('group');
        const tasks = await getTasks(filterGroup || group);

        const embed = new EmbedBuilder()
          .setTitle(`📋 Tasks (${filterGroup || group})`)
          .setDescription(tasks.map(t => 
            `**#${t.id}** ${t.description}\n` +
            `Assignee: <@${t.assignee}> | Due: ${formatDueDate(t.due)}\n` +
            `Status: ${t.status} | Group: ${t.group}`
          ).join('\n\n') || "No tasks found!");

        await interaction.reply({ embeds: [embed] });
      }

      else if (subCmd === 'update') {
        const id = interaction.options.getInteger('id');
        const status = interaction.options.getString('status');
        await updateTaskStatus(id, status);
        await interaction.reply(`✅ Task #${id} updated to **${status}**.`);
      }

    } catch (error) {
      console.error('Task command error:', error);
      await interaction.reply({ content: "❌ An error occurred while processing your request.", ephemeral: true });
    }
  }
};
