import generalResponse from '../helpers/generalResponse.helper'
import { ObjectId } from 'mongodb'
import {
  createCustomer,
  deleteCustomer,
  findAllCustomer,
  findCustomer,
  updateCustomer
} from '../repositories/customer.repository'
import { getSelectParams } from '../helpers/generalHelper'
import Stripe from 'stripe'

export const addCustomerDetail = async (req, res) => {
  try {
    const { email } = req.body

    const isCustomerExists = await findCustomer({
      email,
      company: ObjectId(req.body.company)
    })
    if (isCustomerExists) {
      return generalResponse(res, false, { text: 'Customer Already Exists.' }, 'error', false, 400)
    }
    const stripe = new Stripe(process.env.STRIPE_API_KEY)
    const customer = await stripe.customers.create({
      name: `${req?.body?.firstName} ${req?.body?.lastName}`,
      email: req?.body?.email,
      phone: req?.body?.phone,
      address: { line1: req?.body?.address1 }
    })
    const newCustomer = await createCustomer({ ...req.body, stripe_customer_id: customer.id })
    return generalResponse(res, newCustomer, 'Customer created successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getCustomersDetails = async (req, res) => {
  try {
    const customers = await findAllCustomer(
      { company: ObjectId(req?.headers?.authorization?.company), ...req.query },
      getSelectParams(req)
    )
    return generalResponse(res, customers, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificCustomersDetails = async (req, res) => {
  try {
    const isCustomerExists = await findCustomer({
      _id: ObjectId(req.params.id),
      company: req?.headers?.authorization?.company
    })
    if (!isCustomerExists) {
      return generalResponse(res, false, { text: 'Customer Not Exists.' }, 'error', false, 400)
    }

    const customerDetail = await findCustomer(
      { _id: ObjectId(req.params.id), company: req?.headers?.authorization?.company },
      getSelectParams(req)
    )

    return generalResponse(res, customerDetail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteCustomerDetail = async (req, res) => {
  try {
    const isCustomerExists = await findCustomer({
      _id: ObjectId(req.params.id),
      company: req?.headers?.authorization?.company
    })
    if (!isCustomerExists) {
      return generalResponse(res, false, { text: 'Customer Not Exists.' }, 'error', false, 400)
    }

    await deleteCustomer({ _id: ObjectId(req.params.id), company: req?.headers?.authorization?.company })
    const stripe = new Stripe(process.env.STRIPE_API_KEY)

    if (isCustomerExists?.stripe_customer_id) {
      await stripe.customers.del(isCustomerExists.stripe_customer_id)
    }

    return generalResponse(res, null, 'Customer deleted successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateCustomerDetail = async (req, res) => {
  try {
    const isCustomerExists = await findCustomer({
      _id: ObjectId(req.params.id),
      company: ObjectId(req.body.company)
    })
    if (!isCustomerExists) {
      return generalResponse(res, false, { text: 'Customer Not Exists.' }, 'error', false, 400)
    }
    await updateCustomer({ _id: ObjectId(req.params.id), company: ObjectId(req.body.company) }, { ...req.body })

    const stripe = new Stripe(process.env.STRIPE_API_KEY)

    if (isCustomerExists?.stripe_customer_id) {
      await stripe.customers.update(isCustomerExists?.stripe_customer_id, {
        name: `${req?.body?.firstName} ${req?.body?.lastName}`,
        email: req?.body?.email,
        phone: req?.body?.phone,
        address: { line1: req?.body?.address1 }
      })
    }
    return generalResponse(res, null, 'Customer updated successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
