/**
 * Backfill monthly settlement parents for existing travel/night duty claims.
 * Run: npx tsx scripts/backfill-monthly-settlements.ts
 */
import "dotenv/config";
import { monthlyClaimService } from "../src/lib/services/monthly-claim-service";

async function main() {
  const userId = process.argv[2];
  const result = await monthlyClaimService.backfillMonthlySettlements(userId);
  console.log(
    `Backfill complete: ${result.groupsCreated} settlement groups, ${result.claimsAttached} claims attached`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
