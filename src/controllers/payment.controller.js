// ==================== Packages =======================
import Stripe from 'stripe'
import { ObjectId } from 'mongodb'
// ====================================================
import generalResponse from '../helpers/generalResponse.helper'
import {
  createPaymentMethod,
  deletePaymentMethodsRepo,
  getPaymentMethodByContactId,
  updatePaymentMethod
} from '../repositories/paymentMethod.repository'

export const addPaymentMethod = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const { name, address, paymentMethodId, contact, brand, cardLast4DigitNo, expMonth, expYear, billingCustomerId } =
      req.body
    const stripe = new Stripe(process.env.STRIPE_API_KEY)
    await stripe.paymentMethods.attach(paymentMethodId, { customer: billingCustomerId })

    const result = await createPaymentMethod({
      name,
      brand,
      contact,
      paymentMethodId,
      cardLast4DigitNo,
      expMonth,
      expYear,
      address: address || '',
      company: currentUser.company
    })
    return generalResponse(res, result, 'Payment method created successfully.', 'success', true)
  } catch (error) {
    return generalResponse(res, error?.message ? error?.message : error, '', 'error', false, 400)
  }
}

export const getPaymentMethodsByContactId = async (req, res) => {
  try {
    const { id } = req.params
    const result = await getPaymentMethodByContactId({
      id
    })
    return generalResponse(res, result)
  } catch (error) {
    return generalResponse(res, error?.message ? error?.message : error, '', 'error', false, 400)
  }
}

export const deletePaymentMethods = async (req, res) => {
  try {
    const { ids } = req.query
    const stripe = new Stripe(process.env.STRIPE_API_KEY)
    await Promise.all(ids.map((id) => stripe.paymentMethods.detach(id)))
    const result = await deletePaymentMethodsRepo({
      ids
    })
    return generalResponse(res, result, 'Payment method removed successfully.', 'success', true)
  } catch (error) {
    return generalResponse(res, error?.message ? error?.message : error, '', 'error', false, 400)
  }
}

export const makeDefaultPaymentMethod = async (req, res) => {
  try {
    const { id, contact } = req.body

    await updatePaymentMethod(
      {
        contact: ObjectId(contact),
        isDefault: true
      },
      { isDefault: false }
    )

    const result = await updatePaymentMethod(
      {
        _id: id
      },
      { isDefault: true }
    )
    return generalResponse(res, result, 'Payment method made default successfully.', 'success', true)
  } catch (error) {
    return generalResponse(res, error?.message ? error?.message : error, '', 'error', false, 400)
  }
}
