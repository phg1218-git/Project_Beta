// Copy only an unambiguous account number; never guess between multiple numbers.
export function bankAccountNumber(account: string): string | null {
  const candidates = account.match(/\d(?:[\d -]*\d)?/g)?.map((value) => value.replace(/[^0-9]/g, ''))
    .filter((value) => value.length >= 8 && value.length <= 20) ?? []
  return candidates.length === 1 ? candidates[0] : null
}
