import { Router } from 'express'
import {
  assignContactPipeline,
  createContactDetail,
  getContactDetails,
  getSpecificContact,
  updateContact,
  updateContactStatus,
  updateContactGroupDetails,
  deleteContactDetail,
  archiveContactDetail,
  validateImportContact,
  importedContacts,
  getContactWithRsvp,
  getBillingProfiles,
  getFilteredContacts,
  unSubscribeContact,
  unsubscribeFromSheet,
  deleteMultipleContacts,
  changeContactGroups,
  getContacts,
  countContacts,
  archiveMultipleContacts,
  getContactsForMassEmail,
  getSelectedContactsForMassEmail,
  getContactsForCloneMassEmail,
  getPermissions,
  getStageContacts,
  assignStages,
  getContactsNotInStage
} from '../controllers/contact.controller'
import { authenticated } from '../middlewares/authenticated.middleware'
import { fileUploader } from '../middlewares/fileUploader'

const contact = Router()

contact.post('/contacts', authenticated, createContactDetail)
contact.post('/assign-contact-pipeline', authenticated, assignContactPipeline)
contact.post('/assign-stage', authenticated, assignStages)
contact.post('/validate-import-contacts', authenticated, fileUploader, validateImportContact)
contact.post('/unsubscribe-contacts-list', authenticated, fileUploader, unsubscribeFromSheet)
contact.post('/import-contacts', authenticated, fileUploader, importedContacts)
contact.post('/unsubscribe-contact', unSubscribeContact)
contact.post('/delete-multi-contacts', authenticated, deleteMultipleContacts)
contact.post('/archive-multi-contacts', authenticated, archiveMultipleContacts)
contact.post('/change-contacts-groups', authenticated, changeContactGroups)
contact.post('/count-contacts', authenticated, countContacts)

contact.get('/contacts', authenticated, getContactDetails)
contact.get('/stage-contacts', authenticated, getStageContacts)
contact.get('/contacts-not-in-stage', authenticated, getContactsNotInStage)
contact.get('/new-contacts', authenticated, getContacts)
contact.get('/contacts-mass-email', authenticated, getContactsForMassEmail)
contact.get('/contacts-mass-email-clone', authenticated, getContactsForCloneMassEmail)
contact.get('/filterd-contacts', authenticated, getFilteredContacts)
contact.get('/contacts-with-rsvp', authenticated, getContactWithRsvp)
contact.get('/selected-contacts-mass-email', authenticated, getSelectedContactsForMassEmail)
contact.get('/permissions', authenticated, getPermissions)

contact.delete('/contacts/:id', authenticated, deleteContactDetail)
contact.put('/contacts/archive/:id', authenticated, archiveContactDetail)

contact.get('/contacts/:id', authenticated, getSpecificContact)
contact.get('/billing-profiles', authenticated, getBillingProfiles)

contact.put('/contacts/:id', authenticated, updateContact)
contact.put('/contactStatus/:id', authenticated, updateContactStatus)
contact.put('/update-contact-and-form', authenticated, updateContactGroupDetails)

export default contact
