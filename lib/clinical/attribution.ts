/**
 * Pure attribution logic for the clinical attendance / encounter workspace.
 *
 * DB-free and React-free, like `lib/clinical/encounter.ts`, so it can be unit
 * tested in isolation and reused by both the attributed server actions and the
 * inline-attribution / audit UI. These helpers encode the feature's correctness
 * properties at the pure level:
 *   - author provenance: the author always comes from the authenticated user
 *     passed by the caller (`withAuth`), never from the client content/payload
 *     (Property 1 / Requirements 1.1, 1.2),
 *   - server-time stamping: a version's `createdAt` is exactly the server `now`
 *     injected by the caller (Property 2 / Requirement 1.4),
 *   - no-op guard: a save whose content equals the latest version is not a
 *     meaningful change and must not create a redundant version (Property 4 /
 *     Requirement 2.4),
 *   - latest consistency: the materialised "current value" equals the newest
 *     version's content (Property 5 / Requirement 2.3),
 *   - attribution totality: author labels always resolve to something
 *     displayable, degrading to "author unknown" and omitting an unknown role,
 *     never returning a raw id and never throwing (Property 6 / Requirements
 *     3.3, 6.2).
 */

/** Sentinel label used when an entry's author cannot be resolved (R3.3, R6.2). */
export const AUTHOR_UNKNOWN = "author unknown" as const;

/**
 * An immutable, attributed snapshot of a tracked clinical field at one save.
 *
 * `content` is the field value at that save (a string for free-text notes, or a
 * structured object for sections like `vitals` / `eyeTest`). `authoredBy` is the
 * authoritative staff id; `authoredByName` / `authoredByRole` are denormalised
 * snapshots taken at write time so display stays correct if the staff member is
 * later renamed, deactivated, or deleted. `createdAt` is server time.
 */
export interface AttributedVersion {
    /** The field value captured at this save (string or structured object). */
    content: unknown;
    /** Authoritative staff id, taken from the authenticated user (R1.2). */
    authoredBy: string;
    /** Denormalised author display name snapshot at write time. */
    authoredByName: string;
    /** Denormalised author role/title snapshot at write time (may be ""). */
    authoredByRole: string;
    /** Server-generated timestamp for the write (R1.4). */
    createdAt: Date;
}

/**
 * The minimal authenticated-user shape `makeVersion` needs. Compatible with the
 * app's `withAuth` `User` (`id`, `role`, optional `fullName`) and with the
 * `Staff` model (`_id`, `fullName`, `role`, `specialization`). We accept both id
 * spellings and prefer `specialization` over `role` for the display title.
 */
export interface AttributionUser {
    _id?: string | null;
    id?: string | null;
    fullName?: string | null;
    name?: string | null;
    role?: string | null;
    specialization?: string | null;
}

/**
 * A resolved, displayable author label. Either a name with an optional role, or
 * the "author unknown" fallback. Never carries a raw id. The `role` key is
 * omitted (not blank) when the role cannot be resolved (R3.3).
 */
export type AuthorLabel =
    | { name: string; role?: string }
    | { name: typeof AUTHOR_UNKNOWN };

/** The denormalised attribution fields `resolveAuthorLabel` reads from an entry. */
export interface AttributionEntry {
    authoredByName?: string | null;
    authoredByRole?: string | null;
    // Self-persisting records use these author-id spellings; a raw id must
    // never be surfaced as a name, so they only confirm an author exists.
    authoredBy?: unknown;
    givenBy?: unknown;
    recordedBy?: unknown;
}

