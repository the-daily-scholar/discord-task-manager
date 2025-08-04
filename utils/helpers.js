const groups = require('../config/groups.json');

module.exports = {
  detectGroup(channelName) {
    if (!groups || typeof groups !== 'object') {
      throw new Error("groups.json is missing or invalid.");
    }

    for (const [group, channels] of Object.entries(groups)) {
      if (channels.includes(channelName.toLowerCase())) return group;
    }

    return null; // Explicitly return null for unmapped channels
  },

  async sendDM(client, userId, message, throwOnError = false) {
    try {
      const user = await client.users.fetch(userId);
      await user.send(message);
    } catch (error) {
      console.error(`Error sending DM to ${userId}:`, error);
      if (throwOnError) throw error;
    }
  }
};
