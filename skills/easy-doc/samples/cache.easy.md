<!--
  Worked sample for the easy-doc skill.
  This is what `/easy-doc cache-design.md` produces from a technical caching spec.
  It demonstrates the output shape: a plain title + one-line intro, one 7-element
  block per concept, ASCII drawn from the 4 templates, and a closing takeaway.
  The ORIGINAL technical source (paraphrased) is shown at the bottom for contrast.
-->

# Caching, the easy version

> What this is: a trick that keeps the answers you look up most close by, so the app replies fast instead of fetching from far away every time.

🗂️ Cache — "the sticky-note shelf"

- what it does: jots down answers the app asks for a lot and keeps a copy nearby, so the next time it can reply without the slow trip to the database.
- analogy: keeping the salt you use every day on the counter next to the stove — not deep in a cupboard across the kitchen.

  ```
  [ request ] ──▶ [ cache ] ──hit──▶ [ fast reply ]
                     │
                     └──miss──▶ [ database (far away) ] ──▶ [ slow reply ]
  ```

- compare: without a cache, every question makes the full round-trip to the database; with a cache, the common ones are answered on the spot.

🎯 Cache hit vs. miss — "did the sticky note already have it?"

- what it does: a **hit** means the answer was already on the shelf (fast); a **miss** means it wasn't, so the app fetches it and writes a new sticky note for next time.
- analogy: looking for a phone number — already in your contacts (hit) vs. having to ask around and then saving it (miss).

  ```
  before (no cache)        after (with cache)
  ─────────────────       ─────────────────
   ▢ ask database     →     ▢ check shelf first
   ▢ every time       →     ▢ ask database only on a miss
   ▢ always slow      →     ▢ usually fast
  ```

- compare: a miss costs the same as having no cache at all (one slow trip) — but it pays off, because that answer is now ready for everyone who asks next.

⏳ Latency — "how long you wait for the reply"

- what it does: the wait between asking and getting an answer. A cache shrinks the *usual* wait by skipping the far-away trip for popular questions.
- analogy: the difference between grabbing a snack from your own kitchen vs. driving to the store for it.

  ```
        slow path           │        fast path
   ────────────────────    │   ────────────────────
    go to the database     │    answer from the shelf
    (a long drive)         │    (right there)
   ────────────────────    │   ────────────────────
    waits pile up          │    most replies are quick
  ```

- compare: the engineers' phrase "lower p99 latency" just means "even the slowest few replies got faster" — p99 = the slowest 1 out of 100.

## If you remember one thing

A cache is a shelf of sticky notes for the answers you reach for most — keep them close, and the app rarely has to make the slow trip.

---

<!--
  ── ORIGINAL TECHNICAL SOURCE (paraphrased, for contrast) ──
  "The API gateway bypasses origin on a cache hit, lowering p99 latency.
   On a miss it falls through to the database and populates the entry.
   Cache hit ratio is the primary driver of tail-latency reduction."

  Note how the easy version keeps NOTHING jargony in the body:
  - API gateway / origin / p99 / hit ratio → plain words + analogies
  - but the phrase "p99 latency" is *expanded on first use*, not hidden,
    because the reader may meet it elsewhere (translation checklist step 2).
-->
