const { EmbedBuilder } = require('discord.js');
const { addTask, getTasks } = require('../utils/googleSheets');
const { detectGroup } = require('../utils/helpers');

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
    name: 'task',
    description: 'Manage tasks',
    options: [
      {
        type: 1, // SUB_COMMAND
        name: 'add',
        description: 'Add new task',
        options: [
          { 
            name: 'description', 
            type: 3, 
            required: true,
            description: 'Detailed explanation of the task'  // Added
          },
          { 
            name: 'due', 
            type: 3, 
            description: 'Deadline (format: YYYY-MM-DD)'  // Enhanced
          },
          { 
            name: 'assignee', 
            type: 6, 
            description: 'Team member responsible (@username)'  // Enhanced
          }
        ]
      },
      {
        type: 1,
        name: 'list',
        description: 'List tasks',
        options: [
          { 
            name: 'group', 
            type: 3, 
            description: 'Select team to filter tasks',  // Added
            choices: [
              { name: 'Alpha', value: 'alpha' },
              { name: 'Beta', value: 'beta' },
              { name: 'Gamma', value: 'gamma' }
            ]
          }
        ]
      },
      {
        type: 1, // SUB_COMMAND
        name: 'update',
        description: 'Update task status',
        options: [
          { 
            name: 'id', 
            description: 'Task ID to update', 
            type: 4, // INTEGER
            required: true 
          },
          {
            name: 'status',
            description: 'New status',
            type: 3, // STRING
            required: true,
            choices: [
              { name: '🟡 Pending', value: '🟡 Pending' },
              { name: '🟠 In Progress', value: '🟠 In Progress' },
              { name: '✅ Completed', value: '✅ Completed' }
            ]
          }
        ]
      }
    ]
  },
  async execute(interaction) {
    const subCmd = interaction.options.getSubcommand();
    const group = detectGroup(interaction.channel.name);

    if (subCmd === 'add') {
      const description = interaction.options.getString('description');
      const due = interaction.options.getString('due') || 'No deadline';
      const assignee = interaction.options.getUser('assignee') || interaction.user;

      await addTask({
        description,
        due,
        assignee: assignee.id,
        creator: interaction.user.tag,
        group
      });

      await interaction.reply(`✅ Task added for <@${assignee.id}> in ${group}`);
    }
    else if (subCmd === 'list') {
      const filterGroup = interaction.options.getString('group');
      const tasks = await getTasks(filterGroup || group);
      
      const embed = new EmbedBuilder()
        .setDescription(tasks.map(t => 
          `**#${t.id}** ${t.description}\n` +
          `Assignee: <@${t.assignee}> | Due: ${formatDueDate(t.due)}\n` + // UPDATED
          `Status: ${t.status} | Group: ${t.group}`
        ).join('\n\n') || "No tasks found!")
        .setTitle(`📋 Tasks (${filterGroup || group})`)
        .setDescription(tasks.map(t => 
          `**#${t.id}** ${t.description}\n` +
          `Assignee: <@${t.assignee}> | Due: ${t.due}\n` +
          `Status: ${t.status} | Group: ${t.group}`
        ).join('\n\n') || "No tasks found!");

      await interaction.reply({ embeds: [embed] });
       
    }
  }
};
