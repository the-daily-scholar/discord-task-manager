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
  }
};