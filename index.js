require('dotenv').config();
const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');
const cron = require('node-cron');
const { scheduleReminders } = require('./utils/reminders');
const { addTask, getTasks, updateTask } = require('./utils/googleSheets');
const { detectGroup } = require('./utils/helpers');

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages]
});

// Initialize Google Sheets
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Register Commands on Startup
client.on('ready', async () => {
  console.log(`✅ ${client.user.tag} is ready!`);
  
  await client.application.commands.set([
    {
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
              description: 'What needs to be done?'  // Added missing description
            },
            { 
              name: 'due', 
              type: 3, 
              description: 'When is this due? (YYYY-MM-DD)'  // Enhanced description
            },
            { 
              name: 'assignee', 
              type: 6, 
              description: 'Who should complete this task? (@mention)'  // Enhanced description
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
              description: 'Filter by which team?',  // Added missing description
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
    {
      name: 'mytasks',
      description: 'Show your assigned tasks'
    }
  ]);

  // Start reminder scheduler
  scheduleReminders(client);
});

// Command Handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options, user, channel } = interaction;

  if (commandName === 'task') {
    const subCmd = options.getSubcommand();
    const group = detectGroup(channel.name);

    if (subCmd === 'add') {
      const description = options.getString('description');
      const due = options.getString('due') || 'No deadline';
      const assignee = options.getUser('assignee') || user;

      await addTask({
        description,
        due,
        assignee: assignee.id,
        creator: user.tag,
        group
      });

      await interaction.reply(`✅ Task added for <@${assignee.id}> in ${group}`);
    }

    else if (subCmd === 'list') {
      const filterGroup = options.getString('group');
      const tasks = await getTasks(filterGroup || group);
      
      const embed = new EmbedBuilder()
        .setTitle(`📋 Tasks (${filterGroup || group})`)
        .setDescription(tasks.map(t => 
          `**#${t.id}** ${t.description}\n` +
          `Assignee: <@${t.assignee}> | Due: ${t.due}\n` +
          `Status: ${t.status} | Group: ${t.group}`
        ).join('\n\n'));

      await interaction.reply({ embeds: [embed] });
    }
  }

  else if (commandName === 'mytasks') {
    const tasks = (await getTasks()).filter(t => t.assignee === user.id);
    
    const embed = new EmbedBuilder()
      .setTitle(`📌 Your Tasks (${tasks.length})`)
      .setDescription(tasks.map(t => 
        `**#${t.id}** ${t.description}\n` +
        `Due: ${t.due} | Group: ${t.group}`
      ).join('\n\n') || "No tasks assigned!");

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);