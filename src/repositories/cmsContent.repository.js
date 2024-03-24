import { CmsContent } from '../models/cmsContent'

const findCmsContent = (params, populate) => {
  return CmsContent.findOne(params).populate(populate)
}

const findAllCmsContent = (params, populate) => {
  return CmsContent.find(params).populate(populate).sort({ createdAt: -1 })
}

const createCmsContent = (data) => {
  return CmsContent.create(data)
}

const updateCmsContent = (search, updateValue) => {
  return CmsContent.updateOne(search, updateValue)
}

const deleteCmsContent = (query) => {
  return CmsContent.delete(query)
}
export { createCmsContent, findCmsContent, findAllCmsContent, updateCmsContent, deleteCmsContent }
