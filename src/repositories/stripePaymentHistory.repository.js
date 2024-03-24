import { stripePaymentHistory } from '../models/stripePaymentHistory'

const findStripePaymentHistory = (params) => {
  return stripePaymentHistory.findOne(params)
}

const findAllStripePaymentHistory = (params) => {
  return stripePaymentHistory.find(params).sort({ createdAt: -1 })
}

const createStripePaymentHistory = (data) => {
  return stripePaymentHistory.create(data)
}

const updateStripePaymentHistory = (search, updateValue) => {
  return stripePaymentHistory.updateOne(search, updateValue)
}

const deleteStripePaymentHistory = (status) => {
  return stripePaymentHistory.delete(status)
}

export {
  createStripePaymentHistory,
  findStripePaymentHistory,
  findAllStripePaymentHistory,
  updateStripePaymentHistory,
  deleteStripePaymentHistory
}
