import { Notes } from '../models/notes'
import { parseData } from '../utils/utils'
import { ObjectId } from 'mongodb'

const findNotes = (params, populate) => {
  return Notes.findOne(params).populate(populate)
}

const findAllNotes = (params = {}, projection = {}, populate = [], skip = 0, limit = undefined) => {
  return Notes.find(params, projection).sort({ createdAt: -1 }).populate(populate).skip(skip).limit(limit)
}

const getNoteCount = (query) => {
  return Notes.count(query)
}

const createNotes = (data) => {
  return Notes.create(data)
}

const createMultipleNotes = (data) => {
  return Notes.insertMany(data)
}

const updateNotes = (search, updateValue) => {
  return Notes.updateOne(search, updateValue)
}

const updateManyNotes = (search, updateValue, updateMulti) => {
  return Notes.update(search, updateValue, updateMulti)
}

const deleteNotes = (status) => {
  return Notes.delete(status)
}

const findLastCompanyNote = ({ params = {}, projection = {} } = {}) => {
  return Notes.findOne(params, projection).sort({ _id: -1 })
}

const getFilterNoteQuery = ({ filters }) => {
  const { sort, search, company, folder = null, ...rest } = filters
  const finalSort = parseData(sort) || { createdAt: -1 }

  const companyQuery = { company: ObjectId(company), folder }
  const restOfFilters = Object.keys(rest).length > 0 ? [rest] : []
  const searchFilters = [
    ...(search
      ? [
          {
            $or: [{ title: { $regex: new RegExp(search, 'i') } }, { note: { $regex: new RegExp(search, 'i') } }]
          }
        ]
      : [])
  ]
  const query = {
    $and: [companyQuery, ...restOfFilters, ...searchFilters]
  }

  return { query, sort: finalSort }
}

export {
  createNotes,
  findNotes,
  findAllNotes,
  updateNotes,
  deleteNotes,
  createMultipleNotes,
  findLastCompanyNote,
  getNoteCount,
  getFilterNoteQuery,
  updateManyNotes
}
