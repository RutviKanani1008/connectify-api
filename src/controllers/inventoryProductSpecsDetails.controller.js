// ==================== Packages =======================
import { ObjectId } from 'mongodb'
import { getSelectParams } from '../helpers/generalHelper'

// ====================================================
import generalResponse from '../helpers/generalResponse.helper'
import {
  createProductSpecRepo,
  deleteProductSpecRepo,
  findProductSpecsRepo,
  findProductSpecsAllRepo,
  updateProductSpecRepo,

} from '../repositories/inventoryProductSpecsDetails.repository'

export const createProductSpecs = async (req, res) => {
  try {
    const { name } = req.body
    if (!name) {
      return generalResponse(res, false, { text: 'Product Specs is required.' }, 'error', false, 400)
    }

    const isExist = await findProductSpecsRepo({
      company: req?.headers?.authorization?.company,
      name: req.body.name,
      type: req.body.type
    })

    if (isExist) {
      return generalResponse(res, true, { text: 'Option already exists.' }, 'error', false, 400)
    }
    const productCategory = await createProductSpecRepo({
      name: req.body.name,
      type: req.body.type,
      defaultValue: req.body.defaultValue,
      company: req?.headers?.authorization?.company
    })

    return generalResponse(res, productCategory, 'Option created successfully.', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const saveDefaultValues = async (req, res) => {
  try {
    const defaultData = Object.values(req.body);
    defaultData.forEach(async(item) => {
     await findProductSpecsRepo({
        company: req?.headers?.authorization?.company,
        _id: item
      }).then(async(savedData) =>
        await findProductSpecsAllRepo({
          company: req?.headers?.authorization?.company,
          type: savedData.type,
        }).then(async(allRecords) =>
         await allRecords.forEach(async (record) => {
              await updateProductSpecRepo({ _id: record._id }, { defaultValue: false })
          })
        ).then(async() => {
          await updateProductSpecRepo({ _id: item }, { defaultValue: true })
        })
      )
    });
    return generalResponse(res,null, 'Default value Saved Successfully.', 'success', true)
  
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getProductSpecs = async (req, res) => {
  try {

    const productSpecs = await findProductSpecsAllRepo(
      { company: ObjectId(req?.headers?.authorization?.company) },
      getSelectParams(req)
    )
    return generalResponse(res, productSpecs, '', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const checkProductSpecIsExist = async (req, res) => {
  try {
    const isExist = await findProductSpecsRepo({
      company: req?.headers?.authorization?.company,
      name: req.query?.name,
      type: req.query?.type
    })
    if (isExist) {
      return generalResponse(res, true, { text: 'Option already exists.' }, 'error', false, 400)
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

export const updateProductSpecsById = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) {
      return generalResponse(res, true, { text: 'Id is required.' }, 'error', false, 400)
    }
    const isExist = await findProductSpecsRepo({
      company: req?.headers?.authorization?.company,
      name: req.body.name,
      type: req.body.type
    })

    if (isExist) {
      return generalResponse(res, true, { text: 'Option already exists.' }, 'error', false, 400)
    }
  
    await updateProductSpecRepo({ _id: id }, { ...req.body })
    return generalResponse(res, null, 'Option updated successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteProductSpecById = async (req, res) => {
  try {
    const { id } = req.params

    const productSpec = await findProductSpecsRepo({ _id: id, isDeleted: false })
    if (!productSpec) {
      return generalResponse(res, false, { text: 'Option not found.' }, 'error', false, 400)
    }

    await deleteProductSpecRepo({ _id: req.params.id })

    return generalResponse(res, null, 'Option deleted successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
