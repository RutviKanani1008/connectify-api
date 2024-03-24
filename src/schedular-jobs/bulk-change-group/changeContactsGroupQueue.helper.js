import { ObjectId } from 'mongodb'
import _ from 'lodash'
import { createChangeContactsGroupSchedulerChildJob } from '../bulk-change-group/changeContactsGroupJobSchedulerQueue.helper'
import { findContactPopulate, updateContactAPI } from '../../repositories/contact.repository'
import { emitRequest } from '../../helper/socket-request.helper'

export const changeContactsGroup = async (data, done) => {
  try {
    console.log('===🚀 Change Contacts Group Start ', new Date().getTime())
    await emitRequest({
      eventName: `current-queue-process-${data.company}`,
      eventData: { status: 'in_process', message: 'Change Group contacts is in process...' }
    })

    const {
      group: groupDetails,
      status: statusDetail,
      category: categoryDetail,
      tags: tagsDetails,
      pipelineDetails,
      oldGroup,
      contacts
    } = data

    await Promise.all(
      _.chunk(contacts || [], 100).map((contact100BunchArray, index) =>
        createChangeContactsGroupSchedulerChildJob({
          ...data,
          batchIndex: index,
          totalContacts: contacts.length || 0,
          actionFields: {
            groupDetails,
            statusDetail,
            categoryDetail,
            tagsDetails,
            pipelineDetails,
            oldGroup
          },
          changeContacts: contact100BunchArray
        })
      )
    ).then(async () => {
      console.log('===🚀 Change Contacts Group END : ', new Date().getTime())
      return done()
    })
  } catch (error) {
    console.log('error here', error?.message ? error?.message : error)
    return done()
  }
}
export const changeContactsGroupChild = async (data, done) => {
  try {
    console.log('===🚀 Change Contacts Group --Child-- Process Start.=== : ', new Date().getTime())
    if (_.isArray(data?.changeContacts)) {
      const { actionFields, currentUser } = data
      const { groupDetails, statusDetail, categoryDetail, tagsDetails, pipelineDetails } = actionFields

      await Promise.all(
        data.changeContacts.map(async (contactsData) => {
          const oldContactObj = await findContactPopulate({ _id: contactsData }, [
            { path: 'pipelineDetails.pipeline.id', ref: 'Pipeline' },
            { path: 'pipelineDetails.statusHistory.changedBy' },
            { path: 'groupHistory.changedBy', ref: 'User' },
            { path: 'group.id', ref: 'Groups' },
            { path: 'status.id', ref: 'Status' },
            { path: 'category.id', ref: 'Category' },
            { path: 'tags', ref: 'Tags' }
          ])
          if (
            oldContactObj?.group !== null &&
            groupDetails !== null &&
            !oldContactObj?.group?.id?.equals(ObjectId(groupDetails))
          ) {
            if (!oldContactObj.groupHistory) {
              oldContactObj.groupHistory = []
            }
            const tags = []
            if (oldContactObj?.tags) {
              oldContactObj?.tags.forEach((tag) => {
                tags.push({ id: tag._id, code: tag.tagId, title: tag.tagName })
              })
            }
            if (oldContactObj && oldContactObj.pipelineDetails && oldContactObj.pipelineDetails.length > 0) {
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
            oldContactObj.groupHistory.push({
              changedBy: currentUser._id,
              status: {
                id: oldContactObj?.status?.id?._id ? oldContactObj?.status?.id?._id : null,
                code: oldContactObj?.status?.id?.statusCode ? oldContactObj?.status?.id?.statusCode : null,
                title: oldContactObj?.status?.id?.statusName ? oldContactObj?.status?.id?.statusName : null
              },
              statusHistory: oldContactObj.statusHistory,
              category: {
                id: oldContactObj?.category?.id?._id ? oldContactObj?.category?.id?._id : null,
                code: oldContactObj?.category?.id?.categoryId ? oldContactObj?.category?.id?.categoryId : null,
                title: oldContactObj?.category?.id?.categoryName ? oldContactObj?.category?.id?.categoryName : null
              },
              categoryHistory: oldContactObj.categoryHistory,
              tags,
              tagsHistory: oldContactObj?.tagsHistory,
              pipelineDetails: oldContactObj.pipelineDetails,
              questions: oldContactObj.questions,
              group: {
                id: oldContactObj?.group?.id?._id ? oldContactObj?.group?.id?._id : null,
                code: oldContactObj?.group?.id?.groupCode ? oldContactObj?.group?.id?.groupCode : null,
                title: oldContactObj?.group?.id?.groupName ? oldContactObj?.group?.id?.groupName : null
              }
            })
          }
          oldContactObj.group = { id: groupDetails }
          oldContactObj.status = statusDetail ? { id: statusDetail } : null
          oldContactObj.category = categoryDetail ? { id: categoryDetail } : null
          oldContactObj.tags = tagsDetails || []
          oldContactObj.pipelineDetails = pipelineDetails.length
            ? pipelineDetails?.map((pipeline) => {
                pipeline.pipeline = { id: pipeline.pipeline }
                pipeline.status = { id: pipeline.status }
                return pipeline
              })
            : []
          await updateContactAPI({ _id: contactsData }, oldContactObj)
        })
      ).then(async () => {
        console.log('===🚀 Import Contacts --Child-- Process Done.=== : ', new Date().getTime())
        const importedContacts = data.batchIndex * 100 + data.changeContacts.length
        await emitRequest({
          eventName: `current-queue-process-${data.company}`,
          eventData: {
            status: importedContacts === data.totalContacts ? 'completed' : 'in_process',
            message: `Change Gorup contacts is ${
              importedContacts === data.totalContacts ? 'completed' : 'in process'
            }. ${importedContacts} of ${data.totalContacts} changed with new group.`
          }
        })
        return done()
      })
    }
  } catch (error) {
    console.log('error', error)
    return done()
  }
}
