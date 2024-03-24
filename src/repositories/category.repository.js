import { Category } from '../models/category'

const findCategory = (params, sort = {}) => {
  return Category.findOne(params).sort(sort)
}

const findAllCategory = (params, sort = { position: 1 }) => {
  return Category.find(params).sort(sort)
}

const createCategory = (data) => {
  return Category.create(data)
}

const updateCategory = (search, updateValue) => {
  return Category.updateOne(search, updateValue)
}

const deleteCategory = (params) => {
  return Category.delete(params)
}

export { createCategory, findCategory, findAllCategory, updateCategory, deleteCategory }
