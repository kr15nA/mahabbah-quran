import fs from 'fs'
import path from 'path'

function walkSync(dir: string, callback: (filepath: string) => void) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const filepath = path.join(dir, file)
    if (fs.statSync(filepath).isDirectory()) {
      walkSync(filepath, callback)
    } else {
      callback(filepath)
    }
  }
}

walkSync('app/api/finance/disbursements', (filepath) => {
  if (filepath.endsWith('.ts')) {
    let content = fs.readFileSync(filepath, 'utf8')
    content = content.replace(/\(\({ params }: { params: Promise<{ id: string }> }\)\)/g, '({ params }: { params: Promise<{ id: string }> })')
    fs.writeFileSync(filepath, content)
    console.log(`Fixed ${filepath}`)
  }
})

walkSync('app/admin/keuangan/pengeluaran', (filepath) => {
  if (filepath.endsWith('.tsx')) {
    let content = fs.readFileSync(filepath, 'utf8')
    content = content.replace(/\(\({ params }: { params: Promise<{ id: string }> }\)\)/g, '({ params }: { params: Promise<{ id: string }> })')
    fs.writeFileSync(filepath, content)
    console.log(`Fixed ${filepath}`)
  }
})
