/* eslint-disable no-extend-native */
import _ from 'lodash'

export const varSetInTemplate = (object, body) => {
  if (_.isObject(object)) {
    let tempBody = body
    String.prototype.replaceAll = function (target, payload) {
      const regex = new RegExp(target, 'g')
      return this.valueOf().replace(regex, payload)
    }
    Object.keys(object).forEach((key) => {
      tempBody = tempBody.replaceAll(`{{${key}}}`, object[key])
    })
    return tempBody
  }
  throw new Error('Something went wrong!')
}
