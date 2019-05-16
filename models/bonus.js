/* jslint node: true */
module.exports = (sequelize, { INTEGER }) => {
    const Bonus = sequelize.define('Bonus', {
      amount: INTEGER(),
    })
  
    Bonus.associate = ({ User }) => {
      Bonus.belongsTo(User, { constraints: true, foreignKeyConstraint: true })
    }
  
    return Bonus
  }
