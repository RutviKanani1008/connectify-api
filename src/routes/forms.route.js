import { Router } from 'express'
import {
  createResponse,
  createForm,
  getFormDetail,
  getForms,
  updateForms,
  deleteFormDetail,
  uploadFormFile,
  sendTestMail,
  cloneForm,
  getFormResponseDetail,
  updateFormsResponse,
  deleteFormResponseDetail,
  addTestSchedule,
  removeTestSchedule
} from '../controllers/form.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const forms = Router()

forms.get('/forms', getForms)
forms.get('/forms/:id', getFormDetail)
forms.get('/form-response/:formId', authenticated, getFormResponseDetail)

forms.post('/add-form', authenticated, createForm)
forms.post('/form-response/:id', createResponse)
forms.post('/upload-form-file', uploadFormFile)
forms.post('/send-test-mail', sendTestMail)
forms.post('/clone-form/:id', authenticated, cloneForm)

forms.put('/forms/:id', updateForms)
forms.put('/form-response/:id', authenticated, updateFormsResponse)

forms.delete('/forms/:id', deleteFormDetail)
forms.delete('/form-response/:id', deleteFormResponseDetail)

// -------------------------------------------
forms.post('/add-test-schedule', addTestSchedule)
forms.post('/remove-test-schedule', removeTestSchedule)
// -------------------------------------------

export default forms
