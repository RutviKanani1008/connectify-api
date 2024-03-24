import lodash from 'lodash'
import { ObjectId } from 'mongodb'
import { findContact, updateContactAPI } from '../repositories/contact.repository'

const { isEqual, isArray } = lodash

export const updateGroupInfo = async ({ currentUserId, contactId, groupInfo }) => {
  try {
    const oldContactObj = await findContact({ _id: ObjectId(contactId) }, [
      { path: 'pipelineDetails.pipeline.id', ref: 'Pipeline' },
      { path: 'pipelineDetails.statusHistory.changedBy' },
      { path: 'groupHistory.changedBy', ref: 'User' },
      { path: 'group.id', ref: 'Groups' },
      { path: 'status.id', ref: 'Status' },
      { path: 'category.id', ref: 'Category' },
      { path: 'tags', ref: 'Tags' }
    ])

    const updatedGroupInfo = {
      ...groupInfo,
      tags: (groupInfo.tags || []).map((obj) => obj.id),
      pipelineDetails: (groupInfo.pipelineDetails || []).filter((obj) => obj.action !== 'deleted')
    }

    if (groupInfo.group.keepSame) updatedGroupInfo.group = oldContactObj?.group
    if (groupInfo.status.keepSame) updatedGroupInfo.status = oldContactObj?.status
    if (groupInfo.category.keepSame) updatedGroupInfo.category = oldContactObj?.category

    if (updatedGroupInfo?.group?.id && !oldContactObj?.group?.id?.equals(ObjectId(updatedGroupInfo?.group?.id))) {
      updatedGroupInfo.groupHistory = oldContactObj?.groupHistory

      if (oldContactObj?.pipelineDetails?.length > 0) {
        oldContactObj?.pipelineDetails.forEach((pipeline) => {
          if (pipeline.pipeline) {
            const id = pipeline?.pipeline?.id?._id
            pipeline.pipeline.id = id
          }
          if (pipeline.status) {
            const id = pipeline?.status?.id?._id
            pipeline.status.id = id
          }
        })
      }

      updatedGroupInfo.groupHistory.push({
        changedBy: currentUserId,
        status: {
          id: oldContactObj?.status?.id?._id || null,
          code: oldContactObj?.status?.id?.statusCode || null,
          title: oldContactObj?.status?.id?.statusName || null
        },
        statusHistory: oldContactObj.statusHistory,
        category: {
          id: oldContactObj?.category?.id?._id || null,
          code: oldContactObj?.category?.id?.categoryId || null,
          title: oldContactObj?.category?.id?.categoryName || null
        },
        categoryHistory: oldContactObj.categoryHistory,
        tags: (oldContactObj?.tags || []).map((tag) => ({ id: tag._id, code: tag.tagId, title: tag.tagName })),
        tagsHistory: oldContactObj?.tagsHistory,
        pipelineDetails: oldContactObj.pipelineDetails,
        group: {
          id: oldContactObj?.group?.id?._id || null,
          code: oldContactObj?.group?.id?.groupCode || null,
          title: oldContactObj?.group?.id?.groupName || null
        },
        questions: oldContactObj.questions
      })

      updatedGroupInfo.statusHistory = []
      updatedGroupInfo.categoryHistory = []
      updatedGroupInfo.tagsHistory = []
    } else {
      if (oldContactObj?.status !== null && !oldContactObj?.status?.id?.equals(updatedGroupInfo?.status?.id)) {
        updatedGroupInfo.statusHistory = oldContactObj?.statusHistory || []
        updatedGroupInfo.statusHistory.push({
          changedBy: currentUserId,
          status: {
            code: oldContactObj?.status?.id?.statusCode || null,
            title: oldContactObj?.status?.id?.statusName || null
          }
        })
      }

      if (oldContactObj?.category !== null && !oldContactObj?.category.id.equals(updatedGroupInfo?.category?.id)) {
        updatedGroupInfo.categoryHistory = oldContactObj?.categoryHistory || []
        updatedGroupInfo.categoryHistory.push({
          changedBy: currentUserId,
          category: {
            code: oldContactObj?.category?.id?.categoryId || null,
            title: oldContactObj?.category?.id?.categoryName || null
          }
        })
      }

      if (oldContactObj?.tags?.length > 0 && isArray(updatedGroupInfo?.tags)) {
        const oldTagsIds = (oldContactObj?.tags || []).map((obj) => obj._id) ?? []
        const newTagsIds = updatedGroupInfo?.tags?.map((obj) => obj._id) ?? []
        if (isArray(oldTagsIds) && isArray(newTagsIds) && !isEqual(oldTagsIds.sort(), newTagsIds.sort())) {
          updatedGroupInfo.tagsHistory = oldContactObj.tagsHistory
          updatedGroupInfo.tagsHistory.push({
            changedBy: currentUserId,
            tags: (oldContactObj?.tags || []).map((obj) => ({ code: obj.tagId, title: obj.tagName }))
          })
        }
      }

      if (updatedGroupInfo?.pipelineDetails?.length > 0) {
        updatedGroupInfo.pipelineDetails.forEach((pipeline) => {
          const contactNote = []
          if (pipeline?.notes?.length > 0) {
            pipeline.notes.forEach((note) => {
              const obj = {}
              if (note && note.userId && note.userId._id) obj.userId = note?.userId?._id
              else obj.userId = currentUserId

              obj.text = note.text
              obj.createdAt = note?.createdAt
              contactNote.push(obj)
            })
            pipeline.notes = contactNote
          }
          const oldPipeline = oldContactObj.pipelineDetails.find((pipelineObj) => pipelineObj._id.equals(pipeline._id))
          if (!oldPipeline?.status?.id.equals(pipeline?.status?.id)) {
            if (!pipeline.statusHistory) {
              pipeline.statusHistory = []
            } else {
              const statusHistory = []
              const stages = oldPipeline?.pipeline?.id?.stages?.find((stage) => stage._id.equals(pipeline?.status?.id))
              if (pipeline?.statusHistory?.length > 0) {
                pipeline.statusHistory.push({ status: stages, changedBy: currentUserId })
                statusHistory.push(pipeline?.statusHistory)
              }
              statusHistory.push({ status: stages, changedBy: currentUserId })
              pipeline.statusHistory = statusHistory
            }
          }
        })
      }
    }

    await updateContactAPI({ _id: contactId }, { ...updatedGroupInfo })
  } catch (error) {
    console.log(error)
    throw error
  }
}

