import { getSelectParamsFromBody } from '../helpers/generalHelper'
import generalResponse from '../helpers/generalResponse.helper'
import { ObjectId } from 'mongodb'
import {
  deleteImportProduct,
  findImportProduct,
  findImportProductWithAggregationCount,
  findImportProductWithAggregationErrorCount,
  findImportProductsWithAggregation, multipleDeleteImportProduct, updateImportProduct
} from '../repositories/imported-products.repository'
import { deleteImportProductsJob, findImportProductsJob, updateImportProductsJob } from '../repositories/import-products-jobs.repository'
import { createImportProductsSchedulerJob } from '../schedular-jobs/import-products/importProductsJobSchedularQueue.helper'

export const getCurrentImportProducts = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { company: companyId } = currentUser
    const { limit = 10, page = 1, productErrors, currentImportedProduct } = req.body
    const project = { ...getSelectParamsFromBody(req) }
    const skip = Number(limit) * Number(page) - Number(limit)

    let errorQuery = false
    if (productErrors === 'all') {
      errorQuery = false
    } else if (productErrors === 'totalContactsWithError') {
      errorQuery = { productErrors: { $ne: null } }
    } else if (productErrors === 'contactsWithNoError') {
      errorQuery = { productErrors: { $eq: null } }
    } else if (productErrors) {
      errorQuery = { [`contactErrors.${productErrors}`]: true }
    }

    const total = await findImportProductWithAggregationCount({
      match: {
        company: ObjectId(companyId),
        importedProduct: ObjectId(currentImportedProduct),
        ...(errorQuery && errorQuery)
      }
    })

    let errorsCount = await findImportProductWithAggregationErrorCount({
      match: {
        company: ObjectId(companyId),
        importedProduct: ObjectId(currentImportedProduct),
        productErrors: { $ne: null }
      }
    })

    errorsCount = errorsCount?.[0]
    delete errorsCount?._id
    const totalErrors = await findImportProductWithAggregationCount({
      match: {
        company: ObjectId(companyId),
        importedProduct: ObjectId(currentImportedProduct),
        productErrors: { $ne: null }
      }
    })

    const importProducts = await findImportProductsWithAggregation({
      limit: Number(limit),
      skip,
      match: {
        company: ObjectId(companyId),
        importedProduct: ObjectId(currentImportedProduct),
        ...(errorQuery && errorQuery)
        // contactErrors: { $ne: null }
      },
      project
    })
    return generalResponse(
      res,
      {
        data: importProducts,
        pagination: { total: total?.[0]?.count || 0, totalErrors: totalErrors?.[0]?.count || 0 },
        importErrors: {
          ...errorsCount,
          totalErrors: totalErrors?.[0]?.count || 0
        }
      },
      'success'
    )
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateCurrentImportProducts = async (req, res) => {
  try {
    const currentImportProduct = ObjectId(req.params.id)
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const isCurrentImportProductExist = await findImportProduct({
      _id: currentImportProduct,
      company: ObjectId(currentUser.company)
    })
    if (!isCurrentImportProductExist) {
      return generalResponse(res, false, { text: 'Import Product Not Exists.' }, 'error', false, 400)
    }
    if (!req.body?.title && !req.body?.sku && !req.body?.quantity) {
      return generalResponse(res, false, { text: 'Required field missing' }, 'error', false, 400)
    }
    if (isCurrentImportProductExist && req.body?.title && req.body?.sku && req.body?.quantity) {
      // console.log({ isCurrentImportContactExist })
      let productErrors = {}

      if (!Object.values(productErrors).includes(true)) {
        productErrors = null
      }

      await updateImportProduct(
        { _id: ObjectId(currentImportProduct) },
        { productErrors, data: req.body }
      )

      const updatedImportProduct = await findImportProduct({
        _id: currentImportProduct,
        company: ObjectId(currentUser.company)
      })
      return generalResponse(res, updatedImportProduct, 'success')
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
export const importFinalProducts = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const currentImportProduct = ObjectId(req.params.id)
    const isCurrentImportedProductJobExist = await findImportProductsJob({
      _id: currentImportProduct,
      company: ObjectId(currentUser.company)
    })

    if (!isCurrentImportedProductJobExist) {
      return generalResponse(res, false, { text: 'Import Product Not Exists.' }, 'error', false, 400)
    }
    const job = await createImportProductsSchedulerJob(
      {
        importProducts: currentImportProduct,
        company: ObjectId(currentUser.company),
        currentUser
      },
      0
    )
    if (job.id) {
      await updateImportProductsJob(
        { _id: ObjectId(currentImportProduct), company: ObjectId(currentUser.company) },
        { job: job.id }
      )
    }

    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteCurrentImportProducts = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const deletedImportProduct = await deleteImportProduct({
      _id: ObjectId(req.params.id),
      company: ObjectId(currentUser.company)
    })

    if (deletedImportProduct && deletedImportProduct.acknowledged && deletedImportProduct.matchedCount === 0) {
      return generalResponse(res, false, { text: 'Import contact Not Exists.' }, 'error', false, 400)
    }

    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteImportProducts = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    if (!req.params.id) {
      return generalResponse(res, false, { text: 'Id is required.' }, 'error', false, 400)
    }
    const deletedImportProduct = await multipleDeleteImportProduct({
      importedProduct: ObjectId(req.params.id),
      company: ObjectId(currentUser.company)
    })

    if (deletedImportProduct && deletedImportProduct.acknowledged && deletedImportProduct.matchedCount === 0) {
      return generalResponse(res, false, { text: 'Import Product Not Exists.' }, 'error', false, 400)
    }

     await deleteImportProductsJob({
      _id: ObjectId(req.params.id),
      company: ObjectId(currentUser.company)
     })

    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
