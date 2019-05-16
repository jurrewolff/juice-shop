const utils = require('../lib/utils')
const insecurity = require('../lib/insecurity')
const models = require('../models/index')
const challenges = require('../data/datacache').challenges

module.exports = function retrieveBonus () {
  return (req, res, next) => {
    const id = req.params.id
    models.Bonus.findOne({ where: {UserId: id } })
      .then(bonus => {
        res.json(utils.queryResultToJson(bonus))
      }).catch(error => {
        next(error)
      })
  }
}
