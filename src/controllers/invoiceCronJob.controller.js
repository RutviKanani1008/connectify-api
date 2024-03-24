/* eslint-disable camelcase */
import ejs from 'ejs'
import { Invoices, paymentStatus } from '../models/invoice'
import { sendMail } from '../services/send-grid'
import moment from 'moment'
import { createPriceAndPaymentLink, findInvoice, updateInvoiceById } from '../repositories/invoice.repository'
import path from 'path'
import { getDatesFromRRule } from '../helpers/recurringHelper'
import { createStripePaymentHistory } from '../repositories/stripePaymentHistory.repository'
import Stripe from 'stripe'

export const sendNormalInvoice = async ({ invoice, product }) => {
  const __dirname = path.resolve()

  const body = await ejs.renderFile(path.join(__dirname, '/src/views/invoiceTemplate.ejs'), {
    viewInvoiceLink: `${process.env.HOST_NAME}/invoice/preview/${invoice?.slug}`,
    paymentLink:
      invoice.paymentOption === 'Online' && product?.stripe_payment_link?.url ? product.stripe_payment_link.url : '',
    fullName: `${invoice?.customer?.[0].firstName ?? ''} ${invoice?.customer?.[0].lastName ?? ''}`,
    invoiceId: invoice.invoiceId,
    invoiceDate: moment(new Date(invoice.invoiceDate)).format('Do MMM YYYY'),
    dueDate: moment(new Date(invoice.dueDate)).format('Do MMM YYYY'),
    totalPrice: product.quantity * product.price,
    products: [product]
  })
  console.log('invoice?.customer?.[0]?.email : ', invoice?.customer?.[0]?.email)
  sendMail({ receiver: invoice?.customer?.[0]?.email, subject: 'Invoice', htmlBody: body })
}

export const sendInstallmentInvoice = async ({ invoice, installment, product, stripe_payment_link }) => {
  const __dirname = path.resolve()

  const body = await ejs.renderFile(path.join(__dirname, '/src/views/invoiceTemplate.ejs'), {
    viewInvoiceLink: `${process.env.HOST_NAME}/invoice/preview/${invoice?.slug}`,

    paymentLink: invoice.paymentOption === 'Online' && stripe_payment_link?.url ? stripe_payment_link.url : '',
    fullName: `${invoice?.customer?.[0].firstName ?? ''} ${invoice?.customer?.[0].lastName ?? ''}`,
    invoiceId: invoice.invoiceId,
    invoiceDate: moment(invoice.invoiceDate).format('Do MMM YYYY'),
    dueDate: moment(new Date(installment.dueDate)).utc().format('Do MMM YYYY'),
    totalPrice: product.quantity * product.price,
    products: [product]
  })
  console.log('invoice?.customer?.[0]?.email : ', invoice?.customer?.[0]?.email)
  sendMail({ receiver: invoice?.customer?.[0]?.email, subject: 'Invoice', htmlBody: body })
}

export const sendRecurringInvoice = async ({ invoice, product, paymentLink }) => {
  const __dirname = path.resolve()
  console.log(invoice, product, paymentLink)
  const body = await ejs.renderFile(path.join(__dirname, '/src/views/invoiceTemplate.ejs'), {
    viewInvoiceLink: `${process.env.HOST_NAME}/invoice/preview/${invoice?.slug}`,
    paymentLink:
      invoice.paymentOption === 'Online' && paymentLink?.stripe_payment_link?.url
        ? paymentLink.stripe_payment_link.url
        : '',
    fullName: `${invoice?.customer?.[0].firstName ?? ''} ${invoice?.customer?.[0].lastName ?? ''}`,
    invoiceId: invoice.invoiceId,
    invoiceDate: moment(new Date(invoice.invoiceDate)).format('Do MMM YYYY'),
    dueDate: moment(new Date(invoice.dueDate)).format('Do MMM YYYY'),
    totalPrice: product.quantity * product.price,
    products: [product]
  })
  console.log('invoice?.customer?.[0]?.email : ', invoice?.customer?.[0]?.email)
  sendMail({ receiver: invoice?.customer?.[0]?.email, subject: 'Invoice', htmlBody: body })
}

const getCurrentDate = () => {
  return moment().format('YYYY-MM-DD')
}

