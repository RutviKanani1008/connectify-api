import generalResponse from '../helpers/generalResponse.helper'
import { createGroup, deleteGroup, findAllGroups, findGroup, updateGroup } from '../repositories/groups.repository'
import { ObjectId } from 'mongodb'
import { findAllTags } from '../repositories/tags.repository'
import { findAllCategory } from '../repositories/category.repository'
import { findAllPipeline } from '../repositories/pipeline.repository'
import { findAllStatus } from '../repositories/status.repository'
import { findAllCustomField } from '../repositories/customFields.repository'

export const createNewGroup = async (req, res) => {
  try {
    const { groupName } = req.body
    const isExist = await findGroup({
      groupCode: groupName.replace(/ /g, '-').toLowerCase(),
      company: ObjectId(req.body.company),
      groupName
    })

    if (isExist) {
      return generalResponse(res, false, 'Group Already Exists.', 'error', true, 200)
    }
    const lastGroup = await findGroup({ company: ObjectId(req.body.company) }, null, { position: -1 })

    const group = await createGroup({
      groupCode: groupName.replace(/ /g, '-').toLowerCase(),
      ...req.body,
      position: (lastGroup?.position || 0) + 1
    })
    return generalResponse(res, group, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getGroupDetail = async (req, res) => {
  try {
    const group = await findGroup({ _id: req.params.id })
    return generalResponse(res, group, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getGroups = async (req, res) => {
  try {
    let group
    if (req?.query && req?.query?.slug) {
      group = await findGroup(req.query, { path: 'company' })
    } else if (req?.query) {
      group = await findAllGroups(req.query, {}, { position: 1 })
    } else {
      group = await findAllGroups({}, {}, { position: 1 })
    }
    return generalResponse(res, group, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getGroupRelatedDetails = async (req, res) => {
  try {
    const groupDetail = {}
    groupDetail.tags = await findAllTags({ groupId: req.params.id }, { createdAt: -1 })
    groupDetail.category = await findAllCategory({ groupId: req.params.id }, { createdAt: -1 })
    groupDetail.pipeline = await findAllPipeline({ groupId: req.params.id }, {}, { createdAt: -1 })
    groupDetail.status = await findAllStatus({ groupId: req.params.id }, { createdAt: -1 })
    groupDetail.customeFields = await findAllCustomField({ groupId: req.params.id }, { createdAt: -1 })

    return generalResponse(res, groupDetail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateGroupDetails = async (req, res) => {
  try {
    const { groupName } = req.body
    let isTagsExist
    if (req.body.update === 'status') {
      isTagsExist = await findGroup({
        _id: { $ne: ObjectId(req.params.id) },
        groupCode: groupName.replace(/ /g, '-').toLowerCase(),
        company: ObjectId(req.body.company),
        active: req.body.active
      })
    } else {
      isTagsExist = await findGroup({
        _id: { $ne: ObjectId(req.params.id) },
        groupCode: groupName.replace(/ /g, '-').toLowerCase(),
        company: ObjectId(req.body.company)
      })
    }

    if (isTagsExist) {
      return generalResponse(res, false, 'Group Already Exists.', 'error', true, 200)
    }
    const group = await updateGroup(
      { _id: ObjectId(req.params.id), company: ObjectId(req.body.company) },
      { groupCode: groupName.replace(/ /g, '-').toLowerCase(), ...req.body }
    )
    if (group && group.matchedCount === 0) {
      return generalResponse(res, false, 'No Tag found.', 'error', true, 200)
    }
    const updatedGroup = await findGroup({ _id: req.params.id })

    return generalResponse(res, updatedGroup, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteGroupDetail = async (req, res) => {
  try {
    await deleteGroup({ _id: req.params.id })
    return generalResponse(res, null, 'Group Deleted Successfully.', 'success', true, 200)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
