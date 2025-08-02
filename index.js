require('dotenv').config();
const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages]
});

// Google Sheets Setup
const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json', // (See Step 4)
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Slash Commands
client.on('ready', async () => {
  console.log(`✅ ${client.user.tag} is ready!`);
  
  // Register Commands (Planny-style)
  await client.application.commands.set([
    {
      name: 'task',
      description: 'Manage tasks',
      options: [
        {
          type: 1, // SUB_COMMAND
          name: 'add',
          description: 'Add a new task',
          options: [
            { name: 'description', description: 'Task details', type: 3, required: true },
            { name: 'assignee', description: '@User to assign', type: 6, required: false },
            { name: 'due', description: 'Due date (YYYY-MM-DD)', type: 3, required: false }
          ]
        },
        {
          type: 1, // SUB_COMMAND
          name: 'list',
          description: 'Show all tasks'
        },
        {
          type: 1, // SUB_COMMAND
          name: 'complete',
          description: 'Mark task as done',
          options: [
            { name: 'id', description: 'Task ID to complete', type: 4, required: true }
          ]
        }
      ]
    }
  ]);
});

// Handle Commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { options, user } = interaction;
  const subCmd = options.getSubcommand();

  // /task add
  if (subCmd === 'add') {
    const description = options.getString('description');
    const assignee = options.getUser('assignee') || user;
    const due = options.getString('due') || 'No deadline';

    // Add to Google Sheets (See Step 4)
    await addTaskToSheet(description, assignee.id, due, user.tag);

    await interaction.reply(`✅ Task added: "${description}" (Assigned to: <@${assignee.id}>)`);
  }

  // /task list
  else if (subCmd === 'list') {
    const tasks = await getTasksFromSheet();
    const embed = new EmbedBuilder()
      .setTitle('📝 Task List')
      .setDescription(tasks.map(t => `**#${t[0]}** ${t[1]} (Due: ${t[3]})`).join('\n'));
    
    await interaction.reply({ embeds: [embed] });
  }

  // /task complete
  else if (subCmd === 'complete') {
    const taskId = options.getInteger('id');
    await completeTaskInSheet(taskId);
    await interaction.reply(`✅ Task #${taskId} marked as complete!`);
  }
});

// Google Sheets Functions (Step 4)
async function addTaskToSheet(desc, assignee, due, creator) {
  const authClient = await auth.getClient();
  const sheetId = process.env.GOOGLE_SHEETS_ID;

  await sheets.spreadsheets.values.append({
    auth: authClient,
    spreadsheetId: sheetId,
    range: 'A:F',
    valueInputOption: 'RAW',
    resource: { values: [[ desc, assignee, due, '🟡 Pending', creator ]] }
  });
}

client.login(process.env.DISCORD_TOKEN);