const getSendInvoiceBeforeDate = (sendInvoiceBefore) => {
  return moment().add(sendInvoiceBefore, 'days').format('YYYY-MM-DD')
}

const oneTimePaymentCron = async () => {
  const invoiceDetails = await Invoices.aggregate([
    {
      $match: {
        status: paymentStatus.pending,
        deleted: false,
        paymentOption: 'Online',
        'productDetails.paymentMode': 'Manual',
        'productDetails.paymentType': 'fullPayment',
        'productDetails.productType': 'one-time',
        dueDate: {
          $gte: new Date()
        }
      }
    },
    {
      $lookup: {
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company'
      }
    },
    {
      $lookup: {
        from: 'contacts',
        localField: 'customer',
        foreignField: '_id',
        as: 'customer'
      }
    }
  ])
  if (invoiceDetails.length) {
    invoiceDetails.map(async (invoice) => {
      if (
        (invoice.status === paymentStatus.pending || invoice.status === paymentStatus.partiallyPaid) &&
        invoice.productDetails.length
      ) {
        invoice.productDetails.map(async (product) => {
          if (product.paymentMode === 'Manual' && product.paymentType === 'fullPayment') {
            console.log({ product })
            const invoiceDate = moment(new Date(invoice.dueDate)).format('YYYY-MM-DD')
            if (invoice?.sendInvoiceBefore) {
              // Send invoice before how many days.
              const sendInvoiceBeforeDate = getSendInvoiceBeforeDate(invoice?.sendInvoiceBefore)
              if (
                moment(invoiceDate).isSame(sendInvoiceBeforeDate, 'day') &&
                (product.paymentOption === 'Offline' ||
                  (product.paymentOption === 'Online' && product.stripe_price_id && product.stripe_payment_link))
              ) {
                // NOTE : in case invoice have "sendInvoiceBefore"
                await sendNormalInvoice({ invoice, product })
              }
            }

            const todayDate = getCurrentDate()

            if (invoice?.sendInvoiceOnDueDate && moment(invoiceDate).isSame(todayDate, 'day')) {
              await sendNormalInvoice({ invoice, product })
            }
          }
        })
      }
    })
  }
}

