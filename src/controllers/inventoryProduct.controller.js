import generalResponse from '../helpers/generalResponse.helper'
import { ObjectId } from 'mongodb'
import {
  createProduct,
  deleteProduct,
  findAllProduct,
  findProduct,
  findProductHistory,
  findProductWithAggregation,
  findProductWithAggregationCount,
  updateProduct
} from '../repositories/inventoryProduct.repository'
import { getSelectParams } from '../helpers/generalHelper'
import { parseData, removeFile } from '../utils/utils'
import { findAllUser, findMultipleUsers, findUser } from '../repositories/users.repository'
import { createWooProduct, deleteWooProduct, updateWooProduct } from './wooCommerceController'
import { createProductCategoryRepo, findProductCategoryRepo } from '../repositories/inventoryProductCategory.repository'
import reader from 'xlsx'
import { createImportProductsJob } from '../repositories/import-products-jobs.repository'
import { IMPORT_PRODUCTS_STATUS } from '../models/import-products-job'
import { createBulkImportProducts } from '../repositories/imported-products.repository'
import { sendMail } from '../services/send-grid'
import { findWooConnectionsRepo } from '../repositories/inventoryWoocommerceConnection.repository'
import { findProductCriteriaAllRepo } from '../repositories/inventoryProductCriteria.repository'

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

