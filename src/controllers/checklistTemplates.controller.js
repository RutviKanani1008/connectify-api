import generalResponse from '../helpers/generalResponse.helper'
import {
  createChecklistTemplate,
  deleteChecklistTemplates,
  findOneChecklistTemplate,
  findChecklistTemplates,
  updateChecklistTemplate,
  updateManyChecklist,
  updateChecklistOrderRepo,
  countChecklistTemplates,
  createChecklistTemplateToContacts
} from '../repositories/checklistTemplates.repository'
import { createFolder, findFolder } from '../repositories/folder.repository'
import { getSelectParams } from '../helpers/generalHelper'
import { ObjectId } from 'mongodb'
import path from 'path'
import excelJS from 'exceljs'
import _ from 'lodash'
import { convert } from 'html-to-text'
export const getChecklistTemplates = async (req, res) => {
  try {
    const { search, page = 1, limit = 1000 } = req.query
    const currentUser = req.headers.authorization
    const q = req?.query
    const { folder } = req.query
    if (!folder) {
      req.query.folder = null
    }
    q.company = currentUser.company

    q.contact = q.contact || null

    if (search && search !== '') {
      const searchString = search.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') // replacing special characters allowed in regex
      const searchReg = new RegExp(searchString, 'i')

      const searchQuery = [
        {
          name: { $regex: searchReg }
        },
        {
          'checklist.title': { $regex: searchReg }
        }
      ]
      q.$or = searchQuery
      delete req.query.search
    }

    const templates = await findChecklistTemplates(q, getSelectParams(req), limit * (page - 1), limit)
    const total = await countChecklistTemplates(q)
    return generalResponse(res, { results: templates, totalChecklist: total }, 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getExportChecklistTemplates = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const q = req?.query
    const { folder } = req.query
    if (!folder) {
      req.query.folder = null
    }
    q.company = currentUser.company

    q.contact = q.contact || null
    const templates = await findChecklistTemplates(q, getSelectParams(req))
    const folderDetail = await findFolder({ _id: new ObjectId(req.query.folder) })

    const __dirname = path.resolve()
    const workbook = new excelJS.Workbook()
    const worksheet = workbook.addWorksheet('Checklist')

    const columnHeaderData = {
      name: 'Checklist Name'
    }

    const checklistHeader = {
      title: 'Checklists',
      details: 'Details'
    }
    if (_.isArray(templates)) {
      templates.forEach((obj) => {
        worksheet.addRow(Object.values(columnHeaderData)).eachCell((cell) => {
          cell.font = { bold: true }
          cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left', shrinkToFit: true }
        })
        worksheet.addRow([obj.name]).eachCell((cell) => {
          cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left', shrinkToFit: true }
        })
        worksheet.addRow([]).eachCell((cell) => {
          cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left', shrinkToFit: true }
        })

        worksheet.addRow(Object.values(checklistHeader)).eachCell((cell) => {
          cell.font = { bold: true }
          cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left', shrinkToFit: true }
        })

        // Checklist Details
        obj.checklist.forEach((checklist) => {
          worksheet.addRow([checklist?.title, convert(checklist?.details)]).eachCell((cell) => {
            cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left', shrinkToFit: true }
          })
        })
        worksheet.addRow([]).eachCell((cell) => {
          cell.alignment = { wrapText: true, vertical: 'top' }
        })
      })
    }
    worksheet.columns?.forEach(function (column, i) {
      column.width = 40
    })
    const filePath = `/files/${folderDetail?.folderId || 'checklist'}-${Date.now()}.xlsx`
    await workbook.xlsx.writeFile(`${__dirname}/public${filePath}`)

    return generalResponse(res, filePath, 'success')
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const checkChecklistTemplateAlreadyExist = async (req, res) => {
  try {
    const currentUser = req.headers.authorization
    const { name, id } = req.query

    if (!name) {
      return generalResponse(res, false, { text: 'Template name is required.' }, 'error', false, 400)
    }

    const isExist = await findOneChecklistTemplate({
      name,
      company: currentUser.company,
      _id: { $ne: id }
    }).select({
      _id: 1
    })
    if (isExist) {
      return generalResponse(res, false, { text: 'Template Already Exist with this name.' }, 'error', false, 400)
    }
    return generalResponse(res, null, 'Template Available')
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificChecklistDetail = async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return generalResponse(res, false, { text: 'Checklist id is required.' }, 'error', false, 400)
    }

    const checklistDetail = await findOneChecklistTemplate(
      {
        _id: id
      },
      {},
      [
        { path: 'company', select: { name: 1, email: 1 } },
        { path: 'folder', select: { folderId: 1, folderName: 1 } }
      ]
    )
    if (!checklistDetail) {
      return generalResponse(res, false, { text: 'Checklist Not Exist.' }, 'error', false, 400)
    }
    return generalResponse(res, checklistDetail, null)
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const saveChecklistTemplate = async (req, res) => {
  try {
    const data = req.body
    data.company = req.headers.authorization.company
    let saved = null
    if (data._id) {
      const { name, checklist, _id, folder } = data
      await updateChecklistTemplate({ _id }, { name, checklist, folder })
      saved = await findOneChecklistTemplate({ _id })
      return generalResponse(res, saved, 'Template updated successfully!', 'success', true)
    } else {
      const tempObj = await findChecklistTemplates({
        folder: ObjectId(req.body?.folder),
        company: ObjectId(data.company)
      })
      saved = await createChecklistTemplate({ ...data, order: tempObj.length + 1 })
      return generalResponse(res, saved, 'Template created successfully!', 'success', true)
    }
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteChecklistTemplate = async (req, res) => {
  try {
    const template = await findOneChecklistTemplate({ _id: req.params.id }).select({ _id: 1 })
    if (template) {
      await deleteChecklistTemplates({ _id: req.params.id })
      return generalResponse(res, true, 'success')
    }
    return generalResponse(
      res,
      false,
      { text: 'Checklist Template does not exists in your company' },
      'error',
      false,
      400
    )
  } catch (e) {
    return generalResponse(res, e, '', 'error', false, 400)
  }
}

export const cloneChecklistTemplate = async (req, res) => {
  try {
    const template = await findOneChecklistTemplate({ _id: req.params.id })
    const templateDetails = JSON.parse(JSON.stringify(template))
    if (templateDetails) {
      templateDetails.name = `Copy of ${templateDetails.name}`
    }
    delete templateDetails._id
    delete templateDetails.updatedAt
    delete templateDetails.createdAt
    const cloneTemplateDetail = await createChecklistTemplate({ ...templateDetails })
    return generalResponse(res, cloneTemplateDetail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const copyChecklistTemplateToContacts = async (req, res) => {
  try {
    const { contactIds } = req.body
    await createChecklistTemplateToContacts(contactIds, req.params.id)
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const copyChecklistTemplateToCompany = async (req, res) => {
  try {
    const currentUser = req.headers.authorization

    const checklistDetail = await findOneChecklistTemplate(
      {
        _id: req.params.id
      },
      {},
      [
        { path: 'company', select: { name: 1, email: 1 } },
        { path: 'folder', select: { folderId: 1, folderName: 1 } }
      ]
    )
    if (!checklistDetail) {
      return generalResponse(
        res,
        false,
        { text: 'Checklist Template does not exists in your company' },
        'error',
        false,
        400
      )
    }

    if (checklistDetail?.folder) {
      //
      let isFolderExsistInCompany = await findFolder({
        company: currentUser?.company,
        folderFor: 'checklist',
        model: null,
        modelRecordId: null,
        folderId: checklistDetail?.folder?.folderId,
        folderName: checklistDetail?.folder?.folderName
      })

      if (!isFolderExsistInCompany) {
        // create a new folder if not exist
        isFolderExsistInCompany = await createFolder({
          folderId: checklistDetail?.folder?.folderId,
          folderName: checklistDetail?.folder?.folderName,
          company: currentUser?.company,
          folderFor: 'checklist',
          model: null,
          modelRecordId: null,
          order: 0
        })
      }

      if (isFolderExsistInCompany) {
        await createChecklistTemplate({
          folder: isFolderExsistInCompany?._id,
          name: checklistDetail.name,
          contact: null,
          company: currentUser?.company,
          order: 0,
          checklist: checklistDetail?.checklist || []
        })
      }
    } else {
      await createChecklistTemplate({
        folder: null,
        name: checklistDetail.name,
        contact: null,
        company: currentUser?.company,
        order: 0,
        checklist: checklistDetail?.checklist || []
      })
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateChecklistFolder = async (req, res) => {
  try {
    const { checklist, folder: folderId } = req.body

    await updateManyChecklist({ _id: { $in: checklist } }, { $set: { folder: folderId } }, { multi: true })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateChecklistOrder = async (req, res) => {
  try {
    const checklist = await updateChecklistOrderRepo(req.body?.orderObjArray ?? [])
    return generalResponse(res, checklist, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
