const { google } = require('googleapis');
const creds = JSON.parse(
  Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString()
);

const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});


const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

const FLAG_COLUMNS = {
  reminder100Sent: 'I',
  reminder36Sent: 'J',
  overdue50Sent: 'K',
  overdue150Sent: 'L'
};

const FIELD_COLUMN_MAP = {
  description: 'B',
  assignee: 'C',
  due: 'D',
  status: 'E',
  creator: 'F',
  group: 'H',
  reminder100Sent: 'I',
  reminder36Sent: 'J',
  overdue50Sent: 'K',
  overdue150Sent: 'L'
};

module.exports = {
  async addTask({ description, due, assignee, creator, group }) {
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'A:L',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[
            `=ROW()-1`,      // Auto ID
            description,
            assignee,
            due,
            "🟡 Pending",
            creator,
            `=NOW()`,
            group,
            'FALSE', 'FALSE', 'FALSE', 'FALSE' // Initialize flags
          ]]
        }
      });
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  },

  async getTasks(groupFilter) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'A:L'
      });
      
      return res.data.values
        ? res.data.values.map(row => ({
            id: row[0],
            description: row[1],
            assignee: row[2],
            due: row[3],
            status: row[4],
            creator: row[5],
            group: row[7],
            reminder100Sent: row[8] === 'TRUE',
            reminder36Sent: row[9] === 'TRUE',
            overdue50Sent: row[10] === 'TRUE',
            overdue150Sent: row[11] === 'TRUE'
          })).filter(t => !groupFilter || t.group === groupFilter)
        : [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  },

  async getTask(taskId) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'A:L'
      });
      
      if (!res.data.values) return null;
      const taskRow = res.data.values.find(row => row[0] == taskId);
      
      return taskRow ? {
        id: taskRow[0],
        description: taskRow[1],
        assignee: taskRow[2],
        due: taskRow[3],
        status: taskRow[4],
        creator: taskRow[5],
        group: taskRow[7],
        reminder100Sent: taskRow[8] === 'TRUE',
        reminder36Sent: taskRow[9] === 'TRUE',
        overdue50Sent: taskRow[10] === 'TRUE',
        overdue150Sent: taskRow[11] === 'TRUE'
      } : null;
    } catch (error) {
      console.error('Error fetching task:', error);
      return null;
    }
  },

  async editTaskField(taskId, field, newValue) {
    if (!(field in FIELD_COLUMN_MAP)) {
      throw new Error(`Field "${field}" is not editable or unknown.`);
    }

    const column = FIELD_COLUMN_MAP[field];

    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'A:A' // Just get ID column to find row index
      });

      if (!res.data.values) {
        console.log('No data found.');
        return;
      }

      const rowIndex = res.data.values.findIndex(row => row[0] == taskId);
      if (rowIndex === -1) {
        console.log(`Task ID ${taskId} not found.`);
        return;
      }

      const sheetRow = rowIndex + 1; // Sheets rows are 1-indexed

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${column}${sheetRow}`,
        valueInputOption: 'RAW',
        resource: { values: [[newValue]] }
      });

      console.log(`✅ Task ID ${taskId} field "${field}" updated to "${newValue}"`);
    } catch (error) {
      console.error('Error updating task field:', error);
      throw error;
    }
  },

  async updateTaskStatus(taskId, newStatus) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'A:L'
      });

      if (!res.data.values) {
        console.log('No data found.');
        return;
      }
      
      // const rowIndex = res.data.values.findIndex(row => row[0] == taskId);
      // if (rowIndex === -1) return;
      const rowIndex = res.data.values.findIndex(row => row[0] == taskId);
      if (rowIndex === -1) {
        console.log(`Task ID ${taskId} not found.`);
        return;
      }
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `E${rowIndex + 1}`, // +1 because Sheets is 1-indexed
        valueInputOption: 'RAW',
        resource: { values: [[newStatus]] }
      });
      console.log(`✅ Task ID ${taskId} updated to "${newStatus}"`);
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  },

  async updateTaskFlag(taskId, flagName, value) {
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${FLAG_COLUMNS[flagName]}${Number(taskId) + 1}`, // +1 for 1-based row
        valueInputOption: 'RAW',
        resource: { values: [[value ? 'TRUE' : 'FALSE']] }
      });
    } catch (error) {
      console.error('Error updating flag:', error);
    }
  }
};
