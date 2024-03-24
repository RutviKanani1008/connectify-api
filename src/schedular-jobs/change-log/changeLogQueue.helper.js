import _ from 'lodash'
import { findAllUser } from '../../repositories/users.repository'
import { createSendMailJob } from '../../helpers/jobSchedulerQueue.helper'
import { sendMail } from '../../services/send-grid'
import { findOneEmailTemplate } from '../../repositories/emailTemplates.repository'
import { INTERNAL_COMMUNICATION_TEMPLATE } from '../../constants/internalCommunicationTemplate'
import { varSetInTemplate } from '../../helpers/dynamicVarSetInTemplate.helper'

export const changeLogProcess = async (jobData, done) => {
  try {
    // change log template
    const template = await findOneEmailTemplate({ _id: INTERNAL_COMMUNICATION_TEMPLATE.changeLogEmail })

    // get user
    const users = await findAllUser({ isVerified: true, active: true }, { email: 1 })

    await Promise.all(
      _.chunk(users || [], 100).map((userBatch) =>
        createSendMailJob({
          users: userBatch,
          template,
          changeLog: jobData
        })
      )
    ).then(async () => {
      console.log('=== change log queue END : ', new Date().getTime())
      return done()
    })
    return done()
  } catch (err) {
    console.log('error in change log queue process')
    return done()
  }
}

export const sendMailProcess = async (jobData, done) => {
  try {
    const notAvailable = [null, undefined, '']
    const replacements = {
      features: jobData.changeLog.features,
      improvements: jobData.changeLog.improvements,
      bug_fixes: jobData.changeLog.bugs,
      version_id: jobData.changeLog.version,
      featureLabel: !notAvailable.includes(jobData.changeLog.features)
        ? '<p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px; color: #000000;"><strong>Features:</strong></span></p>'
        : '',
      improvementLabel: !notAvailable.includes(jobData.changeLog.improvements)
        ? '<p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px; color: #000000;"><strong>Improvements:</strong></span></p>'
        : '',
      bugFixLabel: !notAvailable.includes(jobData.changeLog.bugs)
        ? '<p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px; color: #000000;"><strong>Bug Fixes:</strong></span></p>'
        : ''
    }
    const html = varSetInTemplate(replacements, jobData.template.htmlBody)
    for (const user of jobData.users) {
      await sendMail({
        receiver: user.email,
        subject: `xyz V${jobData?.changeLog?.version} Change Log`,
        htmlBody: html
      })
    }

    return done()
  } catch (err) {
    console.log('error in sending mail to user')
    return done()
  }
}
