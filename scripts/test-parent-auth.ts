import fs from 'fs'

async function fetchWithCookie(url: string, method: string, cookie: string, body?: any) {
  const headers: Record<string, string> = { 'Cookie': cookie }
  if (body) headers['Content-Type'] = 'application/json'
  
  const res = await fetch(`http://localhost:3000${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  return { status: res.status, data: await res.json().catch(() => null) }
}

async function login(email: string) {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password: 'Password123!' })
  })
  const setCookie = res.headers.get('set-cookie')
  const cookie = setCookie?.split(';')[0] || ''
  return cookie
}

async function run() {
  console.log('Starting DB Tests...')
  const log: string[] = []
  
  const report = (name: string, success: boolean, msg: string) => {
    const icon = success ? '✅' : '❌'
    const out = `${icon} ${name}: ${msg}`
    console.log(out)
    log.push(out)
  }

  try {
    // 1. Parent tests
    const parentCookie = await login('hendra.wijaya@gmail.com') // Parent of student 1
    
    let res = await fetchWithCookie('/api/attendance?student_id=1', 'GET', parentCookie)
    report('Parent linked student attendance', res.status === 200, `Expected 200, got ${res.status}`)

    res = await fetchWithCookie('/api/attendance?student_id=2', 'GET', parentCookie)
    report('Parent unrelated student attendance', res.status === 403, `Expected 403, got ${res.status}`)

    res = await fetchWithCookie('/api/attendance?student_id=999', 'GET', parentCookie)
    report('Parent nonexistent student attendance', res.status === 403 || res.status === 404, `Expected 403/404, got ${res.status}`)

    res = await fetchWithCookie('/api/learning-reports/1', 'GET', parentCookie)
    report('Parent linked report access', res.status === 200, `Expected 200, got ${res.status}`)

    res = await fetchWithCookie('/api/learning-reports/2', 'GET', parentCookie)
    report('Parent unrelated report access', res.status === 403, `Expected 403, got ${res.status}`)

    res = await fetchWithCookie('/api/notifications/1/read', 'PATCH', parentCookie)
    report('Parent linked notification access', res.status === 200, `Expected 200, got ${res.status}`)

    res = await fetchWithCookie('/api/notifications/2/read', 'PATCH', parentCookie)
    report('Parent unrelated notification access', res.status === 403, `Expected 403, got ${res.status}`)

    // 2. Guru tests
    const guruCookie = await login('aldi.solihin@mahabbahquran.id')
    res = await fetchWithCookie('/api/attendance?class_id=1', 'GET', guruCookie)
    report('Guru attendance behavior', res.status === 200, `Expected 200, got ${res.status}`)

    // 3. Admin tests
    const adminCookie = await login('admin@mahabbahquran.id')
    res = await fetchWithCookie('/api/attendance?class_id=1', 'GET', adminCookie)
    report('Admin attendance behavior', res.status === 200, `Expected 200, got ${res.status}`)

  } catch (err: any) {
    console.error('Test error:', err)
    log.push(`❌ Error: ${err.message}`)
  }

  fs.writeFileSync('db-test-results.txt', log.join('\\n'))
  console.log('Tests completed.')
}

run()
