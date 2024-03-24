import { ChecklistTemplates } from '../models/checklistTemplate'
import { upsertFolder } from './folder.repository'

const findChecklistTemplates = (params, projection = {}, skip = 0, limit = 1000) => {
  return ChecklistTemplates.find(params, projection).sort({ createdAt: -1 }).skip(skip).limit(limit)
}

const findOneChecklistTemplate = (params, projection = {}, populate = []) => {
  return ChecklistTemplates.findOne(params, projection).populate(populate)
}

const createChecklistTemplate = (data) => {
  return ChecklistTemplates.create(data)
}

const updateChecklistTemplate = (search, data) => {
  return ChecklistTemplates.findByIdAndUpdate(search, data)
}

const deleteChecklistTemplates = (params) => {
  return ChecklistTemplates.delete(params)
}

const updateManyChecklist = (search, updateValue, updateMulti) => {
  return ChecklistTemplates.update(search, updateValue, updateMulti)
}

const createChecklistTemplateToContacts = async (contactIds, checklistId) => {
  const template = await findOneChecklistTemplate(
    { _id: checklistId },
    {
      name: 1,
      company: 1,
      'checklist.title': 1,
      'checklist.details': 1,
      'checklist.checked': 1,
      'checklist.sort': 1,
      _id: 0
    },
    { path: 'folder', select: '-_id folderId folderName company' }
  ).lean()

  const templateFolder = template.folder

  const documents = await Promise.all(
    contactIds.map(async (contactId) => {
      const folder = await upsertFolder(
        { folderId: templateFolder.folderId, modelRecordId: contactId, model: 'Contacts', folderFor: 'checklist' },
        {
          ...templateFolder,
          modelRecordId: contactId,
          model: 'Contacts',
          order: 0,
          folderFor: 'checklist'
        }
      )
      // find the last order value
      const lastOrder = await ChecklistTemplates.findOne({
        contact: contactId,
        folder: folder._id
      })
        .sort({ order: -1 })
        .select('order')

      return {
        ...template,
        contact: contactId,
        folder: folder._id,
        order: (lastOrder?.order ?? 0) + 1
      }
    })
  )
  const result = await ChecklistTemplates.insertMany(documents)
  return result
}

const updateChecklistOrderRepo = (orderObjArray) => {
  const tempOrderObjArray = orderObjArray?.map((obj) => ({
    updateOne: {
      filter: {
        _id: obj._id
      },
      update: {
        order: obj.order
      }
    }
  }))
  return ChecklistTemplates.bulkWrite(tempOrderObjArray)
}

const countChecklistTemplates = (params) => {
  return ChecklistTemplates.count(params)
}

export {
  findOneChecklistTemplate,
  findChecklistTemplates,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplates,
  updateManyChecklist,
  updateChecklistOrderRepo,
  countChecklistTemplates,
  createChecklistTemplateToContacts
}
