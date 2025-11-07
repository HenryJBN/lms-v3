import { useState, useEffect } from "react"

/**
 * useDebounce — delays updating a value until after a certain delay
 * Example: const debouncedSearch = useDebounce(searchTerm, 400)
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
