import mongoose from 'mongoose'
import { Tags } from '../models/tags'

const findTag = (params, sort = {}) => {
  return Tags.findOne(params).sort(sort)
}
const findMultipleTag = (params) => {
  return Tags.find({
    _id: {
      $in: params.map((id) => mongoose.Types.ObjectId(id))
    }
  })
}

const findAllTags = (params, sort = { position: 1 }) => {
  return Tags.find(params).sort(sort)
}

const createTag = (data) => {
  return Tags.create(data)
}

const updateTag = (search, updateValue) => {
  return Tags.updateOne(search, updateValue)
}

const updateManyTag = (search, updateValue, updateMulti) => {
  return Tags.update(search, updateValue, updateMulti)
}

const deleteTag = (params) => {
  return Tags.delete(params)
}

export { createTag, findTag, findAllTags, updateTag, deleteTag, findMultipleTag, updateManyTag }
