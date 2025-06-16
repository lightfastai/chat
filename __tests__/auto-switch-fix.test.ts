import { describe, expect, test } from "bun:test"

describe("Auto-Switch Fix", () => {
  test("Should correctly extract timestamp from branch ID", () => {
    const branchId = "branch_j97n4k3h2d5e6f7g8h9i0j1k_1750046000000_abc12345"
    const parts = branchId.split("_")
    const timestamp = parts.length >= 3 ? Number.parseInt(parts[2], 10) : 0

    expect(timestamp).toBe(1750046000000)
  })

  test("Should sort branches by timestamp correctly", () => {
    const branches = [
      { id: "main", name: "Main" },
      {
        id: "branch_j97n4k3h2d5e6f7g8h9i0j1k_1750046000000_abc",
        name: "Branch 1",
      },
      {
        id: "branch_j97n4k3h2d5e6f7g8h9i0j1k_1750046002000_def",
        name: "Branch 2",
      },
      {
        id: "branch_j97n4k3h2d5e6f7g8h9i0j1k_1750046001000_ghi",
        name: "Branch 3",
      },
    ]

    const nonMainBranches = branches.filter((b) => b.id !== "main")

    const branchesWithTimestamps = nonMainBranches.map((branch) => {
      const parts = branch.id.split("_")
      const timestamp =
        parts.length >= 3 ? Number.parseInt(parts[2], 10) || 0 : 0
      return { branch, timestamp }
    })

    const sorted = branchesWithTimestamps.sort(
      (a, b) => b.timestamp - a.timestamp,
    )
    const newestBranch = sorted[0]?.branch

    // Should get the branch with timestamp 1750046002000 (newest)
    expect(newestBranch?.id).toBe(
      "branch_j97n4k3h2d5e6f7g8h9i0j1k_1750046002000_def",
    )
  })

  test("Should handle branches with different message IDs", () => {
    const branches = [
      { id: "main", name: "Main" },
      {
        id: "branch_j97n4k3h2d5e6f7g8h9i0j1k_1750046000000_abc",
        name: "Branch A",
      },
      {
        id: "branch_k8g9h1j2l3m4n5o6p7q8r9s0_1750046001000_def",
        name: "Branch B",
      },
    ]

    const nonMainBranches = branches.filter((b) => b.id !== "main")

    const branchesWithTimestamps = nonMainBranches.map((branch) => {
      const parts = branch.id.split("_")
      const timestamp =
        parts.length >= 3 ? Number.parseInt(parts[2], 10) || 0 : 0
      return { branch, timestamp }
    })

    const sorted = branchesWithTimestamps.sort(
      (a, b) => b.timestamp - a.timestamp,
    )
    const newestBranch = sorted[0]?.branch

    // Should get the branch with latest timestamp regardless of message ID
    expect(newestBranch?.id).toBe(
      "branch_k8g9h1j2l3m4n5o6p7q8r9s0_1750046001000_def",
    )
  })

  test("Should handle malformed branch IDs gracefully", () => {
    const branches = [
      { id: "main", name: "Main" },
      { id: "invalid_branch_id", name: "Invalid" },
      {
        id: "branch_j97n4k3h2d5e6f7g8h9i0j1k_1750046000000_abc",
        name: "Valid",
      },
    ]

    const nonMainBranches = branches.filter((b) => b.id !== "main")

    const branchesWithTimestamps = nonMainBranches.map((branch) => {
      const parts = branch.id.split("_")
      const timestamp =
        parts.length >= 3 ? Number.parseInt(parts[2], 10) || 0 : 0
      return { branch, timestamp }
    })

    const sorted = branchesWithTimestamps.sort(
      (a, b) => b.timestamp - a.timestamp,
    )

    // Should handle invalid branch gracefully (timestamp = 0)
    expect(sorted.length).toBe(2)
    expect(sorted[0].timestamp).toBe(1750046000000) // Valid branch first
    expect(sorted[1].timestamp).toBe(0) // Invalid branch last (NaN becomes 0)
  })
})
