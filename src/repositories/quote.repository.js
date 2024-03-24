import { Quotes } from '../models/quote'
import { ObjectId } from 'mongodb'
import moment from 'moment'
import { createPaymentLink, findAllInvoices } from './invoice.repository'
import { generateRandomString } from '../helpers/generateRandomString'

const findQuote = (params, projection = {}, populate) => {
  return Quotes.findOne(params, projection).sort({ createdAt: -1 }).populate(populate)
}

const findAllQuotes = (params, projection = {}, populate) =>
  Quotes.find(params, projection).sort({ createdAt: -1 }).populate(populate)

const createQuote = (data) => Quotes.create(data)

const updateQuoteById = (search, updateValue) => Quotes.updateOne(search, updateValue)

const deleteQuoteById = (quote) => Quotes.delete(quote)

const convertToInvoice = async (quoteId, company) => {
  try {
    const updatedQuote = await findQuote({ _id: ObjectId(quoteId), company: ObjectId(company) }, {}, [
      { path: 'customer', ref: 'contacts' },
      { path: 'productDetails.product', ref: 'Product' }
    ])

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

    const invoiceId = latestId
    const slug = generateRandomString(12)
    const customer = updatedQuote.customer

    const productDetails = updatedQuote.productDetails
    const onlineProds = productDetails.filter((p) => p.paymentOption === 'Online')
    const offlineProds = productDetails.filter((p) => p.paymentOption === 'Offline')

    /* Create Links from online product */
    const { newProductDetails: newOnlineProds } = await createPaymentLink(onlineProds, customer, company)

    const invoiceDetail = {
      slug,
      invoiceId,
      productDetails: [...offlineProds, ...newOnlineProds],
      company: updatedQuote.company,
      customer: updatedQuote.customer,
      description: updatedQuote.description,
      invoiceDate: updatedQuote.quoteDate,
      dueDate: updatedQuote.expiryDate,
      invoiceStatusActions: [],
      showTerms: updatedQuote.showTerms,
      termsAndCondition: updatedQuote.termsAndCondition
    }

    return invoiceDetail
  } catch (error) {
    console.log(error)
    throw error
  }
}

export { createQuote, findQuote, findAllQuotes, updateQuoteById, deleteQuoteById, convertToInvoice }
