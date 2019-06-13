const fs = require('fs')
const models = require('../models/index')
const utils = require('../lib/utils')
const insecurity = require('../lib/insecurity')
const jade = require('jade')
const config = require('config')
const themes = require('../views/themes/themes').themes
const request = require('request');


module.exports = function getUserProfile () {
  return (req, res, next) => {
    fs.readFile('views/userProfile.jade', function (err, buf) {
      if (err) throw err
      const loggedInUser = insecurity.authenticatedUsers.get(req.cookies.token)
      if (loggedInUser) {
        models.User.findByPk(loggedInUser.data.id).then(user => {
          models.Reward.findOne({ where: { userId: loggedInUser.data.id } }).then(bonus => {

            let jadeTemplate = buf.toString()
            let username = user.dataValues.username
            let bonusBalance = bonus.amount
            if (username.match(/#\{(.*)\}/) !== null && !utils.disableOnContainerEnv()) {
              req.app.locals.abused_ssti_bug = true
              const code = username.substring(2, username.length - 1)
              try {
                eval(code)
              } catch (err) {
                username = '\\' + username
              }
            } else {
              username = '\\' + username
            }
            const theme = themes[config.get('application.theme')]
            jadeTemplate = jadeTemplate.replace(/_username_/g, username)
            jadeTemplate = jadeTemplate.replace(/_emailHash_/g, insecurity.hash(user.dataValues.email))
            jadeTemplate = jadeTemplate.replace(/_title_/g, config.get('application.name'))
            jadeTemplate = jadeTemplate.replace(/_favicon_/g, favicon())
            jadeTemplate = jadeTemplate.replace(/_bgColor_/g, theme.bgColor)
            jadeTemplate = jadeTemplate.replace(/_textColor_/g, theme.textColor)
            jadeTemplate = jadeTemplate.replace(/_navColor_/g, theme.navColor)
            jadeTemplate = jadeTemplate.replace(/_bonusHash_/g, bonusBalance)
            const fn = jade.compile(jadeTemplate)
            res.send(fn(user.dataValues))

          }).catch(error => {
            next(error)
          })
        }).catch(error => {
          next(error)
        })
      } else {
        next(new Error('Blocked illegal activity by ' + req.connection.remoteAddress))
      }
    })
  }

  function favicon () {
    let icon = config.get('application.favicon')
    icon = decodeURIComponent(icon.substring(icon.lastIndexOf('/') + 1))
    return icon
  }
}
