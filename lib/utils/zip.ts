import zlib from 'zlib'

export interface ZipEntry {
  name: string
  data: Buffer
}

/**
 * Creates a standard PKZIP archive from an array of file entries.
 * Pure TypeScript implementation using Node.js built-in zlib for deflate and crc32.
 * Zero external dependencies.
 */
export function createZipArchive(entries: ZipEntry[]): Buffer {
  const localHeaders: Buffer[] = []
  const cdHeaders: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8')
    const uncompressed = Buffer.from(entry.data)
    const compressed = zlib.deflateRawSync(uncompressed)
    const crc = zlib.crc32(uncompressed)

    // Local file header (30 bytes + nameBuf.length)
    const lh = Buffer.alloc(30 + nameBuf.length)
    lh.writeUInt32LE(0x04034b50, 0) // signature
    lh.writeUInt16LE(20, 4)         // version needed (2.0)
    lh.writeUInt16LE(0, 6)          // flags
    lh.writeUInt16LE(8, 8)          // compression method: 8 = DEFLATE
    lh.writeUInt16LE(0, 10)         // file mod time
    lh.writeUInt16LE(0, 12)         // file mod date
    lh.writeUInt32LE(crc, 14)       // crc-32
    lh.writeUInt32LE(compressed.length, 18)   // compressed size
    lh.writeUInt32LE(uncompressed.length, 22) // uncompressed size
    lh.writeUInt16LE(nameBuf.length, 26)      // filename length
    lh.writeUInt16LE(0, 28)                   // extra field length
    nameBuf.copy(lh, 30)

    localHeaders.push(lh, compressed)

    // Central directory header (46 bytes + nameBuf.length)
    const cd = Buffer.alloc(46 + nameBuf.length)
    cd.writeUInt32LE(0x02014b50, 0) // signature
    cd.writeUInt16LE(20, 4)         // version made by
    cd.writeUInt16LE(20, 6)         // version needed
    cd.writeUInt16LE(0, 8)          // flags
    cd.writeUInt16LE(8, 10)         // compression method: 8 = DEFLATE
    cd.writeUInt16LE(0, 12)         // file mod time
    cd.writeUInt16LE(0, 14)         // file mod date
    cd.writeUInt32LE(crc, 16)       // crc-32
    cd.writeUInt32LE(compressed.length, 20)   // compressed size
    cd.writeUInt32LE(uncompressed.length, 24) // uncompressed size
    cd.writeUInt16LE(nameBuf.length, 28)      // filename length
    cd.writeUInt16LE(0, 30)                   // extra field length
    cd.writeUInt16LE(0, 32)                   // file comment length
    cd.writeUInt16LE(0, 34)                   // disk number start
    cd.writeUInt16LE(0, 36)                   // internal file attributes
    cd.writeUInt32LE(0, 38)                   // external file attributes
    cd.writeUInt32LE(offset, 42)              // relative offset of local header
    nameBuf.copy(cd, 46)

    cdHeaders.push(cd)
    offset += lh.length + compressed.length
  }

  const cdOffset = offset
  const cdBuf = Buffer.concat(cdHeaders)
  const cdSize = cdBuf.length

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // signature
  eocd.writeUInt16LE(0, 4)          // disk number
  eocd.writeUInt16LE(0, 6)          // disk where central directory starts
  eocd.writeUInt16LE(entries.length, 8)  // number of central directory records on this disk
  eocd.writeUInt16LE(entries.length, 10) // total number of central directory records
  eocd.writeUInt32LE(cdSize, 12)    // size of central directory
  eocd.writeUInt32LE(cdOffset, 16)  // offset of start of central directory
  eocd.writeUInt16LE(0, 20)         // comment length

  return Buffer.concat([...localHeaders, cdBuf, eocd])
}
