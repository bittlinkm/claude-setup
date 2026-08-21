# Definition of Ready (DoR) — User Story

The Definition of Ready is the agreed set of rules that must be satisfied **before** work on a User Story can begin. This is the org-wide baseline; a project may extend it, so check whether the project has additional DoR items documented (e.g. in its own repo, wiki, or CLAUDE.md) before treating this list as exhaustive.

## 1. Inhalt & Ziel
- Die User Story beschreibt genau eine Anforderung aus Sicht des Benutzers (bzw. Entwicklers bei technischen Stories)
- Ziel und Mehrwert der Story sind klar erkennbar
- Nicht-Ziele / Out-of-Scope sind – falls relevant – benannt
- Die Story ist für alle Beteiligten klar und eindeutig verständlich

## 2. Formale Struktur
- Die User Story folgt dem Format: "Als \<Rolle\> möchte ich \<Ziel\>, um \<Grund\>."
- Die Story ist einem Feature (Parent) zugeordnet
- Die Story ist priorisiert

## 3. Akzeptanz & Qualität
- Mindestens ein Akzeptanzkriterium ist vorhanden
- Akzeptanzkriterien sind klar, messbar und testbar formuliert (Given / When / Then empfohlen)
- Relevante Edge-Cases oder Negativfälle sind berücksichtigt

## 4. UX & Fachlichkeit (falls UI- oder Prozess-relevant)
- Mockups, Wireframes, Screenshots oder Skizzen sind vorhanden oder bewusst nicht erforderlich
- Beispiele bzw. typische Use-Cases sind beschrieben
- Fachlicher Ablauf / User Flow ist klar nachvollziehbar

## 5. Technik & Abhängigkeiten
- Grober technischer Lösungsansatz ist bekannt
- Betroffene Systeme, Module oder Schnittstellen sind identifiziert
- Abhängigkeiten zu anderen Stories oder externen Systemen sind geklärt
- Relevante Architektur-, Security- oder Compliance-Aspekte sind berücksichtigt

## 6. Aufwand & Umsetzung
- Die User Story ist geschätzt (PERT)
- Die Story ist innerhalb eines Sprints umsetzbar
- Externe Abhängigkeiten sind verfügbar oder verbindlich zugesagt

## 7. Tasks
- Umsetzungstasks sind vorhanden und decken Analyse, Implementierung, Tests und Dokumentation ab
- Tasks sind verständlich und klein genug (Faustregel: ≤ 1–2 Tage)

## 8. Compliance & Security (falls relevant)
- Compliance-Relevanz (ISO 27001 / NIS2 / Secure Coding) ist eingeschätzt
- Betroffene Datenarten sind bekannt
- Schutzbedarf und betroffene Datenarten sind bekannt
- Security-Auswirkungen der Story wurden kurz bewertet
- Sicherheitsanforderungen sind Teil der Akzeptanzkriterien
- Secure-Coding-relevante Aspekte sind identifiziert
- Kritikalität und Abhängigkeiten sind bekannt
- Entscheidungen sind dokumentiert (kurz, im Ticket oder Wiki)

## Notes on sections 4 and 8

Section 4 (UX & Fachlichkeit) only applies when the story is UI- or process-relevant — a pure backend/technical story can legitimately skip it; don't fail a story on section 4 just because it has no mockups if it doesn't need any. Say so explicitly in the check output rather than silently skipping.

Section 8 (Compliance & Security) only applies "falls relevant" — most everyday stories won't touch regulated data or have meaningful security surface. Judge relevance from what the story actually describes (does it touch personal data, auth, external interfaces, new dependencies?) rather than mechanically demanding a compliance writeup for a trivial UI tweak.
