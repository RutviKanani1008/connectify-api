import { WebPushSubscription } from '../models/webPushSubscription'

export const getWebSubscriptions = (params, projection = {}, populate) => {
  return WebPushSubscription.find(params, projection).populate(populate)
}

export const createOrUpdateWebSubscriptionRepo = (search, updateValue) => {
  return WebPushSubscription.updateOne(search, updateValue, { upsert: true })
}

export const deleteWebPushSubscriptionRepo = (params) => {
  return WebPushSubscription.delete(params)
}
