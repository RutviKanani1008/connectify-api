import { getFormResponse } from '../repositories/forms.repository'
import { sendMail } from '../services/send-grid'
import { ObjectId } from 'mongodb'
import { findScheduledMassEmail, updateScheduledMassEmail } from '../repositories/scheduledMassEmail'
import { findScheduledMassSMS, updateScheduledMassSMS } from '../repositories/scheduledMassSMS'
import { sendMassSMS } from '../services/sms/sendSms'
import { findOneContactsEmail, updateContactsEmail } from '../repositories/ContactsEmail.repository'
import { varSetInTemplate } from './dynamicVarSetInTemplate.helper'
import AWS from 'aws-sdk'
import { findIntegration } from '../repositories/integrations.repository'
import { createMassEmilSchedulerChildJob } from './jobSchedulerQueue.helper'
import _ from 'lodash'
import { createMassMailLogs } from '../repositories/massMailLog.repository'
import { emitRequest } from '../helper/socket-request.helper'

const escapeRegExp = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special characters
}

export const removeSpecialCharactersFromString = (labelString) => {
  return labelString.replace(/[',!"']/g, '')
}
/* eslint-disable no-extend-native */
export const formMailScheduler = async (data, done) => {
  try {
    const s3 = new AWS.S3({
      endpoint: `s3.${process.env.WASABI_REGION}.wasabisys.com`,
      region: process.env.WASABI_REGION,
      accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
      secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY
    })

    const form = await getFormResponse({ slug: data.slug }, [
      {
        path: 'company',
        select: { email: 1, name: 1 }
      }
    ])
    if (form && form?.autoresponder && form?.autoresponder?.htmlBody && data.autoresponder) {
      let bodyContent = form?.autoresponder?.htmlBody
      let subject = form?.autoresponder?.subject
      form.fields.forEach((obj, index) => {
        String.prototype.replaceAll = function (target, payload) {
          const regex = new RegExp(target, 'g')
          return this.valueOf().replace(regex, payload)
        }
        const escapedSubstring = escapeRegExp(`@${obj.label}`)
        const replaceRegex = new RegExp(escapedSubstring, 'gi')
        bodyContent = bodyContent?.replaceAll(
          replaceRegex,
          obj?.type === 'select'
            ? data?.[removeSpecialCharactersFromString(obj.label)]?.value ?? ''
            : obj?.type === 'multiSelect' && data?.[removeSpecialCharactersFromString(obj?.label)]?.length
            ? data?.[removeSpecialCharactersFromString(obj?.label)]?.map((obj) => obj?.label)?.join(', ')
            : data?.[removeSpecialCharactersFromString(obj?.label)] ?? ''
        )
        subject = subject
          .split(`@[${obj?.label}](${obj?.label})`)
          .join(
            obj?.type === 'select'
              ? data?.[removeSpecialCharactersFromString(obj?.label)]?.value ?? ''
              : obj?.type === 'multiSelect' && data?.[removeSpecialCharactersFromString(obj?.label)]?.length
              ? data?.[removeSpecialCharactersFromString(obj?.label)]?.map((obj) => obj?.label)?.join(', ')
              : data?.[removeSpecialCharactersFromString(obj?.label)] ?? ''
          )
      })

      sendMail({
        sender: form?.company?.email ? form?.company?.email : 'no-reply@ayz.com',
        senderName: form?.company?.name,
        receiver: data?.Email,
        subject,
        htmlBody: bodyContent
      })
    }
    // notification
    if (
      form &&
      form?.notification &&
      form?.notification?.emails &&
      form?.notification?.htmlBody &&
      form?.notification?.emails?.length > 0 &&
      data.notification
    ) {
      let bodyContent = form?.notification?.htmlBody
      let subject = form?.notification?.subject
      let fileAttachments = []

      form.fields.forEach((obj, index) => {
        if (obj.type !== 'file') {
          String.prototype.replaceAll = function (target, payload) {
            const regex = new RegExp(target, 'g')
            return this.valueOf().replace(regex, payload)
          }
          const escapedSubstring = escapeRegExp(`@${obj.label}`)
          const replaceRegex = new RegExp(escapedSubstring, 'gi')
          bodyContent = bodyContent?.replaceAll(
            replaceRegex,
            obj?.type === 'select'
              ? data?.[removeSpecialCharactersFromString(obj?.label)]?.value ?? ''
              : obj?.type === 'multiSelect' && data?.[removeSpecialCharactersFromString(obj?.label)]?.length
              ? data?.[removeSpecialCharactersFromString(obj?.label)]?.map((obj) => obj?.label)?.join(', ')
              : data?.[removeSpecialCharactersFromString(obj?.label)] ?? ''
          )
          subject = subject
            ?.split(`@[${obj?.label}](${obj?.label})`)
            ?.join(
              obj?.type === 'select'
                ? data?.[removeSpecialCharactersFromString(obj?.label)]?.value ?? ''
                : obj?.type === 'multiSelect' && data?.[removeSpecialCharactersFromString(obj?.label)]?.length
                ? data?.[removeSpecialCharactersFromString(obj?.label)]?.map((obj) => obj?.label)?.join(', ')
                : data?.[removeSpecialCharactersFromString(obj?.label)] ?? ''
            )
        }
        if (obj.type === 'file') {
          if (data?.[removeSpecialCharactersFromString(obj?.label)].length) {
            fileAttachments = [...fileAttachments, ...data?.[removeSpecialCharactersFromString(obj?.label)]]
          }
          String.prototype.replaceAll = function (target, payload) {
            const regex = new RegExp(target, 'g')
            return this.valueOf().replace(regex, payload)
          }
          const escapedSubstring = escapeRegExp(`@${obj?.label}`)
          const replaceRegex = new RegExp(escapedSubstring, 'gi')
          bodyContent = bodyContent?.replaceAll(replaceRegex, '')
          subject = subject?.split(`@[${obj?.label}](${obj?.label})`)?.join('')
        }
      })

      if (fileAttachments.length) {
        const attachments = []
        Promise.all([
          ...fileAttachments?.map(async (attachment) => {
            const options = {
              Bucket: process.env.WASABI_BUCKET_NAME,
              Key: attachment
            }
            const data = await s3.getObject(options).promise()
            attachments.push({
              content: data?.Body?.toString('base64'),
              filename: attachment.split('/').pop()
            })
          })
        ]).then(() => {
          form.notification.emails.forEach(async (email) => {
            sendMail({
              sender: form?.company?.email ? form?.company?.email : 'no-reply@ayz.com',
              senderName: form?.company?.name,
              receiver: email,
              subject,
              htmlBody: bodyContent,
              attachments
            })
          })
        })
      } else {
        form.notification.emails.forEach(async (email) => {
          sendMail({
            sender: form?.company?.email ? form?.company?.email : 'no-reply@ayz.com',
            senderName: form?.company?.name,
            receiver: email,
            subject,
            htmlBody: bodyContent
          })
        })
      }
    }
    return done()
  } catch (error) {
    console.log('error', error?.message ? error?.message : error)
    return done()
  }
}

