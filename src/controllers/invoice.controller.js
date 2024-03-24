/* eslint-disable camelcase */
// ==================== Packages =======================
import { ObjectId } from 'mongodb'
import path from 'path'
import ejs from 'ejs'
import moment from 'moment'
import Stripe from 'stripe'
// ====================================================
import { getSelectParams } from '../helpers/generalHelper'
import generalResponse from '../helpers/generalResponse.helper'
import {
  createInvoice,
  createPaymentLink,
  deleteInvoiceById,
  findAllInvoices,
  findInvoice,
  InactivePaymentLink,
  InactiveStripePrices,
  updateInvoiceById
} from '../repositories/invoice.repository'
import { findCustomer } from '../repositories/customer.repository'
import { sendMail } from '../services/send-grid'
import { findAllProduct } from '../repositories/product.repository'
import { findContact } from '../repositories/contact.repository'
import { updateGroupInfo } from '../helpers/contact.helper'
import { generateRandomString } from '../helpers/generateRandomString'
import { createBillingStatusHistory, getLatestBillingStatus } from '../repositories/billingStatusHistory.repository'
import { findUser } from '../repositories/users.repository'
import { decrypt, encrypt, errorMessage } from '../utils/utils'
import { invoiceCronJob, updateStripePaymentHistory } from './invoiceCronJob.controller'
import { getRecurringFrequency } from '../helpers/recurringHelper'
import { paymentStatus } from '../models/invoice'

