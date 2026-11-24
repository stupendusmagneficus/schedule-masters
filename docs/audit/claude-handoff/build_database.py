"""Build or verify the portable audit database from the versioned JSON snapshot."""

import argparse
import json
from pathlib import Path
import re
import sqlite3
import tempfile


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "knowledge-base.json"
DATABASE = ROOT / "audit-context.sqlite"


def identifier(value):
    if not re.fullmatch(r"[a-z][A-Za-z0-9_]*", value):
        raise ValueError(f"Invalid database identifier: {value}")
    return f'"{value}"'


def cell(value):
    if value is None or isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def tables(snapshot):
    for name, value in snapshot.items():
        if isinstance(value, dict):
            yield name, [{"key": key, "value": cell(item)} for key, item in value.items()]
        elif isinstance(value, list):
            if not all(isinstance(row, dict) for row in value):
                raise ValueError(f"Expected objects in {name}")
            yield name, value
        else:
            raise ValueError(f"Unsupported section: {name}")


def populate(connection, snapshot):
    for name, rows in tables(snapshot):
        columns = sorted({key for row in rows for key in row})
        if not columns:
            raise ValueError(f"Empty table schema: {name}")
        definitions = ", ".join(f"{identifier(key)} TEXT" for key in columns)
        connection.execute(
            f"CREATE TABLE {identifier(name)} (row_id INTEGER PRIMARY KEY, {definitions})"
        )
        fields = ", ".join(identifier(key) for key in columns)
        placeholders = ", ".join("?" for _ in columns)
        connection.executemany(
            f"INSERT INTO {identifier(name)} ({fields}) VALUES ({placeholders})",
            [[cell(row.get(key)) for key in columns] for row in rows],
        )
    connection.commit()
    if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
        raise ValueError("SQLite integrity check failed")


def verify(connection, snapshot):
    expected_names = {name for name, _ in tables(snapshot)}
    actual_names = {
        row[0]
        for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
    }
    if expected_names != actual_names:
        raise ValueError("Database sections differ from the JSON snapshot")
    for name, rows in tables(snapshot):
        columns = sorted({key for row in rows for key in row})
        fields = ", ".join(identifier(key) for key in columns)
        actual = connection.execute(
            f"SELECT {fields} FROM {identifier(name)} ORDER BY row_id"
        ).fetchall()
        expected = [tuple(cell(row.get(key)) for key in columns) for row in rows]
        if actual != expected:
            raise ValueError(f"Database content differs in {name}")
    if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
        raise ValueError("SQLite integrity check failed")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify without changing files")
    args = parser.parse_args()
    snapshot = json.loads(SOURCE.read_text())
    if args.check:
        with sqlite3.connect(f"{DATABASE.as_uri()}?mode=ro", uri=True) as connection:
            verify(connection, snapshot)
        print("SQLite matches the JSON snapshot; integrity check passed.")
        return
    with tempfile.TemporaryDirectory(dir=ROOT) as directory:
        temporary = Path(directory) / DATABASE.name
        with sqlite3.connect(temporary) as connection:
            populate(connection, snapshot)
            verify(connection, snapshot)
        temporary.replace(DATABASE)
    print(f"Built {DATABASE.name} from {SOURCE.name}.")


if __name__ == "__main__":
    main()