export const massEmailScheduler = async (data, done) => {
  let contactsCount = 0
  try {
    const { isContactRequest } = data
    if (isContactRequest) {
      await emitRequest({
        eventName: `current-queue-process-${data.company}`,
        eventData: { status: 'in_process', message: 'Sending Bulk Mass email is in process...' }
      })
    } else {
      await emitRequest({
        eventName: `mass-email-process-${data.company}`,
        eventData: {
          scheduledId: data.scheduledId,
          status: 'PROCESSING',
          successCount: 0,
          failedCount: 0
        }
      })
    }
    await updateScheduledMassEmail({ _id: data.scheduledId }, { status: 'PROCESSING' })
    const massEmail = await findScheduledMassEmail({ _id: ObjectId(data.scheduledId) }, [
      { path: 'contacts', ref: 'Contacts', select: { email: true, hasUnsubscribed: true } }
    ]).select({ contacts: true })

    const sendGridKey = await findIntegration({ company: data.company })

    const chunkArray = _.chunk(massEmail.contacts || [], 100)
    contactsCount = massEmail.contacts

    await Promise.all(
      chunkArray.map((contact100BunchArray, index) =>
        createMassEmilSchedulerChildJob({
          ...data,
          contacts: contact100BunchArray,
          sendGridKey,
          batchIndex: index,
          isLastIndex: chunkArray.length === index + 1,
          contactsCount: contactsCount.length
        })
      )
    )

    // if (data.scheduledId) {
    //   await updateScheduledMassEmail({ _id: data.scheduledId }, { status: 'SENT' })
    // }
    return done()
  } catch (error) {
    await updateScheduledMassEmail({ _id: data.scheduledId }, { status: 'FAILED' })
    await emitRequest({
      eventName: `mass-email-process-${data.company}`,
      eventData: { scheduledId: data.scheduledId, status: 'FAILED', successCount: 0, failedCount: contactsCount }
    })
    console.log('error', error?.message ? error?.message : error)
    return done()
  }
}

