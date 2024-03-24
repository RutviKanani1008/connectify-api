import generalResponse from '../helpers/generalResponse.helper'
import { ObjectId } from 'mongodb'
import {
  createProduct,
  deleteProduct,
  findAllProduct,
  findProduct,
  updateProduct
} from '../repositories/product.repository'
import { getSelectParams } from '../helpers/generalHelper'
import Stripe from 'stripe'

export const addProductDetail = async (req, res) => {
  try {
    const { name } = req.body
    const isProductExists = await findProduct({
      productId: name.replace(/ /g, '-').toLowerCase(),
      company: ObjectId(req.body.company)
    })
    if (isProductExists) {
      return generalResponse(res, false, { text: 'Product Already Exists.' }, 'error', false, 400)
    }

    const stripe = new Stripe(process.env.STRIPE_API_KEY)
    const product = await stripe.products.create({
      name,
      active: true,
      description: req?.body?.description,
      ...(req?.body?.image ? { images: [] } : {})
    })

    const newProduct = await createProduct({
      productId: name.replace(/ /g, '-').toLowerCase(),
      stripe_product_id: product.id,
      ...req.body
    })
    return generalResponse(res, newProduct, 'Product created successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getProductsDetails = async (req, res) => {
  try {
    const products = await findAllProduct(
      { company: req?.headers?.authorization?.company, ...req.query },
      getSelectParams(req),
      [{ path: 'category', ref: 'ProductCategory' }]
    )
    return generalResponse(res, products, 'success')
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
      return generalResponse(res, false, { text: 'Product Not Exists.' }, 'error', false, 400)
    }

    const productDetail = await findProduct({ _id: ObjectId(req.params.id) }, getSelectParams(req), [
      { path: 'category', ref: 'ProductCategory' }
    ])

    return generalResponse(res, productDetail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteProductDetail = async (req, res) => {
  try {
    const isProductExists = await findProduct({
      _id: ObjectId(req.params.id),
      company: req?.headers?.authorization?.company
    })
    if (!isProductExists) {
      return generalResponse(res, false, { text: 'Product Not Exists.' }, 'error', false, 400)
    }

    await deleteProduct({ _id: ObjectId(req.params.id) })
    const stripe = new Stripe(process.env.STRIPE_API_KEY)

    if (isProductExists.stripe_product_id) {
      await stripe.products.del(isProductExists.stripe_product_id)
    }
    return generalResponse(res, null, 'Product deleted successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateProductDetail = async (req, res) => {
  try {
    const isProductExists = await findProduct({
      _id: ObjectId(req.params.id),
      company: ObjectId(req.body.company)
    })
    if (!isProductExists) {
      return generalResponse(res, false, { text: 'Product Not Exists.' }, 'error', false, 400)
    }

    const { isNameUpdate, name } = req.body

    if (isNameUpdate) {
      const isProductNameExists = await findAllProduct({
        productId: name.replace(/ /g, '-').toLowerCase(),
        company: req?.headers?.authorization?.company
      })
      if (isProductNameExists && isProductNameExists.length) {
        return generalResponse(res, false, { text: 'Product Name Not Exists.' }, 'error', false, 400)
      }
    }

    await updateProduct(
      { _id: ObjectId(req.params.id), company: ObjectId(req.body.company) },
      { productId: name.replace(/ /g, '-').toLowerCase(), ...req.body }
    )

    const stripe = new Stripe(process.env.STRIPE_API_KEY)

    if (isProductExists.stripe_product_id) {
      await stripe.products.update(isProductExists.stripe_product_id, {
        name,
        active: true,
        description: req?.body?.description,
        ...(req?.body?.image ? { images: [] } : {})
      })
    }
    return generalResponse(res, null, 'Product updated successfully!', 'success', true)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
