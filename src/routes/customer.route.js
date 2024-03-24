import { Router } from 'express'
import { addCustomerDetail, deleteCustomerDetail, getCustomersDetails, getSpecificCustomersDetails, updateCustomerDetail } from '../controllers/customer.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const customer = Router()

customer.get('/customer', authenticated, getCustomersDetails)

customer.get('/customer/:id', authenticated, getSpecificCustomersDetails)

customer.post('/customer', authenticated, addCustomerDetail)

customer.put('/customer/:id', authenticated, updateCustomerDetail)

customer.delete('/customer/:id', authenticated, deleteCustomerDetail)

export default customer
