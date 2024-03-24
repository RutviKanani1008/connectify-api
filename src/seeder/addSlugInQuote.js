import { Quotes } from '../models/quote.js'

// ** others **
import { generateRandomString } from '../helpers/generateRandomString.js'
import { logger } from '../utils/utils.js'
import dbConnection from '../db/connection.js'

/**
 *  script: ts-node ./src/seeder/addSlugInQuote.js
 *  add slug in all quotes
 */

const addSlugInQuote = async () => {
  try {
    dbConnection()
    const quotes = await Quotes.find().select({ _id: 1 })
    await Promise.all(quotes.map((quote) => Quotes.updateOne({ _id: quote._id }, { slug: generateRandomString(12) })))
    console.log('Add slug in quote successfully!')
    return
  } catch (error) {
    logger(error)
  }
}

addSlugInQuote()
