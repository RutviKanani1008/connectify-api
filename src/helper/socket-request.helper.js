import axios from 'axios'
import https from 'https'

export const emitRequest = async (data) => {
  try {
    const authHeader = Buffer.from(JSON.stringify({ user: 'queue', pass: 'Admin@123' })).toString('base64')

    // At request level
    const agent = new https.Agent({
      rejectUnauthorized: false
    })

    return await axios.post(`${process.env.SERVER_URL}/emit`, data, {
      headers: {
        Authorization: authHeader
      },
      httpsAgent: agent
    })
  } catch (error) {
    console.log('Emit Request ERROR', error)
  }
}
