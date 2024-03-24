import _ from 'lodash'
import fs from 'fs'
import moment from 'moment'
import path from 'path'
import rrule from 'rrule'
import CryptoJS from 'crypto-js'

const { RRule } = rrule

export const removeFile = async (filePath) => {
  try {
    const __dirname = path.resolve()
    fs.unlinkSync(path.join(__dirname, filePath))
    return true
  } catch (error) {
    console.log('error', error?.message ? error?.message : error)
    return false
  }
}

export const folderExistCheck = (path) => {
  if (fs.existsSync(path)) {
    return true
  } else {
    fs.mkdirSync(path, { recursive: true })
    return true
  }
}

export const getRRuleFromReccuringDetails = (reccuringDetails) => {
  const weekObj = {
    0: RRule.SU,
    1: RRule.MO,
    2: RRule.TU,
    3: RRule.WE,
    4: RRule.TH,
    5: RRule.FR,
    6: RRule.SA
  }

  const rRuleObj = {
    dtstart: new Date(moment(reccuringDetails.startDate)),
    until: new Date(moment(reccuringDetails.endDate))
  }

  if (reccuringDetails?.schedule === 'weekly') {
    rRuleObj.freq = RRule.WEEKLY
    rRuleObj.byweekday = [weekObj[reccuringDetails?.selectedWeekDay]]
  }
  if (reccuringDetails?.schedule === 'monthly') {
    rRuleObj.freq = RRule.MONTHLY
    rRuleObj.bymonthday = reccuringDetails?.selectedMonthDay
  }
  if (reccuringDetails?.schedule === 'yearly') {
    const bymonth = moment(reccuringDetails?.selectedYear).month()
    const bymonthday = moment(reccuringDetails?.selectedYear).day()
    rRuleObj.freq = RRule.YEARLY
    rRuleObj.bymonth = [bymonth]
    rRuleObj.bymonthday = [bymonthday]
  }

  return new RRule(rRuleObj)
}

export const convertEmptyObjValueToNull = (obj) => {
  try {
    if (_.isObject(obj)) {
      Object.keys(obj).forEach((key) => {
        if (!obj[key]) {
          obj[key] = null
        }
      })
      return obj
    } else {
      return obj
    }
  } catch (error) {
    return obj
  }
}

export const logger = (value) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(value?.message ? value?.message : value)
  }
}

export const errorMessage = (value) => {
  return value?.message ? value?.message : value
}

// Encrypt
export const encrypt = (data) => {
  const cipherText = encodeURIComponent(CryptoJS.AES.encrypt(data, process.env.SECRET_KEY).toString())
  return cipherText
}

// Decrypt
export const decrypt = (data) => {
  const bytes = CryptoJS.AES.decrypt(decodeURIComponent(data), process.env.SECRET_KEY).toString(CryptoJS.enc.Utf8)
  return bytes
}

export const parseData = (data) => {
  try {
    return JSON.parse(data)
  } catch (e) {
    return data
  }
}

export const isValidDate = (date) => {
  if (typeof date === 'string') {
    return Object.prototype.toString.call(new Date(date)).slice(8, -1) === 'Date'
  }

  return date instanceof Date
}

export const ucFirst = (str) => `${str[0].toUpperCase()}${str.slice(1)}`

export const compareArraysByKey = (array1, array2) => {
  if (array1.length !== array2.length) {
    return true
  }

  // sort
  array1.sort()
  array2.sort()

  for (let i = 0; i < array1.length; i++) {
    // difference
    if (array1[i] !== array2[i]) {
      return true
    }
  }

  return false
}
