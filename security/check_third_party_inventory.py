"""Static SOC 2 CC9.2 inventory checks, requiring only Python standard library.

Usage: python3 security/check_third_party_inventory.py
A passing check proves inventory completeness of required fields, NOT SOC 2 compliance.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INVENTORY = ROOT / "security" / "third_party_inventory.json"
REQUIRED_FIELDS = (
    "id", "name", "category", "use", "code_references", "data_exchanged",
    "risks", "risk_rating", "mitigations", "owner", "assessment_status", "evidence",
)
RATINGS = {"low", "medium", "high"}
STATUSES = {"pending_verification", "in_progress", "verified", "gap_identified"}


def validate_inventory(data, root=ROOT):
    errors = []
    if not isinstance(data, dict) or data.get("control") != "SOC 2 CC9.2":
        return ["Inventory must declare control SOC 2 CC9.2"]
    providers = data.get("providers")
    if not isinstance(providers, list) or not providers:
        return ["Inventory must contain providers"]
    seen = set()
    for index, provider in enumerate(providers):
        label = f"providers[{index}]"
        if not isinstance(provider, dict):
            errors.append(f"{label}: must be an object")
            continue
        for field in REQUIRED_FIELDS:
            if field not in provider or provider[field] in (None, "", []):
                if field != "evidence":
                    errors.append(f"{label}: missing {field}")
        identifier = provider.get("id")
        if not isinstance(identifier, str) or not identifier.strip():
            errors.append(f"{label}: invalid id")
        elif identifier in seen:
            errors.append(f"{label}: duplicate id {identifier}")
        else:
            seen.add(identifier)
        if provider.get("risk_rating") not in RATINGS:
            errors.append(f"{label}: invalid risk_rating")
        if provider.get("assessment_status") not in STATUSES:
            errors.append(f"{label}: invalid assessment_status")
        for field in ("code_references", "risks", "mitigations", "evidence"):
            values = provider.get(field)
            if not isinstance(values, list) or (field != "evidence" and not values):
                errors.append(f"{label}: {field} must be a {'possibly empty' if field == 'evidence' else 'nonempty'} list")
                continue
            if any(not isinstance(v, str) or not v.strip() for v in values):
                errors.append(f"{label}: {field} contains an invalid entry")
        for ref in provider.get("code_references", []) if isinstance(provider.get("code_references"), list) else []:
            if isinstance(ref, str) and (Path(ref).is_absolute() or ".." in Path(ref).parts or not (root / ref).is_file()):
                errors.append(f"{label}: missing or unsafe code reference: {ref}")
        if provider.get("assessment_status") == "verified" and not provider.get("evidence"):
            errors.append(f"{label}: verified assessment requires evidence")
    return errors


def main():
    data = json.loads(INVENTORY.read_text(encoding="utf-8"))
    errors = validate_inventory(data)
    if errors:
        print("CC9.2 inventory check FAILED:")
        for error in errors:
            print(" -", error)
        return 1
    print(f"CC9.2 inventory structure PASS: {len(data['providers'])} providers documented")
    print("NOTE: risk ratings and mitigations still require human verification.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