export const updateGroupInfoOld = async ({ currentUserId, contactId, groupInfo }) => {
  try {
    const oldContactObj = await findContact({ _id: ObjectId(contactId) }, [
      { path: 'pipelineDetails.pipeline.id', ref: 'Pipeline' },
      { path: 'pipelineDetails.statusHistory.changedBy' },
      { path: 'groupHistory.changedBy', ref: 'User' },
      { path: 'group.id', ref: 'Groups' },
      { path: 'status.id', ref: 'Status' },
      { path: 'category.id', ref: 'Category' },
      { path: 'tags', ref: 'Tags' }
    ])

    const updatedGroupInfo = { ...groupInfo, tags: (groupInfo.tags || []).map((obj) => obj.id) }

    if (groupInfo?.group?.id && !oldContactObj?.group?.id?.equals(ObjectId(groupInfo?.group?.id))) {
      updatedGroupInfo.groupHistory = oldContactObj?.groupHistory

      if (oldContactObj?.pipelineDetails?.length > 0) {
        oldContactObj?.pipelineDetails.forEach((pipeline) => {
          if (pipeline.pipeline) {
            const id = pipeline?.pipeline?.id?._id
            pipeline.pipeline.id = id
          }
          if (pipeline.status) {
            const id = pipeline?.status?.id?._id
            pipeline.status.id = id
          }
        })
      }

      updatedGroupInfo.groupHistory.push({
        changedBy: currentUserId,
        status: {
          id: oldContactObj?.status?.id?._id || null,
          code: oldContactObj?.status?.id?.statusCode || null,
          title: oldContactObj?.status?.id?.statusName || null
        },
        statusHistory: oldContactObj.statusHistory,
        category: {
          id: oldContactObj?.category?.id?._id || null,
          code: oldContactObj?.category?.id?.categoryId || null,
          title: oldContactObj?.category?.id?.categoryName || null
        },
        categoryHistory: oldContactObj.categoryHistory,
        tags: (oldContactObj?.tags || []).map((tag) => ({ id: tag._id, code: tag.tagId, title: tag.tagName })),
        tagsHistory: oldContactObj?.tagsHistory,
        pipelineDetails: oldContactObj.pipelineDetails,
        group: {
          id: oldContactObj?.group?.id?._id || null,
          code: oldContactObj?.group?.id?.groupCode || null,
          title: oldContactObj?.group?.id?.groupName || null
        },
        questions: oldContactObj.questions
      })

      updatedGroupInfo.statusHistory = []
      updatedGroupInfo.categoryHistory = []
      updatedGroupInfo.tagsHistory = []
    } else {
      if (oldContactObj?.status !== null && !oldContactObj?.status?.id?.equals(groupInfo?.status?.id)) {
        updatedGroupInfo.statusHistory = oldContactObj?.statusHistory || []
        updatedGroupInfo.statusHistory.push({
          changedBy: currentUserId,
          status: {
            code: oldContactObj?.status?.id?.statusCode || null,
            title: oldContactObj?.status?.id?.statusName || null
          }
        })
      }

      if (oldContactObj?.category !== null && !oldContactObj?.category.id.equals(groupInfo?.category?.id)) {
        updatedGroupInfo.categoryHistory = oldContactObj?.categoryHistory || []
        updatedGroupInfo.categoryHistory.push({
          changedBy: currentUserId,
          category: {
            code: oldContactObj?.category?.id?.categoryId || null,
            title: oldContactObj?.category?.id?.categoryName || null
          }
        })
      }

      if (oldContactObj?.tags?.length > 0 && isArray(groupInfo?.tags)) {
        const oldTagsIds = (oldContactObj?.tags || []).map((obj) => obj._id) ?? []
        const newTagsIds = groupInfo?.tags?.map((obj) => obj._id) ?? []
        if (isArray(oldTagsIds) && isArray(newTagsIds) && !isEqual(oldTagsIds.sort(), newTagsIds.sort())) {
          updatedGroupInfo.tagsHistory = oldContactObj.tagsHistory
          updatedGroupInfo.tagsHistory.push({
            changedBy: currentUserId,
            tags: (oldContactObj?.tags || []).map((obj) => ({ code: obj.tagId, title: obj.tagName }))
          })
        }
      }

      if (groupInfo?.pipelineDetails?.length > 0) {
        groupInfo.pipelineDetails.forEach((pipeline) => {
          const contactNote = []
          if (pipeline?.notes?.length > 0) {
            pipeline.notes.forEach((note) => {
              const obj = {}
              if (note && note.userId && note.userId._id) obj.userId = note?.userId?._id
              else obj.userId = currentUserId

              obj.text = note.text
              obj.createdAt = note?.createdAt
              contactNote.push(obj)
            })
            pipeline.notes = contactNote
          }
          const oldPipeline = oldContactObj.pipelineDetails.find((pipelineObj) => pipelineObj._id.equals(pipeline._id))
          if (!oldPipeline?.status?.id.equals(pipeline?.status?.id)) {
            if (!pipeline.statusHistory) {
              pipeline.statusHistory = []
            } else {
              const statusHistory = []
              const stages = oldPipeline?.pipeline?.id?.stages?.find((stage) => stage._id.equals(pipeline?.status?.id))
              if (pipeline?.statusHistory?.length > 0) {
                pipeline.statusHistory.push({ status: stages, changedBy: currentUserId })
                statusHistory.push(pipeline?.statusHistory)
              }
              statusHistory.push({ status: stages, changedBy: currentUserId })
              pipeline.statusHistory = statusHistory
            }
          }
        })
      }
    }

    await updateContactAPI({ _id: contactId }, { ...updatedGroupInfo })
  } catch (error) {
    console.log(error)
    throw error
  }
}

export const isValidateEmail = (email) => {
  const regex =
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return regex.test(email)
}
