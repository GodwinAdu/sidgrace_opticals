"use client";

/**
 * Thin wrapper around the self-persisting `IcuChartPanel`.
 *
 * The panel owns its own server-action persistence (`addIcuChartEntry` /
 * `getIcuChart` against the admission) — this wrapper never routes those saves
 * through the record save (Req 4.4). It only adapts provider state to the
 * panel's props and enforces the ICU read-only rule.
 *
 * ICU read-only rule (Req 2.5): recording ICU observations requires
 * `attNursing`. A user who has ONLY `icuManagement` (but not `attNursing`) may
 * view the ICU chart but gets it read-only. We read the user's flags via the
 * provider's fail-open `can(flag)` helper and combine with the shell's
 * `readOnly` (historical mode), reproducing the monolith's exact expression:
 *   `readOnly || (!can("attNursing") && can("icuManagement"))`.
 *
 * Tab visibility itself (active admission AND (attNursing || icuManagement)) is
 * already gated in the registry; here we only decide editable-vs-read-only.
 */
import { IcuChartPanel } from "../../NursingPanels";
import { useEncounter } from "../EncounterProvider";
import type { EncounterTabProps } from "./types";

export default function IcuChartTabModule({ admission, readOnly }: EncounterTabProps) {
    const { can } = useEncounter();

    // icuManagement-only users (no attNursing) get a read-only chart; historical
    // mode (shell `readOnly`) also forces read-only.
    const icuReadOnly = readOnly || (!can("attNursing") && can("icuManagement"));

    return <IcuChartPanel admissionId={admission?._id} readOnly={icuReadOnly} />;
}
