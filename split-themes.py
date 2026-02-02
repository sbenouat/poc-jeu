#!/usr/bin/env python3
"""
Migration script: Split monolithic questions.sample.json into individual theme files.
Run once with: python3 split-themes.py
"""

import json
import os

# Read the monolithic file
with open('questions.sample.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Create questions directory
os.makedirs('questions', exist_ok=True)

# Generate index.json with theme metadata
index = {
    "version": "2.0",
    "themes": []
}

for theme in data['themes']:
    # Count total questions across all difficulties
    question_count = sum(len(qs) for qs in theme['questions'].values())

    index['themes'].append({
        "id": theme['id'],
        "name": theme['name'],
        "file": f"{theme['id']}.json",
        "questionCount": question_count
    })

    # Write individual theme file
    theme_path = f"questions/{theme['id']}.json"
    with open(theme_path, 'w', encoding='utf-8') as f:
        json.dump(theme, f, ensure_ascii=False, indent=2)
    print(f"Created: {theme_path} ({question_count} questions)")

# Write index.json
with open('questions/index.json', 'w', encoding='utf-8') as f:
    json.dump(index, f, ensure_ascii=False, indent=2)

print(f"\nCreated: questions/index.json ({len(index['themes'])} themes)")
print(f"Total files: {len(index['themes']) + 1}")
