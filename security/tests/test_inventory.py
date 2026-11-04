import json
import tempfile
import unittest
from pathlib import Path
from security.check_third_party_inventory import ROOT, INVENTORY, validate_inventory


class ThirdPartyInventoryTests(unittest.TestCase):
    def setUp(self):
        self.inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))

    def test_inventory_valid(self):
        self.assertEqual([], validate_inventory(self.inventory))

    def test_duplicate_provider_rejected(self):
        self.inventory["providers"].append(dict(self.inventory["providers"][0]))
        self.assertTrue(any("duplicate id" in e for e in validate_inventory(self.inventory)))

    def test_missing_source_reference_rejected(self):
        self.inventory["providers"][0]["code_references"] = ["missing/does-not-exist.js"]
        self.assertTrue(any("missing or unsafe code reference" in e for e in validate_inventory(self.inventory)))

    def test_verified_requires_evidence(self):
        self.inventory["providers"][0]["assessment_status"] = "verified"
        self.assertTrue(any("requires evidence" in e for e in validate_inventory(self.inventory)))

    def test_unknown_risk_rating_rejected(self):
        self.inventory["providers"][0]["risk_rating"] = "severe"
        self.assertTrue(any("invalid risk_rating" in e for e in validate_inventory(self.inventory)))


if __name__ == "__main__":
    unittest.main()
