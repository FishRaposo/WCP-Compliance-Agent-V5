# ADR 0005: DBWD Rate Lookup — Compliance Core Owns Matching, Data Platform Owns Storage

**Status:** Accepted

**Date:** 2026-05-05

## Decision

The Data Platform stores DBWD rate records, snapshots, and refresh jobs. The Compliance Core queries the Data Platform for candidate rates and applies deterministic matching and validation logic to determine which rate applies to a given employee classification and locality.

## Context

DBWD (Davis-Bacon Wage Determination) rate lookup was split across multiple V3 modules: Redis cache, PostgreSQL table, in-memory corpus, and SAM.gov API stub. The matching logic (trade alias resolution, Levenshtein fuzzy matching, locality normalization) was in the compliance pipeline but the storage and refresh was mixed into the backend.

## Rationale

Rate applicability is legally meaningful validation logic. The Compliance Core needs to:

1. Resolve trade classification aliases (e.g., "elec" → "Electrician").
2. Match employee locality to rate locality with normalization.
3. Select the applicable rate based on effective date.
4. Produce an explanation for why a specific rate matched.

This is compliance reasoning, not data retrieval. The Data Platform should own the rate storage and refresh pipeline, but the Compliance Core should own the matching logic.

For the V5 MVP, the Compliance Core includes a 20-trade in-memory rate corpus as a fallback. Full Data Platform rate storage with DB refresh will be implemented in Phase 4.

## Consequences

- Legal reasoning stays close to the deterministic engine.
- Rate storage and refresh are Data Platform responsibilities.
- The Compliance Core has a self-contained fallback corpus for testing and MVP demos.
- Future SAM.gov live integration will be a Data Platform ETL flow.
