import { Router } from 'express'
import {
  addCompany,
  assignMemberPipeline,
  createCompanyMember,
  getAllCompanyUser,
  getCompanies,
  getSpecificCompany,
  updateContactStages,
  updateCompanyDetail,
  updateCompanyMember,
  updateCompanyNotes,
  updateCompanyNotesById,
  updateMemberStatus,
  validateCompany,
  deleteCompanyByID,
  getFilteredCompanies,
  archiveCompany
} from '../controllers/company.controller'
import { getTagsAndCategoryDetails } from '../controllers/tags.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const company = Router()

company.get('/company', getCompanies)
company.get('/company/all', getFilteredCompanies)

company.get('/company/:id', authenticated, getSpecificCompany)
company.get('/validateCompany', validateCompany)
company.get('/companyUser', authenticated, getAllCompanyUser)
company.get('/tagsAndCategory', authenticated, getTagsAndCategoryDetails)

company.post('/company', authenticated, addCompany)
company.post('/company-member', authenticated, createCompanyMember)
company.post('/assign-pipeline', authenticated, assignMemberPipeline)

company.put('/company/:id', authenticated, updateCompanyDetail)
company.put('/company/archive/:id', authenticated, archiveCompany)
company.put('/updateCompanyNote/:id', authenticated, updateCompanyNotes)
company.put('/updateCompanyNotes/:id', authenticated, updateCompanyNotesById)
company.put('/updateContactStage/:id', authenticated, updateContactStages)
company.put('/company-member/:id', authenticated, updateCompanyMember)
company.put('/company-member-status/:id', authenticated, updateMemberStatus)

company.delete('/company/:id', authenticated, deleteCompanyByID)

export default company
