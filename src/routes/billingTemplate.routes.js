import { Router } from 'express'
import {
  addTermsTemplate,
  cloneTermsTemplate,
  deleteTermsTemplate,
  getTermsTemplateById,
  getTermsTemplates,
  updateTermsTemplate
} from '../controllers/billingTemplate.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const billingTemplate = Router()

/* Terms & Condition Template */
// billingTemplate.get('/billing-templates/terms', getTermsTemplates)
// billingTemplate.post('/billing-templates/terms', addTermsTemplate)
// billingTemplate.get('/billing-templates/terms/:id', getTermsTemplateById)
// billingTemplate.put('/billing-templates/terms/:id', updateTermsTemplate)
// billingTemplate.delete('/billing-templates/terms/:id', deleteTermsTemplate)

billingTemplate
  .route('/billing-templates/terms')
  .get(authenticated, getTermsTemplates)
  .post(authenticated, addTermsTemplate)

billingTemplate
  .route('/billing-templates/terms/:id')
  .get(authenticated, getTermsTemplateById)
  .put(authenticated, updateTermsTemplate)
  .delete(authenticated, deleteTermsTemplate)

billingTemplate.route('/billing-templates/terms/clone/:id').post(authenticated, cloneTermsTemplate)
/*  */

export default billingTemplate
