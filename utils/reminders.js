const cron = require('node-cron');
const moment = require('moment');
const { getTasks, updateTaskFlag } = require('./googleSheets');
const { sendDM } = require('./helpers');
require('dotenv').config();

const FLAGS = {
  REMINDER_100H: 'reminder100Sent',
  REMINDER_36H: 'reminder36Sent',
  OVERDUE_50H: 'overdue50Sent',
  OVERDUE_150H: 'overdue150Sent'
};

function isValidDate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && moment(dateStr, 'YYYY-MM-DD', true).isValid();
}

module.exports = {
  scheduleReminders(client) {
    cron.schedule('*/30 * * * *', async () => {
      try {
        const tasks = await getTasks();
        const now = moment();
        const channel = client.channels.cache.get(process.env.REMINDER_CHANNEL_ID);
        if (!channel) {
          console.error('Reminder channel not found!');
          return;
        }

        for (const task of tasks) {
          try {
            // Skip completed or no-deadline tasks
            if (task.status === '✅ Completed' || task.due === 'No deadline') continue;

            // Validate due date
            if (!isValidDate(task.due)) {
              console.warn(`Skipping task #${task.id}: invalid due date (${task.due}).`);
              continue;
            }

            const dueDate = moment(task.due, 'YYYY-MM-DD');
            const hoursLeft = dueDate.diff(now, 'hours', true);
            const hoursOverdue = -hoursLeft;

            // --- Pre-Due Reminders ---
            if (hoursLeft > 0) {
              if (hoursLeft <= 100 && hoursLeft > 36 && !task[FLAGS.REMINDER_100H]) {
                await channel.send(`<@${task.assignee}> ⏳ **100-HOUR REMINDER**\n"${task.description}"\nDue: ${task.due} (in ${Math.ceil(hoursLeft)} hours)`);
                await updateTaskFlag(task.id, FLAGS.REMINDER_100H, true);
                await sendDM(client, task.assignee, `⏳ Reminder: "${task.description}" is due in about ${Math.ceil(hoursLeft)} hours.`, false);
              }
              if (hoursLeft <= 36 && hoursLeft > 0 && !task[FLAGS.REMINDER_36H]) {
                await channel.send(`<@${task.assignee}> ⚠️ **36-HOUR REMINDER**\n"${task.description}"\nDue: ${task.due} (in ${Math.ceil(hoursLeft)} hours)`);
                await updateTaskFlag(task.id, FLAGS.REMINDER_36H, true);
                await sendDM(client, task.assignee, `⚠️ Critical Reminder: "${task.description}" is due soon (${Math.ceil(hoursLeft)} hours).`, false);
              }
            }
            // --- Overdue Reminders ---
            else if (hoursOverdue > 0) {
              if (hoursOverdue >= 50 && hoursOverdue < 150 && !task[FLAGS.OVERDUE_50H]) {
                await channel.send(`<@${task.assignee}> 🔴 **50 HOURS OVERDUE!**\n"${task.description}"\nOverdue by ${Math.floor(hoursOverdue)} hours`);
                await updateTaskFlag(task.id, FLAGS.OVERDUE_50H, true);
                await sendDM(client, task.assignee, `🔴 Your task "${task.description}" is overdue by ${Math.floor(hoursOverdue)} hours.`, false);
              }
              if (hoursOverdue >= 150 && !task[FLAGS.OVERDUE_150H]) {
                await channel.send(`<@${task.assignee}> 🔥 **150 HOURS OVERDUE!**\n"${task.description}"\nCRITICALLY overdue by ${Math.floor(hoursOverdue)} hours`);
                await updateTaskFlag(task.id, FLAGS.OVERDUE_150H, true);
                await sendDM(client, task.assignee, `🔥 URGENT: Your task "${task.description}" is critically overdue by ${Math.floor(hoursOverdue)} hours.`, false);
              }
            }
          } catch (taskError) {
            console.error(`Error processing task #${task.id}:`, taskError);
          }
        }
      } catch (error) {
        console.error('Reminder job error:', error);
      }
    });
  }
};