export const massEmailSchedulerChild = async (data, done) => {
  const massEmail = await findScheduledMassEmail({ _id: ObjectId(data.scheduledId) }, [
    { path: 'template', ref: 'Email-Template' },
    { path: 'company', select: { email: true, name: true, _id: true } }
  ]).select({ template: true, company: true, senderEmail: true, senderName: true, _id: true })

  try {
    const { isContactRequest = false } = data

    if (_.isArray(data?.contacts)) {
      const sendGridKey = data.sendGridKey

      if (sendGridKey && sendGridKey?.sendGrid?.apiKey && data?.contacts?.length) {
        await Promise.all(
          data?.contacts.map(async (contact) => {
            let { htmlBody } = massEmail?.template
            if (!contact.hasUnsubscribed && contact?.email) {
              const notifySuperAdminVarObj = {
                UNSUBSCRIBEURL: `${process.env.HOST_NAME}/unsubscribe?id=${btoa(contact?._id)}`
              }
              htmlBody = varSetInTemplate(notifySuperAdminVarObj, htmlBody || '')

              return sendMail({
                receiver: contact?.email,
                sender: massEmail?.senderEmail || massEmail.company?.email,
                senderName: massEmail?.senderName || massEmail.company?.name,
                subject: massEmail?.template?.subject,
                htmlBody,
                category: String(massEmail?._id),
                sendGridKey: sendGridKey?.sendGrid?.apiKey
              })
            }
          })
        )
      }

      await createMassMailLogs(
        data?.contacts.map((obj) => ({
          contact: obj?._id,
          scheduleMassEmailId: data.scheduledId,
          status: 'SUCCESS',
          company: massEmail.company._id
        }))
      )
      await updateScheduledMassEmail({ _id: data.scheduledId }, { $inc: { successCount: data?.contacts?.length || 0 } })
      const scheduleMassMail = await findScheduledMassEmail({ _id: data.scheduledId }).select({
        successCount: true,
        failedCount: true
      })
      const importedContacts = data.batchIndex * 100 + data.contacts.length
      if (data.isLastIndex) {
        if (!isContactRequest) {
          await emitRequest({
            eventName: `mass-email-process-${data.company}`,
            eventData: {
              scheduledId: data.scheduledId,
              status: 'SENT',
              successCount: scheduleMassMail.successCount,
              failedCount: scheduleMassMail.failedCount
            }
          })
        }

        await updateScheduledMassEmail({ _id: data.scheduledId }, { status: 'SENT' })
      } else {
        if (!isContactRequest) {
          await emitRequest({
            eventName: `mass-email-process-${massEmail.company._id}`,
            eventData: {
              scheduledId: data.scheduledId,
              status: 'PROCESSING',
              successCount: scheduleMassMail.successCount,
              failedCount: scheduleMassMail.failedCount
            }
          })
        }
      }
      if (data.isContactRequest) {
        await emitRequest({
          eventName: `current-queue-process-${data.company}`,
          eventData: {
            status: importedContacts === data.contactsCount ? 'completed' : 'in_process',
            message: `Sending mass email is ${importedContacts === data.contactsCount ? 'completed' : 'in process'}. ${
              scheduleMassMail.successCount
            } out of ${data.contactsCount} mail is send successful. And ${
              scheduleMassMail.failedCount
            } mail are failed to send.`
          }
        })
      }
    }
    return done()
  } catch (error) {
    const scheduleMassMail = await findScheduledMassEmail({ _id: data.scheduledId }).select({
      successCount: true,
      failedCount: true
    })

    await emitRequest({
      eventName: `mass-email-process-${massEmail.company._id}`,
      eventData: {
        scheduledId: data.scheduledId,
        status: 'FAILED',
        successCount: scheduleMassMail.successCount,
        failedCount: scheduleMassMail.failedCount
      }
    })
    await updateScheduledMassEmail(
      { _id: data.scheduledId },
      { status: 'FAILED', $inc: { failedCount: data?.contacts?.length || 0 } }
    )
    await createMassMailLogs(
      data?.contacts.map((obj) => ({
        contact: obj?._id,
        scheduleMassEmailId: data.scheduledId,
        status: 'FAILED',
        company: massEmail.company._id
      }))
    )
    console.log('error', error?.message ? error?.message : error)
    return done()
  }
}

