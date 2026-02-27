from fastapi import Depends, Request, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from database.session import get_session
from models.site import Site
from sqlmodel import select
import time
from typing import Dict, Tuple, Optional
from dataclasses import dataclass
import uuid


@dataclass
class SiteData:
    """Cached site data - detached from ORM session"""
    id: uuid.UUID
    subdomain: str
    custom_domain: Optional[str]
    name: str
    logo_url: Optional[str]
    theme_config: Dict
    owner_id: uuid.UUID
    is_active: bool


# Cache configuration
_SITE_CACHE: Dict[str, Tuple[SiteData, float]] = {}
_SITE_CACHE_TTL = 300  # 5 minutes


# ─────────────────────────────────────────────────────────────────
# Cache Utilities
# ─────────────────────────────────────────────────────────────────

def _get_cached_site(cache_key: str) -> Optional[SiteData]:
    """Return cached site data if still valid, else None."""
    entry = _SITE_CACHE.get(cache_key)
    if entry and (time.monotonic() - entry[1]) < _SITE_CACHE_TTL:
        return entry[0]
    return None


def _cache_site(cache_key: str, site: Site) -> SiteData:
    """Cache site as dataclass to avoid detached session issues."""
    site_data = SiteData(
        id=site.id,
        subdomain=site.subdomain,
        custom_domain=site.custom_domain,
        name=site.name,
        logo_url=site.logo_url,
        theme_config=site.theme_config or {},
        owner_id=site.owner_id,
        is_active=site.is_active
    )
    _SITE_CACHE[cache_key] = (site_data, time.monotonic())
    return site_data


def invalidate_site_cache(subdomain: str = None) -> None:
    """Call this when a site is updated."""
    if subdomain:
        _SITE_CACHE.pop(f"sub:{subdomain}", None)
    else:
        _SITE_CACHE.clear()


# ─────────────────────────────────────────────────────────────────
# Host Resolution
# ─────────────────────────────────────────────────────────────────

def _extract_subdomain(host: str) -> str:
    """Extract subdomain from host string."""
    if "localhost" in host or "127.0.0.1" in host:
        parts = host.split(".")
        return parts[0] if len(parts) > 1 else "localhost"
    return host.split(".")[0] if "." in host else host


# ─────────────────────────────────────────────────────────────────
# Site Lookup Strategies (in priority order)
# ─────────────────────────────────────────────────────────────────

async def _lookup_by_subdomain(subdomain: str, session: AsyncSession) -> Optional[Site]:
    """Query site by subdomain."""
    result = await session.exec(select(Site).where(Site.subdomain == subdomain))
    return result.first()


async def _lookup_by_custom_domain(host: str, session: AsyncSession) -> Optional[Site]:
    """Query site by custom domain."""
    result = await session.exec(select(Site).where(Site.custom_domain == host))
    return result.first()


async def _lookup_fallback_site(session: AsyncSession) -> Optional[Site]:
    """Get the first site as a fallback (dev/single-tenant mode)."""
    result = await session.exec(select(Site).order_by(Site.id))
    return result.first()


# ─────────────────────────────────────────────────────────────────
# Main Dependency
# ─────────────────────────────────────────────────────────────────

async def get_current_site(
    request: Request,
    session: AsyncSession = Depends(get_session)
) -> SiteData:
    """
    Resolve the current site from the request.
    
    Lookup order:
    1. Subdomain (e.g., tenant1.lms.com)
    2. Custom domain (e.g., academy.company.com)
    3. Fallback to first site (for dev/single-tenant)
    """
    # Extract host and subdomain
    host = request.headers.get("x-tenant-domain") or request.headers.get("host", "")
    host = host.split(":")[0]  # Remove port
    subdomain = _extract_subdomain(host)

    # 1. Try subdomain lookup
    cache_key = f"sub:{subdomain}"
    cached = _get_cached_site(cache_key)
    if cached:
        return cached

    site = await _lookup_by_subdomain(subdomain, session)
    if site:
        return _cache_site(cache_key, site)

    # 2. Try custom domain lookup
    cache_key = f"dom:{host}"
    cached = _get_cached_site(cache_key)
    if cached:
        return cached

    site = await _lookup_by_custom_domain(host, session)
    if site:
        return _cache_site(cache_key, site)

    # 3. Fallback to first site
    cache_key = "fallback"
    cached = _get_cached_site(cache_key)
    if cached:
        return cached

    site = await _lookup_fallback_site(session)
    if site:
        return _cache_site(cache_key, site)

    # No site found
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Site not found for host: {host}"
    )