const installmentsPaymentCron = async () => {
  const invocieDetailsWithInstallment = await Invoices.aggregate([
    {
      $match: {
        status: paymentStatus.pending,
        deleted: false,
        paymentOption: 'Online',
        'productDetails.paymentMode': 'Manual',
        'productDetails.paymentType': 'installment',
        dueDate: {
          $gte: new Date()
        },
        'productDetails.installments.dueDate': {
          $gte: new Date(moment()),
          $lte: new Date(moment().add(4, 'days'))
        }
      }
    },
    {
      $lookup: {
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company'
      }
    },
    {
      $lookup: {
        from: 'contacts',
        localField: 'customer',
        foreignField: '_id',
        as: 'customer'
      }
    }
  ])

  // console.log({ invocieDetailsWithInstallment })
  if (invocieDetailsWithInstallment.length) {
    invocieDetailsWithInstallment.map(async (invoice) => {
      let isUpdated = false
      if (
        (invoice.status === paymentStatus.pending || invoice.status === paymentStatus.partiallyPaid) &&
        invoice.productDetails.length
      ) {
        await Promise.all([
          ...invoice.productDetails.map(async (product) => {
            if (
              product.paymentMode === 'Manual' &&
              product.paymentType === 'installment' &&
              product.installments.length
            ) {
              await Promise.all([
                ...product.installments.map(async (installment) => {
                  let isSendInvoice = false
                  const invoiceDate = moment(new Date(installment.dueDate)).format('YYYY-MM-DD')
                  if (invoice?.sendInvoiceBefore) {
                    // Send invoice before how many days.
                    console.log({ installment, status: 'Send invoice before' })
                    const currentDate = getSendInvoiceBeforeDate(invoice?.sendInvoiceBefore)
                    if (
                      moment(invoiceDate).isSame(currentDate, 'day') &&
                      !installment.stripe_price_id &&
                      !installment.stripe_payment_link
                    ) {
                      // NOTE : in case invoice have "sendInvoiceBefore".
                      // 1. generate price in stripe
                      // 2. generate payment link
                      // 3. Send link or invoice to customer
                      // 4. And update stripe_price_id and stripe_payment_link in installment object.
                      // Generate Price and Payment link and send mail to customer

                      const { stripe_payment_link, stripe_price_id } = await createPriceAndPaymentLink({
                        productPrice: installment.amount,
                        product: product,
                        customer: invoice?.customer?.[0],
                        invoice,
                        installment
                      })

                      installment.stripe_price_id = stripe_price_id
                      installment.stripe_payment_link = stripe_payment_link
                      await sendInstallmentInvoice({ invoice, installment, product, stripe_payment_link })
                      isUpdated = true
                    }
                  } else {
                    const currentDate = getCurrentDate()
                    if (
                      moment(invoiceDate).isSame(currentDate, 'day') &&
                      !installment.stripe_price_id &&
                      !installment.stripe_payment_link
                    ) {
                      console.log({
                        installment,
                        status: 'invoice don\'t have "sendInvoiceBefore" and current date is same as due date'
                      })

                      // NOTE : in case invoice don't have "sendInvoiceBefore" and current date is same as due date.
                      // 1. generate price in stripe
                      // 2. generate payment link
                      // 3. Send link or invoice to customer

                      const { stripe_payment_link, stripe_price_id } = await createPriceAndPaymentLink({
                        productPrice: installment.amount,
                        product: product,
                        customer: invoice?.customer?.[0],
                        invoice,
                        installment
                      })

                      installment.stripe_price_id = stripe_price_id
                      installment.stripe_payment_link = stripe_payment_link

                      await sendInstallmentInvoice({ invoice, installment, product, stripe_payment_link })
                      isUpdated = true

                      isSendInvoice = true
                    }
                  }

                  // If invoice not contain sendInvoiceBefore but it contains sendInvoiceOnDueDate so that we need to check is it send on first else block
                  if (
                    !isSendInvoice &&
                    invoice?.sendInvoiceOnDueDate &&
                    moment(new Date(installment.dueDate)).utc().isSame(moment(new Date()).utc(), 'day')
                  ) {
                    // Send invoice on due date
                    if (!installment.stripe_price_id && !installment.stripe_payment_link) {
                      // 1. generate price in stripe
                      // 2. generate payment link
                      const { stripe_payment_link, stripe_price_id } = await createPriceAndPaymentLink({
                        productPrice: installment.amount,
                        product: product,
                        customer: invoice?.customer?.[0],
                        invoice,
                        installment
                      })

                      installment.stripe_price_id = stripe_price_id
                      installment.stripe_payment_link = stripe_payment_link

                      isUpdated = true
                    }
                    console.log({
                      installment,
                      status: 'send invoice on due date'
                    })
                    // 3. Send link or invoice to customer
                    await sendInstallmentInvoice({
                      invoice,
                      installment,
                      product,
                      stripe_payment_link: installment.stripe_payment_link
                    })
                  }
                })
              ])
            }
          })
        ]).then(async () => {
          invoice.company = invoice.company?.[0]?._id
          invoice.customer = invoice.customer?.[0]?._id
          if (isUpdated) {
            await updateInvoiceById({ _id: invoice._id }, invoice)
          }
        })
      }
    })
  }
}