export const getAllInvoices = async (req, res) => {
  try {
    const invoices = await findAllInvoices(
      { company: ObjectId(req?.headers?.authorization?.company), ...req.query },
      getSelectParams(req),
      [{ path: 'customer', ref: 'Customers' }]
    )
    generalResponse(res, invoices, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificInvoice = async (req, res) => {
  try {
    // if pass the slug then use slug otherwise use id
    const { id } = req.params
    const { slug, isPublicPage } = req.query

    if (!id) return generalResponse(res, false, { text: 'Invoice Id required.' }, 'error', false, 400)
    const invoice = await findInvoice(
      slug ? { slug: isPublicPage === 'true' ? decrypt(slug) : slug } : { _id: ObjectId(id) },
      getSelectParams(req),
      [
        { path: 'company' },
        { path: 'customer', ref: 'Contacts' },
        { path: 'productDetails.product', ref: 'Product' },
        { path: 'invoiceStatusActions.newGroupInfo.group.id', ref: 'Groups' },
        { path: 'invoiceStatusActions.newGroupInfo.status.id', ref: 'Status' },
        { path: 'invoiceStatusActions.newGroupInfo.category.id', ref: 'Category' },
        { path: 'invoiceStatusActions.newGroupInfo.tags.id', ref: 'Tags' },
        { path: 'invoiceStatusActions.newGroupInfo.pipelineDetails.pipeline.id', ref: 'Pipeline' }
      ]
    )
    if (invoice) {
      generalResponse(res, invoice, 'success')
    } else {
      return generalResponse(res, '', 'Your link invalid!', 'error', true, 200)
    }
  } catch (error) {
    return generalResponse(res, error, 'Your link invalid!', 'error', true, 200)
  }
}

export const sendTestInvoice = async (req, res) => {
  try {
    const { slug } = req.params
    const { receiverEmails } = req.body
    const invoice = await findInvoice(
      {
        slug
      },
      {
        id: 1,
        paymentOption: 1,
        invoiceId: 1,
        invoiceDate: 1,
        dueDate: 1,
        productDetails: 1,
        slug: 1
      },
      [
        { path: 'customer', ref: 'Customers' },
        { path: 'productDetails.product', ref: 'Product' }
      ]
    )

    if (!invoice) return generalResponse(res, false, { text: 'Invoice Not Found.' }, 'error', false, 400)
    // call helper
    sendAllInvoice({ invoice, receiverEmails })
    if (invoice.individualInvoice?.length) {
      invoice.forEach((individualInvoice) => {
        individualInvoice.status = paymentStatus.pending
      })
    }
    invoice.isInvoiceSent = true
    invoice.status = paymentStatus.pending
    await updateInvoiceById({ slug }, invoice)
    return generalResponse(res, null, 'Invoice sended successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getNewInvoiceId = async (req, res) => {
  try {
    const start = moment().startOf('day').toISOString()
    const end = moment().endOf('day').toISOString()

    // 20221121-001 ({year}{month}{day}-{number})

    // { createdAt: { $gte: start, $lt: end } }
    const allInvoice = await findAllInvoices({ createdAt: { $gte: start, $lt: end } })

    const date = moment().format('YYYYMMDD')
    let latestId = date + '-0001'
    if (allInvoice.length) {
      const lastInvoiceId = allInvoice[0].invoiceId
      const newId = parseInt(lastInvoiceId.split('-')[1]) + 1 || 1
      if (newId) latestId = moment().format('YYYYMMDD') + '-' + ('0000' + newId).slice(-4)
    }

    generalResponse(res, { latestInvoiceId: latestId }, 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const addInvoice = async (req, res, next) => {
  try {
    const { customer: customerId, productDetails } = req.body
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    if (!req?.headers?.authorization?.company) {
      return generalResponse(res, false, { text: 'Something went wrong! Login again.' }, 'error', false, 400)
    }

    let customer = null
    if (customerId) {
      customer = await findContact({
        _id: ObjectId(customerId),
        company: req.headers.authorization?.company
      })
    }
    productDetails.forEach((product) => {
      if (product.productType === 'recurring') {
        product.reccuringDetails.rrule = getRecurringFrequency(product.reccuringDetails)
      }
    })

    if (!productDetails || !Array.isArray(productDetails) || !productDetails?.length) {
      return generalResponse(res, false, { text: 'Product details required.' }, 'error', false, 400)
    }

    let createObj = { ...req.body }

    const onlineProds = productDetails.filter((p) => p.paymentOption === 'Online')
    const offlineProds = productDetails.filter((p) => p.paymentOption === 'Offline')

    /* Create Links from online product */
    const { newProductDetails: newOnlineProds } = await createPaymentLink(
      onlineProds,
      customer,
      req.headers.authorization?.company,
      req.body?.invoiceId
    )

    createObj = { ...createObj, productDetails: [...offlineProds, ...newOnlineProds], slug: generateRandomString(12) }

    const newInvoice = await createInvoice(createObj)

    /* Update group related to Invoice Status Actions */
    if (req.body.invoiceStatusActions?.length) {
      const invoiceAction = req.body.invoiceStatusActions.find((q) => q.status === newInvoice.status)
      if (invoiceAction && invoiceAction?.newGroupInfo?.group) {
        await updateGroupInfo({
          currentUserId: currentUser._id,
          contactId: customerId,
          groupInfo: {
            group: invoiceAction.newGroupInfo.group,
            status: invoiceAction.newGroupInfo.status,
            category: invoiceAction.newGroupInfo.category,
            tags: invoiceAction.newGroupInfo.tags,
            pipelineDetails: invoiceAction.newGroupInfo.pipelineDetails
          }
        })
      }
    }

    return generalResponse(res, newInvoice, 'Invoice created successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, errorMessage(error), '', 'error', false, 400)
  }
}

export const cloneInvoice = async (req, res, next) => {
  try {
    const { id } = req.params
    const invoiceData = await findInvoice({ _id: id }, {})
    if (invoiceData && (invoiceData.status === paymentStatus.draft || invoiceData.status === paymentStatus.pending)) {
      if (invoiceData && moment(invoiceData.dueDate) < moment()) {
        return generalResponse(res, false, { text: "Expired invoice can't be clone" }, 'error', false, 400)
      }
      const { productDetails } = invoiceData
      let customer = null
      if (invoiceData.customer) {
        customer = await findContact({
          _id: ObjectId(invoiceData.customer),
          company: req.headers.authorization?.company
        }).select({ _id: true })
      } else {
        throw new Error('Something went wrong!')
      }

      const onlineProds = productDetails.filter((p) => p.paymentOption === 'Online')
      const offlineProds = productDetails.filter((p) => p.paymentOption === 'Offline')
      delete invoiceData._id

      const start = moment().startOf('day').toISOString()
      const end = moment().endOf('day').toISOString()

      const allInvoice = await findAllInvoices({ createdAt: { $gte: start, $lt: end } })

      const date = moment().format('YYYYMMDD')
      let latestId = date + '-0001'
      if (allInvoice.length) {
        const lastInvoiceId = allInvoice[0].invoiceId
        const newId = parseInt(lastInvoiceId.split('-')[1]) + 1 || 1
        if (newId) latestId = moment().format('YYYYMMDD') + '-' + ('0000' + newId).slice(-4)
      }

      invoiceData.invoiceId = latestId

      // /* Create Links from online product */
      const { newProductDetails: newOnlineProds } = await createPaymentLink(
        onlineProds,
        customer,
        req.headers.authorization?.company
      )

      const cloveInvoiceData = await createInvoice({
        ...invoiceData,
        customer: customer._id ? customer._id : null,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        invoiceId: invoiceData.invoiceId,
        company: req.headers.authorization?.company,
        productDetails: [...offlineProds, ...newOnlineProds]
      })

      return generalResponse(
        res,
        { cloveInvoiceData, onlineProds, newOnlineProds, offlineProds },
        'Clone invoice successfully!',
        'success',
        true
      )
    } else {
      throw new Error('Something went wrong!')
    }
  } catch (error) {
    return generalResponse(res, error?.message ? error?.message : error, '', 'error', false, 400)
  }
}

export const saveAndSendInvoice = async (req, res, next) => {
  try {
    const { customer: customerId, productDetails } = req.body

    if (!req.headers.authorization?.company) {
      return generalResponse(res, false, { text: 'Something went wrong! Login again.' }, 'error', false, 400)
    }

    let customer = null
    if (customerId) {
      customer = await findCustomer({
        _id: ObjectId(customerId),
        company: req.headers.authorization?.company
      })
    }

    if (!productDetails || !Array.isArray(productDetails) || !productDetails?.length) {
      return generalResponse(res, false, { text: 'Product details required.' }, 'error', false, 400)
    }

    // const productIds = productDetails.map((p) => ObjectId(p.product))
    // const allProducts = await findAllProduct({ _id: { $in: [productIds] } })
    // const productIds = productDetails.map((p) => ObjectId(p.product))
    const allProducts = await findAllProduct({ _id: { $in: ['638901a1d9666b0fb2decf7f', '63890189d9666b0fb2decf76'] } })

    const createObj = { ...req.body }

    // const recurringProducts = allProducts.filter((p) => p.type === 'recurring')
    const oneTimeProducts = allProducts.filter((p) => p.type === 'one-time')

    const newInvoice = await createInvoice(createObj)

    /* Offline Payment */
    await Promise.all([
      ...oneTimeProducts.map(async (productObj) => {
        const existProduct = productDetails.find((p) => p.product.toString() === productObj._id.toString())

        let paymentLink = ''
        let products = [existProduct]
        if (existProduct.paymentType === 'online' && existProduct.paymentMethod === 'Manual') {
          const { paymentLink: newLink, newProductDetails } = await createPaymentLink(
            [existProduct],
            customer,
            req.headers.authorization?.company
          )
          paymentLink = newLink.payment_link
          products = newProductDetails
        }

        const __dirname = path.resolve()
        const body = await ejs.renderFile(path.join(__dirname, '/src/views/invoiceTemplate.ejs'), {
          viewInvoiceLink: `${process.env.HOST_NAME}/invoice/preview/${encrypt(newInvoice.slug)}`,
          paymentLink,
          fullName: `${customer.firstName ?? ''} ${customer.lastName ?? ''}`,
          invoiceId: newInvoice.id,
          invoiceDate: moment(new Date(req.body.invoiceDate)).utc().format('Do MMM YYYY'),
          dueDate: moment(new Date(req.body.dueDate)).utc().format('Do MMM YYYY'),
          totalPrice: existProduct.price * existProduct.quantity,
          products
        })
        sendMail({ receiver: customer.email, subject: 'Invoice', htmlBody: body })
      })
    ])

    return generalResponse(res, newInvoice, 'Invoice created successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params
    const { customer: customerId, productDetails } = req.body
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    if (!id) return generalResponse(res, false, { text: 'Invoice Id required.' }, 'error', false, 400)

    if (!req.headers.authorization?.company) {
      return generalResponse(res, false, { text: 'Something went wrong! Login again.' }, 'error', false, 400)
    }

    if (!productDetails || !Array.isArray(productDetails) || !productDetails?.length) {
      return generalResponse(res, false, { text: 'Product details required.' }, 'error', false, 400)
    }

    const invoice = await findInvoice({
      _id: ObjectId(id),
      company: req.headers.authorization.company
    })

    if (!invoice) return generalResponse(res, false, { text: 'Invoice Not Found.' }, 'error', false, 400)

    let customer = null
    const { productDetails: oldInvoiceProducts } = invoice

    if (customerId) {
      customer = await findContact({
        _id: ObjectId(customerId),
        company: req.headers.authorization?.company
      })
    }

    let updateObj = { ...req.body }

    const onlineProds = productDetails.filter((p) => p.paymentOption === 'Online')
    const offlineProds = productDetails.filter((p) => p.paymentOption === 'Offline')

    const oldOnlineProds = oldInvoiceProducts.filter((p) => p.paymentOption === 'Online')
    if (oldOnlineProds.length) {
      await InactiveStripePrices(oldOnlineProds)
      await InactivePaymentLink(oldOnlineProds)
    }

    /* Create Links from online product */
    const { newProductDetails: newOnlineProds } = await createPaymentLink(
      onlineProds,
      customer,
      req.headers.authorization?.company
    )

    updateObj = { ...req.body, productDetails: [...offlineProds, ...newOnlineProds] }

    await updateInvoiceById({ _id: ObjectId(id), company: ObjectId(req.headers.authorization.company) }, updateObj)

    /* Update group related to Invoice Status Actions */
    if (req.body.invoiceStatusActions?.length) {
      const invoiceAction = req.body.invoiceStatusActions.find((q) => q.status === req.body.status)
      if (invoiceAction && invoiceAction?.newGroupInfo?.group) {
        await updateGroupInfo({
          currentUserId: currentUser._id,
          contactId: customerId,
          groupInfo: {
            group: invoiceAction.newGroupInfo.group,
            status: invoiceAction.newGroupInfo.status,
            category: invoiceAction.newGroupInfo.category,
            tags: invoiceAction.newGroupInfo.tags,
            pipelineDetails: invoiceAction.newGroupInfo.pipelineDetails
          }
        })
      }
    }

    generalResponse(res, null, 'Invoice updated successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, note = null, companyId } = req.body
    let currentUserId = req.body.currentUserId
    const currentUser = req.headers.authorization

    if (!currentUserId) {
      const companyAdmin = await findUser({ company: companyId, role: 'admin' }, { select: { _id: 1 } })
      currentUserId = companyAdmin._id
    }

    if (!id) return generalResponse(res, false, { text: 'Invoice Id required.' }, 'error', false, 400)

    if (!currentUserId) {
      return generalResponse(res, false, { text: 'Something went wrong! Login again.' }, 'error', false, 400)
    }

    const invoice = await findInvoice({
      _id: ObjectId(id),
      company: ObjectId(companyId)
    })

    if (!invoice) return generalResponse(res, false, { text: 'Invoice Not Found.' }, 'error', false, 400)

    let customer = invoice.customer

    if (customer) {
      customer = await findContact({
        _id: ObjectId(customer),
        company: ObjectId(companyId)
      })
    }

    const topBillingHistory = await getLatestBillingStatus({
      recordRelationId: id,
      type: 'Invoice'
    })

    if (!topBillingHistory || (topBillingHistory && topBillingHistory.status !== status)) {
      // add status history in history model
      const statusHistoryResult = await createBillingStatusHistory({
        recordRelationId: id,
        type: 'Invoice',
        status,
        company: currentUser.company
      })
      const updateObj = {
        status,
        notes: [
          ...invoice?.notes,
          { text: note, status, statusHistoryId: statusHistoryResult._id, createdAt: new Date() }
        ]
      }
      if (note) {
        await updateInvoiceById({ _id: ObjectId(id), company: ObjectId(companyId) }, updateObj)
      }
      /* Update group related to Invoice Status Actions */
      if (invoice.invoiceStatusActions?.length) {
        const invoiceAction = invoice.invoiceStatusActions.find((q) => q.status === status)

        if (invoiceAction && invoiceAction?.newGroupInfo?.group) {
          await updateGroupInfo({
            currentUserId,
            contactId: customer,
            groupInfo: {
              group: invoiceAction.newGroupInfo.group,
              status: invoiceAction.newGroupInfo.status,
              category: invoiceAction.newGroupInfo.category,
              tags: invoiceAction.newGroupInfo.tags,
              pipelineDetails: invoiceAction.newGroupInfo.pipelineDetails
            }
          })
        }
      }
      generalResponse(
        res,
        { statusHistoryResult: statusHistoryResult, notes: updateObj.notes },
        'Invoice updated successfully!',
        'success',
        true
      )
    } else {
      const updateObj = {
        status,
        notes: [
          ...invoice?.notes,
          { text: note, status: status, statusHistoryId: topBillingHistory._id, createdAt: new Date() }
        ]
      }
      if (note) {
        await updateInvoiceById({ _id: ObjectId(id), company: ObjectId(companyId) }, updateObj)
      }
      return generalResponse(res, updateObj.notes, 'Note updated successfully!', 'success', true)
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return generalResponse(res, false, { text: 'Invoice Id required.' }, 'error', false, 400)

    const invoice = await findInvoice({
      _id: ObjectId(id),
      company: req?.headers?.authorization?.company
    })

    if (!invoice) return generalResponse(res, false, { text: 'Invoice Not Found.' }, 'error', false, 400)

    const { productDetails, oldInvoicePaymentLink } = invoice
    await InactiveStripePrices(productDetails)
    await InactivePaymentLink(oldInvoicePaymentLink.payment_id)

    await deleteInvoiceById({ _id: ObjectId(id), company: req?.headers?.authorization?.company })

    generalResponse(res, null, 'Invoice deleted successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

const sendAllInvoice = async ({ invoice, receiverEmails = false }) => {
  const __dirname = path.resolve()

  if (invoice.productDetails.length) {
    await Promise.all([
      ...invoice.productDetails.map(async (invoiceDetail) => {
        console.log(encrypt(invoice.slug))

        console.log(decrypt(encrypt(invoice.slug)))

        if (!invoiceDetail?.installments?.length) {
          const body = await ejs.renderFile(path.join(__dirname, '/src/views/invoiceTemplate.ejs'), {
            viewInvoiceLink: `${process.env.HOST_NAME}/invoice/preview/${encrypt(invoice.slug)}`,
            paymentLink: invoice.paymentOption === 'Online' ? invoiceDetail.stripe_payment_link?.url : '',
            fullName: `${invoice?.customer.firstName ?? ''} ${invoice?.customer.lastName ?? ''}`,
            invoiceId: invoice.invoiceId,
            invoiceDate: moment(new Date(invoice.invoiceDate)).utc().format('Do MMM YYYY'),
            dueDate: moment(new Date(invoice.dueDate)).utc().format('Do MMM YYYY'),
            totalPrice: invoiceDetail.quantity * invoiceDetail.price,
            products: [invoiceDetail]
          })
          sendMail({
            receiver: receiverEmails || invoice.customer.email,
            subject: 'Invoice',
            htmlBody: body
          })
        }
      })
    ])
  }
}

export const sendInvoice = async (req, res) => {
  try {
    const { slug } = req.params
    const invoice = await findInvoice(
      {
        slug
      },
      {
        id: 1,
        paymentOption: 1,
        invoiceId: 1,
        invoiceDate: 1,
        dueDate: 1,
        productDetails: 1,
        slug: 1
      },
      [
        { path: 'customer', ref: 'Customers' },
        { path: 'productDetails.product', ref: 'Product' }
      ]
    )

    console.log({ invoice })

    if (!invoice) return generalResponse(res, false, { text: 'Invoice Not Found.' }, 'error', false, 400)
    // call helper
    sendAllInvoice({ invoice })
    if (invoice.individualInvoice?.length) {
      invoice.forEach((individualInvoice) => {
        individualInvoice.status = paymentStatus.pending
      })
    }
    invoice.isInvoiceSent = true
    invoice.status = paymentStatus.pending
    await updateInvoiceById({ slug }, invoice)
    return generalResponse(res, null, 'Invoice Send Successfully.', 'success', true)
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const addInvoiceAsDraft = async (req, res) => {
  try {
    const { customer: customerId, productDetails } = req.body

    let customer = null
    if (customerId) {
      customer = await findCustomer({
        _id: ObjectId(customerId),
        company: req.headers.authorization?.company
      })
    }

    if (!productDetails || !Array.isArray(productDetails) || !productDetails?.length) {
      return generalResponse(res, false, { text: 'Product details required.' }, 'error', false, 400)
    }

    const createObj = { ...req.body, customer }

    const newInvoice = await createInvoice(createObj)

    return generalResponse(res, newInvoice, 'Invoice created successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateStripInvoiceStatus = async (req, res) => {
  // const response = {
  //   id: 'cs_test_a1w6MKClB0pHCVZVlRnv7Zbq8iv8CRMY04DIBndilZ1VKHWw8AypknjFuB',
  //   object: 'checkout.session',
  //   after_expiration: null,
  //   allow_promotion_codes: false,
  //   amount_subtotal: 12000,
  //   amount_total: 12000,
  //   automatic_tax: { enabled: false, status: null },
  //   billing_address_collection: 'auto',
  //   cancel_url: 'https://stripe.com',
  //   client_reference_id: null,
  //   consent: null,
  //   consent_collection: null,
  //   created: 1675190660,
  //   currency: 'usd',
  //   custom_text: { shipping_address: null, submit: null },
  //   customer: null,
  //   customer_creation: 'if_required',
  //   customer_details: {
  //     address: {
  //       city: 'New City',
  //       country: 'US',
  //       line1: 'fdfv d fdvdfv',
  //       line2: 'jnjkadsnckjs njskdnckj',
  //       postal_code: '36400',
  //       state: 'AL'
  //     },
  //     email: 'btdeveloper7@gmail.com',
  //     name: 'Test User',
  //     phone: null,
  //     tax_exempt: 'none',
  //     tax_ids: []
  //   },
  //   customer_email: null,
  //   expires_at: 1675277060,
  //   invoice: null,
  //   invoice_creation: {
  //     enabled: false,
  //     invoice_data: {
  //       account_tax_ids: null,
  //       custom_fields: null,
  //       description: null,
  //       footer: null,
  //       metadata: {},
  //       rendering_options: null
  //     }
  //   },
  //   livemode: false,
  //   locale: 'auto',
  //   metadata: {
  //     invoice: '20230201-0002',
  //     product: '63c9904972cfe7b49a8de1b3',
  //     customer: '639a276b8bf08bf33c081a6f'
  //   },
  //   mode: 'payment',
  //   payment_intent: 'pi_3MWOorSC5GAVp5ZC11xqtPd9',
  //   payment_link: 'plink_1MWOm7SC5GAVp5ZC8EWUUJz9',
  //   payment_method_collection: 'always',
  //   payment_method_options: {},
  //   payment_method_types: ['card'],
  //   payment_status: 'paid',
  //   phone_number_collection: { enabled: false },
  //   recovered_from: null,
  //   setup_intent: null,
  //   shipping_address_collection: null,
  //   shipping_cost: null,
  //   shipping_details: null,
  //   shipping_options: [],
  //   status: 'complete',
  //   submit_type: 'auto',
  //   subscription: null,
  //   success_url: 'https://stripe.com',
  //   total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 0 },
  //   url: null
  // }
  // await updateStripePaymentHistory(response)
  return { status: 'Done' }
}
export const handleInvoiceStatus = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature']
    const stripe = new Stripe(process.env.STRIPE_API_KEY)

    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      'whsec_c1fd7484cc92515a90e9570b9b983d0e45ef33f26fb84be7cc51598c16168f17'
    )
    switch (event.type) {
      case 'checkout.session.completed': {
        const paymentIntent = event.data.object
        console.log('CHECKOUT SUCCEEDED', paymentIntent)

        const { payment_link: paymentLinkId, payment_status: paymentStatus } = paymentIntent

        const status = paymentStatus === 'paid' ? 'Paid' : 'Cancelled'

        console.log({ paymentLinkId, status })

        await updateStripePaymentHistory(paymentIntent)
        // await InactivePaymentLink(paymentLinkId)
        // await updateInvoiceProductStatusByPaymentId(paymentLinkId, { status })

        break
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        console.log('SUCCEEDED', paymentIntent)
        break
      }
      case 'payment_intent.canceled':
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        console.log('PAYMENT Failed', paymentIntent)
        break
      }

      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`)
    }
  } catch (error) {
    console.log('error', error?.message ? error?.message : error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const TestSendInvoice = async (req, res) => {
  try {
    // yearly, monthly, weekly
    // const { productDetails } = req.body
    // productDetails.map((product) => {
    //   // console.log({ product })
    //   if (product.productType === 'recurring') {
    //     console.log({ rule: getRecurringFrequency(product.reccuringDetails) })
    //     // rule.toString()
    //   }
    // })
    await invoiceCronJob()
    return generalResponse(res, null, 'Invoice created successfully!', 'success', true)
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

// console.log(
//   'ttt : ',
//   invoice?.sendInvoiceBefore,
//   ' : ',
//   moment().add(invoice?.sendInvoiceBefore, 'day'),
//   ' : ',
//   moment().add(invoice?.sendInvoiceBefore),
//   ' : ',
//   moment(installment.dueDate).isSame(moment().add(invoice?.sendInvoiceBefore, 'day'), 'day')
//   // ' : ',
//   // moment(installment.dueDate).isSameOrBefore(moment(), 'day')
//   // ' : ',
//   // moment(),
//   // ' : ',
//   // new Date(installment.dueDate) === new Date(installment.dueDate)
// )

// export const TestSendInvoice = async (req, res) => {
//   try {
//     const invoiceDetails = await Invoices.aggregate([
//       {
//         $match: {
//           status: 'Pending',
//           deleted: false,
//           paymentOption: 'Online',
//           'productDetails.paymentMode': 'Manual',
//           'productDetails.paymentType': 'installment',
//           dueDate: {
//             $gte: new Date()
//           },
//           'productDetails.installments.dueDate': {
//             $gte: new Date(moment()),
//             $lte: new Date(moment().add(4, 'days'))
//           }
//         }
//       },
//       {
//         $lookup: {
//           from: 'companies',
//           localField: 'company',
//           foreignField: '_id',
//           as: 'company'
//         }
//       }
//     ])

//     invoiceDetails.forEach((invoice) => {
//       if (invoice.status === 'Pending' && invoice.productDetails.length) {
//         invoice.productDetails.forEach((product) => {
//           if (product.paymentMode === 'Manual' && product.paymentType === 'installment') {
//             product.installments.forEach((installment) => {
//               let isSendInvoice = false
//               if (invoice?.sendInvoiceBefore) {
//                 // Send invoice before how many days.
//                 if (
//                   moment(installment.dueDate).isSame(moment().add(invoice?.sendInvoiceBefore, 'day'), 'day') &&
//                   !installment.stripe_price_id &&
//                   !installment.stripe_payment_link
//                 ) {
//                   // NOTE : in case invoice have "sendInvoiceBefore".
//                   // 1. generate price in stripe
//                   // 2. generate payment link
//                   // 3. Send link or invoice to customer
//                   // 4. And update stripe_price_id and stripe_payment_link in installment object.
//                   // Generate Price and Payment link and send mail to customer
//                 }
//               } else {
//                 if (
//                   moment(installment.dueDate).isSame(moment().add(1, 'day'), 'day') &&
//                   !installment.stripe_price_id &&
//                   !installment.stripe_payment_link
//                 ) {
//                   // NOTE : in case invoice don't have "sendInvoiceBefore".
//                   // 1. generate price in stripe
//                   // 2. generate payment link
//                   // 3. Send link or invoice to customer

//                   isSendInvoice = true
//                 }
//               }

//               if (
//                 !isSendInvoice && // If invoice not contain sendInvoiceBefore but it contains sendInvoiceOnDueDate so that we need to check is it send on first else block
//                 invoice?.sendInvoiceOnDueDate &&
//                 moment(installment.dueDate).isSame(moment().add(1, 'day'), 'day')
//               ) {
//                 // Send invoice on due date
//                 if (!installment.stripe_price_id && !installment.stripe_payment_link) {
//                   // 1. generate price in stripe
//                   // 2. generate payment link
//                 }
//                 // 3. Send link or invoice to customer
//               }
//             })
//           }
//         })
//       }
//     })
//     // console.log({ invoiceDetails })

//     // console.log(moment().add(4, 'days'), new Date(moment()))
//     return generalResponse(res, null, 'Invoice created successfully!', 'success', true)
//   } catch (error) {
//     return generalResponse(res, error, '', 'error', false, 400)
//   }
// }findQuote
