import { Router } from 'express'
import {
  addCustomFieldDetail,
  deleteCustomFieldDetail,
  getCustomFieldsDetails,
  updateCustomFieldDetail
} from '../controllers/customField.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const customField = Router()

customField.get('/custom-field', authenticated, getCustomFieldsDetails)

customField.post('/custom-field', authenticated, addCustomFieldDetail)

customField.put('/custom-field/:id', authenticated, updateCustomFieldDetail)

customField.delete('/custom-field/:id', authenticated, deleteCustomFieldDetail)

export default customField
