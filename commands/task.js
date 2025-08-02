const { EmbedBuilder } = require('discord.js');
const { addTask, getTasks } = require('../utils/googleSheets');
const { detectGroup } = require('../utils/helpers');

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
