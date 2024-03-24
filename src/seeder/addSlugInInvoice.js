import { Invoices } from '../models/invoice.js'

// ** others **
import { generateRandomString } from '../helpers/generateRandomString.js'
import { logger } from '../utils/utils.js'
import dbConnection from '../db/connection.js'

/**
 *  script: ts-node ./src/seeder/addSlugInInvoice.js
 *  add slug in all invoices
 */

const addSlugInInvoice = async () => {
  try {
    dbConnection()
    const invoices = await Invoices.find().select({ _id: 1 })
    await Promise.all(
      invoices.map((invoice) => Invoices.updateOne({ _id: invoice._id }, { slug: generateRandomString(12) }))
    )
    console.log('Add slug in invoice successfully!')
    return
  } catch (error) {
    logger(error)
  }
}

addSlugInInvoice()
