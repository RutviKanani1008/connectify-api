// ==================== Packages =======================
import { ObjectId } from 'mongodb'
import { getSelectParams } from '../helpers/generalHelper'

// ====================================================
import generalResponse from '../helpers/generalResponse.helper'
import {
  createProductCriteriaRepo,
  findProductCriteriaAllRepo,
  updateProductCriteriaRepo,
  findProductCriteriaRepo,
  deleteProductCriteriaRepo,
  criteriaBulkWrite
} from '../repositories/inventoryProductCriteria.repository'

export const createProductCriteria = async (req, res) => {
  try {
    const { label } = req.body

    if (!label) {
      return generalResponse(res, false, { text: 'Label  is required.' }, 'error', false, 400)
    }

    const isExist = await findProductCriteriaRepo({
      nameId: label.replace(/ /g, '-').toLowerCase(),
      company: req?.headers?.authorization?.company
    })

    if (isExist) {
      return generalResponse(res, null, { text: 'Criteria Field already exists.' }, 'error')
    }

    const productCategory = await createProductCriteriaRepo({
        nameId: label.replace(/ /g, '-').toLowerCase(),
        company: req?.headers?.authorization?.company,
        order: 0,
        ...req.body
      })
      return generalResponse(res, productCategory, 'Criteria Field created successfully.', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const reOrderCriteria = async (req, res) => {
  try {
    let data = req.body
    data = data?.map((obj, index) => ({
      updateOne: {
        filter: {
          _id: obj._id
        },
        update: {
          order: index
        }
      }
    }))
    const criteria = await criteriaBulkWrite(data || [])
    return generalResponse(res, criteria, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getProductCriteria = async (req, res) => {
  try {
    const criteria = await findProductCriteriaAllRepo(
      { company: ObjectId(req?.headers?.authorization?.company) },
      getSelectParams(req)
    )
    return generalResponse(res, criteria, '', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const checkProductCriteriaIsExist = async (req, res) => {
  try {
    const label = req.query?.label
    const isExist = await findProductCriteriaRepo({
      nameId: label.replace(/ /g, '-').toLowerCase(),
      company: req?.headers?.authorization?.company
    })
    if (isExist) {
      return generalResponse(res, true, { text: 'Criteria Field already exists.' }, 'error', false, 400)
    }
    return generalResponse(res, null)
  } catch (error) {
    console.log(error);
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getProductCriteriaDetails = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return generalResponse(res, null, { text: 'Id is required.' }, 'error')
    const criteria = await findProductCriteriaRepo({ _id: id }, getSelectParams(req))
    return generalResponse(res, criteria, '', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateProductCriteriaById = async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return generalResponse(res, false, { text: 'Category id is required.' }, 'error', false, 400)
    }

    const isExist = await findProductCriteriaRepo({
      nameId: req.body.label.replace(/ /g, '-').toLowerCase(),
      company: req?.headers?.authorization?.company,
      _id: { $ne: id }
    })

    if (isExist) {
      return generalResponse(res, null, { text: 'Criteria Field already exists.' }, 'error')
    }
    const criteria = await findProductCriteriaRepo({ _id: id })
    if (!criteria) {
      return generalResponse(res, false, { text: 'Criteria Field not found.' }, 'error', false, 400)
    }
     const updatedCriteria = {
        ...req.body,
        nameId: req.body.label.replace(/ /g, '-').toLowerCase()
    }
     await updateProductCriteriaRepo({ _id: req.params.id }, updatedCriteria)
      return generalResponse(res, null, 'Category updated successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteProductCriteriaById = async (req, res) => {
  try {
    const { id } = req.params
    const criteria = await findProductCriteriaRepo({ _id: id, isDeleted: false })

    if (!criteria) {
      return generalResponse(res, false, { text: 'Criteria not found.' }, 'error', false, 400)
    }
     await deleteProductCriteriaRepo({ _id: req.params.id })
      return generalResponse(res, null, 'Criteria Field deleted successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
