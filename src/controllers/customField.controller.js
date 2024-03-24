import generalResponse from '../helpers/generalResponse.helper'
import { ObjectId } from 'mongodb'
import {
  createCustomField,
  deleteCustomField,
  findAllCustomField,
  findCustomField,
  updateCustomField
} from '../repositories/customFields.repository'

export const getCustomFieldsDetails = async (req, res) => {
  try {
    const customFields = await findAllCustomField(req.query, { position: 1 })
    return generalResponse(res, customFields, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const addCustomFieldDetail = async (req, res) => {
  try {
    const { fieldName } = req.body
    const field = await findCustomField({
      fieldId: fieldName.replace(/ /g, '-').toLowerCase(),
      company: ObjectId(req.body.company),
      groupId: ObjectId(req.body.groupId)
    })
    console.log('field', field)
    if (field) {
      return generalResponse(res, false, { text: 'Category Already Exists.' }, 'error', false, 400)
    }
    const lastCustomField = await findCustomField(
      { company: ObjectId(req.body.company), groupId: req.body.groupId ? ObjectId(req.body.groupId) : null },
      { position: -1 }
    )
    console.log('lastCustomField', lastCustomField)
    const newCustomField = await createCustomField({
      fieldId: fieldName.replace(/ /g, '-').toLowerCase(),
      ...req.body,
      position: (lastCustomField?.position || 0) + 1
    })
    return generalResponse(res, newCustomField, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteCustomFieldDetail = async (req, res) => {
  try {
    const customField = await deleteCustomField({ _id: ObjectId(req.params.id) })
    if (customField && customField.acknowledged && customField.deletedCount === 0) {
      return generalResponse(res, false, { text: 'Custom Field Not Exists.' }, 'error', false, 400)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateCustomFieldDetail = async (req, res) => {
  try {
    const { fieldName } = req.body
    let isCustomFieldExists
    if (req.body.type === 'status') {
      isCustomFieldExists = await findCustomField({
        fieldId: fieldName.replace(/ /g, '-').toLowerCase(),
        company: ObjectId(req.body.company),
        active: req.body.active,
        groupId: ObjectId(req.body.groupId)
      })
    } else {
      isCustomFieldExists = await findCustomField({
        fieldId: fieldName.replace(/ /g, '-').toLowerCase(),
        company: ObjectId(req.body.company),
        groupId: ObjectId(req.body.groupId)
      })
    }
    if (isCustomFieldExists) {
      return generalResponse(res, false, { text: 'Custom Field Already Exists.' }, 'error', false, 400)
    }
    const updatedField = await updateCustomField(
      { _id: ObjectId(req.params.id), company: ObjectId(req.body.company) },
      { fieldId: fieldName.replace(/ /g, '-').toLowerCase(), ...req.body }
    )
    if (updatedField && updatedField.matchedCount === 0) {
      return generalResponse(res, false, { text: 'No Custom Field found.' }, 'error', false, 400)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
