import axios from 'axios'

export const checkGoogleReCaptchaVerification = async (token) => {
  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`

  const res = await axios.post(url).catch((e) => {
    console.log(e)
  })
  if (res.data && res.data?.success) {
    return true
  } else return false
}
