//commands/task.js

const { EmbedBuilder } = require('discord.js');
const { addTask, getTasks, updateTaskStatus, editTaskField } = require('../utils/googleSheets'); // <-- ensure updateTaskStatus is imported
const { detectGroup } = require('../utils/helpers');
const moment = require('moment'); // Needed for due date formatting

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
            description: 'Detailed explanation of the task'
          },
          { 
            name: 'due', 
            type: 3, 
            description: 'Deadline (format: YYYY-MM-DD)'
          },
          { 
            name: 'assignee', 
            type: 6, 
            description: 'Team member responsible (@username)'
          },
          { 
            name: 'group', 
            type: 3, 
            description: 'Task group',
            choices: [
              { name: 'General', value: 'general' },
              { name: 'Alpha', value: 'alpha' },
              { name: 'Beta', value: 'beta' },
              { name: 'Gamma', value: 'gamma' },
              { name: 'Delta', value: 'delta' }
            ]
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
            description: 'Select team to filter tasks',
            choices: [
              { name: 'Alpha', value: 'alpha' },
              { name: 'Beta', value: 'beta' },
              { name: 'Gamma', value: 'gamma' },
              { name: 'Delta', value: 'delta' }
            ]
          },
          {
            name: 'status',
            type: 3,
            description: 'Filter by task status',
            choices: [
              { name: '🟡 Pending', value: '🟡 Pending' },
              { name: '🟠 In Progress', value: '🟠 In Progress' },
              { name: '✅ Completed', value: '✅ Completed' }
            ]
          }
        ]
      },
      {
        type: 1, // SUB_COMMAND
        name: 'edit',
        description: 'Edit an existing task',
        options: [
          {
            name: 'id',
            type: 4, // INTEGER
            description: 'Task ID to edit',
            required: true
          },
          {
            name: 'field',
            type: 3, // STRING
            description: 'Which field to edit',
            required: true,
            choices: [
              { name: 'Description', value: 'description' },
              { name: 'Due Date (YYYY-MM-DD)', value: 'due' },
              { name: 'Group', value: 'group' },
              { name: 'Assignee', value: 'assignee' }
            ]
          },
          {
            name: 'value',
            type: 3, // STRING, for description, due, (for assignee and group we will get differently)
            description: 'New value (for assignee pick user instead)',
            required: false
          },
          {
            name: 'group',
            type: 3,
            description: 'New group (if editing group)',
            required: false,
            choices: [
              { name: 'Alpha', value: 'alpha' },
              { name: 'Beta', value: 'beta' },
              { name: 'Gamma', value: 'gamma' },
              { name: 'Delta', value: 'delta' }
            ]
          },
          {
            name: 'assignee',
            type: 6, // USER type
            description: 'New assignee (if editing assignee)',
            required: false
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

    try { // <-- keep try/catch global

      if (subCmd === 'add') {
        const description = interaction.options.getString('description');
        const due = interaction.options.getString('due') || 'No deadline';
        const assignee = interaction.options.getUser('assignee') || interaction.user;
        const taskGroup = interaction.options.getString('group') || group;

        await addTask({
          description,
          due,
          assignee: assignee.id,
          creator: interaction.user.tag,
          group: taskGroup
        });

        await interaction.reply(`✅ Task added for <@${assignee.id}> in ${taskGroup}`);
      }
      else if (subCmd === 'edit') {
        await interaction.deferReply({ ephemeral: true });
      
        const id = interaction.options.getInteger('id');
        const field = interaction.options.getString('field');

        let newValue;

        // Get new value based on field type
        if (field === 'assignee') {
          const user = interaction.options.getUser('assignee');
          if (!user) return interaction.editReply({ content: 'Please specify the new assignee!', ephemeral: true });
          newValue = user.id;
        } else if (field === 'group') {
          newValue = interaction.options.getString('group');
          if (!newValue) return interaction.editReply({ content: 'Please specify the new group!', ephemeral: true });
        } else {
          newValue = interaction.options.getString('value');
          if (!newValue) return interaction.editReply({ content: `Please specify the new value for ${field}!`, ephemeral: true });
        }

        // Validate due date format if editing due
        if (field === 'due' && !/^\d{4}-\d{2}-\d{2}$/.test(newValue)) {
          return interaction.editReply('❌ Invalid due date format. Use YYYY-MM-DD.');
        }

        await editTaskField(id, field, newValue);

        await interaction.editReply(`✅ Task #${id} updated. **${field}** is now **${newValue}**.`);
      }  
      
      else if (subCmd === 'list') {
        const filterGroup = interaction.options.getString('group');
        const filterStatus = interaction.options.getString('status');
        let tasks = await getTasks(filterGroup || group);

        if (filterStatus) tasks = tasks.filter(t => t.status === filterStatus);
        
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
        await interaction.deferReply({ ephemeral: true }); // <-- ADDED: prevent timeout

        const id = interaction.options.getInteger('id');
        const status = interaction.options.getString('status');
        await updateTaskStatus(id, status);
        await interaction.editReply(`✅ Task #${id} updated to **${status}**.`); // <-- CHANGED: edit after defer
      }

    } catch (error) {
      // console.error('Task command error:', error);
      console.error('Error updating task status:', error);
      // await interaction.reply({ content: "❌ An error occurred while processing your request.", ephemeral: true });
      // Optionally notify user the command failed
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true });
      } else {
        await interaction.editReply({ content: '❌ Something went wrong.', ephemeral: true });
      }
    }
  }
  
};
