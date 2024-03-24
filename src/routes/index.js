import auth from './auth.routes'
import home from './home.route'
import { Router } from 'express'
import company from './company.routes'
import contact from './contact.routes'
import users from './user.routes'
import forms from './forms.route'
import document from './document.routes'
import pipeline from './pipeline.route'
import group from './group.route'
import tags from './tags.route'
import status from './status.route'
import category from './category.route'
import customField from './customFields.route'
import event from './event.route'
import changeLog from './changeLog.route'
import massEmail from './massEmail.route'
import scheduledMassEmail from './scheduledMassEmail.route'
import massSMS from './massSMS.route'
import scheduledMassSMS from './scheduledMassSMSroute'
import smsTemplate from './smsTemplates.routes'
import emailTemplate from './emailTemplates.routes'
import customer from './customer.route'
import product from './product.route'
import invoice from './invoice.routes'
import productCategory from './productCategory.route'
import quote from './quote.route'
import payment from './payment.route'
import billingTemplate from './billingTemplate.routes'
import changeHistoryStatus from './billingStatusHistory.routes'
import task from './task.route'
import taskOption from './taskOption.route'
import general from './general.route'
import notes from './notes.route'
import folders from './folder.route'
import checklistTemplate from './checklistTemplates.routes'
import taskUpdates from './taskUpdate.route'
import taskNofiyUsers from './taskNotifyUsers.routes'
import contactEmail from './contactsEmail.route'
import emailSender from './emailSender.routes'
import featureRequest from './featureRequest.route'
import integration from './integrations.route'
import reportProblem from './reportProblem.route'
import reportFeatureComments from './reportFeatureComments.route'
import smtpImap from './smtp-imap.route'
import importContacts from './importContacts.routes'
import taskTimer from './taskTimer.route'
import inventoryProduct from './inventoryProduct.routes'
import inventoryProductCategory from './inventoryProductCategory.routes'
import inventoryWarehouseLocation from './inventoryWarehouseLocation.routes'
import inventoryProductSpecDetails from './inventoryProductSpecDetails.routes'
import inventoryWooConnection from './inventoryWoocommerceConnection.routes'
import email from './email.route'
import communicationSettings from './communicationSettings.route'
import mailProviderFolder from './mailProviderFolder.route'
import inventoryWooDefaultSettings from './inventoryWooDefaultSettings.routes'
import inventoryOfflineOrder from './inventoryOfflineOrder.routes'
import inventoryProductCriteria from './inventoryProductCriteria.routes'
import contactActivities from './contactActivities'
import userGuide from './userGuide'
import inventoryOnlineOrder from './inventoryOnlineOrder.routes'
import directMailTemplate from './directMailTemplates.routes'
import afterTaskInstructionTemplate from './afterTaskInstructionTemplate.route'
import directMail from './directMail.route'
import envelope from './envelope.routes'
import lob from './lob.route'
import cmsContent from './cmsContent'
import webPushSubscription from './webPushSubscription.route'
import notification from './notification.route'
import taskManagerSettings from './taskManagerSettings.route'
import userNotificationSettings from './userNotificationSettings.route'

const router = Router()

router.use('/', general)
router.use('/auth', auth)
router.use('/', home)
router.use('/', company)
router.use('/', contact)
router.use('/', users)
router.use('/', forms)
router.use('/', document)
router.use('/', pipeline)
router.use('/', group)
router.use('/', tags)
router.use('/', status)
router.use('/', category)
router.use('/', customField)
router.use('/', event)
router.use('/', changeLog)
router.use('/', massEmail)
router.use('/', massSMS)
router.use('/', scheduledMassEmail)
router.use('/', scheduledMassSMS)
router.use('/', smsTemplate)
router.use('/', emailTemplate)
router.use('/', customer)
router.use('/', product)
router.use('/', invoice)
router.use('/', productCategory)
router.use('/', quote)
router.use('/', payment)
router.use('/', billingTemplate)
router.use('/', changeHistoryStatus)
router.use('/', task)
router.use('/', taskManagerSettings)
router.use('/', taskOption)
router.use('/', notes)
router.use('/', folders)
router.use('/', checklistTemplate)
router.use('/', taskUpdates)
router.use('/', taskNofiyUsers)
router.use('/', contactEmail)
router.use('/', emailSender)
router.use('/', featureRequest)
router.use('/', reportProblem)
router.use('/', reportFeatureComments)
router.use('/', integration)
router.use('/', smtpImap)
router.use('/', importContacts)
router.use('/', taskTimer)
router.use('/', inventoryProduct)
router.use('/', inventoryProductCategory)
router.use('/', inventoryWarehouseLocation)
router.use('/', inventoryProductSpecDetails)
router.use('/', inventoryWooConnection)
router.use('/', mailProviderFolder)
router.use('/', email)
router.use('/', inventoryWooDefaultSettings)
router.use('/', inventoryOfflineOrder)
router.use('/', inventoryOnlineOrder)
router.use('/', inventoryProductCriteria)
router.use('/', contactActivities)
router.use('/', communicationSettings)
router.use('/', userGuide)
router.use('/', cmsContent)
router.use('/', directMailTemplate)
router.use('/', afterTaskInstructionTemplate)
router.use('/', directMail)
router.use('/', envelope)
router.use('/', lob)
router.use('/', userNotificationSettings)
router.use('/', webPushSubscription)
router.use('/', notification)

export default router
