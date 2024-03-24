import { PaymentMethod } from '../models/paymentMethod'
import { ObjectId } from 'mongodb'

export const createPaymentMethod = (data) => PaymentMethod.create(data)

export const getPaymentMethodByContactId = ({ id }) => PaymentMethod.find({ contact: ObjectId(id) })

export const getPaymentMethods = (params) => PaymentMethod.find(params)

export const deletePaymentMethodsRepo = ({ ids = [] }) => PaymentMethod.delete({ paymentMethodId: { $in: ids } })

export const updatePaymentMethod = (search, updateValue) => PaymentMethod.updateOne(search, updateValue)
