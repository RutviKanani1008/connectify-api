import { Router } from 'express'

import {
  forgotPassword,
  login,
  register,
  changeForgotPassword,
  sendTestMail,
  updateUserDetail,
  virtualLogin,
  testSendGrid,
  virtualUserLogin,
  sendVerificationCode,
  checkVerificationCode,
  virtualAdminLogin,
  logout
} from '../controllers/auth.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const auth = Router()

auth.post('/login', login)
auth.post('/logout', authenticated, logout)
auth.post('/register', register)
auth.post('/forgot-password', forgotPassword)
auth.post('/change-password', changeForgotPassword)
auth.post('/reset-password', changeForgotPassword)
auth.get('/test-email', sendTestMail)
auth.get('/virtual-login/:id', authenticated, virtualLogin)
auth.get('/virtual-login/user/:id', authenticated, virtualUserLogin)
auth.get('/virtual-login/admin/:id', authenticated, virtualAdminLogin)
auth.get('/testSendGrid', testSendGrid)

auth.put('/user', authenticated, updateUserDetail)
auth.post('/send-verification', authenticated, sendVerificationCode)
auth.post('/check-verification', authenticated, checkVerificationCode)

export default auth
