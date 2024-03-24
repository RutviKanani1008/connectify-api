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
} from '../repositories/inventoryProductCategory.repository'
import {
  createWooProductCategories,
  deleteWooProductCategories,
  updateWooProductCategories
} from './wooCommerceController'
import { findProduct } from '../repositories/inventoryProduct.repository'

export const createProductCategory = async (req, res) => {
  try {
    const { name } = req.body
    const companyId = req?.headers?.authorization?.company

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
    const wooData = await createWooProductCategories(companyId, name)
    if (wooData && wooData.id) {
      const productCategory = await createProductCategoryRepo({
        nameId: name.replace(/ /g, '-').toLowerCase(),
        name: req.body.name,
        company: req?.headers?.authorization?.company,
        wooID: wooData.id
      })
      return generalResponse(res, productCategory, 'Category created successfully.', 'success', true)
    } else {
      return generalResponse(res, wooData, { text: wooData.message }, 'error', false, 400)
    }
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
    const companyId = req?.headers?.authorization?.company

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
    const wooData = await updateWooProductCategories(companyId, name, productCategory.wooID)
    if (wooData && wooData.id) {
      const updatedProductCategory = {
        name,
        nameId: name.replace(/ /g, '-').toLowerCase()
      }
      await updateProductCategoryRepo({ _id: req.params.id }, updatedProductCategory)
      return generalResponse(res, null, 'Category updated successfully!', 'success', true)
    } else {
      return generalResponse(res, wooData, { text: wooData.message }, 'error', false, 400)
    }
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteProductCategoryById = async (req, res) => {
  try {
    const { id } = req.params
    const companyId = req?.headers?.authorization?.company

    const productCategory = await findProductCategoryRepo({ _id: id, isDeleted: false })
    const isProductExists = await findProduct({
      category: ObjectId(id),
      company: req?.headers?.authorization?.company
    })
    console.log(isProductExists)

    if (isProductExists) {
      return generalResponse(
        res,
        false,
        { text: 'Product with  this Category is present can`t delete.' },
        'error',
        false,
        400
      )
    }
    if (!productCategory) {
      return generalResponse(res, false, { text: 'Category not found.' }, 'error', false, 400)
    }
    const wooData = await deleteWooProductCategories(companyId, productCategory.wooID)
    if (wooData && wooData.id) {
      await deleteProductCategoryRepo({ _id: req.params.id })
      return generalResponse(res, null, 'Category deleted successfully!', 'success', true)
    } else {
      return generalResponse(res, wooData, { text: wooData.message }, 'error', false, 400)
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
