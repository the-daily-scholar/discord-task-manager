# Discord Task Manager Bot
**A lightweight Discord bot for managing team tasks with Google Sheets integration.
Features task tracking, deadlines, group filtering, and automated reminders.**

---

## Features

- Add, list, and update tasks directly in Discord.
- Google Sheets backend for persistent storage.
- Group-based tasks (general, alpha, beta, gamma, delta).
- Deadline parsing: supports exact dates & natural language (today, tomorrow, in 3 days).
- Automatic reminders in a progress-update channel.

---

## Setup

1. Clone & Install
```
git clone https://github.com/the-daily-scholar/discord-task-manager.git
cd task-manager-bot
npm install
```
2. Environment Variables <br>
***Create a .env file:***
```
DISCORD_TOKEN=<your-discord-bot-token>
CLIENT_ID=<your-discord-app-id>
GUILD_ID=<your-test-server-id> # Optional for dev
GOOGLE_SHEETS_ID=<your-google-sheet-id>
GOOGLE_CREDENTIALS_BASE64=<base64-encoded-service-account-key>
REMINDER_CHANNEL_ID=<discord-channel-id-for-reminders>
```
3. Deploy Commands
```
node deploy-commands.js
```
4. Start the Bot
```
npm start
```

---

## Commands

### /task add
```
/task add description:<string> due:<YYYY-MM-DD/today/tomorrow/in X days> assignee:@user group:<general/alpha/beta/gamma/delta>
```
- description (required): Task details.
- due (optional): Deadline.
- assignee (optional): Who’s responsible (defaults to the sender).
- group (optional): Team group.

---

### /task list
```
/task list group:<group> status:<status>
```
- group (optional): Filter by group.
- status (optional): Filter by task status.

---

### /mytasks
***(List your tasks)***
```
/mytasks status:<status>
```
- status (optional): Filter by status.

---

### /update
***Update task status***
```
/update id:<task_id> status:<status>
```
- id (required): Task ID from /task list.

- status (required): New status.

---

### *Task Statuses*
🟡 Pending
🟠 In Progress
✅ Completed

---

## Contributing to the project 
1. Fork the repo.
2. Create a new branch.
3. Submit a pull request.

---