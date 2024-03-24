import { BillingStatusHistory } from '../models/billingStatusHistory'

export const createBillingStatusHistory = (data) => BillingStatusHistory.create(data)

export const getBillingStatusHistory = (params) => BillingStatusHistory.find(params).sort({ createdAt: -1 })

export const getLatestBillingStatus = (params) => BillingStatusHistory.findOne(params).sort({ _id: -1 })

export const deleteBillingStatusHistoryRepo = ({ ids = [] }) =>
  BillingStatusHistory.delete({ BillingStatusHistoryId: { $in: ids } })

export const updateBillingStatusHistory = (search, updateValue) => BillingStatusHistory.updateOne(search, updateValue)
