/**
 * Parsing of custom HTTP header flags for the play command, e.g.
 * play <url> --referer https://site.com/ --origin https://site.com --header "Cookie: a=b"
 */

export interface ParsedPlayInput {
	input: string;
	headers: Record<string, string>;
}

// Shortcut flags mapped to their header name
const HEADER_FLAGS = new Map<string, string>([
	['--referer', 'Referer'],
	['--referrer', 'Referer'],
	['--origin', 'Origin'],
	['--user-agent', 'User-Agent'],
	['--ua', 'User-Agent'],
]);

// Generic flags taking a "Name: Value" argument
const GENERIC_HEADER_FLAGS = new Set(['--header', '-h']);

const HEADER_NAME_REGEX = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;

/**
 * Check whether the (space-split) command arguments contain any header flag
 */
export function hasHeaderFlags(args: string[]): boolean {
	return args.some(arg => HEADER_FLAGS.has(arg.toLowerCase()) || GENERIC_HEADER_FLAGS.has(arg.toLowerCase()));
}

const QUOTE_CHARS = new Set(['"', '“', '”']);

/**
 * Split a string into whitespace-separated tokens, keeping "quoted values" together.
 * Smart quotes (as typed by mobile keyboards) are treated as regular double quotes,
 * and \" inserts a literal quote (e.g. for sec-ch-ua values).
 */
export function tokenize(text: string): string[] {
	const tokens: string[] = [];
	const chars = [...text];
	let current = '';
	let inQuotes = false;
	let hasToken = false;

	for (let i = 0; i < chars.length; i++) {
		const char = chars[i];
		if (char === '\\' && QUOTE_CHARS.has(chars[i + 1])) {
			current += chars[++i];
			hasToken = true;
		} else if (QUOTE_CHARS.has(char)) {
			inQuotes = !inQuotes;
			hasToken = true;
		} else if (!inQuotes && /\s/.test(char)) {
			if (hasToken) {
				tokens.push(current);
				current = '';
				hasToken = false;
			}
		} else {
			current += char;
			hasToken = true;
		}
	}

	if (inQuotes) {
		throw new Error('Unterminated quote in command.');
	}
	if (hasToken) {
		tokens.push(current);
	}

	return tokens;
}

/**
 * Normalize a header name to Title-Case (e.g. user-agent -> User-Agent).
 * HTTP header names are case-insensitive, so this avoids sending duplicates
 * and lets user values override the library's default User-Agent.
 */
function normalizeHeaderName(name: string): string {
	return name
		.split('-')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
		.join('-');
}

function validateHeaderValue(name: string, value: string): void {
	if (/[\r\n]/.test(value)) {
		throw new Error(`Invalid value for header \`${name}\`: line breaks are not allowed.`);
	}
}

/**
 * Extract header flags from the play command tokens.
 * Remaining tokens are joined back into the input (URL, video name or search query).
 */
export function parseHeaderFlags(tokens: string[]): ParsedPlayInput {
	// Null prototype so any valid header name (even __proto__) becomes an own property
	const headers: Record<string, string> = Object.create(null);
	const inputTokens: string[] = [];

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		const flag = token.toLowerCase();
		const headerName = HEADER_FLAGS.get(flag);
		const isGeneric = GENERIC_HEADER_FLAGS.has(flag);

		if (!headerName && !isGeneric) {
			inputTokens.push(token);
			continue;
		}

		// No valid header value starts with '-': this is most likely the next flag
		const value = tokens[++i];
		if (value === undefined || value === '' || value.startsWith('-')) {
			throw new Error(`Missing value for \`${token}\`.`);
		}

		if (headerName) {
			validateHeaderValue(headerName, value);
			headers[headerName] = value;
		} else {
			const separator = value.indexOf(':');
			const name = separator > 0 ? value.slice(0, separator).trim() : '';
			if (!name || !HEADER_NAME_REGEX.test(name)) {
				throw new Error(`Invalid header \`${value}\`. Use the format \`"Name: Value"\`.`);
			}
			const headerValue = value.slice(separator + 1).trim();
			validateHeaderValue(name, headerValue);
			headers[normalizeHeaderName(name)] = headerValue;
		}
	}

	let input = inputTokens.join(' ');
	// Discord users wrap links in <...> to suppress embeds
	if (input.startsWith('<') && input.endsWith('>')) {
		input = input.slice(1, -1);
	}

	return { input, headers };
}
