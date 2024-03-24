import { getSelectParams } from '../helpers/generalHelper'
import generalResponse from '../helpers/generalResponse.helper'
import {
  bulkUpdateDocuments,
  createDocumentRepo,
  deleteDocumentRepo,
  findAllDocumentRepo,
  findDocumentByIdRepo,
  findDocumentWithAggregation,
  findDocumentWithAggregationCount,
  getAllDocumentCountRepo,
  updateDocumentOrderRepo,
  updateDocumentRepo,
  updateManyDocument
} from '../repositories/documents.repository'
import { deleteFolder, findFolder } from '../repositories/folder.repository'
import { parseData } from '../utils/utils'
import { ObjectId } from 'mongodb'
import _ from 'lodash'
import { deleteAttachmentFromWasabi } from '../middlewares/fileUploader'

export const documentFileUpload = async (req, res) => {
  try {
    if (req?.files?.length) {
      return generalResponse(
        res,
        req?.files?.map((file) => {
          return file.key
        }),
        'success'
      )
    } else {
      throw new Error('')
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const createDocument = async (req, res) => {
  try {
    const count = await getAllDocumentCountRepo({ archived: false })
    const document = await createDocumentRepo({ ...req.body, order: count })
    const { removeAttachments = [] } = req.body
    if (_.isArray(removeAttachments) && removeAttachments.length > 0) {
      await deleteAttachmentFromWasabi(removeAttachments)
    }
    return generalResponse(res, document, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getDocumentDetail = async (req, res) => {
  try {
    const document = await findDocumentByIdRepo({ _id: req.params.id })
    return generalResponse(res, document, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateDocumentsFolder = async (req, res) => {
  try {
    const { files, folder: folderId } = req.body
    await updateManyDocument({ _id: { $in: files } }, { $set: { folder: folderId } }, { multi: true })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteDocumentsFolder = async (req, res) => {
  try {
    const folderId = req.params.folderId
    const count = await getAllDocumentCountRepo({ archived: true })
    const allDocuments = await findAllDocumentRepo({ folder: folderId })
    const docsToUpdate = allDocuments.map((d, idx) => ({
      _id: d._id,
      updateValue: { folder: null, archived: true, order: count + idx + 1 }
    }))
    await bulkUpdateDocuments(docsToUpdate)
    await deleteFolder({ _id: folderId })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getDocuments = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company: companyId } = currentUser
    let { limit = 10, page = 1, search = '', sort, archived = false, contactId = false, folderId = false } = req.query
    const project = { ...getSelectParams(req) }
    const skip = Number(limit) * Number(page) - Number(limit)
    sort = parseData(sort)

    const $and = [{ archived: archived === 'true' }]
    if (companyId) {
      $and.push({ company: ObjectId(companyId) })
    }

    if (contactId) {
      $and.push({ contact: ObjectId(contactId) })
    } else {
      $and.push({ contact: null })
    }
    if (folderId) {
      if (folderId === 'unassigned') $and.push({ folder: null })
      else $and.push({ folder: ObjectId(folderId) })
    }
    if (search) {
      const reg = new RegExp(search, 'i')
      $and.push({
        $or: [{ name: { $regex: reg } }, { document: { $regex: reg } }]
      })
    }

    const match = { ...($and.length ? { $and } : {}) }

    const total = await findDocumentWithAggregationCount({
      match
    })

    const documents = await findDocumentWithAggregation({ limit: Number(limit), skip, match, sort, project })
    return generalResponse(res, { results: documents, pagination: { total: total?.[0]?.count || 0 } }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateDocument = async (req, res) => {
  try {
    let order
    const thisDocument = await findDocumentByIdRepo(req.params.id)
    if (req.body?.orderChange) {
      if (req.body?.archived === false || req.body?.archived === true) {
        const count = await getAllDocumentCountRepo({ archived: req.body?.archived })
        order = count
      }
      if (thisDocument?.folder) {
        const folder = await findFolder({ _id: thisDocument?.folder })
        if (!folder) {
          req.body.folder = null
        }
      }
      const higherOrderDocuments = await findAllDocumentRepo({
        archived: !req.body?.archived,
        order: { $gt: thisDocument.order }
      })
      const updateOrderPayload = higherOrderDocuments.map((el) => ({ _id: el._id, order: el.order - 1 }))
      await updateDocumentOrderRepo(updateOrderPayload)
    }
    await updateDocumentRepo({ _id: req.params.id }, { ...req.body, ...((order || order === 0) && { order }) })

    // remove attachments from s3
    const { removeAttachments = [] } = req.body
    if (_.isArray(removeAttachments) && removeAttachments.length > 0) {
      await deleteAttachmentFromWasabi(removeAttachments)
    }
    const documentDetail = await findDocumentByIdRepo({ _id: req.params.id })

    return generalResponse(res, documentDetail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteDocument = async (req, res) => {
  try {
    const documentDetail = await findDocumentByIdRepo({ _id: req.params.id })
    if (documentDetail?.document) {
      await deleteAttachmentFromWasabi([documentDetail?.document])
    }
    await deleteDocumentRepo({ _id: req.params.id })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateDocumentOrder = async (req, res) => {
  try {
    const document = await updateDocumentOrderRepo(req.body?.orderObjArray ?? [])
    return generalResponse(res, document, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
