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
    
    // Fix params type
    content = content.replace(
      /({ params }: { params: { id: string } })/g,
      '({ params }: { params: Promise<{ id: string }> })'
    )
    
    // Fix await params.id
    content = content.replace(
      /const id = parseInt\(params\.id, 10\)/g,
      'const paramsObj = await params;\n    const id = parseInt(paramsObj.id, 10)'
    )
    
    // Fix requireAuth -> requirePermission
    content = content.replace(
      /import { requireAuth }/g,
      'import { requirePermission }'
    )
    content = content.replace(
      /await requireAuth\(req, '(.+?)'\)/g,
      'await requirePermission(\'$1\')'
    )
    
    fs.writeFileSync(filepath, content)
    console.log(`Updated ${filepath}`)
  }
})

walkSync('app/admin/keuangan/pengeluaran', (filepath) => {
  if (filepath.endsWith('.tsx')) {
    let content = fs.readFileSync(filepath, 'utf8')
    
    // Fix requireAuth
    content = content.replace(
      /import { requireAuth }/g,
      'import { requirePermission }'
    )
    content = content.replace(
      /import { requireAuth, hasPermission }/g,
      'import { requirePermission, hasPermission }'
    )
    content = content.replace(
      /await requireAuth\(null, '(.+?)'\)/g,
      'await requirePermission(\'$1\')'
    )

    // Fix params type in pages
    content = content.replace(
      /({ params }: { params: { id: string } })/g,
      '({ params }: { params: Promise<{ id: string }> })'
    )
    
    // Fix await params.id
    content = content.replace(
      /const id = parseInt\(params\.id, 10\)/g,
      'const paramsObj = await params;\n  const id = parseInt(paramsObj.id, 10)'
    )
    
    fs.writeFileSync(filepath, content)
    console.log(`Updated ${filepath}`)
  }
})
