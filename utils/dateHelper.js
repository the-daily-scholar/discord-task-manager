const moment = require('moment');

module.exports = {
  parseDueDate(input) {
    if (!input || input.toLowerCase() === 'no deadline') 
      return { date: 'No deadline', error: null };

    // Absolute date (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const date = moment(input, 'YYYY-MM-DD', true);
      if (date.isValid()) return { date: date.format('YYYY-MM-DD'), error: null };
      return { date: null, error: 'Invalid date format. Use YYYY-MM-DD.' };
    }

    // Relative dates
    const lowerInput = input.toLowerCase();
    const today = moment().startOf('day');

    if (lowerInput === 'today') 
      return { date: today.format('YYYY-MM-DD'), error: null };

    if (lowerInput === 'tomorrow') 
      return { date: moment(today).add(1, 'days').format('YYYY-MM-DD'), error: null };

    const match = lowerInput.match(/in (\d+) (day|week)s?/i);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2] + 's';
      return { date: moment(today).add(amount, unit).format('YYYY-MM-DD'), error: null };
    }

    // Fallback: Try parsing natural language
    const parsedDate = moment(input);
    if (parsedDate.isValid()) 
      return { date: parsedDate.format('YYYY-MM-DD'), error: null };

    // Error fallback
    return { 
      date: null, 
      error: `Unrecognized date format. Try:\n• YYYY-MM-DD\n• "tomorrow"\n• "in 3 days"`
    };
  }
};