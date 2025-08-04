require('dotenv').config();
const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');
const { scheduleReminders } = require('./utils/reminders');
const { addTask, getTasks } = require('./utils/googleSheets');
const { detectGroup } = require('./utils/helpers');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMembers // Added for assignee fetching
  ]
});

/*
const group = detectGroup(channel.name);
if (!group) {
  await interaction.reply({ 
    content: `❌ This channel (**${channel.name}**) is not mapped to any group. Please use a valid task channel or contact an admin.`,
    ephemeral: true 
  });
  return;
}
*/

// Helper: Validate date format (YYYY-MM-DD)
function isValidDate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
}

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
              description: 'What needs to be done?'
            },
            { 
              name: 'due', 
              type: 3, 
              description: 'When is this due? (YYYY-MM-DD)'
            },
            { 
              name: 'assignee', 
              type: 6, 
              description: 'Who should complete this task? (@mention)'
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
              description: 'Filter by which team?',
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

  try {
    if (commandName === 'task') {
      const subCmd = options.getSubcommand();
      const group = detectGroup(channel.name.toLowerCase()); // enforce lowercase

      if (subCmd === 'add') {
        const description = options.getString('description');
        let due = options.getString('due');
        const assignee = options.getUser('assignee') || user;

        // Validate due date
        if (due && !isValidDate(due)) {
          await interaction.reply({ content: "❌ Invalid date format. Use YYYY-MM-DD.", ephemeral: true });
          return;
        }
        due = due || 'No deadline';

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
        
        let description = tasks.map(t => 
          `**#${t.id}** ${t.description}\nAssignee: <@${t.assignee}> | Due: ${t.due}\nStatus: ${t.status} | Group: ${t.group}`
        ).join('\n\n') || "No tasks found.";

        // Truncate to fit Discord embed limits
        if (description.length > 4000) {
          description = description.substring(0, 4000) + "\n\n...and more";
        }

        const embed = new EmbedBuilder()
          .setTitle(`📋 Tasks (${filterGroup || group})`)
          .setDescription(description);

        await interaction.reply({ embeds: [embed] });
      }
    }

    else if (commandName === 'mytasks') {
      const tasks = (await getTasks()).filter(t => t.assignee === user.id);
      
      let description = tasks.map(t => 
        `**#${t.id}** ${t.description}\nDue: ${t.due} | Group: ${t.group}`
      ).join('\n\n') || "No tasks assigned!";

      if (description.length > 4000) {
        description = description.substring(0, 4000) + "\n\n...and more";
      }

      const embed = new EmbedBuilder()
        .setTitle(`📌 Your Tasks (${tasks.length})`)
        .setDescription(description);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    console.error("Command error:", error);
    await interaction.reply({ content: "❌ An error occurred while processing your request.", ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
