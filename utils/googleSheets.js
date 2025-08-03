
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// Column mapping for flags (add to top of file)
const FLAG_COLUMNS = {
  reminder100Sent: 'I',
  reminder36Sent: 'J',
  overdue50Sent: 'K',
  overdue150Sent: 'L'
};

module.exports = {
  async addTask({ description, due, assignee, creator, group }) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A:F',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          `=ROW()-1`, // Auto ID
          description,
          assignee,
          due,
          "🟡 Pending",
          creator,
          `=NOW()`,
          group
        ]]
      }
    });
  },

  async getTasks(groupFilter) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A:H'
    });
    
    return res.data.values
      ? res.data.values.map(row => ({
          id: row[0],
          description: row[1],
          assignee: row[2],
          due: row[3],
          status: row[4],
          creator: row[5],
          group: row[7]
        })).filter(t => !groupFilter || t.group === groupFilter)
      : [];
  },
  // Add to module.exports
async getTask(taskId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'A:H'
  });
  
  if (!res.data.values) return null;
  
  // Find task by ID (column A)
  const taskRow = res.data.values.find(row => row[0] == taskId);
  
  return taskRow ? {
    id: taskRow[0],
    description: taskRow[1],
    assignee: taskRow[2],
    due: taskRow[3],
    status: taskRow[4],
    creator: taskRow[5],
    group: taskRow[7]
  } : null;
},

async updateTaskStatus(taskId, newStatus) {
  // Find row index for task ID
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'A:H'
  });
  
  if (!res.data.values) return;
  
  const rowIndex = res.data.values.findIndex(row => row[0] == taskId);
  if (rowIndex === -1) return;
  
  // Update status in column E (index 4)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `E${rowIndex + 1}`, // +1 because Sheets is 1-indexed
    valueInputOption: 'RAW',
    resource: { values: [[newStatus]] }
  });
},

  // New function for updating flags
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
      throw error;
    }
  },

  // Modified getTask() to include flags
  async getTask(taskId) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A:L' // Updated to include all columns
    });
    
    if (!res.data.values) return null;
    
    const taskRow = res.data.values.find(row => row[0] == taskId);
    return taskRow ? {
      id: taskRow[0],
      description: taskRow[1],
      assignee: taskRow[2],
      due: row[3],
      status: row[4],
      creator: row[5],
      group: row[7],
      reminder100Sent: row[8] === 'TRUE',
      reminder36Sent: row[9] === 'TRUE',
      overdue50Sent: row[10] === 'TRUE',
      overdue150Sent: row[11] === 'TRUE'
    } : null;
  }
};

