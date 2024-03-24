import { ObjectId } from 'mongodb'
import _ from 'lodash'
import { emitRequest } from '../../helper/socket-request.helper'
import { findAllImportProducts } from '../../repositories/imported-products.repository'
import { IMPORT_PRODUCTS_STATUS } from '../../models/import-products-job'
import { createImportProductsSchedulerChildJob } from './importProductsJobSchedularQueue.helper'
import { updateImportProductsJob } from '../../repositories/import-products-jobs.repository'
import { createMultipleProducts } from '../../repositories/inventoryProduct.repository'
import { createProductCategoryRepo, findProductCategoryRepo } from '../../repositories/inventoryProductCategory.repository'
import { createWooProduct, createWooProductCategories } from '../../controllers/wooCommerceController'
import { findProductCriteriaAllRepo } from '../../repositories/inventoryProductCriteria.repository'
import { createWooProductObj } from '../../controllers/inventoryProduct.controller'

const DEFAULT_PRODUCT_LOCATION = [
  {
    location: 'Website',
    isSelected: false,
    criteria: null
  },
  {
    location: 'Store',
    isSelected: false,
    criteria: null
  },
  {
    location: 'Junk',
    isSelected: false,
    criteria: null
  },
  {
    location: 'Auction',
    isSelected: false,
    criteria: null
  }
]

export const importProductScheduler = async (data, done) => {
  try {
    console.log('===🚀 Import Products Start ', new Date().getTime())
    await emitRequest({
      eventName: `current-queue-process-${data.company}`,
      eventData: { status: 'in_process', message: 'Importing Product is in process...' }
    })

    const importedProducts = await findAllImportProducts({
      importedProduct: data.importProducts,
      company: ObjectId(data.company),
      productErrors: null
    })

    await Promise.all(
      _.chunk(importedProducts || [], 100).map((product100BunchArray, index) =>
        createImportProductsSchedulerChildJob({
          ...data,
          batchIndex: index,
          totalProducts: importedProducts.length || 0,
          importedProducts: product100BunchArray
        })
      )
    ).then(async () => {
      console.log('===🚀 Import Products END : ', new Date().getTime())
      await updateImportProductsJob(
        { _id: data.importedProducts },
        { status: IMPORT_PRODUCTS_STATUS.success, errorReason: null }
      )
      return done()
    })
  } catch (error) {
    console.log('error here', error?.message ? error?.message : error)
    return done()
  }
}

export const importProductSchedulerChild = async (data, done) => {
  try {
    console.log('===🚀 Import Product --Child-- Process Start.=== : ', new Date().getTime())

    if (_.isArray(data?.importedProducts)) {
      const { currentUser } = data
      console.log(currentUser)
      const tempCreatedProducts = []
      await Promise.all(
        data.importedProducts.map(async (productData) => {
          const product = productData.data
          if (product.title && product.sku && product.quantity) {
            if (product.category) {
              const isExist = await findProductCategoryRepo({
                nameId: product.category.replace(/ /g, '-').toLowerCase(),
                company: ObjectId(currentUser.company)
              })
              if (isExist) {
                product.category = ObjectId(isExist._id)
              } else {
                const wooData = await createWooProductCategories(currentUser.company, product.category)
                if (wooData && wooData.id) {
                  const productCategory = await createProductCategoryRepo({
                    nameId: product.category.replace(/ /g, '-').toLowerCase(),
                    name: product.category,
                    company: currentUser.company,
                    wooID: wooData.id
                  })
                  product.category = ObjectId(productCategory._id)
                }
              }
            }
            if (product.locations) {
              const splitLocations = product.locations.split(',').map(item => item.trim().toLowerCase())
              const locationData = await handleProductLocation(splitLocations, currentUser.company);
              const isSyncToWooCommerce = locationData?.find((individualProductLocation) =>
                individualProductLocation.location === 'Website' && individualProductLocation?.isSelected === true
              )
                if (isSyncToWooCommerce) {
                  const productCategory = await findProductCategoryRepo({ _id: product.category })
                  const productData = { ...product, productCategory }
                  const productObj = createWooProductObj(productData)
                  const wooData = await createWooProduct(currentUser.company, productObj)
                  if (wooData && wooData.id) {
                    product.wooID = wooData.id
                  } else {
                    await updateImportProductsJob(
                      { _id: data.importProducts },
                      { status: IMPORT_PRODUCTS_STATUS.error, errorReason: wooData.message || '' }
                    )
                    console.log('error', wooData)
                    return done()
                  }
                }
              product.productLocations = locationData
            }
            tempCreatedProducts.push({
              ...product,
              company: ObjectId(currentUser.company),
              createdBy: ObjectId(currentUser._id),
              barcode: product.sku,
              archived: false,
              deleted: false
            })
          }
        })
      ).then(async () => {
        await createMultipleProducts([...tempCreatedProducts])
        console.log('===🚀 Import Products --Child-- Process Done.=== : ', new Date().getTime())
        const importedProducts = data.batchIndex * 100 + data.importedProducts.length
        await emitRequest({
          eventName: `current-queue-process-${data.company}`,
          eventData: {
            status: importedProducts === data.totalProducts ? 'completed' : 'in_process',
            message: `Importing products is ${
              importedProducts === data.totalProducts ? 'completed' : 'in process'
            }. ${importedProducts} of ${data.totalProducts} imported.`
          }
        })
        return done()
      })
    }
  } catch (error) {
    await updateImportProductsJob(
      { _id: data.importProducts },
      { status: IMPORT_PRODUCTS_STATUS.error, errorReason: error?.message || '' }
    )
    console.log('error', error)
    return done()
  }
}

  const handleProductLocation = async (type, companyId) => {
    const currentProductLocation = JSON.parse(JSON.stringify(DEFAULT_PRODUCT_LOCATION))
    const productCriteria = await findProductCriteriaAllRepo({ company: companyId })
    if (currentProductLocation.length > 0) {
      currentProductLocation.map((currentLocation) => {
        if (type.includes(currentLocation.location.toLowerCase())) {
          currentLocation.isSelected = true
        } else {
          currentLocation.isSelected = false
          currentLocation.criteria = null
        }
        currentLocation.productQuestions =
          productCriteria?.map((individualCriteria) => {
            return {
              label: individualCriteria?.label,
              options: individualCriteria?.options,
              placeholder: individualCriteria?.placeholder,
              type: individualCriteria?.type,
              fieldId: individualCriteria?.nameId,
              criteria: individualCriteria?._id,
            };
          }) || []

        currentLocation?.productQuestions?.push({
          label: 'Comments',
          options: [],
          placeholder: 'Enter Comments',
          type: {
            label: 'Textarea',
            value: 'textarea'
          },
          fieldId: 'comments',
          criteria: null
        })
      })
      return currentProductLocation
    }
  }
