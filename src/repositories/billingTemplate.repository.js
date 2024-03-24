import { BillingTemplate } from '../models/billingTemplate'

export const findBillingTemplates = (params, projection = {}) => {
  return BillingTemplate.find(params, projection).sort({ createdAt: -1 })
}

export const findSpecificBillingTemplate = (params, projection = {}) => BillingTemplate.findOne(params, projection)

export const createBillingTemplate = (data) => BillingTemplate.create(data)

export const updateBillingTemplateById = (search, data) => BillingTemplate.findOneAndUpdate(search, data)

export const removeBillingTemplate = (params) => BillingTemplate.delete(params)
