import mongoose from 'mongoose'

declare global {
  var _mongooseConn: Promise<typeof mongoose> | undefined
}

// Cache the connection promise on globalThis so dev hot-reloads and concurrent
// first requests share a single connection.
export function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not defined in environment variables')

  global._mongooseConn ??= mongoose.connect(uri)
  return global._mongooseConn
}
