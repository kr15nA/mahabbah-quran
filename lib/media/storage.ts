import { put, del, head } from '@vercel/blob'

// Exporting an object allows tests to intercept and mock the methods
export const BlobStorage = {
  putBlob: async (filename: string, buffer: Buffer, options: any) => {
    return put(filename, buffer, options)
  },
  
  deleteBlob: async (url: string) => {
    return del(url)
  },

  headBlob: async (url: string) => {
    return head(url)
  }
}
