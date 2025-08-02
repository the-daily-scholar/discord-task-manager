const cron = require('node-cron');
const { getTasks } = require('./googleSheets');
const { sendDM } = require('./helpers');
const { reminderSchedule, midpointReminder } = require('../config/reminders.json');

module.exports = {
  scheduleReminders(client) {
    // Due date reminders
    cron.schedule(reminderSchedule, async () => {
      const tasks = await getTasks();
      const today = new Date().toISOString().split('T')[0];
      
      tasks.forEach(task => {
        if (task.due === today && task.status !== '✅ Done') {
          sendDM(client, task.assignee, 
            `⏰ **Task Due Today!**\n"${task.description}"\n` +
            `Group: ${task.group} | Created by: ${task.creator}`
          );
        }
      });
    });

    // Midpoint reminders
    cron.schedule(midpointReminder, async () => {
      const tasks = await getTasks();
      // ... (similar logic for 3-day reminders)
    });
        // Inside cron jobs
    tasks.forEach(task => {
      if (task.due === 'No deadline') return;
      
      const today = moment().format('YYYY-MM-DD');
      const dueDate = moment(task.due, 'YYYY-MM-DD');
      
      // Due today
      if (task.due === today) {
        sendDM(client, task.assignee, 
          `⏰ **TASK DUE TODAY!**\n"${task.description}"\n` +
          `Group: ${task.group} | Created by: ${task.creator}`
        );
      }
      
      // 3-day warning
      else if (dueDate.diff(moment(), 'days') === 3) {
        sendDM(client, task.assignee, 
          `⚠️ **TASK DUE IN 3 DAYS**\n"${task.description}"\n` +
          `Due: ${task.due} | Group: ${task.group}`
        );
      }
    });
  }
};