import _ from 'lodash'
import { getSelectedContactsWithFilters } from '../../repositories/contact.repository'
import { createBulkNotesSchedulerChildJob } from './createBulkTaskJobSchedulerQueue.helper'
import { createMultipleNotes } from '../../repositories/note.repository'
import { emitRequest } from '../../helper/socket-request.helper'

export const createBulkNotes = async (data, done) => {
  try {
    console.log('===🚀 Bulk Note queue ', new Date().getTime())
    await emitRequest({
      eventName: `current-queue-process-${data.currentUser.company}`,
      eventData: { status: 'in_process', message: 'Creating Bulk Note is in process...' }
    })
    const { currentUser, contactFilters } = data

    const { is_all_selected, selected_contacts } = contactFilters || {}

    let contacts = selected_contacts || []
    if (is_all_selected) {
      const filters = { ...contactFilters, company: currentUser?.company, select: '_id' }
      const results = await getSelectedContactsWithFilters(filters)
      contacts = (results.contacts || []).map((c) => c._id)
    }

    contacts = contacts.map((contact) => contact)

    await Promise.all(
      _.chunk(contacts || [], 100).map((contact100BunchArray, index) =>
        createBulkNotesSchedulerChildJob({
          ...data,
          batchIndex: index,
          totalContacts: contacts.length || 0,
          contacts: contact100BunchArray
        })
      )
    ).then(async () => {
      console.log('===🚀 Bulk Note queue END : ', new Date().getTime())
      return done()
    })
  } catch (error) {
    console.log('error here', error?.message ? error?.message : error)
    return done()
  }
}
export const createBulkNotesChild = async (data, done) => {
  try {
    console.log('===🚀 Bulk Task queue --Child-- Process Start.=== : ', new Date().getTime())
    if (_.isArray(data?.contacts)) {
      const { currentUser, contactFilters, ...rest } = data

      const tempNotes = []
      data?.contacts.forEach((contact) => {
        tempNotes.push({
          modelId: contact,
          ...rest
        })
      })
      await createMultipleNotes(tempNotes)
      const importedContacts = data.batchIndex * 100 + data.contacts.length
      await emitRequest({
        eventName: `current-queue-process-${data.currentUser.company}`,
        eventData: {
          status: importedContacts === data.totalContacts ? 'completed' : 'in_process',
          message: `Creating a notes is ${
            importedContacts === data.totalContacts ? 'completed' : 'in process'
          }. ${importedContacts} of ${data.totalContacts} note is created.`
        }
      })
      console.log('===🚀 Bulk Note queue --Child-- Process End.=== : ', new Date().getTime())

      return done()
    }
  } catch (error) {
    console.log('error', error)
    return done()
  }
}
