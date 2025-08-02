
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

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
}
};
