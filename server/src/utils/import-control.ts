/**
 * Import Control Flag
 * Shared between server and data importer
 */

export let shouldStopImport = false

export function setShouldStopImport(value: boolean) {
	shouldStopImport = value
}

export function getShouldStopImport(): boolean {
	return shouldStopImport
}
