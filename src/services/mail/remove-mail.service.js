import { deleteEmails } from '../../repositories/email.repository'

export const removeMailProcess = async (data, done) => {
  try {
    const { providerName, company, user } = data

    console.log('======== Mail Deleting Started 🚀=========')
    await deleteEmails({
      company,
      user,
      mail_provider: providerName
    })
    console.log('======== Mail Deleting Ended 🚀=========')
    return done()
  } catch (error) {
    console.log('removeMailProcess', error)
    return done()
  }
}
