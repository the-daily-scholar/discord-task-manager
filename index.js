require('dotenv').config();
const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');
const { scheduleReminders } = require('./utils/reminders');
const { addTask, getTasks } = require('./utils/googleSheets');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMembers, // Added for member data when assigning tasks
  ],
});

// Register Commands on Startup
client.on('ready', async () => {
  console.log(`✅ ${client.user.tag} is ready!`);


///
  //BELOW HERE IS THE HARDCODED COMMANDS SET!!!
  //DON'T TURN IT ON UNLESS deploy-commands.js BREAKS!!!
/*
  await client.application.commands.set([
    {
      name: 'task',
      description: 'Manage tasks',
      options: [
        {
          type: 1,
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
              name: 'group',
              type: 3,
              description: 'Which team is this for?',
              required: true,
              choices: [
                { name: 'General', value: 'general' },
                { name: 'Alpha', value: 'alpha' },
                { name: 'Beta', value: 'beta' },
                { name: 'Gamma', value: 'gamma' },
                { name: 'Delta', value: 'delta' },
              ],
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
          ],
        },
        {
          type: 1,
          name: 'list',
          description: 'List tasks',
          options: [
            {
              name: 'group',
              type: 3,
              description: 'Filter by team',
              choices: [
                { name: 'General', value: 'general' },
                { name: 'Alpha', value: 'alpha' },
                { name: 'Beta', value: 'beta' },
                { name: 'Gamma', value: 'gamma' },
                { name: 'Delta', value: 'delta' },
              ],
            },
            {
              name: 'status',
              type: 3,
              description: 'Filter by status',
              choices: [
                { name: '🟡 Pending', value: '🟡 Pending' },
                { name: '🟠 In Progress', value: '🟠 In Progress' },
                { name: '✅ Completed', value: '✅ Completed' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'mytasks',
      description: 'Show your assigned tasks',
      options: [
        {
          name: 'status',
          type: 3,
          description: 'Filter by status',
          choices: [
            { name: '🟡 Pending', value: '🟡 Pending' },
            { name: '🟠 In Progress', value: '🟠 In Progress' },
            { name: '✅ Completed', value: '✅ Completed' },
          ],
        },
      ],
    },
  ]);
*/
///
  // Start reminder scheduler
  scheduleReminders(client);
});

// Command Handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'task') {
    const subCmd = interaction.options.getSubcommand();

    if (subCmd === 'add') {
      const description = interaction.options.getString('description');
      const due = interaction.options.getString('due') || 'No deadline';
      const assignee = interaction.options.getUser('assignee') || interaction.user;
      const group = interaction.options.getString('group');

      await addTask({
        description,
        due,
        assignee: assignee.id,
        creator: interaction.user.tag,
        group,
      });

      await interaction.reply({ content: `✅ Task added for <@${assignee.id}> in ${group}`, flags: 1 << 6 });
    }

    else if (subCmd === 'list') {
      const filterGroup = interaction.options.getString('group');
      const filterStatus = interaction.options.getString('status');
      let tasks = await getTasks(filterGroup);

      if (filterStatus) {
        tasks = tasks.filter((t) => t.status === filterStatus);
      }

      const embed = new EmbedBuilder()
        .setTitle(`📋 Tasks (${filterGroup || 'All'})`)
        .setDescription(
          tasks.length
            ? tasks.map((t) =>
                `**#${t.id}** ${t.description}\nAssignee: <@${t.assignee}> | Due: ${t.due}\nStatus: ${t.status} | Group: ${t.group}`
              ).join('\n\n')
            : 'No tasks found!'
        );

      await interaction.reply({ embeds: [embed] });
    }
  }

  else if (commandName === 'mytasks') {
    const filterStatus = interaction.options.getString('status');
    let tasks = (await getTasks()).filter((t) => t.assignee === interaction.user.id);

    if (filterStatus) {
      tasks = tasks.filter((t) => t.status === filterStatus);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📌 Your Tasks (${tasks.length})`)
      .setDescription(
        tasks.length
          ? tasks.map((t) => `**#${t.id}** ${t.description}\nDue: ${t.due} | Group: ${t.group}`).join('\n\n')
          : 'No tasks assigned!'
      );

    await interaction.reply({ embeds: [embed], flags: 1 << 6 });
  }
});

client.login(process.env.DISCORD_TOKEN);