const reccursiveInvoiceCron = async () => {
  const recurrsiveInvoice = await Invoices.aggregate([
    {
      $match: {
        status: paymentStatus.pending,
        deleted: false,
        paymentOption: 'Online',
        'productDetails.paymentMode': 'Manual',
        'productDetails.paymentType': 'fullPayment',
        'productDetails.productType': 'recurring',
        dueDate: {
          $gte: new Date()
        }
      }
    },
    {
      $lookup: {
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company'
      }
    },
    {
      $lookup: {
        from: 'contacts',
        localField: 'customer',
        foreignField: '_id',
        as: 'customer'
      }
    }
  ])
  if (recurrsiveInvoice.length) {
    recurrsiveInvoice.map(async (invoice) => {
      let isUpdated = false
      if (
        (invoice.status === paymentStatus.pending || invoice.status === paymentStatus.partiallyPaid) &&
        invoice.productDetails.length
      ) {
        await Promise.all([
          ...invoice.productDetails.map(async (product) => {
            // const invoiceDate = moment(new Date(invoice.dueDate)).format('YYYY-MM-DD')
            if (product?.reccuringDetails && product?.reccuringDetails?.rrule) {
              // Get all recurring details
              const recurringDate = getDatesFromRRule(product?.reccuringDetails?.rrule)
              if (recurringDate.length) {
                // Sened invoice before
                if (invoice?.sendInvoiceBefore) {
                  // current date + send invoice before
                  const currentDate = getSendInvoiceBeforeDate(invoice?.sendInvoiceBefore)

                  // Check currentDate is existing in recurringDate
                  const isExist = recurringDate?.find(
                    (rdate) => moment(rdate).utc().format('YYYY-MM-DD') === currentDate
                  )

                  if (isExist) {
                    // Check link is alreday created for that recurring date
                    const checkStripeLinkGenerate = product?.recurringPaymentDetails?.find(
                      (paymentDate) =>
                        moment(paymentDate?.recurringInvoiceDate).utc().format('YYYY-MM-DD') === currentDate
                    )

                    // Check payment link is generated or not
                    if (product?.recurringPaymentDetails?.length && checkStripeLinkGenerate) {
                      // get payment link and send
                      await sendRecurringInvoice({
                        invoice,
                        product,
                        paymentLink: { stripe_payment_link: checkStripeLinkGenerate?.stripe_payment_link }
                      })
                    } else {
                      // Generate payment line and send in case first time generate link of that date.
                      const { stripe_payment_link, stripe_price_id } = await createPriceAndPaymentLink({
                        productPrice: product?.price,
                        product: product,
                        customer: invoice?.customer?.[0],
                        invoice,
                        recurringDate: currentDate
                      })

                      // Manage the generate payment link history
                      if (!product?.recurringPaymentDetails) {
                        product.recurringPaymentDetails = []
                      }
                      product.recurringPaymentDetails?.push({
                        recurringInvoiceDate: currentDate,
                        stripe_price_id,
                        stripe_payment_link
                      })
                      await sendRecurringInvoice({ invoice, product, paymentLink: { stripe_payment_link } })
                      isUpdated = true
                    }
                  }
                }

                // Send invoice on due date
                if (invoice.sendInvoiceOnDueDate) {
                  const isExist = recurringDate?.find(
                    (rdate) => moment(rdate).utc().format('YYYY-MM-DD') === getCurrentDate()
                  )
                  if (isExist) {
                    const checkStripeLinkGenerate = product?.recurringPaymentDetails?.find(
                      (paymentDate) =>
                        moment(paymentDate?.recurringInvoiceDate).utc().format('YYYY-MM-DD') === getCurrentDate()
                    )
                    // Check payment line is generated or not
                    if (product?.recurringPaymentDetails?.length && checkStripeLinkGenerate) {
                      // get payment line and send
                      await sendRecurringInvoice({
                        invoice,
                        product,
                        paymentLink: { stripe_payment_link: checkStripeLinkGenerate?.stripe_payment_link }
                      })
                    } else {
                      // Generate payment line and send
                      const { stripe_payment_link, stripe_price_id } = await createPriceAndPaymentLink({
                        productPrice: product?.price,
                        product: product,
                        customer: invoice?.customer?.[0],
                        invoice
                      })
                      if (!product?.recurringPaymentDetails) {
                        product.recurringPaymentDetails = []
                      }
                      product.recurringPaymentDetails?.push({
                        recurringInvoiceDate: getCurrentDate(),
                        stripe_price_id,
                        stripe_payment_link
                      })
                      await sendRecurringInvoice({ invoice, product, paymentLink: { stripe_payment_link } })
                      isUpdated = true
                    }
                  }
                }
              }
            }
          })
        ]).then(async () => {
          invoice.company = invoice.company?.[0]?._id
          invoice.customer = invoice.customer?.[0]?._id
          if (isUpdated) {
            await updateInvoiceById({ _id: invoice._id }, invoice)
          }
        })
      }
    })
  }
}
export const invoiceCronJob = async () => {
  // Do whatever you want in here. Send email, Make  database backup or download data.
  console.log(new Date().toLocaleString())
  // For one time Invoice
  await oneTimePaymentCron()
  // For Installment invoice
  await installmentsPaymentCron()
  // Fro Recursive Invoice
  await reccursiveInvoiceCron()
}

