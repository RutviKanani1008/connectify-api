import twilio from 'twilio'

const accountSid = ''
const authToken = ''
const notifyServiceSID = ''

export const sendSMS = (number, message) => {
  const client = twilio(accountSid, authToken)
  return client.messages.create({
    body: message,
    from: '+15625731068',
    to: number
  })
}

export const sendMassSMS = ({ numbers, message }) => {
  const body = message

  const client = twilio(accountSid, authToken)
  const service = client.notify.services(notifyServiceSID)
  const bindings = numbers.map((number) => {
    return JSON.stringify({ binding_type: 'sms', address: number })
  })

  return service.notifications
    .create({
      toBinding: bindings,
      body
    })
    .catch((e) => console.log(e))
}
