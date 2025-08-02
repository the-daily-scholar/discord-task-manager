
const groups = require('../config/groups.json');

module.exports = {
  detectGroup(channelName) {
    for (const [group, channels] of Object.entries(groups)) {
      if (channels.includes(channelName.toLowerCase())) return group;
    }
    return "General";
  },

  async sendDM(client, userId, message) {
    const user = await client.users.fetch(userId);
    await user.send(message).catch(console.error);
  }
};