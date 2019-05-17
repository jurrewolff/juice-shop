/* jslint node: true */
module.exports = (sequelize, { INTEGER }) => {
    const Reward = sequelize.define('Reward', {
      amount: INTEGER(),
    })
  
    Reward.associate = ({ User }) => {
      Reward.belongsTo(User, { constraints: true, foreignKeyConstraint: true })
    }
  
    return Reward
  }
