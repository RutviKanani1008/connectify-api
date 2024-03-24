// ==================== Packages =======================
import path from 'path'
import ejs from 'ejs'
import moment from 'moment'
import { ObjectId } from 'mongodb'
// ====================================================
import {
  convertToInvoice,
  createQuote,
  deleteQuoteById,
  findAllQuotes,
  findQuote,
  updateQuoteById
} from '../repositories/quote.repository'
import { getSelectParams } from '../helpers/generalHelper'
import generalResponse from '../helpers/generalResponse.helper'
import { sendMail } from '../services/send-grid'
import { decrypt, encrypt, getRRuleFromReccuringDetails } from '../utils/utils'
import { createBillingContact, findContact, updateContactAPI } from '../repositories/contact.repository'
import { updateGroupInfo } from '../helpers/contact.helper'
import { generateRandomString } from '../helpers/generateRandomString'
import { createBillingStatusHistory, getLatestBillingStatus } from '../repositories/billingStatusHistory.repository'
import { findUser } from '../repositories/users.repository'
import { createInvoice } from '../repositories/invoice.repository'
import { getRecurringFrequency } from '../helpers/recurringHelper'
import { paymentStatus } from '../models/invoice'

export const getAllQuotes = async (req, res) => {
  try {
    const quotes = await findAllQuotes(
      { company: ObjectId(req?.headers?.authorization?.company), ...req.query },
      getSelectParams(req),
      [
        { path: 'customer', ref: 'Customers' },
        { path: 'productDetails.product', ref: 'Product' }
      ]
    )
    generalResponse(res, quotes, 'Quotes Fetched Successfully.', 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificQuote = async (req, res) => {
  try {
    // if pass the slug then use slug otherwise use id
    const { id } = req.params
    const { slug, isPublicPage } = req.query

    if (!id) return generalResponse(res, false, { text: 'Quote Id required.' }, 'error', false, 400)
    const quote = await findQuote(
      slug ? { slug: isPublicPage === 'true' ? decrypt(slug) : slug } : { _id: ObjectId(id) },
      getSelectParams(req),
      [
        { path: 'company' },
        { path: 'customer', ref: 'Contacts' },
        { path: 'productDetails.product', ref: 'Product' },
        { path: 'quoteStatusActions.newGroupInfo.group.id', ref: 'Groups' },
        { path: 'quoteStatusActions.newGroupInfo.status.id', ref: 'Status' },
        { path: 'quoteStatusActions.newGroupInfo.category.id', ref: 'Category' },
        { path: 'quoteStatusActions.newGroupInfo.tags.id', ref: 'Tags' },
        { path: 'quoteStatusActions.newGroupInfo.pipelineDetails.pipeline.id', ref: 'Pipeline' }
      ]
    )
    if (quote) {
      generalResponse(res, quote, 'success')
    } else {
      return generalResponse(res, '', 'Your link invalid!', 'error', true, 200)
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getNewQuoteId = async (req, res) => {
  try {
    const start = moment().startOf('day').toISOString()
    const end = moment().endOf('day').toISOString()

    const allQuotes = await findAllQuotes({ createdAt: { $gte: start, $lt: end } })

    const date = moment().format('YYYYMMDD')
    let latestId = date + '-0001'
    if (allQuotes.length) {
      const lastQuoteId = allQuotes[0].quoteId
      const newId = parseInt(lastQuoteId.split('-')[1]) + 1 || 1
      if (newId) latestId = moment().format('YYYYMMDD') + '-' + ('0000' + newId).slice(-4)
    }

    generalResponse(res, { latestQuoteId: latestId }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const addQuote = async (req, res) => {
  try {
    const { customer: customerId, productDetails } = req.body
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    if (!req?.headers?.authorization?.company) {
      return generalResponse(res, false, { text: 'Something went wrong! Login again.' }, 'error', false, 400)
    }

    if (!productDetails || !Array.isArray(productDetails) || !productDetails?.length) {
      return generalResponse(res, false, { text: 'Product details required.' }, 'error', false, 400)
    }
    productDetails.forEach((product) => {
      if (product.productType === 'recurring') {
        product.reccuringDetails.rrule = getRecurringFrequency(product.reccuringDetails)
      }
    })
    let customer = null
    if (customerId) {
      customer = await findContact({
        _id: ObjectId(customerId),
        company: req.headers.authorization?.company
      })
      if (customer && !customer.billingCustomerId && !customer.enableBilling) {
        const bill = await createBillingContact(customer)
        await updateContactAPI({ _id: ObjectId(customerId) }, { billingCustomerId: bill?.id, enableBilling: true })
      }
    }

    let isValidProducts = true
    for (const productObj of productDetails) {
      if (!productObj.product || !productObj.quantity || !productObj.price) {
        isValidProducts = false
        break
      }
    }

    if (!isValidProducts) {
      return generalResponse(res, false, { text: 'Invalid Product Details' }, 'error', false, 400)
    }

    if (productDetails.length) {
      productDetails.forEach((p) => {
        console.log(p.installments)
      })
    }
    const createObj = {
      slug: generateRandomString(12),
      quoteId: req.body.quoteId,
      customer: customerId,
      company: req.headers.authorization.company,
      productDetails,
      description: req.body.description,
      quoteDate: req.body.quoteDate,
      expiryDate: req.body.expiryDate,
      sendInvoiceOnDueDate: req.body?.sendInvoiceOnDueDate,
      sendInvoiceBefore: req.body?.sendInvoiceBefore,
      quoteStatusActions: req.body?.quoteStatusActions,
      enableStatusAction: req.body?.enableStatusAction ? req.body?.enableStatusAction : false,
      showTerms: req.body?.showTerms || false,
      termsAndCondition: req.body?.termsAndCondition
    }

    const newQuote = await createQuote(createObj)

    if (req.body.quoteStatusActions?.length) {
      const quoteAction = req.body.quoteStatusActions.find(
        (q) => q.status === (req.body.status || paymentStatus.pending)
      )
      if (quoteAction && quoteAction?.newGroupInfo?.group) {
        await updateGroupInfo({
          currentUserId: currentUser._id,
          contactId: customer,
          groupInfo: {
            group: quoteAction.newGroupInfo.group,
            status: quoteAction.newGroupInfo.status,
            category: quoteAction.newGroupInfo.category,
            tags: quoteAction.newGroupInfo.tags,
            pipelineDetails: quoteAction.newGroupInfo.pipelineDetails
          }
        })
        if (quoteAction?.convertToInvoice) {
          const invoiceDetails = await convertToInvoice(newQuote.id, req.headers.authorization.company)
          await createInvoice(invoiceDetails)
        }
      }
    }

    const quoteDetails = await findQuote(
      { _id: ObjectId(newQuote._id), company: req?.headers?.authorization?.company },
      {},
      [
        { path: 'customer', ref: 'contacts' },
        { path: 'productDetails.product', ref: 'Product' }
      ]
    )

    const mailProducts = quoteDetails.productDetails.map((p) => {
      let reccuringDetails = null
      if (p.reccuringDetails) {
        const ruleResponse = getRRuleFromReccuringDetails(p.reccuringDetails)
        reccuringDetails = {
          type: 'recurring',
          recurrenceTime: ruleResponse.toText()
        }
      }
      let charges = 0
      if (p?.chargesType === 'percentage' && p?.charges) {
        charges = (Number(p?.price) * Number(p?.charges)) / 100
      }
      if (p?.chargesType === 'fixed') {
        charges = Number(p?.charges)
      }
      return {
        product: p.product,
        quantity: p.quantity,
        price: Number(p.price) + Number(charges),
        ...(reccuringDetails && { ...reccuringDetails })
      }
    })

    const __dirname = path.resolve()
    const body = await ejs.renderFile(path.join(__dirname, '/src/views/quoteTemplate.ejs'), {
      fullName: `${customer?.firstName ?? ''} ${customer?.lastName ?? ''}`,
      invoiceId: req.body?.quoteId,
      invoiceDate: moment(req.body?.quoteDate).format('Do MMM YYYY'),
      dueDate: moment(req.body?.expiryDate).format('Do MMM YYYY'),
      products: mailProducts,
      viewInvoiceLink: `${process.env.HOST_NAME}/quote/preview/${encrypt(newQuote.slug)}`
    })
    sendMail({ receiver: customer?.email, subject: 'Quote', htmlBody: body })

    return generalResponse(res, newQuote, 'Quote created successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const cloneQuote = async (req, res) => {
  try {
    const { id } = req.params
    const quoteData = await findQuote({ _id: id }, {})
    if (!req?.headers?.authorization?.company) {
      return generalResponse(res, false, { text: 'Something went wrong! Login again.' }, 'error', false, 400)
    }
    const tempQuoteObj = JSON.parse(JSON.stringify(quoteData))

    if (moment(tempQuoteObj.expiryDate) < moment()) {
      return generalResponse(res, false, { text: "Expired quote can't be clone" }, 'error', false, 400)
    }
    if (tempQuoteObj) {
      let customer = null
      if (tempQuoteObj.customer) {
        customer = await findContact({
          _id: ObjectId(tempQuoteObj.customer),
          company: req.headers.authorization?.company
        }).select({ _id: true })
      } else {
        throw new Error('Something went wrong!')
      }
      const start = moment().startOf('day').toISOString()
      const end = moment().endOf('day').toISOString()

      const allQuotes = await findAllQuotes({ createdAt: { $gte: start, $lt: end } })

      const date = moment().format('YYYYMMDD')
      let latestId = date + '-0001'
      if (allQuotes.length) {
        const lastQuoteId = allQuotes[0].quoteId
        const newId = parseInt(lastQuoteId.split('-')[1]) + 1 || 1
        if (newId) latestId = moment().format('YYYYMMDD') + '-' + ('0000' + newId).slice(-4)
      }

      tempQuoteObj.quoteId = latestId
      delete tempQuoteObj._id

      const cloneQuote = await createQuote(tempQuoteObj)

      const quoteDetails = await findQuote(
        { _id: ObjectId(cloneQuote._id), company: req?.headers?.authorization?.company },
        {},
        [
          { path: 'customer', ref: 'contacts' },
          { path: 'productDetails.product', ref: 'Product' }
        ]
      )

      const mailProducts = quoteDetails.productDetails.map((p) => {
        let reccuringDetails = null
        if (p.reccuringDetails) {
          const ruleResponse = getRRuleFromReccuringDetails(p.reccuringDetails)
          reccuringDetails = {
            type: 'recurring',
            recurrenceTime: ruleResponse.toText()
          }
        }

        return {
          product: p.product,
          quantity: p.quantity,
          price: p.price,
          ...(reccuringDetails && { ...reccuringDetails })
        }
      })

      const __dirname = path.resolve()
      const body = await ejs.renderFile(path.join(__dirname, '/src/views/quoteTemplate.ejs'), {
        fullName: `${customer?.firstName ?? ''} ${customer?.lastName ?? ''}`,
        invoiceId: req.body?.quoteId,
        invoiceDate: moment(req.body?.quoteDate).format('Do MMM YYYY'),
        dueDate: moment(req.body?.expiryDate).format('Do MMM YYYY'),
        products: mailProducts,
        viewInvoiceLink: `${process.env.HOST_NAME}/quote/preview/${encrypt(cloneQuote.slug)}`
      })
      sendMail({ receiver: customer?.email, subject: 'Quote', htmlBody: body })

      return generalResponse(res, 'cloneQuote', 'Clone quote successfully!', 'success', true)
    } else {
      throw new Error('Something went wrong!')
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const sendQuoteById = async (req, res) => {
  try {
    const { slug } = req.params
    if (!slug) {
      return generalResponse(res, false, { text: 'Quote slug is required.' }, 'error', false, 400)
    }

    const quoteDetails = await findQuote({ slug }, {}, [
      { path: 'customer', ref: 'Contacts' },
      { path: 'productDetails.product', ref: 'Product' }
    ])

    const mailProducts = quoteDetails.productDetails.map((p) => {
      let reccuringDetails = null
      if (p.reccuringDetails) {
        const ruleResponse = getRRuleFromReccuringDetails(p.reccuringDetails)
        reccuringDetails = {
          type: 'recurring',
          recurrenceTime: ruleResponse.toText()
        }
      }

      return {
        product: p.product,
        quantity: p.quantity,
        price: p.price,
        ...(reccuringDetails && { ...reccuringDetails })
      }
    })

    const { quoteId, customer, quoteDate, expiryDate } = quoteDetails

    const __dirname = path.resolve()
    const body = await ejs.renderFile(path.join(__dirname, '/src/views/quoteTemplate.ejs'), {
      fullName: `${customer.firstName ?? ''} ${customer.lastName ?? ''}`,
      invoiceId: quoteId,
      invoiceDate: moment(quoteDate).format('Do MMM YYYY'),
      dueDate: moment(expiryDate).format('Do MMM YYYY'),
      products: mailProducts,
      viewInvoiceLink: `${process.env.HOST_NAME}/quote/preview/${encrypt(slug)}`
    })

    sendMail({ receiver: customer.email, subject: 'Quote', htmlBody: body })

    return generalResponse(res, null, 'Quote sended successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const sendTestQuote = async (req, res) => {
  try {
    const { slug } = req.params
    const { receiverEmails } = req.body
    if (!slug) {
      return generalResponse(res, false, { text: 'Quote slug is required.' }, 'error', false, 400)
    }

    const quoteDetails = await findQuote({ slug }, {}, [
      { path: 'customer', ref: 'Contacts' },
      { path: 'productDetails.product', ref: 'Product' }
    ])

    const mailProducts = quoteDetails.productDetails.map((p) => {
      let reccuringDetails = null
      if (p.reccuringDetails) {
        const ruleResponse = getRRuleFromReccuringDetails(p.reccuringDetails)
        reccuringDetails = {
          type: 'recurring',
          recurrenceTime: ruleResponse.toText()
        }
      }

      return {
        product: p.product,
        quantity: p.quantity,
        price: p.price,
        ...(reccuringDetails && { ...reccuringDetails })
      }
    })

    const { quoteId, customer, quoteDate, expiryDate } = quoteDetails

    const __dirname = path.resolve()
    const body = await ejs.renderFile(path.join(__dirname, '/src/views/quoteTemplate.ejs'), {
      fullName: `${customer.firstName ?? ''} ${customer.lastName ?? ''}`,
      invoiceId: quoteId,
      invoiceDate: moment(quoteDate).format('Do MMM YYYY'),
      dueDate: moment(expiryDate).format('Do MMM YYYY'),
      products: mailProducts,
      viewInvoiceLink: `${process.env.HOST_NAME}/quote/preview/${encrypt(slug)}`
    })

    sendMail({ receiver: receiverEmails, subject: 'Quote', htmlBody: body })

    return generalResponse(res, null, 'Quote sended successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateQuote = async (req, res) => {
  try {
    const { id } = req.params
    const { customer, productDetails } = req.body
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    if (!id) return generalResponse(res, false, { text: 'Invoice Id required.' }, 'error', false, 400)

    if (!req?.headers?.authorization?.company) {
      return generalResponse(res, false, { text: 'Something went wrong! Login again.' }, 'error', false, 400)
    }

    if (!productDetails || !Array.isArray(productDetails) || !productDetails?.length) {
      return generalResponse(res, false, { text: 'Product details required.' }, 'error', false, 400)
    }

    let isValidProducts = true
    for (const productObj of productDetails) {
      if (!productObj.product || !productObj.quantity || !productObj.price) {
        isValidProducts = false
        break
      }
    }

    if (!isValidProducts) {
      return generalResponse(res, false, { text: 'Invalid Product Details' }, 'error', false, 400)
    }

    const updateObj = {}

    if (customer !== undefined) updateObj.customer = customer
    if (productDetails !== undefined) updateObj.productDetails = productDetails
    if (req.body.status !== undefined) updateObj.status = req.body.status
    if (req.body.description !== undefined) updateObj.description = req.body.description
    if (req.body.quoteDate !== undefined) updateObj.quoteDate = req.body.quoteDate
    if (req.body.expiryDate !== undefined) updateObj.expiryDate = req.body.expiryDate
    if (req.body.quoteStatusActions?.length) updateObj.quoteStatusActions = req.body.quoteStatusActions
    if (req.body.sendInvoiceBefore) updateObj.sendInvoiceBefore = req.body.sendInvoiceBefore
    if (req.body.sendInvoiceOnDueDate) updateObj.sendInvoiceOnDueDate = req.body.sendInvoiceOnDueDate
    if (req.body.enableStatusAction) updateObj.enableStatusAction = req.body.enableStatusAction
    if (req.body.showTerms) updateObj.showTerms = req.body?.showTerms || false
    if (req.body.termsAndCondition) updateObj.termsAndCondition = req.body?.termsAndCondition

    const newQuote = await updateQuoteById(
      { _id: ObjectId(id), company: ObjectId(req.headers.authorization.company) },
      updateObj
    )

    /* Update group related to Quote Status Actions */
    if (req.body.quoteStatusActions?.length) {
      const quoteAction = req.body.quoteStatusActions.find((q) => q.status === req.body.status)
      if (quoteAction && quoteAction?.newGroupInfo?.group) {
        await updateGroupInfo({
          currentUserId: currentUser._id,
          contactId: customer,
          groupInfo: {
            group: quoteAction.newGroupInfo.group,
            status: quoteAction.newGroupInfo.status,
            category: quoteAction.newGroupInfo.category,
            tags: quoteAction.newGroupInfo.tags,
            pipelineDetails: quoteAction.newGroupInfo.pipelineDetails
          }
        })

        if (quoteAction?.convertToInvoice) {
          const invoiceDetails = await convertToInvoice(id, req.headers.authorization.company)
          await createInvoice(invoiceDetails)
        }
      }
    }

    return generalResponse(res, newQuote, 'Quote updated successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateQuoteStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status, note = null, companyId } = req.body
    let currentUserId = req.body.currentUserId
    const currentUser = req.headers.authorization

    if (!currentUserId) {
      const companyAdmin = await findUser({ company: companyId, role: 'admin' }, { select: { _id: 1 } })
      currentUserId = companyAdmin._id
    }

    if (!id) return generalResponse(res, false, { text: 'Quote Id required.' }, 'error', false, 400)

    if (!currentUserId) {
      return generalResponse(res, false, { text: 'Something went wrong! Login again.' }, 'error', false, 400)
    }

    const quote = await findQuote({
      _id: ObjectId(id),
      company: ObjectId(companyId)
    })

    if (!quote) return generalResponse(res, false, { text: 'Quote Not Found.' }, 'error', false, 400)

    const topBillingHistory = await getLatestBillingStatus({
      recordRelationId: id,
      type: 'Quote'
    })
    if (!topBillingHistory || (topBillingHistory && topBillingHistory.status !== status)) {
      // add status history in history model
      const statusHistoryResult = await createBillingStatusHistory({
        recordRelationId: id,
        type: 'Quote',
        // notes: [],
        status,
        company: currentUser.company
      })

      const updateObj = {
        status,
        notes: [...quote.notes, { text: note, status, statusHistoryId: statusHistoryResult._id, createdAt: new Date() }]
      }
      if (note) {
        await updateQuoteById({ _id: ObjectId(id), company: ObjectId(companyId) }, updateObj)
      }

      if (quote.quoteStatusActions?.length) {
        const quoteAction = quote.quoteStatusActions.find((q) => q.status === status)

        if (quoteAction?.newGroupInfo?.group) {
          await updateGroupInfo({
            currentUserId,
            contactId: quote.customer,
            groupInfo: {
              group: quoteAction.newGroupInfo.group,
              status: quoteAction.newGroupInfo.status,
              category: quoteAction.newGroupInfo.category,
              tags: quoteAction.newGroupInfo.tags,
              pipelineDetails: quoteAction.newGroupInfo.pipelineDetails
            }
          })
          if (quoteAction?.convertToInvoice) {
            const invoiceDetails = await convertToInvoice(id, companyId)
            await createInvoice(invoiceDetails)
          }
        }
      }
      return generalResponse(
        res,
        { statusHistoryResult: statusHistoryResult, notes: updateObj.notes },
        'Quote status updated successfully!',
        'success',
        true
      )
    } else {
      const updateObj = {
        status,
        notes: [
          ...quote.notes,
          { text: note, status: status, statusHistoryId: topBillingHistory._id, createdAt: new Date() }
        ]
      }
      if (note) {
        await updateQuoteById({ _id: ObjectId(id), company: ObjectId(companyId) }, updateObj)
      }
      return generalResponse(res, updateObj.notes, 'Note updated successfully!', 'success', true)
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteQuote = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return generalResponse(res, false, { text: 'Quote Id required.' }, 'error', false, 400)

    const quote = await findQuote({
      _id: ObjectId(id),
      company: req?.headers?.authorization?.company
    })

    if (!quote) return generalResponse(res, false, { text: 'Quote Not Found.' }, 'error', false, 400)

    await deleteQuoteById({ _id: ObjectId(id), company: req?.headers?.authorization?.company })

    generalResponse(res, null, 'Quote deleted successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
