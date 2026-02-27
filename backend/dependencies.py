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


# In-memory site cache: key -> (site_data, timestamp)
_site_cache: Dict[str, Tuple[SiteData, float]] = {}
_SITE_CACHE_TTL = 300  # 5 minutes


def _get_cached_site(cache_key: str) -> Optional[SiteData]:
    """Return cached site data if still valid, else None."""
    entry = _site_cache.get(cache_key)
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
    _site_cache[cache_key] = (site_data, time.monotonic())
    return site_data


def invalidate_site_cache(subdomain: str = None) -> None:
    """Call this when a site is updated. Pass subdomain to clear one, or None to clear all."""
    if subdomain:
        _site_cache.pop(f"sub:{subdomain}", None)
    else:
        _site_cache.clear()


def _extract_subdomain(host: str) -> str:
    """Extract subdomain from host string."""
    if "localhost" in host or "127.0.0.1" in host:
        parts = host.split(".")
        return parts[0] if len(parts) > 1 else "localhost"
    else:
        parts = host.split(".")
        return parts[0] if len(parts) >= 2 else host


async def get_current_site(
    request: Request,
    session: AsyncSession = Depends(get_session)
) -> SiteData:
    # 1. Resolve host
    host = request.headers.get("x-tenant-domain") or request.headers.get("host", "")
    host = host.split(":")[0]
    subdomain = _extract_subdomain(host)

    # 2. Check in-memory cache first
    cached = _get_cached_site(f"sub:{subdomain}")
    if cached:
        return cached

    # 3. Query DB by subdomain
    query = select(Site).where(Site.subdomain == subdomain)
    result = await session.exec(query)
    site = result.first()
    
    if not site:
        # Fallback: custom domain
        cached_custom = _get_cached_site(f"dom:{host}")
        if cached_custom:
            return cached_custom
        query_custom = select(Site).where(Site.custom_domain == host)
        result_custom = await session.exec(query_custom)
        site = result_custom.first()
        if site:
            return _cache_site(f"dom:{host}", site)
        
    if not site:
        # Last fallback: first site
        cached_fallback = _get_cached_site("fallback")
        if cached_fallback:
            return cached_fallback
        query_fallback = select(Site).order_by(Site.id)
        result_fallback = await session.exec(query_fallback)
        site = result_fallback.first()
        if site:
            return _cache_site("fallback", site)
        
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site not found for host: {host}"
        )

    return _cache_site(f"sub:{subdomain}", site)