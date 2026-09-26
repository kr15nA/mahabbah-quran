import { put, del, head } from '@vercel/blob'

import { getBlobToken } from '../config/env'

// Exporting an object allows tests to intercept and mock the methods
export const BlobStorage = {
  putBlob: async (filename: string, buffer: Buffer, options: any) => {
    getBlobToken()
    return put(filename, buffer, options)
  },
  
  deleteBlob: async (url: string) => {
    getBlobToken()
    return del(url)
  },

  headBlob: async (url: string) => {
    getBlobToken()
    return head(url)
  }
}