export const updateStripePaymentHistory = async (stripeResponce) => {
  const { payment_link, metadata, id: stripePaymentId, amount_total } = stripeResponce
  const { invoice, recurringDate } = metadata
  const invoiceDetails = await findInvoice({ invoiceId: invoice })
  if (invoiceDetails && payment_link && invoice) {
    let isUpdate = false
    const stripeHistoryObj = {}
    invoiceDetails.productDetails.forEach((product) => {
      if (
        product.productType === 'one-time' &&
        product.paymentMode === 'Manual' &&
        product.paymentOption === 'Online'
      ) {
        // If the product is one time
        if (product.paymentType === 'fullPayment' && product?.stripe_payment_link?.id === payment_link) {
          product.status = paymentStatus.paid
          invoiceDetails.status = paymentStatus.paid
          stripeHistoryObj.invoice = invoiceDetails?._id
          stripeHistoryObj.product = product._id
          stripeHistoryObj.stripe_payment_id = stripePaymentId
          stripeHistoryObj.invoiceType = product.paymentType
          stripeHistoryObj.total_amount = amount_total / 100
          stripeHistoryObj.installment = null
          isUpdate = true
        }

        // If the product is installment
        if (product.paymentType === 'installment' && product.installments.length) {
          product.installments = product.installments.map((installment) => {
            if (installment && installment?.stripe_payment_link?.id === payment_link) {
              console.log({ installment })
              stripeHistoryObj.invoice = invoiceDetails?._id
              stripeHistoryObj.product = product._id
              stripeHistoryObj.stripe_payment_id = stripePaymentId
              stripeHistoryObj.invoiceType = product.paymentType
              stripeHistoryObj.total_amount = amount_total / 100
              stripeHistoryObj.installment = installment?._id
              installment.status = paymentStatus.paid
              isUpdate = true
            }
            return installment
          })
          const paidInstallments = product.installments.filter(
            (installment) => installment.status === paymentStatus.paid
          )?.length
          // eslint-disable-next-line no-unused-vars
          const pendingInstallments = product.installments.filter(
            (installment) => installment.status === paymentStatus.pending
          )?.length
          if (paidInstallments >= product?.installments?.length / 2) {
            product.status = paymentStatus.partiallyPaid
          } else if (paidInstallments === product?.installments?.length) {
            product.status = paymentStatus.paid
          }
        }
      }

      // If product is recurring
      if (
        product?.productType === 'recurring' &&
        product?.paymentMode === 'Manual' &&
        product?.paymentOption === 'Online' &&
        product?.recurringPaymentDetails?.length
      ) {
        product.recurringPaymentDetails = product?.recurringPaymentDetails?.map((recurringDetail) => {
          if (
            moment(recurringDetail.recurringInvoiceDate).utc().format('YYYY-MM-DD') ===
              moment(recurringDate).format('YYYY-MM-DD') &&
            recurringDetail?.stripe_payment_link?.id === payment_link
          ) {
            recurringDetail.status = paymentStatus.paid
            stripeHistoryObj.invoice = invoiceDetails?._id
            stripeHistoryObj.product = product._id
            stripeHistoryObj.stripe_payment_id = stripePaymentId
            stripeHistoryObj.invoiceType = product.productType
            stripeHistoryObj.total_amount = amount_total / 100
            stripeHistoryObj.installment = null
            stripeHistoryObj.recurringDate = recurringDate
          }
          return recurringDetail
        })
        const recurringAvailableDate = getDatesFromRRule(product?.reccuringDetails?.rrule)?.length
        const paidRecurring = product?.recurringPaymentDetails.filter(
          (recurring) => recurring?.status === paymentStatus.paid
        )?.length

        if (recurringAvailableDate === paidRecurring) {
          product.status = paymentStatus.paid
        }
      }
    })
    if (isUpdate) {
      await updateInvoiceById({ _id: invoiceDetails._id }, invoiceDetails)
    }
    if (
      stripeHistoryObj &&
      stripeHistoryObj.invoice &&
      stripeHistoryObj.product &&
      stripeHistoryObj.stripe_payment_id
    ) {
      await createStripePaymentHistory({ ...stripeHistoryObj, company: invoiceDetails.company })
    }

    const stripe = new Stripe(process.env.STRIPE_API_KEY)

    await stripe.paymentLinks.update(payment_link, { active: false })
  }
}
