from __future__ import annotations

import ipaddress
import re
import socket
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, urlopen

MAX_HTML_BYTES = 512_000
REQUEST_TIMEOUT_SECONDS = 4


def sanitize_text(value: str | None, *, max_length: int = 300) -> str | None:
    if not value:
        return None
    cleaned = re.sub(r'[\x00-\x1f\x7f]+', ' ', value)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    if not cleaned:
        return None
    return cleaned[:max_length]


def sanitize_url(value: str | None) -> str | None:
    if not value:
        return None
    parsed = urlparse(value.strip())
    if parsed.scheme not in {'http', 'https'} or not parsed.netloc:
        return None
    return sanitize_text(value.strip(), max_length=1000)


class MetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.meta: dict[str, str] = {}
        self.title_text = ''
        self._inside_title = False
        self.snippets: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {k.lower(): (v or '') for k, v in attrs}
        if tag.lower() == 'meta':
            key = (attr_map.get('property') or attr_map.get('name') or '').lower()
            content = attr_map.get('content', '')
            if key and content and key not in self.meta:
                self.meta[key] = content
        elif tag.lower() == 'title':
            self._inside_title = True

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == 'title':
            self._inside_title = False

    def handle_data(self, data: str) -> None:
        stripped = data.strip()
        if self._inside_title and stripped:
            self.title_text += f' {stripped}'
        elif stripped and len(self.snippets) < 30:
            self.snippets.append(stripped)


def _is_safe_host(hostname: str) -> bool:
    lowered = hostname.lower()
    if lowered in {'localhost', '127.0.0.1', '::1'}:
        return False
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False

    for info in infos:
        ip_raw = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_raw)
        except ValueError:
            continue
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
            return False
    return True


def _extract_price(parser: MetadataParser) -> float | None:
    candidate_keys = [
        'product:price:amount',
        'og:price:amount',
        'twitter:data1',
        'price',
    ]
    for key in candidate_keys:
        price = _parse_price(parser.meta.get(key))
        if price:
            return price

    joined_snippets = ' '.join(parser.snippets)
    return _parse_price(joined_snippets)


def _parse_price(value: str | None) -> float | None:
    text = sanitize_text(value, max_length=5000)
    if not text:
        return None
    match = re.search(r'(?:[$€£]|USD\s*)?(\d{1,3}(?:[,.]\d{3})*(?:[,.]\d{2})|\d+(?:[,.]\d{2}))', text)
    if not match:
        return None
    num = match.group(1).replace(',', '')
    try:
        amount = float(num)
    except ValueError:
        return None
    if amount <= 0:
        return None
    return round(amount, 2)


def _fallback_title(url: str) -> str:
    parsed = urlparse(url)
    host = parsed.netloc.replace('www.', '')
    return f'Item from {host}' if host else 'Wishlist item'


def fetch_url_metadata(url: str) -> dict[str, Any]:
    safe_url = sanitize_url(url)
    if not safe_url:
        return {
            'ok': False,
            'title': None,
            'image_url': None,
            'target_price': None,
            'product_url': None,
            'fallback_title': 'Wishlist item',
            'message': 'URL must be a valid http(s) address.',
        }

    hostname = (urlparse(safe_url).hostname or '').strip()
    if not hostname or not _is_safe_host(hostname):
        return {
            'ok': False,
            'title': None,
            'image_url': None,
            'target_price': None,
            'product_url': safe_url,
            'fallback_title': _fallback_title(safe_url),
            'message': 'Host is not reachable or not allowed.',
        }

    req = Request(
        safe_url,
        headers={
            'User-Agent': 'WishlistMetadataBot/1.0 (+https://example.local)',
            'Accept': 'text/html,application/xhtml+xml',
        },
    )

    try:
        with urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            content_type = response.headers.get('Content-Type', '').lower()
            if 'text/html' not in content_type and 'application/xhtml+xml' not in content_type:
                raise ValueError('URL did not return an HTML document.')
            raw = response.read(MAX_HTML_BYTES)
            html = raw.decode('utf-8', errors='ignore')
    except Exception:
        return {
            'ok': False,
            'title': None,
            'image_url': None,
            'target_price': None,
            'product_url': safe_url,
            'fallback_title': _fallback_title(safe_url),
            'message': 'Could not fetch metadata from this URL. You can still fill fields manually.',
        }

    parser = MetadataParser()
    parser.feed(html)

    title = sanitize_text(parser.meta.get('og:title') or parser.title_text, max_length=200)
    image_url = sanitize_url(parser.meta.get('og:image'))
    target_price = _extract_price(parser)

    return {
        'ok': bool(title or image_url or target_price),
        'title': title,
        'image_url': image_url,
        'target_price': target_price,
        'product_url': safe_url,
        'fallback_title': _fallback_title(safe_url),
        'message': 'Metadata parsed successfully.' if (title or image_url or target_price) else 'Metadata was unavailable. You can fill details manually.',
    }
