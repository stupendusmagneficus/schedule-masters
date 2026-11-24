import sqlite3
import unittest

from build_database import identifier, populate, verify


class AuditDatabaseTests(unittest.TestCase):
    def setUp(self):
        self.connection = sqlite3.connect(":memory:")
        self.addCleanup(self.connection.close)
        self.snapshot = {
            "metadata": {"product": "Chvilio", "partial": True},
            "findings": [
                {
                    "id": "F-001",
                    "title": "Даты 'от' и 'до'",
                    "evidence": ["source.ts:10", "case.spec.ts"],
                    "status": None,
                }
            ],
        }

    def test_round_trip_preserves_unicode_quotes_nested_values_and_null(self):
        populate(self.connection, self.snapshot)
        verify(self.connection, self.snapshot)
        title, status = self.connection.execute(
            "SELECT title, status FROM findings"
        ).fetchone()
        self.assertEqual(title, "Даты 'от' и 'до'")
        self.assertIsNone(status)

    def test_changed_content_is_detected(self):
        populate(self.connection, self.snapshot)
        self.connection.execute("UPDATE findings SET status = 'PASS'")
        with self.assertRaisesRegex(ValueError, "content differs"):
            verify(self.connection, self.snapshot)

    def test_missing_section_is_detected(self):
        populate(self.connection, self.snapshot)
        self.connection.execute("DROP TABLE findings")
        with self.assertRaisesRegex(ValueError, "sections differ"):
            verify(self.connection, self.snapshot)

    def test_unsafe_identifier_is_rejected(self):
        with self.assertRaises(ValueError):
            identifier('entries"; DROP TABLE metadata; --')

    def test_unstructured_list_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Expected objects"):
            populate(self.connection, {"entries": ["unstructured"]})


if __name__ == "__main__":
    unittest.main()
