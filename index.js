require('dotenv').config();
const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');
const { scheduleReminders } = require('./utils/reminders');
const { addTask, getTasks, updateTaskStatus, editTaskField } = require('./utils/googleSheets');

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
      console.log("Adding Task")
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

      await interaction.reply({ content: `✅ Task added for <@${assignee.id}> in ${group}` });
    }

    else if (subCmd === 'edit') {
      console.log("Editing Task");
      await interaction.deferReply({ ephemeral: true });
    
      const id = interaction.options.getInteger('id');
      const field = interaction.options.getString('field');
    
      let newValue;
      let user;
    
      try {
        if (field === 'assignee') {
          user = interaction.options.getUser('assignee');
          if (!user) return await interaction.editReply({ content: 'Please specify the new assignee!', ephemeral: true });
          newValue = user.id;
        } else if (field === 'group') {
          newValue = interaction.options.getString('group');
          if (!newValue) return await interaction.editReply({ content: 'Please specify the new group!', ephemeral: true });
        } else {
          newValue = interaction.options.getString('value');
          if (!newValue) return await interaction.editReply({ content: `Please specify the new value for ${field}!`, ephemeral: true });
        }
    
        // Validate due date format if editing due
        if (field === 'due' && !/^\d{4}-\d{2}-\d{2}$/.test(newValue)) {
          return await interaction.editReply('❌ Invalid due date format. Use YYYY-MM-DD.');
        }
       
        await editTaskField(id, field, newValue);

        // For assignee, display mention instead of raw ID:
      let displayValue = newValue;
      if (field === 'assignee') {
        // Try to fetch the user to mention by ID (if available)
        try {
          displayValue = user ? `<@${user.id}>` : newValue;
          console.log(displayValue)
        } catch {
          displayValue = newValue;
        }
      }
    
        await interaction.editReply(`✅ Task #${id} updated. **${field}** is now **${displayValue}**.`);
      } catch (error) {
        console.error('Error editing task:', error);
        if (error.message.includes('not found')) {
          return await interaction.editReply({ content: `❌ Task ID  #${id} not found. Please check the ID and try again.`, ephemeral: true });
        }
        await interaction.editReply('❌ Failed to edit the task.');
      }
    }  

    else if (subCmd === 'update') {
      console.log("Updating Task")
      await interaction.deferReply({ ephemeral: true }); // Acknowledge the interaction and allow for delayed response
      
      const taskId = interaction.options.getInteger('id');
      const newStatus = interaction.options.getString('status');
      
      try {
        await updateTaskStatus(taskId, newStatus);
        await interaction.editReply(`✅ Task #${taskId} updated to **${newStatus}**.`);
      } catch (error) {
        console.error('Error updating task:', error);
        if (error.message.includes('not found')) {
          return await interaction.editReply({ content: `❌ Task ID #${taskId} not found. Please check the ID and try again.`, ephemeral: true });
        }
        await interaction.editReply('❌ Failed to update the task status.');
      }
    }

    else if (subCmd === 'list') {
      console.log("Listing Tasks")
      await interaction.deferReply({ ephemeral: true });
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

      await interaction.editReply({ embeds: [embed] });
    }
  }

  else if (commandName === 'mytasks') {
    console.log("Listing My Task")
    await interaction.deferReply({ flags: 64  });
    const filterStatus = interaction.options.getString('status');
    let tasks = (await getTasks()).filter((t) => t.assignee === interaction.user.id);

    if (filterStatus) {
      tasks = tasks.filter((t) => t.status === filterStatus);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📌 Your Tasks (${tasks.length})`)
      .setDescription(
        tasks.length
          ? tasks.map((t) => `**#${t.id}** ${t.description}\nDue: ${t.due} | Status: ${t.status} | Group: ${t.group}`).join('\n\n')
          : 'No tasks assigned!'
      );

    await interaction.editReply({ embeds: [embed], flags: 1 << 6 });
  }
});

client.login(process.env.DISCORD_TOKEN);
