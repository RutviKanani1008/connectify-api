import generalResponse from '../helpers/generalResponse.helper'
import { findAllCategory } from '../repositories/category.repository'
import { createTag, deleteTag, findAllTags, findTag, updateManyTag, updateTag } from '../repositories/tags.repository'
import { ObjectId } from 'mongodb'

export const addTagDetail = async (req, res) => {
  try {
    const { tagName, folderName, groupId } = req.body
    req.body.folderName = folderName || null
    req.body.groupId = groupId || null

    const tags = await findTag({
      tagId: tagName.replace(/ /g, '-').toLowerCase(),
      company: ObjectId(req.body.company),
      groupId: req.body.groupId ? ObjectId(req.body.groupId) : null
    })
    if (tags) {
      return generalResponse(res, false, 'Tag Already Exists.', 'error', true, 200)
    }
    const lastTag = await findTag(
      { company: ObjectId(req.body.company), groupId: req.body.groupId ? ObjectId(req.body.groupId) : null },
      { position: -1 }
    )
    console.log('lastTag', lastTag)
    const newTags = await createTag({
      tagId: tagName.replace(/ /g, '-').toLowerCase(),
      ...req.body,
      position: (lastTag?.position || 0) + 1
    })
    return generalResponse(res, newTags, 'Tag Created Successfully.', 'success', true, 200)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getTagsDetails = async (req, res) => {
  try {
    const { folder, groupId } = req.query
    if (!folder) {
      req.query.folder = null
    }
    if (!groupId) {
      req.query.groupId = null
    }
    const tags = await findAllTags(req.query, { position: 1 })
    return generalResponse(res, tags, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteTagDetail = async (req, res) => {
  try {
    const tags = await deleteTag({ _id: ObjectId(req.params.id) })
    if (tags && tags.acknowledged && tags.deletedCount === 0) {
      return generalResponse(res, false, { text: 'Tag Not Exists.' }, 'error', false, 400)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateTagDetail = async (req, res) => {
  try {
    const { tagName } = req.body
    let isTagsExist
    if (req.body.type === 'status') {
      isTagsExist = await findTag({
        tagId: tagName.replace(/ /g, '-').toLowerCase(),
        company: ObjectId(req.body.company),
        active: req.body.active,
        groupId: req.body.groupId ? ObjectId(req.body.groupId) : null
      })
    } else {
      isTagsExist = await findTag({
        tagId: tagName.replace(/ /g, '-').toLowerCase(),
        company: ObjectId(req.body.company),
        groupId: req.body.groupId ? ObjectId(req.body.groupId) : null,
        folder: ObjectId(req.body.folder)
      })
    }
    if (isTagsExist) {
      return generalResponse(res, false, 'Tag Already Exists.', 'error', true, 400)
    }
    const tags = await updateTag(
      {
        _id: ObjectId(req.params.id),
        company: ObjectId(req.body.company),
        groupId: req.body.groupId ? ObjectId(req.body.groupId) : null
      },
      { tagId: tagName.replace(/ /g, '-').toLowerCase(), ...req.body }
    )
    if (tags && tags.matchedCount === 0) {
      return generalResponse(res, false, 'No Tag found.', 'error', true, 200)
    }
    const updatedTag = await findTag({ _id: ObjectId(req.params.id) })
    return generalResponse(res, updatedTag, 'Tag Updated Successfully.', 'success', true, 200)
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

export const updateTagsFolder = async (req, res) => {
  try {
    const { tags, folder: folderId } = req.body

    const updateTags = await updateManyTag({ _id: { $in: tags } }, { $set: { folder: folderId } }, { multi: true })
    console.log({ updateTags })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
