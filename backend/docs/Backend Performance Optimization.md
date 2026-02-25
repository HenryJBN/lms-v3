# Backend Performance Optimization
## Problem
Initial requests to the FastAPI backend are slow. Subsequent requests are faster due to caching, but the first hit takes too long.
## Root Causes Found
### 1. CRITICAL: Synchronous Redis blocking the async event loop (`utils/redis_client.py`)
The Redis client uses `redis.from_url()` (synchronous). In an async FastAPI app, **every sync Redis call blocks the entire event loop**, preventing ALL concurrent requests from processing. This is the single biggest contributor to slowness. Every `cache_manager.get_json()`, `cache_manager.set_json()`, and session operation stalls the server.
### 2. CRITICAL: `sessionmaker` recreated on every request (`database/session.py:57-61`)
`get_session()` creates a **new `sessionmaker` factory on every call**. This is a well-known anti-pattern — the factory should be a module-level singleton created once.
### 3. HIGH: `get_current_site` queries DB on every request (`dependencies.py`)
Every endpoint with `Depends(get_current_site)` triggers a DB query to look up the site by subdomain. Sites rarely change — this should be cached (in-memory or Redis).
### 4. HIGH: Admin site lookup on every authenticated request (`middleware/auth.py:110-111`)
`get_current_user` runs `select(Site).where(Site.subdomain == "admin")` on **every single authenticated request** for the super admin check. This is an extra DB round-trip per request.
### 5. MEDIUM: Connection pool warmup only warms 1 connection (`database/session.py:46-54`)
`warmup_connections()` opens just 1 connection. It should warm the full `pool_size` (5 connections) in parallel.
## Proposed Changes
### Fix 1: Switch Redis to async (`utils/redis_client.py`)
* Replace `import redis` with `import redis.asyncio as redis`
* Make all `CacheManager` and `RedisSessionManager` methods `async`
* Update all call sites in routers to `await` Redis calls
### Fix 2: Make `sessionmaker` a module-level singleton (`database/session.py`)
* Move the `sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)` to module level
* `get_session()` just does `async with async_session_factory() as session: yield session`
### Fix 3: Cache site lookups in-memory (`dependencies.py`)
* Add a simple TTL-based in-memory cache (dict + timestamp) for site lookups by subdomain
* Cache for 5 minutes — no Redis needed for this, in-process memory is fastest
* Invalidate on site update (if applicable)
### Fix 4: Cache admin site ID at startup (`middleware/auth.py`)
* Resolve the admin site ID once during app lifespan startup and store it in a module-level variable
* `get_current_user` reads the cached ID instead of querying every time
### Fix 5: Proper pool warmup (`database/session.py`)
* Open `pool_size` concurrent connections during warmup, not just 1
* Use `asyncio.gather()` to warm them in parallel
