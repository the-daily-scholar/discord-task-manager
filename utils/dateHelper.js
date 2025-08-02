const moment = require('moment');

module.exports = {
  parseDueDate(input) {
    if (!input || input.toLowerCase() === 'no deadline') return 'No deadline';
    
    // Try absolute date (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const date = moment(input, 'YYYY-MM-DD');
      if (date.isValid()) return date.format('YYYY-MM-DD');
      return { error: 'Invalid date format. Use YYYY-MM-DD' };
    }
    
    // Try relative dates
    const lowerInput = input.toLowerCase();
    const today = moment().startOf('day');
    
    if (lowerInput === 'today') return today.format('YYYY-MM-DD');
    if (lowerInput === 'tomorrow') return today.add(1, 'days').format('YYYY-MM-DD');
    
    const match = lowerInput.match(/in (\d+) (day|week)s?/i);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2] + 's'; // Convert to plural
      return today.add(amount, unit).format('YYYY-MM-DD');
    }
    
    // Fallback: Try parsing natural language
    const parsedDate = moment(input);
    if (parsedDate.isValid()) return parsedDate.format('YYYY-MM-DD');
    
    return { error: `Unrecognized date format: "${input}". Try:\n` +
                    '- Absolute: YYYY-MM-DD\n' +
                    '- Relative: "tomorrow", "in 3 days"' };
  }
};