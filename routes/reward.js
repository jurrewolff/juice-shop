const models = require('../models/index')

module.exports = function points () {
  return ({ params }, res, next) => {
    const id = params.id
    let points = params.points //? decodeURIComponent(params.points) : undefined
    models.Basket.findByPk(id).then(basket => {
      if (basket) {
        basket.update({ appliedPoints: points })
        res.json({ points })
      } else {
        next(new Error('Could not update reward points with id: ' + id))
      }
    }).catch(error => {
      next(error)
    })
  }
}