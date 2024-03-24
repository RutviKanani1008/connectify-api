import generalResponse from '../helpers/generalResponse.helper'
import { findContact, updateContactAPI } from '../repositories/contact.repository'
import { findOneCompany, updateCompany } from '../repositories/companies.repository'
import { findUser, updateUser } from '../repositories/users.repository'
import { findProduct, updateProduct } from '../repositories/product.repository'
import { deleteAttachmentFromWasabi } from '../middlewares/fileUploader'
import _ from 'lodash'

export const uploadFiles = async (req, res) => {
  try {
    const { socketInstance } = req
    const { ...details } = req.body
    if (details?.removeAttachments) {
      if (_.isArray(details?.removeAttachments) && details?.removeAttachments.length) {
        await deleteAttachmentFromWasabi(details?.removeAttachments)
      } else {
        await deleteAttachmentFromWasabi([details?.removeAttachments])
      }
    }

    if (req?.files?.[0]?.key) {
      if (details?.model === 'company' && details?.id && details?.field) {
        const company = await findOneCompany({ _id: details.id })
        company[details.field] = req?.files?.[0]?.key
        await updateCompany({ _id: details.id }, company)
      }
      if (details?.model === 'users' && details?.id && details?.field) {
        const user = await findUser({ _id: details.id })
        user[details.field] = req?.files?.[0]?.key
        await updateUser({ _id: details.id }, user)
      }
      if (details?.model === 'contact' && details?.id && details?.field) {
        const contact = await findContact({ _id: details.id })
        contact[details.field] = req?.files?.[0]?.key
        await updateContactAPI({ _id: details.id }, contact)
      }
      if (details?.model === 'products' && details?.id && details?.field) {
        const product = await findProduct({ _id: details.id })
        product[details.field] = req?.files?.[0]?.key
        await updateProduct({ _id: details.id }, product)
      }
      socketInstance && socketInstance.emit('uploadProgress', 100)
      return generalResponse(res, req?.files?.[0]?.key, 'success')
    } else {
      throw new Error('')
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const removeUploadAttachment = async (req, res) => {
  try {
    const { attachmentUrl, modelDetail = null } = req.body
    if (_.isArray(attachmentUrl) && attachmentUrl.length > 0) {
      await deleteAttachmentFromWasabi(attachmentUrl)
    }
    if (modelDetail) {
      if (modelDetail?.model === 'company' && modelDetail?.id) {
        const company = await findOneCompany({ _id: modelDetail?.id })
        company.companyLogo = null
        await updateCompany({ _id: modelDetail.id }, company)
      }
      if (modelDetail?.model === 'users' && modelDetail?.id) {
        const user = await findUser({ _id: modelDetail?.id })
        user.userProfile = null
        await updateUser({ _id: modelDetail?.id }, user)
      }
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}
