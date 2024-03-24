import { Companies } from '../models/companies'
import { parseData } from '../utils/utils'

const findCompany = (params, projection = {}) => {
  return Companies.find(params, projection).sort({ createdAt: -1 })
}

const createCompany = (data) => {
  return Companies.create(data)
}

const findOneCompany = (params, projection = {}) => {
  return Companies.findOne(params, projection)
}
const findOneCompanyEmail = (params, projection = {}) => {
  return Companies.findOne(params, projection).select({ email: true })
}

const findCompanyAggregate = (params) => {
  return Companies.aggregate(params)
}

const findCompanyAggregateCount = ({ match }) => {
  return Companies.aggregate([{ $match: match }, { $count: 'count' }])
}

const updateCompany = (search, updateValue, options) => {
  return Companies.findByIdAndUpdate(search, updateValue, options)
}

const deleteCompany = (params) => {
  return Companies.delete(params)
}

const findCompanyWithDeleted = (params, projection = {}) => {
  return Companies.findWithDeleted(params, projection).sort({ _id: 1 })
}

const getFilterCompanyQuery = ({ filters }) => {
  let { sort, search, archived } = filters
  sort = parseData(sort)
  const $and = []
  if (search) {
    const reg = new RegExp(search, 'i')
    $and.push({
      $or: [{ name: { $regex: reg } }, { email: { $regex: reg } }]
    })
  }

  if (!archived || archived === 'false') {
    $and.push({ archived: { $ne: true } })
  } else {
    $and.push({ archived: true })
  }

  if (!sort) sort = { createdAt: -1 }

  return { query: { ...($and.length ? { $and } : {}) }, sort }
}

export {
  deleteCompany,
  createCompany,
  findCompany,
  findCompanyAggregate,
  findCompanyAggregateCount,
  updateCompany,
  findOneCompany,
  findOneCompanyEmail,
  findCompanyWithDeleted,
  getFilterCompanyQuery
}
