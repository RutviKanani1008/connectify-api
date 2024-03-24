import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import {
  connectSmtpImap,
  deleteSmtpImapCredential,
  getConnectedSmtpAccount,
  getConnectedSmtpAccounts,
  isMailSyncing,
  refreshMail,
  setMailWatcher,
  updateSmtpImap
} from '../controllers/smtp-imap.controller'

const smtpImap = Router()

smtpImap.post('/smtp-imap/connect', authenticated, connectSmtpImap)
smtpImap.post('/smtp-imap/refresh', authenticated, refreshMail)
smtpImap.post('/smtp-imap/set-mail-watcher', authenticated, setMailWatcher)
smtpImap.get('/smtp-imap/connected-accounts', authenticated, getConnectedSmtpAccounts)
smtpImap.get('/smtp-imap/connected-accounts/:userName', authenticated, getConnectedSmtpAccount)
smtpImap.put('/smtp-imap/update/:userName', authenticated, updateSmtpImap)
smtpImap.delete('/smtp-imap/remove-account', authenticated, deleteSmtpImapCredential)
smtpImap.get('/smtp-imap/is-mail-syncing', authenticated, isMailSyncing)

export default smtpImap
