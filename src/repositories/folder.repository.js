import mongoose from 'mongoose'
import { Folders } from '../models/folders'

const findFolder = (params) => {
  return Folders.findOne(params)
}
const findMultipleFolder = (params) => {
  return Folders.find({
    _id: {
      $in: params.map((id) => mongoose.Types.ObjectId(id))
    }
  })
}

export const folderBulkWrite = (orderObjArray) => {
  return Folders.bulkWrite(orderObjArray)
}

const findAllFolders = (params, projection = {}) => {
  return Folders.find(params, projection).sort({ createdAt: -1 })
}
const findFolderWithAggregation = (match, otherCountFieldsLookup = []) => {
  return Folders.aggregate([
    {
      $match: {
        ...match
      }
    },
    ...otherCountFieldsLookup
  ])
}
const createFolder = (data) => {
  return Folders.create(data)
}

const upsertFolder = (filter, data) => {
  return Folders.findOneAndUpdate(filter, data, {
    upsert: true,
    new: true
  })
}

const updateFolder = (search, updateValue) => {
  return Folders.updateOne(search, updateValue)
}

const deleteFolder = (params) => {
  return Folders.delete(params)
}

export {
  createFolder,
  findFolder,
  findAllFolders,
  updateFolder,
  deleteFolder,
  findMultipleFolder,
  findFolderWithAggregation,
  upsertFolder
}
