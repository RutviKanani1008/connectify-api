import jwt from 'jsonwebtoken'

export const jwthelper = {
  sign: (payload, option) => {
    return jwt.sign(payload, process.env.JWT_KEY || 'abc', option)
  },

  decode: async (token) => {
    /**
     * @description token must start with Bearer text.
     */
    const regex = /^(Bearer\s)/gm
    if (!regex.test(token)) {
      return false
    }

    /**
     * Remove the Bearer text from token.
     */
    token = token.replace('Bearer ', '')

    let r
    try {
      r = jwt.verify(token, process.env.JWT_KEY || 'abc')
    } catch (e) {
      return false
    }
    return r
  }
}
