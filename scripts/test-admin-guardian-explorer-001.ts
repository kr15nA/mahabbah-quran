import { getGuardianExplorerSummary, getStudentGuardianExplorer, getGuardianExplorer } from '../lib/guardians/explorer'
import assert from 'assert'

async function run() {
  console.log("=========================================")
  console.log("TESTING: Admin Guardian Explorer (Phase B2)")
  console.log("=========================================")

  try {
    console.log("\n1. SUMMARY METRICS")
    const summary = await getGuardianExplorerSummary()
    console.log("Total Active Guardians:", summary.totalActiveGuardians)
    console.log("Multi-Student Guardians:", summary.multiStudentGuardians)
    console.log("Students Without Guardian:", summary.studentsWithoutGuardian)
    console.log("Students Without Primary:", summary.studentsWithoutPrimary)
    assert(summary.totalActiveGuardians >= 0, "Total guardians should be >= 0")
    console.log("-> Summary Metrics PASS")

    console.log("\n2. PER SANTRI DATA QUERY")
    const studentData = await getStudentGuardianExplorer({ page: 1, pageSize: 30 })
    assert(studentData.data, "Data array should exist")
    assert(studentData.meta.totalItems >= 0, "totalItems should be >= 0")
    console.log(`Returned ${studentData.data.length} students`)
    if (studentData.data.length > 0) {
      const firstRow = studentData.data[0]
      assert('activeGuardianCount' in firstRow, "activeGuardianCount missing")
      assert('hasPrimaryGuardian' in firstRow, "hasPrimaryGuardian missing")
      assert(Array.isArray(firstRow.relations), "relations should be array")
    }
    console.log("-> Per Santri Query PASS")

    console.log("\n3. PER SANTRI - ZERO GUARDIAN FILTER")
    const zeroGuardianData = await getStudentGuardianExplorer({ page: 1, pageSize: 10, quality: 'no_guardian' })
    if (zeroGuardianData.data.length > 0) {
      assert(zeroGuardianData.data[0].activeGuardianCount === 0, "Should only return students with 0 guardians")
    }
    console.log(`Returned ${zeroGuardianData.data.length} students without guardian`)
    console.log("-> Zero Guardian Filter PASS")

    console.log("\n4. PER WALI DATA QUERY")
    const guardianData = await getGuardianExplorer({ page: 1, pageSize: 30 })
    assert(guardianData.data, "Data array should exist")
    console.log(`Returned ${guardianData.data.length} guardians`)
    if (guardianData.data.length > 0) {
      const firstRow = guardianData.data[0]
      assert('activeStudentCount' in firstRow, "activeStudentCount missing")
      assert(Array.isArray(firstRow.relations), "relations should be array")
    }
    console.log("-> Per Wali Query PASS")

    console.log("\n5. PER WALI - MULTI STUDENT FILTER")
    const multiStudentData = await getGuardianExplorer({ page: 1, pageSize: 10, multiStudent: true })
    if (multiStudentData.data.length > 0) {
      assert(multiStudentData.data[0].activeStudentCount > 1, "Should only return guardians with >1 students")
    }
    console.log(`Returned ${multiStudentData.data.length} guardians with >1 students`)
    console.log("-> Multi-Student Filter PASS")
    
    console.log("\n6. SAFE DTO")
    if (guardianData.data.length > 0) {
      const firstRel = guardianData.data[0].relations[0]
      if (firstRel) {
        assert(!('passwordHash' in firstRel), "passwordHash exposed!")
        assert(!('role' in firstRel), "role exposed in relations!")
      }
    }
    console.log("-> Safe DTO PASS")

    console.log("\nALL TESTS PASSED SUCCESSFULLY.")
    process.exit(0)
  } catch (error) {
    console.error("\nTEST FAILED:", error)
    process.exit(1)
  }
}

run()
