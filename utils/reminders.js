const cron = require('node-cron');
const moment = require('moment');
const { getTasks, updateTaskFlag } = require('./googleSheets');
require('dotenv').config();

// Flag to track sent reminders
const FLAGS = {
  REMINDER_100H: 'reminder100Sent',
  REMINDER_36H: 'reminder36Sent',
  OVERDUE_50H: 'overdue50Sent',
  OVERDUE_150H: 'overdue150Sent'
};

module.exports = {
  scheduleReminders(client) {
    // Run every 30 minutes for precision
    cron.schedule('*/30 * * * *', async () => {
      try {
        const tasks = await getTasks();
        const now = moment();
        
        for (const task of tasks) {
          // Skip completed tasks or those without deadlines
          if (task.status === '✅ Completed' || task.due === 'No deadline') continue;
          
          const dueDate = moment(task.due, 'YYYY-MM-DD');
          const hoursLeft = dueDate.diff(now, 'hours', true);  // Precise decimal hours
          const hoursOverdue = -hoursLeft;  // Positive number when overdue

          // Get reminder channel (configured in .env)
          const channel = client.channels.cache.get(process.env.REMINDER_CHANNEL_ID);
          if (!channel) {
            console.error('Reminder channel not found!');
            continue;
          }

          // --- Pre-Due Reminders ---
          if (hoursLeft > 0) {
            // 100 hours (≈4 days) reminder
            if (hoursLeft <= 100 && hoursLeft > 36 && !task[FLAGS.REMINDER_100H]) {
              await channel.send(`<@${task.assignee}> ⏳ **100-HOUR REMINDER**\n"${task.description}"\nDue: ${task.due} (in ${Math.ceil(hoursLeft)} hours)`);
              await updateTaskFlag(task.id, FLAGS.REMINDER_100H, true);
            }
            
            // 36 hours (≈1.5 days) reminder
            if (hoursLeft <= 36 && hoursLeft > 0 && !task[FLAGS.REMINDER_36H]) {
              await channel.send(`<@${task.assignee}> ⚠️ **36-HOUR REMINDER**\n"${task.description}"\nDue: ${task.due} (in ${Math.ceil(hoursLeft)} hours)`);
              await updateTaskFlag(task.id, FLAGS.REMINDER_36H, true);
            }
          } 
          // --- Overdue Reminders ---
          else if (hoursOverdue > 0) {
            // 50 hours overdue (~2 days)
            if (hoursOverdue >= 50 && hoursOverdue < 150 && !task[FLAGS.OVERDUE_50H]) {
              await channel.send(`<@${task.assignee}> 🔴 **50 HOURS OVERDUE!**\n"${task.description}"\nOverdue by ${Math.floor(hoursOverdue)} hours`);
              await updateTaskFlag(task.id, FLAGS.OVERDUE_50H, true);
            }
            
            // 150 hours overdue (~6 days)
            if (hoursOverdue >= 150 && !task[FLAGS.OVERDUE_150H]) {
              await channel.send(`<@${task.assignee}> 🔥 **150 HOURS OVERDUE!**\n"${task.description}"\nCRITICALLY overdue by ${Math.floor(hoursOverdue)} hours`);
              await updateTaskFlag(task.id, FLAGS.OVERDUE_150H, true);
            }
          }
        }
      } catch (error) {
        console.error('Reminder error:', error);
      }
    });
  }
};