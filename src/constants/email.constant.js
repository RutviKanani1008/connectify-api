export const defaultConfig = {
  smtp: {
    host: '',
    port: 587,
    secure: false,
    auth: {
      user: '',
      pass: ''
    },
    type: 'smtp'
  },
  imap: {
    host: '',
    port: 993,
    secure: false,
    auth: {
      user: '',
      pass: ''
    },
    type: 'imap'
  }
}

export const defaultSmtp = [
  {
    serverDomain: 'gmail.com',
    config: {
      smtp: { host: 'smtp.gmail.com', port: 587, secure: true },
      imap: { host: 'imap.gmail.com', port: 993, secure: true }
    }
  },
  {
    serverDomain: 'yahoo.com',
    config: {
      smtp: { host: 'smtp.mail.yahoo.com', port: 465, secure: true },
      imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true }
    }
  },
  {
    serverDomain: 'plus',
    config: {
      smtp: { host: 'plus.smtp.mail.yahoo.com', port: 465, secure: true },
      imap: { host: 'plus.imap.mail.yahoo.com', port: 993, secure: true }
    }
  },
  {
    serverDomain: 'yahoo.co.uk',
    config: {
      smtp: { host: 'smtp.mail.yahoo.co.uk', port: 465, secure: true },
      imap: { host: 'imap.mail.yahoo.co.uk', port: 993, secure: true }
    }
  },
  {
    serverDomain: 'aol.com',
    config: {
      smtp: { host: 'smtp.aol.com', port: 587, secure: false },
      imap: { host: 'imap.aol.com', port: 993, secure: true }
    }
  },
  {
    serverDomain: 'at&t',
    config: {
      smtp: { host: 'smtp.att.yahoo.com', port: 465, secure: true },
      imap: { host: 'imap.att.yahoo.com', port: 993, secure: true }
    }
  },
  {
    serverDomain: 'ntlworld.com',
    config: {
      smtp: { host: 'smtp.ntlworld.com', port: 465, secure: true },
      imap: { host: 'imap.ntlworld.com', port: 993, secure: true }
    }
  },
  {
    serverDomain: 'bt',
    config: {
      smtp: { host: 'smtp.btconnect.com', port: 25, secure: false },
      imap: { host: 'imap4.btconnect.com', port: 143, secure: false }
    }
  },
  {
    serverDomain: 'o2',
    config: {
      smtp: { host: 'mail.o2online.de', port: 25, secure: false },
      imap: { host: 'imap.o2online.de', port: 143, secure: false }
    }
  },
  {
    serverDomain: 'secureimap',
    config: {
      smtp: { host: 'securesmtp.t-online.de', port: 587, secure: true },
      imap: { host: 'secureimap.t-online.de', port: 993, secure: true }
    }
  },
  {
    serverDomain: '1and1',
    config: {
      smtp: { host: 'smtp.1and1.com', port: 587, secure: false },
      imap: { host: 'imap.1and1.com', port: 993, secure: true }
    }
  },
  {
    serverDomain: 'verizon.net',
    config: {
      smtp: { host: 'outgoing.verizon.net', port: 587, secure: false },
      imap: { host: 'incoming.verizon.net', port: 143, secure: false }
    }
  },
  {
    serverDomain: 'zoho.com',
    config: {
      smtp: { host: 'smtp.zoho.com', port: 587, secure: false },
      imap: { host: 'imap.zoho.com', port: 993, secure: true }
    }
  },
  {
    serverDomain: 'gmx.com',
    config: {
      smtp: { host: 'smtp.gmx.com', port: 465, secure: true },
      imap: { host: 'imap.gmx.com', port: 993, secure: true }
    }
  },
  {
    serverDomain: 'postoffice',
    config: {
      smtp: { host: 'smtp.postoffice.net', port: 465, secure: true },
      imap: { host: 'imap.postoffice.net', port: 993, secure: true }
    }
  }
]

export const MAIL_LABELS = {
  Inbox: 'Inbox',
  Sent: 'Sent',
  Draft: 'Draft',
  Starred: 'Starred',
  Archive: 'Archive',
  Trash: 'Trash',
  Spam: 'Spam',
  Other: 'Other'
}
