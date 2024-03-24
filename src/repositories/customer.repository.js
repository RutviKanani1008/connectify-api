import { Customers } from '../models/customer'

const findCustomer = (params, projection = {}) => {
  return Customers.findOne(params, projection).sort({ createdAt: -1 })
}

const findAllCustomer = (params, projection = {}) => {
  return Customers.find(params, projection).sort({ createdAt: -1 })
}

const createCustomer = (data) => {
  return Customers.create(data)
}

const updateCustomer = (search, updateValue) => {
  return Customers.updateOne(search, updateValue)
}

const deleteCustomer = (customer) => {
  return Customers.delete(customer)
}

export { createCustomer, findCustomer, findAllCustomer, updateCustomer, deleteCustomer }
