import sgMail from '@sendgrid/mail'

export const sendMail = async ({
  sender = process.env.FROM_EMAIL,
  receiver = 'developer@mailinator.com',
  senderName = 'XYZ CRM',
  subject,
  body = ' ',
  htmlBody = ' ',
  category = null,
  bcc = [],
  cc = [],
  attachments = [],
  sendGridKey = process.env.SEND_GRID_API_KEY
}) => {
  const msg = {
    from: {
      email: sender,
      name: senderName
    },
    to: receiver,
    subject,
    text: body,
    html: htmlBody,
    attachments,
    ...(cc?.length > 0 ? { cc } : {}),
    ...(bcc?.length > 0 ? { bcc } : {}),
    ...(category ? { categories: category } : {})
  }

  sgMail.setApiKey(sendGridKey)

  if (!htmlBody?.length && !body?.length) {
    return
  }

  try {
    await sgMail.send(msg)
    console.log({ receiver })
  } catch (error) {
    console.log('Mail Send Error')
    throw Error(error)
  }

  // sgMail
  //   .send(msg)
  //   .then((res) => {
  //     console.log({ res })
  //   })
  //   .catch((err) => {
  //     console.log({ err: err?.response?.body?.errors })
  //   })
}

// Sends an email notification to a user if their notification mode includes email.
export const sendEmailNotificationIfEnabled = async (user, subject, body, attachments = []) => {
  if (user.notificationModes.includes('email')) {
    await sendMail({
      receiver: user?.email,
      subject,
      body,
      htmlBody: body,
      attachments
    })
  }
}
