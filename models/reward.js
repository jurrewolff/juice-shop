/* jslint node: true */
module.exports = (sequelize, { INTEGER }) => {
    const Reward = sequelize.define('Reward', {
      amount: INTEGER(4),  // ?4 bytes = max integer up to 4294967295? 
      spent: INTEGER(4),
    })
  
    Reward.associate = ({ User }) => {
      Reward.belongsTo(User, { constraints: true, foreignKeyConstraint: true })
    }
  
    return Reward
  }
  