import json, sys, io, os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
qdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "questions")

with open(os.path.join(qdir, "index.json"), encoding="utf-8") as f:
    index = json.load(f)

errors = []
for entry in index["themes"]:
    path = os.path.join(qdir, entry["file"])
    try:
        with open(path, encoding="utf-8") as f:
            raw = f.read()
        if raw.startswith("﻿"):
            errors.append(f"{entry['file']}: BOM present")
            raw = raw.lstrip("﻿")
        data = json.loads(raw)
    except Exception as e:
        errors.append(f"{entry['file']}: JSON invalide -> {e}")
        continue

    if data.get("id") != entry["id"]:
        errors.append(f"{entry['file']}: id '{data.get('id')}' != index '{entry['id']}'")
    expected_per_level = entry["questionCount"] // 10
    total = 0
    seen = {}
    for lvl in range(1, 11):
        qs = data.get("questions", {}).get(str(lvl))
        if qs is None:
            errors.append(f"{entry['file']}: niveau {lvl} manquant")
            continue
        if len(qs) != expected_per_level:
            errors.append(f"{entry['file']}: niveau {lvl} a {len(qs)} questions (attendu {expected_per_level})")
        total += len(qs)
        for i, qa in enumerate(qs):
            q, a = qa.get("q", ""), qa.get("a", "")
            if not q.strip() or not a.strip():
                errors.append(f"{entry['file']}: niveau {lvl} #{i} champ vide")
            key = q.strip().lower()
            if key in seen:
                errors.append(f"{entry['file']}: doublon question niveau {lvl} (deja niveau {seen[key]}): {q[:60]}")
            else:
                seen[key] = lvl
    extra = set(data.get("questions", {}).keys()) - {str(i) for i in range(1, 11)}
    if extra:
        errors.append(f"{entry['file']}: niveaux inattendus {extra}")
    print(f"{entry['file']}: {total} questions (attendu {entry['questionCount']})")
    if total != entry["questionCount"]:
        errors.append(f"{entry['file']}: total {total} != questionCount {entry['questionCount']} dans index.json")

print()
if errors:
    print(f"{len(errors)} PROBLEME(S) :")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("TOUT EST OK")
