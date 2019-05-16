const path = require('path')
const fs = require('fs')
const PDFDocument = require('pdfkit')
const utils = require('../lib/utils')
const insecurity = require('../lib/insecurity')
const models = require('../models/index')
const products = require('../data/datacache').products
const challenges = require('../data/datacache').challenges
const config = require('config')
const db = require('../data/mongodb')

module.exports = function placeOrder () {
  return (req, res, next) => {
    const id = req.params.id
    models.Basket.findOne({ where: { id }, include: [ { model: models.Product, paranoid: false } ] })
      .then(basket => {
        if (basket) {
          const customer = insecurity.authenticatedUsers.from(req)
          const email = customer ? customer.data ? customer.data.email : '' : ''
          const orderId = insecurity.hash(email).slice(0, 4) + '-' + utils.randomHexString(16)
          const pdfFile = 'order_' + orderId + '.pdf'
          const doc = new PDFDocument()
          const date = new Date().toJSON().slice(0, 10)
          const fileWriter = doc.pipe(fs.createWriteStream(path.join(__dirname, '../ftp/', pdfFile)))

          doc.font('Times-Roman', 40).text(config.get('application.name'), { align: 'center' })
          doc.moveTo(70, 115).lineTo(540, 115).stroke()
          doc.moveTo(70, 120).lineTo(540, 120).stroke()
          doc.fontSize(20).moveDown()
          doc.font('Times-Roman', 20).text('Order Confirmation', { align: 'center' })
          doc.fontSize(20).moveDown()
          doc.font('Times-Roman', 15).text('Customer: ' + email, { align: 'left' })
          doc.font('Times-Roman', 15).text('Order #: ' + orderId, { align: 'left' })
          doc.moveDown()
          doc.font('Times-Roman', 15).text('Date: ' + date, { align: 'left' })
          doc.moveDown()
          doc.moveDown()
          let totalPrice = 0
          let basketProducts = []
          let totalPoints = 0
          let itemBonus = 0;
          let usedPoints =12;
          
          basket.Products.forEach(({ BasketItem, price, name }) => {
            if (utils.notSolved(challenges.christmasSpecialChallenge) && BasketItem.ProductId === products.christmasSpecial.id) {
              utils.solve(challenges.christmasSpecialChallenge)
            }

            const itemTotal = price * BasketItem.quantity
            // const itemBonus = Math.round(price / 10) * BasketItem.quantity
            const product = { quantity: BasketItem.quantity,
              name: name,
              price: price,
              total: itemTotal,
              bonus: itemBonus
            }
            basketProducts.push(product)
            doc.text(BasketItem.quantity + 'x ' + name + ' ea. ' + price + ' = ' + itemTotal)
            doc.moveDown()
            totalPrice += itemTotal
            // totalPoints += itemBonus
          })

          //Gebruikte Bonuspunten
            //Elk bonuspunt is 0.5 currency, maximaal 25% van de bestelling 
            //De bonuspunten die je krijgt na de bestelling zijn 10% van het gehele bedrag
            // itemBonus wordt berekend door een fucntion
            if (usedPoints>0) {
              const pointsCurrency = (usedPoints*0.5).toFixed(2);
              const pointsPercentage = ((pointsCurrency/totalPrice)*100).toFixed(1);

              doc.text("The " + usedPoints + " bonus points are equal to a " + pointsPercentage + "% discount");
              doc.moveDown;

              

              doc.moveDown();
              doc.text("" + totalPrice + " - " + pointsPercentage + "% = " + (totalPrice - pointsCurrency));
              doc.moveDown;

              totalPrice = (totalPrice - pointsCurrency);

              itemBonus = Math.round(totalPrice *0.1);

            }

          doc.moveDown()
          const discount = calculateApplicableDiscount(basket, req)
          if (discount > 0) {
            const discountAmount = (totalPrice * (discount / 100)).toFixed(2)
            doc.text(discount + '% discount from coupon: -' + discountAmount)
            doc.moveDown()
            totalPrice -= discountAmount
          }
          doc.font('Helvetica-Bold', 20).text('Total Price: ' + totalPrice.toFixed(2))
          doc.moveDown()
          doc.font('Helvetica-Bold', 15).text('Bonus Points Earned: ' + itemBonus)
          doc.font('Times-Roman', 15).text('(You will be able to these points for amazing bonuses in the future!)')
          doc.moveDown()
          doc.moveDown()
          doc.font('Times-Roman', 15).text('Thank you for your order!')
          doc.end()

          if (utils.notSolved(challenges.negativeOrderChallenge) && totalPrice < 0) {
            utils.solve(challenges.negativeOrderChallenge)
          }

          db.orders.insert({
            orderId: orderId,
            email: (email ? email.replace(/[aeiou]/gi, '*') : undefined),
            totalPrice: totalPrice,
            products: basketProducts,
            bonus: totalPoints,
            eta: Math.floor((Math.random() * 5) + 1).toString()
          })

          fileWriter.on('finish', () => {
            basket.update({ coupon: null })
            models.BasketItem.destroy({ where: { BasketId: id } })
            res.json({ orderConfirmation: '/ftp/' + pdfFile })
          })
        } else {
          next(new Error('Basket with id=' + id + ' does not exist.'))
        }
      }).catch(error => {
        next(error)
      })
  }
}

function calculateApplicableDiscount (basket, req) {
  if (insecurity.discountFromCoupon(basket.coupon)) {
    let discount = insecurity.discountFromCoupon(basket.coupon)
    if (utils.notSolved(challenges.forgedCouponChallenge) && discount >= 80) {
      utils.solve(challenges.forgedCouponChallenge)
    }
    return discount
  } else if (req.body.couponData) {
    const couponData = Buffer.from(req.body.couponData, 'base64').toString().split('-')
    const couponCode = couponData[0]
    const couponDate = couponData[1]
    const campaign = campaigns[couponCode]
    if (campaign && couponDate == campaign.validOn) { // eslint-disable-line eqeqeq
      if (utils.notSolved(challenges.manipulateClockChallenge)) { // FIXME check if coupon is actually expired
        utils.solve(challenges.manipulateClockChallenge)
      }
      return campaign.discount
    }
  }
  return 0
}

const campaigns = {
  WMNSDY2019: { validOn: new Date('Mar 08, 2019').getTime(), discount: 75 }
}