import generalResponse from '../helpers/generalResponse.helper'
import {
  createCategory,
  deleteCategory,
  findAllCategory,
  findCategory,
  updateCategory
} from '../repositories/category.repository'
import { findAllTags } from '../repositories/tags.repository'
import { ObjectId } from 'mongodb'

export const getCategoryDetails = async (req, res) => {
  try {
    const { groupId } = req.query
    if (!groupId) {
      req.query.groupId = null
    }
    const category = await findAllCategory(req.query, { position: 1 })
    return generalResponse(res, category, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const addCategoryDetail = async (req, res) => {
  try {
    const { categoryName, groupId } = req.body
    req.body.groupId = groupId || null
    const category = await findCategory({
      categoryId: categoryName.replace(/ /g, '-').toLowerCase(),
      company: ObjectId(req.body.company),
      groupId: req.body.groupId ? ObjectId(req.body.groupId) : null
    })
    if (category) {
      return generalResponse(res, false, { text: 'Category Already Exists.' }, 'error', false, 400)
    }
    const lastCategory = await findCategory(
      { company: ObjectId(req.body.company), groupId: req.body.groupId ? ObjectId(req.body.groupId) : null },
      { position: -1 }
    )
    const newCategory = await createCategory({
      categoryId: categoryName.replace(/ /g, '-').toLowerCase(),
      ...req.body,
      position: (lastCategory?.position || 0) + 1
    })
    return generalResponse(res, newCategory, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteCategoryDetail = async (req, res) => {
  try {
    const category = await deleteCategory({ _id: ObjectId(req.params.id) })
    if (category && category.acknowledged && category.deletedCount === 0) {
      return generalResponse(res, false, { text: 'Category Not Exists.' }, 'error', false, 400)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateCategoryDetail = async (req, res) => {
  try {
    const { categoryName } = req.body
    let isCategoryExists
    if (req.body.type === 'status') {
      isCategoryExists = await findCategory({
        _id: { $ne: ObjectId(req.params.id) },
        categoryId: categoryName.replace(/ /g, '-').toLowerCase(),
        company: ObjectId(req.body.company),
        active: req.body.active,
        groupId: req.body.groupId ? ObjectId(req.body.groupId) : null
      })
    } else {
      isCategoryExists = await findCategory({
        _id: { $ne: ObjectId(req.params.id) },
        categoryId: categoryName.replace(/ /g, '-').toLowerCase(),
        company: ObjectId(req.body.company),
        groupId: req.body.groupId ? ObjectId(req.body.groupId) : null
      })
    }
    if (isCategoryExists) {
      return generalResponse(res, false, { text: 'Category Already Exists.' }, 'error', false, 400)
    }
    const category = await updateCategory(
      { _id: ObjectId(req.params.id), company: ObjectId(req.body.company) },
      { categoryId: categoryName.replace(/ /g, '-').toLowerCase(), ...req.body }
    )
    if (category && category.matchedCount === 0) {
      return generalResponse(res, false, { text: 'No category found.' }, 'error', false, 400)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getTagsAndCategoryDetails = async (req, res) => {
  try {
    const tags = await findAllTags(req.query)
    const category = await findAllCategory(req.query)

    const obj = {}
    obj.tags = tags
    obj.category = category

    return generalResponse(res, obj, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
