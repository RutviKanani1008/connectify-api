/* eslint-disable space-before-function-paren */
import _ from 'lodash'
import { isValidDate, ucFirst } from '../utils/utils'

export class IMail {
  id = undefined
  user = undefined
  email = undefined
  company = undefined
  mail_provider = undefined
  from = undefined
  to = undefined
  folders = undefined
  flags = undefined
  message_id = undefined
  cc = undefined
  bcc = undefined
  subject = undefined
  html = undefined
  text = undefined
  attachments = undefined
  thread_id = undefined
  mail_provider_thread_id = undefined
  mail_provider_send_date = undefined
  created_at = undefined
  updated_at = undefined
  deleted_at = undefined
  is_main = undefined
  send_date = undefined
  emailUid = undefined
}

export default class ImapMessage {
  mail
  data

  constructor(data) {
    this.mail = new IMail()
    this.data = data
  }

  setInstance = () => {
    _.forEach(this.mail, (_value, key) => {
      if (typeof this[`set${ucFirst(key)}`] === 'function') {
        this?.[`set${ucFirst(key)}`]?.()
      }
    })
    return this
  }

  getResult = () => {
    return _.cloneDeep(this.mail)
  }

  setMail_provider_thread_id = () => {
    const references = this.data?.message?.headers?.get?.('references')
    if (typeof references === 'string') {
      this.mail.mail_provider_thread_id = references
    }

    if (typeof references === 'object' && Array.isArray(references)) {
      this.mail.mail_provider_thread_id = references.at(0)
    }

    if (!references) {
      this.mail.mail_provider_thread_id = this.data?.message?.headers?.get('message-id')
    }

    return this
  }

  setUser = () => {
    this.mail.user = this.data.data.user
    return this
  }

  setCompany = () => {
    this.mail.company = this.data.data.company
    return this
  }

  setEmail = () => {
    this.mail.email = this.data.data.email
    return this
  }

  setMail_provider = () => {
    this.mail.mail_provider = 'smtp'
    return this
  }

  setFrom = () => {
    let address = this.data?.message?.headers?.get('from')?.value[0].address
    if (this.data.message.mailBox === 'Sent') {
      address = this.data.data.email
    }
    const name = this.data?.message?.headers?.get('from')?.value[0].name
    this.mail.from = { address, name }
    return this
  }

  setTo = () => {
    this.mail.to = this.data?.message?.headers?.get('to')?.value
    return this
  }

  setCc = () => {
    this.mail.cc = this.data?.message?.headers?.get('cc')?.value

    return this
  }

  setBcc = () => {
    this.mail.bcc = this.data?.message?.headers?.get('bcc')?.value
    return this
  }

  setMessage_id = () => {
    this.mail.message_id = this.data?.message?.headers?.get('message-id')
    return this
  }

  setEmailUid = () => {
    this.mail.emailUid = [{ mailBox: this.data.message.mailBox, uuId: this.data?.message?.emailUid }]
    return this
  }

  setSubject = () => {
    this.mail.subject = this.data?.message?.headers?.get('subject')
    console.log('**********', this.mail.subject, '**********')
    return this
  }

  setFolders = () => {
    const folders = Object.keys(this.data.userSelectedFolder).filter(
      (key) => this.data.userSelectedFolder[key] === this.data.message.mailBox
    )
    this.mail.folders = folders.length ? folders : []
    return this
  }

  setFlags = () => {
    this.mail.flags = this.data?.message?.attributes?.flags

    return this
  }

  setSend_date = () => {
    const providedDate = this.data?.message?.headers?.get?.('date')
    if (isValidDate(providedDate)) {
      this.mail.send_date = new Date(providedDate)
    }
    return this
  }

  setHtml = () => {
    this.mail.html = this?.data?.message?.body?.html
    return this
  }

  setText = () => {
    this.mail.text = this.data?.message?.body?.text
    return this
  }
}
