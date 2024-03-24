import nodemailer from 'nodemailer'

export const createConnection = (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: {
        user: options.auth.user,
        pass: options.auth.pass
      }
    })
    return transporter
  } catch (error) {
    console.log('createConnection', error)
  }
}

export const verifySmtpConnection = async (options) => {
  try {
    return createConnection(options).verify()
  } catch (error) {
    console.log({ error })
    throw new Error('Smtp connection verification failed:Please check credentials')
  }
}

export const sendSmtpMail = async (connectionData, emailData) => {
  const details = await createConnection(connectionData)
    .sendMail({
      from: emailData.from,
      to: emailData.to,
      cc: emailData.cc,
      bcc: emailData.bcc,
      subject: emailData?.subject,
      text: emailData?.text,
      html: emailData?.html,
      attachments: emailData.attachments
    })
    .then((info) => {
      if (info.response.search('queued') !== -1) {
        throw new Error('Your mail is being queued by your host. please contact to your smtp host.')
      }
      return info
    })
    .catch((err) => {
      throw new Error(400, err.message)
    })

  return details
}

export const replySmtpMail = async (connectionData, emailData) => {
  const details = await createConnection(connectionData)
    .sendMail({
      from: emailData.from,
      to: emailData.to,
      cc: emailData.cc,
      bcc: emailData.bcc,
      subject: emailData?.subject,
      text: emailData?.text,
      html: emailData?.html,
      attachments: emailData.attachments,
      replyTo: emailData.to,
      inReplyTo: emailData.thread_id,
      references: emailData.thread_id
    })
    .then((info) => {
      if (info.response.search('queued') !== -1) {
        throw new Error('Your mail is being queued by your host. please contact to your smtp host.')
      }
      return info
    })
    .catch((err) => {
      throw new Error(400, err.message)
    })

  return details
}

export const forwardSmtpMail = async (connectionData, emailData) => {
  const details = await createConnection(connectionData)
    .sendMail({
      from: emailData.from,
      to: emailData.to,
      cc: emailData.cc,
      bcc: emailData.bcc,
      subject: emailData?.subject,
      text: emailData?.text,
      html: emailData?.html,
      attachments: emailData.attachments,
      inReplyTo: emailData.thread_id
    })
    .then((info) => {
      if (info.response.search('queued') !== -1) {
        throw new Error('Your mail is being queued by your host. please contact to your smtp host.')
      }
      return info
    })
    .catch((err) => {
      throw new Error(400, err.message)
    })

  return details
}
