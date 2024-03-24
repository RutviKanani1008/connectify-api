import mongoose from 'mongoose'
import { config } from 'dotenv'
config({ path: `.env.${process.env.NODE_ENV}` })

const dbConnection = () => {
  const databaseURL = process.env.DB_URL

  mongoose.connect(databaseURL, {
    autoCreate: true,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    monitorCommands: true
  })

  mongoose.connection.on('connected', () => {
    console.log('Mongoose default connection open to ' + databaseURL)
  })

  mongoose.connection.on('error', (err) => {
    console.log('Mongoose default connection error: ' + err)
  })

  mongoose.connection.on('disconnected', () => {
    console.log('Mongoose default connection disconnected')
  })
}

export default dbConnection
