import { ObjectId } from 'mongodb'
import _ from 'lodash'
import { findAllImportContacts, multipleDeleteImportContact } from '../../repositories/imported-contacts.repository'
import { createImportContactsSchedulerChildJob } from './importContactsJobSchedulerQueue.helper'
import { updateImportContactsJob } from '../../repositories/imported-contacts-jobs.repository'
import { IMPORT_CONTACTS_STATUS } from '../../models/import-contacts-job'
import { createMultipleContact, findContact, updateMultipleContact } from '../../repositories/contact.repository'
import { createGroup, findGroup } from '../../repositories/groups.repository'
import { createStatus, findStatus } from '../../repositories/status.repository'
import { createCategory, findCategory } from '../../repositories/category.repository'
import { createTag, findTag } from '../../repositories/tags.repository'
import { createPipeline, findPipeline, updatePipeline } from '../../repositories/pipeline.repository'
import { isValidateEmail } from '../../helpers/contact.helper'
import { emitRequest } from '../../helper/socket-request.helper'
import { AVAILABLE_ACTIVITY_FOR, AVAILABLE_EVENT_TYPE } from '../../models/contact-activity'
import { createMultipleContactActivity } from '../../repositories/contactActivities'

export const importContactScheduler = async (data, done) => {
  try {
    console.log('===🚀 Import Contacts Start ', new Date().getTime())
    await emitRequest({
      eventName: `current-queue-process-${data.company}`,
      eventData: { status: 'in_process', message: 'Importing contacts is in process...' }
    })

    const importedContacts = await findAllImportContacts({
      importedContact: data.importContacts,
      company: ObjectId(data.company)
      // contactErrors: null
    })

    await Promise.all(
      _.chunk(importedContacts || [], 100).map((contact100BunchArray, index) =>
        createImportContactsSchedulerChildJob({
          ...data,
          batchIndex: index,
          totalContacts: importedContacts.length || 0,
          importedContacts: contact100BunchArray
        })
      )
    ).then(async () => {
      console.log('===🚀 Import Contacts END : ', new Date().getTime())
      await updateImportContactsJob(
        { _id: data.importContacts },
        { status: IMPORT_CONTACTS_STATUS.success, errorReason: null }
      )
      return done()
    })

    // if (data.scheduledId) {
    //   await updateScheduledMassEmail({ _id: data.scheduledId }, { status: 'SUCCESS' })
    // }
  } catch (error) {
    console.log('error here', error?.message ? error?.message : error)
    return done()
  }
}
export const importContactSchedulerChild = async (data, done) => {
  try {
    console.log('===🚀 Import Contacts --Child-- Process Start.=== : ', new Date().getTime())

    if (_.isArray(data?.importedContacts)) {
      const { actionFields, currentUser } = data
      const {
        group: groupDetails,
        status: statusDetail,
        category: categoryDetail,
        tags: tagsDetails,
        pipelineDetails
      } = actionFields

      const tempCreatedContacts = []
      const tempContactObjArray = []
      await Promise.all(
        data.importedContacts
          .filter((c) => !c.contactErrors?.isDuplicateEmail)
          .map(async (contactsData) => {
            const contact = contactsData.data

            if (contact.firstName) {
              if (contact.email && !isValidateEmail(contact.email)) {
                return
              }

              let isContactExist = false
              if (contact.email && isValidateEmail(contact.email)) {
                isContactExist = await findContact({ email: contact.email, company: ObjectId(contactsData.company) }, [
                  { path: 'pipelineDetails.pipeline.id', ref: 'Pipeline' },
                  { path: 'pipelineDetails.statusHistory.changedBy' },
                  { path: 'groupHistory.changedBy', ref: 'User' },
                  { path: 'group.id', ref: 'Groups' },
                  { path: 'status.id', ref: 'Status' },
                  { path: 'category.id', ref: 'Category' },
                  { path: 'tags', ref: 'Tags' }
                ])
              }

              if (!isContactExist) {
                if (contact?.group || groupDetails) {
                  // Check for group
                  if (groupDetails) {
                    contact.group = { id: groupDetails }
                  } else {
                    const isGroupExist = await findGroup({
                      groupCode: contact?.group.replace(/ /g, '-').toLowerCase(),
                      company: ObjectId(contactsData.company),
                      groupName: contact?.group
                    })
                    if (isGroupExist) {
                      contact.group = { id: isGroupExist._id }
                    } else {
                      // Create new group
                      const group = await createGroup({
                        groupCode: contact?.group.replace(/ /g, '-').toLowerCase(),
                        groupName: contact?.group,
                        company: ObjectId(contactsData.company)
                      })
                      contact.group = { id: group._id }
                    }
                  }
                  // check for status
                  if (statusDetail) {
                    contact.status = { id: statusDetail }
                  } else {
                    if (contact?.group?.id && contact?.status) {
                      const isStatusExist = await findStatus({
                        statusCode: contact?.status.replace(/ /g, '-').toLowerCase(),
                        company: ObjectId(contactsData.company),
                        groupId: ObjectId(contact?.group?.id)
                      })
                      if (isStatusExist) {
                        contact.status = { id: isStatusExist._id }
                      } else {
                        // Create new status
                        const newstatus = await createStatus({
                          statusName: contact?.status,
                          statusCode: contact?.status.replace(/ /g, '-').toLowerCase(),
                          groupId: contact?.group?.id,
                          company: ObjectId(contactsData.company)
                        })
                        contact.status = { id: newstatus._id }
                      }
                    }
                  }

                  if (categoryDetail) {
                    contact.category = { id: categoryDetail }
                  } else {
                    // check for category
                    if (contact?.group?.id && contact?.category) {
                      const isCategoryExists = await findCategory({
                        categoryId: contact?.category.replace(/ /g, '-').toLowerCase(),
                        company: ObjectId(contactsData.company),
                        groupId: ObjectId(contact?.group?.id)
                      })

                      if (isCategoryExists) {
                        contact.category = { id: isCategoryExists._id }
                      } else {
                        // Create a new Category
                        const newCategory = await createCategory({
                          categoryName: contact?.category,
                          categoryId: contact?.category.replace(/ /g, '-').toLowerCase(),
                          company: ObjectId(contactsData.company),
                          groupId: ObjectId(contact?.group?.id)
                        })
                        contact.category = { id: newCategory._id }
                      }
                    }
                  }

                  if (tagsDetails) {
                    contact.tags = tagsDetails
                  } else {
                    if (contact?.group?.id && contact?.tags?.length) {
                      const tagsId = []
                      await Promise.all(
                        contact?.tags.map(async (tag) => {
                          // promise.push()
                          const isTagExists = await findTag({
                            tagId: tag.replace(/ /g, '-').toLowerCase(),
                            company: ObjectId(contactsData.company),
                            groupId: ObjectId(contact?.group?.id)
                          })
                          if (isTagExists) {
                            tagsId.push(isTagExists._id)
                          } else {
                            // Create a new Category
                            const newTag = await createTag({
                              tagName: tag,
                              tagId: tag.replace(/ /g, '-').toLowerCase(),
                              company: ObjectId(contactsData.company),
                              groupId: ObjectId(contact?.group?.id)
                            })
                            tagsId.push(newTag)
                            // contact.category = { id: newCategory._id }
                          }
                        })
                      ).then(async () => {
                        contact.tags = tagsId
                      })
                    }
                  }

                  if (pipelineDetails) {
                    contact.pipelineDetails = pipelineDetails?.map((pipeline) => {
                      return { pipeline: { id: pipeline.pipeline }, status: { id: pipeline.status } }
                    })
                  } else {
                    // check for pipeline
                    if (contact?.group?.id && contact?.pipeline) {
                      const isPipelineExist = await findPipeline({
                        pipelineCode: contact?.pipeline.replace(/ /g, '-').toLowerCase(),
                        company: ObjectId(contactsData.company),
                        groupId: ObjectId(contact?.group?.id)
                      })

                      if (isPipelineExist) {
                        const pipelineObj = { pipeline: { id: isPipelineExist._id } }

                        if (contact?.stage) {
                          const stage = (isPipelineExist?.stages || []).find(
                            (s) => s.code === contact.stage.replace(/ /g, '-').toLowerCase()
                          )

                          if (stage?._id) {
                            pipelineObj.status = { id: stage._id }
                          } else {
                            const stages = isPipelineExist?.stages || []
                            const newStage = {
                              title: contact.stage,
                              code: contact.stage.replace(/ /g, '-').toLowerCase()
                            }
                            stages.push(newStage)

                            await updatePipeline({ _id: isPipelineExist._id }, { stages })

                            const updatedPipeline = await findPipeline({ _id: isPipelineExist._id })

                            const stage = (updatedPipeline?.stages || []).find(
                              (s) => s.code === contact.stage.replace(/ /g, '-').toLowerCase()
                            )
                            if (stage?._id) {
                              pipelineObj.status = { id: stage._id }
                            }
                          }
                        }

                        contact.pipelineDetails = [pipelineObj]
                      } else {
                        // Create a new pipeline

                        const stages = []

                        if (contact?.stage) {
                          const newStage = {
                            title: contact.stage,
                            code: contact.stage.replace(/ /g, '-').toLowerCase()
                          }
                          stages.push(newStage)
                        }

                        const newPipeline = await createPipeline({
                          pipelineName: contact?.pipeline,
                          pipelineCode: contact?.pipeline.replace(/ /g, '-').toLowerCase(),
                          company: ObjectId(contactsData.company),
                          groupId: ObjectId(contact?.group?.id),
                          stages
                        })

                        if (newPipeline) {
                          const pipelineObj = { pipeline: { id: newPipeline._id } }

                          if (contact?.stage) {
                            const stage = newPipeline.stages.find(
                              (s) => s.code === contact.stage.replace(/ /g, '-').toLowerCase()
                            )

                            if (stage?._id) {
                              pipelineObj.status = { id: stage._id }
                            }
                          }

                          contact.pipelineDetails = [pipelineObj]
                        }
                      }
                    }
                  }
                  tempCreatedContacts.push({
                    ...contact,
                    company: ObjectId(contactsData.company),
                    archived: false,
                    deleted: false
                  })
                  // const newContact = await createContact({
                  //   ...contact,
                  //   company: ObjectId(contactsData.company),
                  //   archived: false,
                  //   deleted: false
                  // })
                } else {
                  delete contact?.group
                  delete contact?.status
                  delete contact?.category
                  delete contact?.tags
                  tempCreatedContacts.push({
                    ...contact,
                    company: ObjectId(contactsData.company),
                    archived: false,
                    deleted: false
                  })
                  // const newContact = await createContact({
                  //   ...contact,
                  //   company: ObjectId(contactsData.company),
                  //   archived: false,
                  //   deleted: false
                  // })
                }
              } else {
                if (
                  isContactExist?.group !== null &&
                  groupDetails !== null &&
                  !isContactExist?.group?.id?.equals(ObjectId(groupDetails))
                ) {
                  if (!isContactExist.groupHistory) {
                    isContactExist.groupHistory = []
                  }
                  const tags = []
                  if (isContactExist?.tags) {
                    isContactExist?.tags.forEach((tag) => {
                      tags.push({ id: tag._id, code: tag.tagId, title: tag.tagName })
                    })
                  }
                  if (isContactExist && isContactExist.pipelineDetails && isContactExist?.pipelineDetails?.length > 0) {
                    isContactExist?.pipelineDetails.map((pipeline) => {
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

                  isContactExist.groupHistory.push({
                    changedBy: currentUser._id,
                    status: {
                      id: isContactExist?.status?.id?._id ? isContactExist?.status?.id?._id : null,
                      code: isContactExist?.status?.id?.statusCode ? isContactExist?.status?.id?.statusCode : null,
                      title: isContactExist?.status?.id?.statusName ? isContactExist?.status?.id?.statusName : null
                    },
                    statusHistory: isContactExist.statusHistory,
                    category: {
                      id: isContactExist?.category?.id?._id ? isContactExist?.category?.id?._id : null,
                      code: isContactExist?.category?.id?.categoryId ? isContactExist?.category?.id?.categoryId : null,
                      title: isContactExist?.category?.id?.categoryName
                        ? isContactExist?.category?.id?.categoryName
                        : null
                    },
                    categoryHistory: isContactExist.categoryHistory,
                    tags,
                    tagsHistory: isContactExist?.tagsHistory,
                    pipelineDetails: isContactExist.pipelineDetails,
                    questions: isContactExist.questions,
                    group: {
                      id: isContactExist?.group?.id?._id ? isContactExist?.group?.id?._id : null,
                      code: isContactExist?.group?.id?.groupCode ? isContactExist?.group?.id?.groupCode : null,
                      title: isContactExist?.group?.id?.groupName ? isContactExist?.group?.id?.groupName : null
                    }
                  })
                }
                isContactExist.group = groupDetails ? { id: groupDetails } : null
                isContactExist.status = statusDetail ? { id: statusDetail } : null
                isContactExist.category = categoryDetail ? { id: categoryDetail } : null
                isContactExist.tags = tagsDetails?.length ? tagsDetails : []
                isContactExist.pipelineDetails = pipelineDetails?.length
                  ? pipelineDetails?.map((pipeline) => {
                      pipeline.pipeline = { id: pipeline.pipeline }
                      pipeline.status = { id: pipeline.status }
                      return pipeline
                    })
                  : []

                tempContactObjArray.push({
                  updateOne: {
                    filter: {
                      _id: ObjectId(isContactExist?._id),
                      company: ObjectId(contactsData.company)
                      // email: contact.email,
                    },
                    update: { ...isContactExist?._doc }
                  }
                })
              }
            }
          })
      ).then(async () => {
        const createdContacts = await createMultipleContact([...tempCreatedContacts])
        await updateMultipleContact(tempContactObjArray)
        if (createdContacts.length) {
          const contactActivities = []
          createdContacts.forEach((createdContact) => {
            contactActivities.push({
              eventType: AVAILABLE_EVENT_TYPE.NEW_CONTACT_CREATE_FROM_MASS_IMPORT,
              contact: createdContact?._id,
              eventFor: AVAILABLE_ACTIVITY_FOR.contact,
              refId: createdContact?._id,
              company: ObjectId(currentUser.company),
              createdBy: ObjectId(currentUser._id)
            })
          })

          if (contactActivities.length) {
            await createMultipleContactActivity(contactActivities)
          }
        }
        console.log('===🚀 Import Contacts --Child-- Process Done.=== : ', new Date().getTime())
        const importedContacts = data.batchIndex * 100 + data.importedContacts.length
        await emitRequest({
          eventName: `current-queue-process-${data.company}`,
          eventData: {
            status: importedContacts === data.totalContacts ? 'completed' : 'in_process',
            message: `Importing contacts is ${
              importedContacts === data.totalContacts ? 'completed' : 'in process'
            }. ${importedContacts} of ${data.totalContacts} imported.`
          }
        })

        if (importedContacts === data.totalContacts) {
          await multipleDeleteImportContact({
            importedContact: ObjectId(data.importContacts),
            company: ObjectId(data.company)
          })
          console.log('===🚀 Import Contacts END FINAL: ', new Date().getTime())
        }

        return done()
      })
    }
  } catch (error) {
    await updateImportContactsJob(
      { _id: data.importContacts },
      { status: IMPORT_CONTACTS_STATUS.error, errorReason: error?.message || '' }
    )
    console.log('error', error)
    return done()
  }
}
