import generalResponse from '../helpers/generalResponse.helper'
import { validateContact } from '../models/contacts'
import { validateLodges } from '../models/companies'
import { validateRegisterUser } from '../models/users'

export const validateUser = async (res, user) => {
  const response = validateRegisterUser(user)
  if (response && response.error) {
    response.error &&
      response.error.details &&
      response.error.details.forEach((user) => {
        delete user.context
      })
    return generalResponse(res, null, response.error.details, 'error', false, 400)
  }
  return true
}

export const validateCompanyRequest = async (res, company) => {
  const companyResponse = validateLodges(company)
  if (companyResponse && companyResponse.error) {
    companyResponse.error &&
      companyResponse.error.details &&
      companyResponse.error.details.forEach((user) => {
        delete user.context
      })
    return generalResponse(res, null, companyResponse.error.details, 'error', false, 400)
  }
  return true
}

export const validateContactRequest = async (contact, res) => {
  const contactResponse = validateContact(contact)
  if (contactResponse && contactResponse.error) {
    contactResponse.error &&
      contactResponse.error.details &&
      contactResponse.error.details.forEach((user) => {
        delete user.context
      })
    return generalResponse(res, null, contactResponse.error.details, 'error', false, 400)
  }
  return true
}
