import Stripe from 'stripe'
import { ObjectId } from 'mongodb'
import { Invoices } from '../models/invoice'
import { findProduct } from './product.repository'
import path from 'path'

const findInvoice = (params, projection = {}, populate) => {
  return Invoices.findOne(params, projection).sort({ createdAt: -1 }).populate(populate)
}

const findAllInvoices = (params, projection = {}, populate) =>
  Invoices.find(params, projection).sort({ createdAt: -1 }).populate(populate)

const findInvoiceByPaymentId = (paymentId) => Invoices.findOne({ 'stripe_payment_link.payment_id': paymentId })

const createInvoice = (data) => Invoices.create(data)

const updateInvoiceById = (search, updateValue) => Invoices.updateOne(search, updateValue)

const updatedInvoiceByPaymentId = (paymentId, updateValue) => {
  return Invoices.updateOne({ 'stripe_payment_link.payment_id': paymentId }, updateValue)
}

const updateInvoiceProductStatusByPaymentId = async (paymentId, status) => {
  const invoice = await Invoices.find({
    productDetails: { $elemMatch: { 'stripe_payment_link.id': paymentId } }
  })

  if (invoice.length) {
    const existInvoice = invoice[0]
    const updatedProductDetails = existInvoice.productDetails?.map((i) =>
      i.stripe_payment_link.id === paymentId ? { ...i, stripe_payment_link: null, status } : i
    )

    return Invoices.updateOne({ _id: existInvoice._id }, { productDetails: updatedProductDetails })
  }
}

const deleteInvoiceById = (invoice) => Invoices.delete(invoice)

const createPaymentLink = async (productDetails, customer, company, invoiceId = null) => {
  const stripe = new Stripe(process.env.STRIPE_API_KEY)

  const newProductDetails = [...productDetails]
  await Promise.all([
    ...newProductDetails.map(async (productObj) => {
      if (productObj.productType !== 'recurring') {
        const prod = await findProduct({
          _id: ObjectId(productObj?.product),
          company
        })

        if (!prod || !prod.stripe_product_id) throw new Error('Invalid Product in product details')

        const currentProd = newProductDetails.find((p) => p.product === productObj.product)
        if (!productObj?.installments?.length) {
          let charges = 0
          if (productObj?.chargesType === 'percentage' && productObj?.charges) {
            charges = (Number(productObj?.price) * Number(productObj?.charges)) / 100
          }
          if (productObj?.chargesType === 'fixed') {
            charges = Number(productObj?.charges)
          }
          const price = await stripe.prices.create({
            unit_amount: (productObj?.price + charges) * 100,
            currency: 'usd',
            product: prod.stripe_product_id
          })
          if (!price) throw new Error('Something went wrong! Please try with different products')
          productObj.stripe_price_id = price.id

          const paymentLinkResponse = await stripe.paymentLinks.create({
            line_items: [{ price: price.id, quantity: productObj.quantity }],
            metadata: { customer: String(customer._id), ...(invoiceId ? { invoice: invoiceId } : null) }
          })

          if (!paymentLinkResponse.id || !paymentLinkResponse.url) throw new Error('Invoice Creation Failed.')
          productObj.stripe_payment_link = { id: paymentLinkResponse.id, url: paymentLinkResponse.url }
        } else {
          productObj.stripe_price_id = null
          productObj.stripe_payment_link = null
        }
      }
    })
  ])

  // const paymentLinkResponse = await stripe.paymentLinks.create({
  //   line_items: lineItems,
  //   metadata: { customer: customer._id }
  //   // after_completion: { type: 'redirect', redirect: { url: process.env.HOST_NAME } },
  // })

  return {
    newProductDetails
  }
}

const InactiveStripePrices = async (products) => {
  const stripe = new Stripe(process.env.STRIPE_API_KEY)

  return await Promise.all([
    ...products.map(async (prodObj) => {
      await stripe.prices.update(prodObj.stripe_price_id, { active: false })
    })
  ])
}

const InactivePaymentLink = async (products) => {
  const stripe = new Stripe(process.env.STRIPE_API_KEY)

  return await Promise.all([
    ...products.map(async (prodObj) => {
      await stripe.paymentLinks.update(prodObj.stripe_payment_link.id, { active: false })
    })
  ])
}

const createPriceAndPaymentLink = async ({ productPrice, product, customer, installment, invoice, recurringDate }) => {
  const __dirname = path.resolve()

  // console.log({ productPrice, product, customer, installment })
  const stripe = new Stripe(process.env.STRIPE_API_KEY)

  const prod = await findProduct({
    _id: ObjectId(product?.product)
  })
  const price = await stripe.prices.create({
    unit_amount: productPrice * 100,
    currency: 'usd',
    product: prod.stripe_product_id
  })
  const paymentLinkResponse = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: {
      customer: String(customer._id),
      ...(installment?._id ? { installmentId: String(installment._id) } : null),
      ...(invoice?._id ? { invoice: String(invoice.invoiceId) } : null),
      ...(recurringDate ? { recurringDate: recurringDate } : null)
    }
  })

  // const body = await ejs.renderFile(path.join(__dirname, '/src/views/invoiceTemplate.ejs'), {
  //   paymentLink: paymentLinkResponse?.url,
  //   fullName: `${customer.firstName ?? ''} ${customer.lastName ?? ''}`,
  //   invoiceId: invoice.invoiceId,
  //   invoiceDate: moment(invoice.invoiceDate).format('Do MMM YYYY'),
  //   dueDate: moment(invoice.dueDate).format('Do MMM YYYY'),
  //   totalPrice: productPrice * 100,
  //   products: [product]
  // })
  // // sendMail({ receiver: 'testUser123@mailinator.com', subject: 'Invoice', htmlBody: body })
  // console.log(invoice.customer?.[0]?.email)
  // // sendMail({ receiver: invoice.customer?.[0]?.email, subject: 'Invoice', htmlBody: body })
  // sendMail({ receiver: 'test.customer.software@yopmail.com', subject: 'Invoice', htmlBody: body })

  return {
    stripe_price_id: price.id,
    stripe_payment_link: { id: paymentLinkResponse.id, url: paymentLinkResponse.url }
  }
}

export {
  createInvoice,
  findInvoice,
  findAllInvoices,
  findInvoiceByPaymentId,
  updateInvoiceById,
  updatedInvoiceByPaymentId,
  updateInvoiceProductStatusByPaymentId,
  deleteInvoiceById,
  createPaymentLink,
  InactiveStripePrices,
  InactivePaymentLink,
  createPriceAndPaymentLink
}