export const addProductDetail = async (req, res) => {
  try {
    const body = req.body
    const company = req?.headers?.authorization?.company
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const isSyncToWooCommerce = body?.productLocations?.find(
      (individualProductLocation) =>
        individualProductLocation.location === 'Website' && individualProductLocation?.isSelected === true
    )
    if (currentUser?.inventoryRole === 'adminUser' && isSyncToWooCommerce) {
      const productCategory = await findProductCategoryRepo({ _id: req.body.category })
      const productData = { ...req.body, productCategory }
      const productObj = createWooProductObj(productData)
      productObj.meta_data[0].key = 'll_product_id'
      productObj.meta_data[0].value = productData.barcode ? productData.barcode : productData.manufacturerBarcode
      const wooData = await createWooProduct(company, productObj)
      if (wooData && wooData.id) {
        body.wooID = wooData.id
      } else {
        return generalResponse(res, wooData, { text: wooData.message }, 'error', false, 400)
      }
    }
    if (currentUser?.inventoryRole === 'inputUser') {
      body.productStatus = 1
    }
    const product = await createProduct({ ...body })
    if (currentUser?.inventoryRole === 'inputUser') {
      const productHTMLTemplate = `<h2 style="margin-bottom: 24px;text-align:center;color: #FA8072;">Redlightdealz</h2>
      <h4>New Product ${product.title} has been added please click on below link</h4> 
      <a style="display: block;
        font-size: 14px;
        line-height: 100%;
        margin-bottom: 24px;
        color: #a3db59;
        text-decoration: none;" href=${process.env.HOST_NAME}/member/product/${product._id}>Update Product</a>`

      const users = await findAllUser({ company, inventoryRole: { $in: ['productDetailUser', 'storageUser'] } })
      if (users) {
       for (const user of users) {
        await sendMail({ receiver: user.email, subject: 'New Product Added !', htmlBody: productHTMLTemplate })
      }
     }
    }
    return generalResponse(res, product, 'Product Save Successfully!', 'success', true)
  } catch (error) {
    console.log('error', error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getProducts = async (req, res) => {
  try {
    const project = { ...getSelectParams(req) }
    let { userId, productStatus, companyId, limit = 5, page = 1, search = '', sort, startDate, endDate } = req.query
    sort = parseData(sort)
    const skip = Number(limit) * Number(page) - Number(limit)
    const $and = [{ company: ObjectId(companyId) }]
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      $and.push({ createdAt: { $gte: start, $lt: end } })
    }
    if (search) {
      const reg = new RegExp(search, 'i')
      $and.push({
        $or: [
          { title: { $regex: reg } },
          { price: { $regex: reg } },
          { salePrice: { $regex: reg } },
          { description: { $regex: reg } },
          { sku: { $regex: reg } },
          { barcode: { $regex: reg } },
          { manufacturerBarcode: { $regex: reg } }
        ]
      })
    }
    if (userId) {
      $and.push({ createdBy: ObjectId(userId) })
    }
    if (productStatus) {
      $and.push({ productStatus: parseInt(productStatus) })
    }
    const match = { ...($and.length ? { $and } : {}) }

    const totalProducts = await findProductWithAggregationCount({
      match
    })

    const products = await findProductWithAggregation({ match, skip, limit: Number(limit), sort, project })
    return generalResponse(
      res,
      { results: products, pagination: { total: totalProducts?.[0]?.count || 0 } },
      '',
      'success'
    )
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const wooProductWebhookDetail = async (req, res) => {
  try {
    const type = req.headers['x-wc-webhook-event']
    if (type === 'updated' || type === 'created') {
      const storeDetails = await findWooConnectionsRepo({ url: req?.body?.site_url })
      storeDetails.forEach(async (store) => {
      const adminUser = await findUser({ company: store.company, role: 'admin' })
      const productData = createProductObj(req.body)
      const productCategory = await findProductCategoryRepo({ wooID: productData.category.id, company: store.company })
      if (productCategory) {
        productData.category = productCategory._id
      } else {
        const productCategory = await createProductCategoryRepo({
          nameId: productData.category.name.replace(/ /g, '-').toLowerCase(),
          name: productData.category.name,
          company: store.company,
          wooID: productData.category.id
        })
        productData.category = productCategory._id
      }
        const isProductExists = await findProduct({
          wooID: productData.wooID,
          company: store.company
        })
        if (isProductExists) {
          await updateProduct({ wooID: productData.wooID, company: ObjectId(store.company) }, { ...productData })
        } else {
          productData.productLocations = await handleProductLocation('Website', store.company)
          productData.productLocationQuestion = {
            condition_of_item: null,
            does_the_product_work: null,
            is_factory_sealed: 'yes',
            is_broken_or_use: null,
            is_item_in_new_condition: 'yes'
          }
        productData.company = store.company
        productData.sku = Math.floor(new Date().valueOf() * Math.random()).toString()
        productData.barcode = Math.floor(new Date().valueOf() * Math.random()).toString()
        productData.createdBy = adminUser?._id || null
        productData.productStatus = 1
        const createdProduct = await createProduct({ ...productData })
        const productHTMLTemplate = `<h2 style="margin-bottom: 24px;text-align:center;color: #FA8072;">Redlightdealz</h2>
          <h4>New Product ${createdProduct.title} has been added please click on below link</h4> 
          <a style="display: block;
            font-size: 14px;
            line-height: 100%;
            margin-bottom: 24px;
            color: #a3db59;
            text-decoration: none;" href=${process.env.HOST_NAME}/member/product/${createdProduct._id}>Update Product</a>`

      const users = await findAllUser({ company: store.company, inventoryRole: { $in: ['productDetailUser', 'storageUser'] } })
      if (users) {
       for (const user of users) {
        await sendMail({ receiver: user.email, subject: 'New Product Added !', htmlBody: productHTMLTemplate })
      }
     }
      }
      })
    }
    if (type === 'deleted') {
      const storeDetails = await findWooConnectionsRepo({ url: req?.body?.site_url })
      storeDetails.forEach(async (store) => {
          await deleteProduct({ wooID: req?.body?.id, company: store.company })
      })
    }
    return generalResponse(res, 200)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

const createProductObj = (product) => {
   const productObj = {
     wooID: product.id,
     title: product.name,
     price: product.regular_price.toString() || 0,
     salePrice: product.sale_price.toString() || 0,
     quantity: product.stock_quantity || 0,
     description: product.description.replace(/<[^>]+>/g, '') || '',
     weight: product.weight ? product.weight.toString() : '',
     length: product.dimensions.length ? product.dimensions.length.toString() : '',
     width: product.dimensions.width ? product.dimensions.width.toString() : '',
     height: product.dimensions.height ? product.dimensions.height.toString() : '',
     category: product.categories ? product.categories[0] : null,
     image: handleImages(product.images, 'featureImage'),
     galleryImages: handleImages(product.images, 'galleryImages')
  }
  return productObj
}
 const handleProductLocation = async (type, companyId) => {
    const currentProductLocation = JSON.parse(JSON.stringify(DEFAULT_PRODUCT_LOCATION))
    const productCriteria = await findProductCriteriaAllRepo({ company: companyId })
    if (currentProductLocation.length > 0) {
      currentProductLocation.map((currentLocation) => {
        if (currentLocation.location === 'Website') {
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
              criteria: individualCriteria?._id
            }
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

const handleImages = (images, type) => {
  if (images.length > 0) {
    const featureImage = images[0].src
    const galleryImages = []
    for (let i = 1; i < images.length; i++) {
      galleryImages.push({
        fileName: images[i].name,
        fileUrl: images[i].src
       })
      }
   return type === 'featureImage' ? featureImage : (galleryImages.length > 0 ? galleryImages : [] )
  }
}
export const getProductsByName = async (req, res) => {
  try {
    const project = { ...getSelectParams(req) }
    const $and = [{ company: req?.headers?.authorization?.company }]
    if (req.query.title) {
      const reg = new RegExp(req.query.title, 'i')
      $and.push({
        $or: [{ title: { $regex: reg } }]
      })
    }
    const match = { ...($and.length ? { $and } : {}) }

    const products = await findAllProduct(match, project)
    return generalResponse(res, products, '', 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificProductsDetails = async (req, res) => {
  try {
    const isProductExists = await findProduct({
      _id: ObjectId(req.params.id),
      company: req?.headers?.authorization?.company
    })
    if (!isProductExists) {
      return generalResponse(res, false, { text: 'Product Does Not Exists.' }, 'error', false, 400)
    }

    const productDetail = await findProduct({ _id: ObjectId(req.params.id) }, getSelectParams(req), [
      { path: 'category', ref: 'InventoryProductCategory' },
      { path: 'warehouse', ref: 'InventoryWarehouseLocations' },
      { path: 'createdBy', ref: 'users', select: { firstName: 1, lastName: 1, email: 1 } }
    ])

    return generalResponse(res, productDetail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getSpecificProductHistory = async (req, res) => {
  try {
    // eslint-disable-next-line no-unused-vars
    const page = req.query.page * 1 || 1
    const limit = req.query.limit * 1 || 20
    const skip = 0

    const isProductExists = await findProduct({
      _id: ObjectId(req.query.id),
      company: req?.headers?.authorization?.company
    })
    if (!isProductExists) {
      return generalResponse(res, false, { text: 'Product Not Exists.' }, 'error', false, 400)
    }

    const productDetail = await findProductHistory(
      { _id: ObjectId(req.query.id) },
      getSelectParams(req),
      [],
      skip,
      limit
    )
    const userIds = []
    if (productDetail.history && productDetail.history.length > 0) {
      productDetail.history.forEach((item) => {
        userIds.push(item.updatedBy)
      })
    }
    const historyUserDetails = await findMultipleUsers(userIds).select({
      _id: 1,
      firstName: 1,
      lastName: 1,
      email: 1,
      userProfile: 1
    })

    const finalProductDetail = { productDetail, historyUserDetails }
    return generalResponse(res, finalProductDetail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getProductDetailsByBarcode = async (req, res) => {
  try {
    let productDetail
    const isProductExists = await findProduct({
      barcode: req.params.id,
      company: req?.headers?.authorization?.company
    })
    const isProductManufactureExists = await findProduct({
      manufacturerBarcode: req.params.id,
      company: req?.headers?.authorization?.company
    })
    if (!isProductExists && !isProductManufactureExists) {
      return generalResponse(res, false, { text: 'Product Not Exists.' }, 'error', false, 400)
    }
    if (isProductExists) {
      productDetail = await findProduct({ barcode: req.params.id })
    } else {
      productDetail = await findProduct({ manufacturerBarcode: req.params.id })
    }
    return generalResponse(res, productDetail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getAllProductByStatus = async (company, productStatus) => {
    const allProducts = await findAllProduct({
      company,
      productStatus: { $in: productStatus }
    })
  return allProducts.length
}

export const getProductDetailsByManufacturerBarcode = async (req, res) => {
  try {
    const isProductManufactureExists = await findProduct({
      manufacturerBarcode: req.params.id,
      company: req?.headers?.authorization?.company
    })

    if (!isProductManufactureExists) {
      return generalResponse(res, false, { text: 'Product Not Exists.' }, 'error', false, 400)
    }

    const productDetail = await findProduct({
      manufacturerBarcode: req.params.id,
      company: req?.headers?.authorization?.company
    })

    return generalResponse(res, productDetail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateProductDetail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const isProductExists = await findProduct({
      _id: ObjectId(req.params.id),
      company: ObjectId(req.body.company)
    })
    if (!isProductExists) {
      return generalResponse(res, false, { text: 'Product Not Exists.' }, 'error', false, 400)
    }

    const isSyncToWooCommerce = req.body?.productLocations?.find(
      (individualProductLocation) =>
        individualProductLocation.location === 'Website' && individualProductLocation?.isSelected === true
    )
    if (isSyncToWooCommerce) {
      if (req.body.wooID) {
        const productCategory = await findProductCategoryRepo({ _id: req.body.category })
        const productData = { ...req.body, productCategory }
        const productObj = createWooProductObj(productData)
        const wooData = await updateWooProduct(req.body.company, productObj, req.body.wooID)
        if (wooData && wooData.id) {
          req.body.wooID = wooData.id
        } else {
          return generalResponse(res, wooData, { text: wooData.message }, 'error', false, 400)
        }
      } else if ((currentUser?.inventoryRole === 'productDetailUser' || currentUser?.inventoryRole === 'adminUser') && isSyncToWooCommerce) {
        const productCategory = await findProductCategoryRepo({ _id: req.body.category })
        const productData = { ...req.body, productCategory }
        const productObj = createWooProductObj(productData)
        productObj.meta_data[0].key = 'll_product_id'
        productObj.meta_data[0].value = productData.barcode ? productData.barcode : productData.manufacturerBarcode
        const wooData = await createWooProduct(req.body.company, productObj)
        if (wooData && wooData.id) {
          req.body.wooID = wooData.id
        } else {
          return generalResponse(res, wooData, { text: wooData.message }, 'error', false, 400)
        }
      }
    } else if (!isSyncToWooCommerce) {
      if (req.body?.wooID) {
        const wooData = await deleteWooProduct(req.body.company, req.body.wooID)
        if (wooData && wooData.id) {
          req.body.wooID = null
        } else {
          return generalResponse(res, wooData, { text: wooData.message }, 'error', false, 400)
        }
      }
    }
    if (currentUser?.inventoryRole === 'storageUser') {
      req.body.productStatus = 2
    }
    if (currentUser?.inventoryRole === 'productDetailUser') {
      req.body.productStatus = 3
    }
    await updateProduct({ _id: ObjectId(req.params.id), company: ObjectId(req.body.company) }, { ...req.body })
    return generalResponse(res, null, 'Product updated successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateProductQuantity = async (productData) => {
  try {
    productData.map(async (item) => {
      await updateProduct({ _id: ObjectId(item._id), company: ObjectId(item.company) }, { ...item })
    })
  } catch (error) {
    return error
  }
}

export const createWooProductObj = (product) => {
  const wooProduct = {
    name: product.title,
    regular_price: product.price.toString() || 0,
    sale_price: product.salePrice.toString() || 0,
    categories: product.category ? [{ id: product.productCategory.wooID }] : [],
    description: product.description || '',
    short_description: product.description || '',
    stock_quantity: parseInt(product.quantity) || 0,
    weight: product.weight ? product.weight.toString() : '',
    dimensions: {
      length: product.length ? product.length.toString() : '',
      width: product.width ? product.width.toString() : '',
      height: product.height ? product.height.toString() : ''
    },
    images: (product.image || (product.galleryImages && product.galleryImages.length > 0)) ? getProductImages(product.image, product.galleryImages ? product.galleryImages : []) : ''
  }
  return wooProduct
}

const getProductImages = (image, galleryImages) => {
  const allImages = []

  allImages.push({ src: image.startsWith('https') ? image : `${process.env.S3_BUCKET_BASE_URL}${image}` })

  if (galleryImages.length > 0) {
    galleryImages.forEach((item) => {
      allImages.push({ src: item.fileUrl.startsWith('https') ? item.fileUrl : `${process.env.S3_BUCKET_BASE_URL}${item.fileUrl}` })
    })
  }
  return allImages
}

export const validateImportProducts = async (req, res) => {
  try {
    const { socketInstance } = req

    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    if (req.files?.[0]) {
      const file = reader.readFile(req.files[0].path)

      const mainSheet = file.SheetNames[0]
      const importedProducts = reader.utils.sheet_to_json(file.Sheets[mainSheet])
      removeFile(req.files[0].path)

      if (importedProducts && importedProducts.length > 0) {
        const importProductJob = await createImportProductsJob({
          status: IMPORT_PRODUCTS_STATUS.pending,
          errorReason: null,
          company: ObjectId(currentUser.company)
        })

        const tempProducts = []
        importedProducts.forEach((product, index) => {
          const obj = {}
          obj.productErrors = {
            isTitleNotExists: false,
            isQuantityNotExists: false,
            isQuantityNotNumber: false,
            isSku: false
          }
          if (!product?.title) {
            obj.productErrors.isTitleNotExists = true
          }
          if (!product?.quantity) {
            obj.productErrors.isQuantityNotExists = true
          }
          // if (product?.quantity) {
          //   const checkNumber = +product.quantity > 0
          //   obj.productErrors.isQuantityNotNumber = checkNumber
          // }
          if (!product?.sku) {
            obj.productErrors.isSku = true
          }
          if (product?.galleryImages) {
            product.galleryImages = product?.galleryImages?.split?.(',')
          }
          if (!Object.values(obj.productErrors).includes(true)) {
            obj.productErrors = null
          }
          obj.importedProduct = importProductJob._id
          obj.company = ObjectId(currentUser.company)
          obj.createdBy = ObjectId(currentUser._id)
          obj.data = product
          tempProducts.push(obj)
        })
        await createBulkImportProducts([...tempProducts])
        socketInstance && socketInstance.emit('uploadProgress', 100)
        return generalResponse(res, importProductJob, '')
      } else {
        socketInstance && socketInstance.emit('uploadProgress', 100)
        return generalResponse(res, [], '')
      }
      // res.send(data)
    } else {
      throw new Error('File uploading error!')
    }
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
