// v1.4 — Demo examples for first-time users (Tier 2)

export interface DemoExample {
  id: string;
  label: string;
  description: string;
  text: string;
}

export const DEMO_EXAMPLES: DemoExample[] = [
  {
    id: 'chatgpt-numbered',
    label: 'ChatGPT — friendly list',
    description: 'A classic ChatGPT response with enthusiastic tone and numbered tips',
    text: `Sure! Here are 5 ways to improve your sleep:

1. Stick to a consistent schedule. Going to bed and waking up at the same time each day strengthens your circadian rhythm.
2. Limit caffeine after 2 PM. Caffeine has a half-life of about 5-6 hours, so afternoon coffee can disrupt nighttime sleep.
3. Keep your room cool and dark. The optimal temperature is around 65°F (18°C).
4. Avoid screens an hour before bed. Blue light suppresses melatonin production.
5. Wind down with a calming routine. Reading, light stretching, or meditation work well.

Let me know if you want more detailed tips on any of these!`,
  },
  {
    id: 'claude-technical',
    label: 'Claude — technical explanation',
    description: 'A Claude-style measured technical response with code',
    text: `Here's how to implement a rate limiter using the token bucket algorithm:

\`\`\`python
import time
from collections import deque

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.tokens = capacity
        self.refill_rate = refill_rate
        self.last_refill = time.monotonic()

    def acquire(self, count: int = 1) -> bool:
        self._refill()
        if self.tokens >= count:
            self.tokens -= count
            return True
        return False

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now
\`\`\`

The key trade-off here is between burst capacity (the bucket size) and steady-state throughput (the refill rate). For an API with 1000 requests/minute and the ability to burst to 100 concurrent calls, you'd configure capacity=100 and refill_rate=16.67.

Note that this implementation isn't thread-safe. For concurrent use, wrap the acquire and refill calls in a lock.`,
  },
  {
    id: 'json-api',
    label: 'JSON API response',
    description: 'A pure JSON output — the kind a structured-output prompt produces',
    text: `{
  "intent": "schedule_meeting",
  "confidence": 0.94,
  "entities": {
    "participants": ["alice@example.com", "bob@example.com"],
    "duration_minutes": 30,
    "preferred_times": ["2026-01-15T14:00:00Z", "2026-01-15T15:00:00Z"],
    "topic": "Q1 roadmap review"
  },
  "next_action": "check_availability",
  "fallback_response": "I'll check everyone's calendars and propose three time options."
}`,
  },
];
