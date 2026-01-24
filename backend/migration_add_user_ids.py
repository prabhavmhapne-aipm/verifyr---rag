"""
Migration Script: Add user_id to existing conversations

This script adds user_id and user_email fields to existing conversation
files that were created before authentication was implemented.

Existing conversations without user_id will be assigned:
- user_id: "anonymous"
- user_email: null

This allows the system to handle pre-auth conversations gracefully.

Usage:
    python backend/migration_add_user_ids.py
"""

import json
from pathlib import Path
from datetime import datetime


def migrate_conversations():
    """
    Migrate existing conversation files to include user_id field.
    """
    # Get conversations directory
    project_root = Path(__file__).parent.parent
    conversations_dir = project_root / "data" / "conversations"

    if not conversations_dir.exists():
        print("No conversations directory found. Nothing to migrate.")
        return

    # Get all conversation files
    conversation_files = list(conversations_dir.glob("*.json"))

    if not conversation_files:
        print("No conversation files found. Nothing to migrate.")
        return

    print(f"Found {len(conversation_files)} conversation file(s) to check.")
    print("-" * 50)

    migrated = 0
    skipped = 0
    errors = 0

    for conv_file in conversation_files:
        try:
            # Read the conversation file
            with open(conv_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Check if migration is needed
            needs_migration = False
            if "user_id" not in data:
                data["user_id"] = "anonymous"
                needs_migration = True

            if "user_email" not in data:
                data["user_email"] = None
                needs_migration = True

            if needs_migration:
                # Write the updated data back
                with open(conv_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

                print(f"Migrated: {conv_file.name}")
                migrated += 1
            else:
                print(f"Skipped (already has user_id): {conv_file.name}")
                skipped += 1

        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid JSON in {conv_file.name}: {e}")
            errors += 1
        except Exception as e:
            print(f"ERROR: Failed to process {conv_file.name}: {e}")
            errors += 1

    print("-" * 50)
    print(f"Migration complete!")
    print(f"  Migrated: {migrated}")
    print(f"  Skipped:  {skipped}")
    print(f"  Errors:   {errors}")


def dry_run():
    """
    Show what would be migrated without making changes.
    """
    project_root = Path(__file__).parent.parent
    conversations_dir = project_root / "data" / "conversations"

    if not conversations_dir.exists():
        print("No conversations directory found.")
        return

    conversation_files = list(conversations_dir.glob("*.json"))

    if not conversation_files:
        print("No conversation files found.")
        return

    print("DRY RUN - No changes will be made")
    print(f"Found {len(conversation_files)} conversation file(s)")
    print("-" * 50)

    needs_migration = 0
    already_migrated = 0

    for conv_file in conversation_files:
        try:
            with open(conv_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            has_user_id = "user_id" in data
            has_user_email = "user_email" in data

            if not has_user_id or not has_user_email:
                print(f"  NEEDS MIGRATION: {conv_file.name}")
                print(f"    - has user_id: {has_user_id}")
                print(f"    - has user_email: {has_user_email}")
                needs_migration += 1
            else:
                print(f"  OK: {conv_file.name} (user_id: {data['user_id']})")
                already_migrated += 1

        except Exception as e:
            print(f"  ERROR: {conv_file.name} - {e}")

    print("-" * 50)
    print(f"Summary:")
    print(f"  Files needing migration: {needs_migration}")
    print(f"  Files already migrated:  {already_migrated}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--dry-run":
        dry_run()
    else:
        print("Conversation Migration Script")
        print("=" * 50)
        print()
        print("This script will add user_id='anonymous' to existing")
        print("conversation files that don't have a user_id field.")
        print()

        # Ask for confirmation
        response = input("Proceed with migration? (y/n): ").strip().lower()

        if response == 'y':
            migrate_conversations()
        else:
            print("Migration cancelled.")
            print("Run with --dry-run to see what would be changed.")
