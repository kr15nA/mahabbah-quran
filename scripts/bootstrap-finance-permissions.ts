import { financeDb as db } from '../lib/finance/tx'
import { permissions } from '../drizzle/schema'

const requiredPermissions = [
  'finance.billing.view',
  'finance.billing.manage',
  'finance.payment.view',
  'finance.payment.manage',
  'finance.payment.refund',
  'finance.ziswaf.view',
  'finance.ziswaf.manage',
  'finance.ziswaf.refund',
  'finance.disbursement.view',
  'finance.disbursement.manage',
  'finance.disbursement.approve',
  'finance.disbursement.pay',
  'finance.disbursement.reverse',
  'finance.dashboard.view',
  'finance.report.view',
  'finance.report.export',
  'finance.settings.manage'
]

async function bootstrap() {
  console.log('Bootstrapping Finance Permissions...')
  for (const code of requiredPermissions) {
    const name = code.split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    await db.insert(permissions)
      .values({ code, name })
      .onConflictDoNothing({ target: permissions.code })
  }
  console.log('Done.')
  process.exit(0)
}

bootstrap().catch(console.error)
