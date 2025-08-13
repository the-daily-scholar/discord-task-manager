const cron = require('node-cron');
const moment = require('moment');
const { getTasks, updateTaskFlag } = require('./googleSheets');
const { reminderSchedule } = require('../config/reminders.json');
require('dotenv').config();

const FLAGS = {
  REMINDER_100H: 'reminder100Sent',
  REMINDER_36H: 'reminder36Sent',
  OVERDUE_50H: 'overdue50Sent',
  OVERDUE_150H: 'overdue150Sent'
};

module.exports = {
  scheduleReminders(client) {
    // Load from config
    cron.schedule(reminderSchedule, async () => {
      try {
        const tasks = await getTasks();
        const now = moment();

        for (const task of tasks) {
          // Skip invalid or completed tasks
          if (task.status === '✅ Completed' || task.status === '❌ Cancelled' || task.due === 'No deadline') continue;
          
          const dueDate = moment(task.due, 'YYYY-MM-DD');
          if (!dueDate.isValid()) continue;

          const hoursLeft = dueDate.diff(now, 'hours', true);
          const hoursOverdue = -hoursLeft;

          const channel = client.channels.cache.get(process.env.REMINDER_CHANNEL_ID);
          if (!channel) {
            console.error('Reminder channel not found!');
            continue;
          }

          // --- PRE-DUE REMINDERS ---
          if (hoursLeft > 0) {
            if (hoursLeft <= 100 && hoursLeft > 36 && !task[FLAGS.REMINDER_100H]) {
              await channel.send(`<@${task.assignee}> ⏳ **100-HOUR REMINDER**\n"${task.description}"\nDue: ${task.due} (in ${Math.ceil(hoursLeft)} hours)`);
              await updateTaskFlag(task.id, FLAGS.REMINDER_100H, true);
            }
            if (hoursLeft <= 36 && !task[FLAGS.REMINDER_36H]) {
              await channel.send(`<@${task.assignee}> ⚠️ **36-HOUR REMINDER**\n"${task.description}"\nDue: ${task.due} (in ${Math.ceil(hoursLeft)} hours)`);
              await updateTaskFlag(task.id, FLAGS.REMINDER_36H, true);
            }
          }

          // --- OVERDUE REMINDERS ---
          else if (hoursOverdue > 0) {
            if (hoursOverdue >= 50 && hoursOverdue < 150 && !task[FLAGS.OVERDUE_50H]) {
              await channel.send(`<@${task.assignee}> 🔴 **50 HOURS OVERDUE!**\n"${task.description}"\nOverdue by ${Math.floor(hoursOverdue)} hours`);
              await updateTaskFlag(task.id, FLAGS.OVERDUE_50H, true);
            }
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