const sendContactMassEmail = ({
  receiverEmail,
  currentUserEmail,
  currentUserName,
  bcc,
  cc,
  subject,
  htmlBody,
  tempAttachment,
  contactEmailId,
  sendGridKey
}) => {
  sendMail({
    sender: currentUserEmail || null,
    senderName: currentUserName || null,
    receiver: receiverEmail,
    bcc: bcc?.length ? bcc : [],
    cc: cc?.length ? cc : [],
    subject: subject || '',
    htmlBody,
    category: String(contactEmailId),
    attachments: tempAttachment,
    sendGridKey
  })
}

export const contactMassEmailScheduler = async (data, done) => {
  try {
    const s3 = new AWS.S3({
      endpoint: `s3.${process.env.WASABI_REGION}.wasabisys.com`,
      region: process.env.WASABI_REGION,
      accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
      secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY
    })
    const { contactEmailId, currentUserName, currentUserEmail } = data
    const contactMassEmail = await findOneContactsEmail({ _id: ObjectId(contactEmailId) }, {}, [
      { path: 'contact', ref: 'Contacts', select: { email: true, hasUnsubscribed: true } }
    ])
    const { bcc, cc, htmlBody, subject, attachments, contact } = contactMassEmail
    const tempAttachment = []
    const sendGridKey = await findIntegration({ company: data.company })

    if (sendGridKey && sendGridKey?.sendGrid?.apiKey && attachments.length) {
      Promise.all([
        ...attachments?.map(async (attachment) => {
          const options = {
            Bucket: process.env.WASABI_BUCKET_NAME,
            Key: attachment?.fileUrl
          }
          const data = await s3.getObject(options).promise()
          tempAttachment.push({
            content: data?.Body?.toString('base64'),
            filename: attachment?.fileName
          })
        })
      ]).then(() => {
        if (!contact?.hasUnsubscribed) {
          sendContactMassEmail({
            receiverEmail: contact?.email,
            currentUserEmail,
            currentUserName,
            bcc,
            cc,
            subject,
            htmlBody,
            tempAttachment,
            contactEmailId,
            sendGridKey: sendGridKey?.sendGrid?.apiKey
          })
        }
      })
    } else {
      if (!contact?.hasUnsubscribed && sendGridKey && sendGridKey?.sendGrid?.apiKey) {
        sendContactMassEmail({
          receiverEmail: contact?.email,
          currentUserEmail,
          currentUserName,
          bcc,
          cc,
          subject,
          htmlBody,
          tempAttachment,
          contactEmailId,
          sendGridKey: sendGridKey?.sendGrid?.apiKey
        })
      }
    }
    if (contactEmailId) {
      await updateContactsEmail({ _id: contactEmailId }, { status: 'SUCCESS' })
    }

    return done()
  } catch (error) {
    console.log('error', error?.message ? error?.message : error)
    return done()
  }
}

export const massSMSScheduler = async (data, done) => {
  try {
    const massSMS = await findScheduledMassSMS({ _id: ObjectId(data.scheduledId) }, [
      { path: 'template', ref: 'Sms-Template' },
      { path: 'contacts', ref: 'Contacts', select: { phone: true } }
    ])
    if (massSMS && massSMS?.contacts?.length && massSMS?.template?.body) {
      const contactPhoneNumbers = massSMS.contacts.map((contact) => contact.phone)

      sendMassSMS({
        numbers: contactPhoneNumbers,
        message: massSMS.template.body
      })
    }

    if (data.scheduledId) {
      await updateScheduledMassSMS({ _id: data.scheduledId }, { status: 'SUCCESS' })
    }
    return done()
  } catch (error) {
    console.log('error', error?.message ? error?.message : error)
    return done()
  }
}
