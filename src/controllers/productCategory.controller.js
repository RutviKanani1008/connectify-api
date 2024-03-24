// ==================== Packages =======================
import { ObjectId } from 'mongodb'
import { getSelectParams } from '../helpers/generalHelper'

// ====================================================
import generalResponse from '../helpers/generalResponse.helper'
import {
  createProductCategoryRepo,
  deleteProductCategoryRepo,
  findProductCategoriesRepo,
  findProductCategoryRepo,
  updateProductCategoryRepo
} from '../repositories/productCategory.repository'

export const createProductCategory = async (req, res) => {
  try {
    const { name } = req.body
    if (!name) {
      return generalResponse(res, false, { text: 'Category name is required.' }, 'error', false, 400)
    }

    const isExist = await findProductCategoryRepo({
      nameId: name.replace(/ /g, '-').toLowerCase(),
      company: req?.headers?.authorization?.company
    })

    if (isExist) {
      return generalResponse(res, null, { text: 'Category already exists.' }, 'error')
    }
    const productCategory = await createProductCategoryRepo({
      nameId: name.replace(/ /g, '-').toLowerCase(),
      name: req.body.name,
      company: req?.headers?.authorization?.company
    })

    return generalResponse(res, productCategory, 'Category created successfully.', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getProductCategories = async (req, res) => {
  try {
    const products = await findProductCategoriesRepo(
      { company: ObjectId(req?.headers?.authorization?.company) },
      getSelectParams(req)
    )
    return generalResponse(res, products, '', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const checkProductCategoryIsExist = async (req, res) => {
  try {
    const name = req.query?.name
    const isExist = await findProductCategoryRepo({
      nameId: name.replace(/ /g, '-').toLowerCase(),
      company: req?.headers?.authorization?.company
    })
    if (isExist) {
      return generalResponse(res, true, { text: 'Category already exists.' }, 'error', false, 400)
    }
    return generalResponse(res, null)
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getProductCategory = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return generalResponse(res, null, { text: 'Id is required.' }, 'error')
    const productCategory = await findProductCategoryRepo({ _id: id }, getSelectParams(req))
    return generalResponse(res, productCategory, '', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateProductCategoryById = async (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body
    if (!id) {
      return generalResponse(res, false, { text: 'Category id is required.' }, 'error', false, 400)
    }

    const isExist = await findProductCategoryRepo({
      nameId: name.replace(/ /g, '-').toLowerCase(),
      company: req?.headers?.authorization?.company,
      _id: { $ne: id }
    })

    if (isExist) {
      return generalResponse(res, null, { text: 'Category already exists.' }, 'error')
    }
    const productCategory = await findProductCategoryRepo({ _id: id })
    if (!productCategory) {
      return generalResponse(res, false, { text: 'Category not found.' }, 'error', false, 400)
    }
    const updatedProductCategory = {
      name,
      nameId: name.replace(/ /g, '-').toLowerCase()
    }
    await updateProductCategoryRepo({ _id: req.params.id }, updatedProductCategory)
    return generalResponse(res, null, 'Category updated successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteProductCategoryById = async (req, res) => {
  try {
    const { id } = req.params

    const productCategory = await findProductCategoryRepo({ _id: id, isDeleted: false })
    if (!productCategory) {
      return generalResponse(res, false, { text: 'Category not found.' }, 'error', false, 400)
    }

    await deleteProductCategoryRepo({ _id: req.params.id })

    return generalResponse(res, null, 'Category deleted successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