/** Trim a value to a string, treating null/undefined as empty. */
function str(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

/**
 * The author id for a user, accepting either `_id` (Staff) or `id` (withAuth
 * `User`). Returns "" when neither is present so callers can detect a missing
 * author rather than persisting "undefined".
 */
function resolveUserId(user: AttributionUser): string {
    return str(user._id) || str(user.id);
}

/** The display name for a user, preferring `fullName` then a generic `name`. */
function resolveUserName(user: AttributionUser): string {
    return str(user.fullName) || str(user.name);
}

/**
 * The role/title snapshot for a user. Prefers `specialization` (the clinical
 * title, e.g. "Ophthalmologist") when present, else the plain `role`.
 */
function resolveUserRole(user: AttributionUser): string {
    return str(user.specialization) || str(user.role);
}

/**
 * Whether `nextContent` is a meaningful change from `previousContent` (R2.4).
 *
 * Reproduces how the encounter save decides "changed": strings compare by
 * trimmed value (leading/trailing whitespace is not a change), structured
 * values compare by deep equality. Returns `false` when there is no previous
 * content and the next is empty (nothing to record), and `true` whenever the
 * two differ. Used so a save identical to the latest version does NOT append a
 * redundant version.
 */
export function isMeaningfulChange(previousContent: unknown, nextContent: unknown): boolean {
    // Both strings (or absent-vs-string): compare trimmed values.
    const prevIsStringy = previousContent === undefined || previousContent === null || typeof previousContent === "string";
    const nextIsStringy = nextContent === undefined || nextContent === null || typeof nextContent === "string";
    if (prevIsStringy && nextIsStringy) {
        return str(previousContent) !== str(nextContent);
    }
    // Structured (or mixed string/structured): deep-equal comparison.
    return !deepEqual(previousContent, nextContent);
}

/**
 * Order-insensitive deep structural equality for the no-op guard. Handles
 * primitives, Dates, arrays, and plain objects. Deliberately conservative:
 * anything it cannot compare structurally falls back to strict equality.
 */
function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null || a === undefined || b === undefined) return a === b;
    if (typeof a !== typeof b) return false;

    if (a instanceof Date || b instanceof Date) {
        return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
    }

    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
        return a.every((item, i) => deepEqual(item, b[i]));
    }

    if (typeof a === "object") {
        const ao = a as Record<string, unknown>;
        const bo = b as Record<string, unknown>;
        const aKeys = Object.keys(ao);
        const bKeys = Object.keys(bo);
        if (aKeys.length !== bKeys.length) return false;
        return aKeys.every((key) => Object.prototype.hasOwnProperty.call(bo, key) && deepEqual(ao[key], bo[key]));
    }

    return false;
}

/**
 * Build an attributed version for a save (Properties 1 & 2).
 *
 * The author is taken ONLY from the passed `user` — never from `content`, even
 * if the content carries a forged `authoredBy`. `createdAt` is exactly the
 * passed server `now` (callers inject the server clock; the client never
 * supplies time). The name/role are denormalised snapshots at write time.
 *
 * @param content the field value being saved.
 * @param user the authenticated user injected by `withAuth`.
 * @param now the server-generated timestamp for the write.
 */
export function makeVersion(content: unknown, user: AttributionUser, now: Date): AttributedVersion {
    return {
        content,
        authoredBy: resolveUserId(user),
        authoredByName: resolveUserName(user),
        authoredByRole: resolveUserRole(user),
        // Defensive copy so the caller cannot mutate the stored timestamp.
        createdAt: new Date(now.getTime()),
    };
}

/**
 * The content of the newest version, used as the materialised "current value"
 * (Property 5 / R2.3). Returns `undefined` when there are no versions.
 */
export function latestVersionContent(
    versions: readonly AttributedVersion[] | null | undefined,
): unknown {
    if (!versions || versions.length === 0) return undefined;
    return versions[versions.length - 1].content;
}

/**
 * Resolve an entry's author to a displayable label (Property 6 / R3.3, R6.2).
 *
 * Reads the denormalised `authoredByName` / `authoredByRole` snapshots. When the
 * name cannot be resolved (missing/blank, or only a raw id is present) it
 * returns the "author unknown" label — never a raw id. When the role cannot be
 * resolved it omits `role` rather than showing a blank. Never throws.
 */
export function resolveAuthorLabel(entry: AttributionEntry | null | undefined): AuthorLabel {
    const name = str(entry?.authoredByName);
    if (!name) {
        return { name: AUTHOR_UNKNOWN };
    }
    const role = str(entry?.authoredByRole);
    return role ? { name, role } : { name };
}

/** The parts `formatAttribution` renders into a deterministic display string. */
export interface AttributionParts {
    name: string;
    role?: string;
    at: Date;
}

const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Zero-pad a number to two digits for the HH:MM time component. */
function pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Deterministic inline-attribution display string (R3.1), e.g.
 * "Dr. Jane Doe (Ophthalmologist) - 14:32, 13 Oct".
 *
 * Formatting is explicit and does not depend on locale so tests are not flaky:
 * the time uses the Date's UTC hours/minutes and the date its UTC day/month, so
 * a fixed Date always renders the same string regardless of the host timezone.
 * The role is shown in parentheses only when present; a blank role is omitted.
 */
export function formatAttribution({ name, role, at }: AttributionParts): string {
    const who = role && role.trim() ? `${name} (${role.trim()})` : name;
    const time = `${pad2(at.getUTCHours())}:${pad2(at.getUTCMinutes())}`;
    const date = `${at.getUTCDate()} ${MONTHS[at.getUTCMonth()]}`;
    return `${who} - ${time}, ${date}`;
}
