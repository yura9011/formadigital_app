"""
Instagram Enricher Module
Uses Instaloader to fetch public profile data from Instagram.
"""

import instaloader
from datetime import datetime
from typing import Optional, Dict, Any
import logging
import time
from functools import wraps

logger = logging.getLogger(__name__)

# Rate limiting: track last request time
_last_request_time = 0
_min_request_interval = 6  # seconds between requests (10 per minute)


def rate_limit(func):
    """Decorator to enforce rate limiting"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        global _last_request_time
        current_time = time.time()
        time_since_last = current_time - _last_request_time
        
        if time_since_last < _min_request_interval:
            sleep_time = _min_request_interval - time_since_last
            logger.info(f"Rate limiting: sleeping {sleep_time:.1f}s")
            time.sleep(sleep_time)
        
        _last_request_time = time.time()
        return func(*args, **kwargs)
    return wrapper


class InstagramEnricher:
    """Fetches public Instagram profile data using Instaloader"""
    
    def __init__(self):
        self.loader = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            quiet=True,
        )

    @rate_limit
    def get_profile_data(self, handle: str) -> Dict[str, Any]:
        """
        Fetch public profile data for an Instagram handle.
        
        Args:
            handle: Instagram username (without @)
            
        Returns:
            Dict with profile data or error information
        """
        # Clean handle
        handle = handle.strip().lstrip('@')
        
        if not handle:
            return {
                'success': False,
                'error': 'Empty handle provided',
                'error_code': 'INVALID_HANDLE'
            }
        
        try:
            logger.info(f"Fetching Instagram profile: {handle}")
            profile = instaloader.Profile.from_username(self.loader.context, handle)
            
            # Get last post date if available
            last_post_date = None
            try:
                posts = profile.get_posts()
                first_post = next(iter(posts), None)
                if first_post:
                    last_post_date = first_post.date_utc.isoformat()
            except Exception as e:
                logger.warning(f"Could not get posts for {handle}: {e}")
            
            return {
                'success': True,
                'data': {
                    'handle': handle,
                    'fullName': profile.full_name,
                    'bio': profile.biography,
                    'followers': profile.followers,
                    'following': profile.followees,
                    'posts': profile.mediacount,
                    'isPrivate': profile.is_private,
                    'isVerified': profile.is_verified,
                    'profilePicUrl': profile.profile_pic_url,
                    'externalUrl': profile.external_url,
                    'lastPostDate': last_post_date,
                    'fetchedAt': datetime.utcnow().isoformat(),
                }
            }
            
        except instaloader.exceptions.ProfileNotExistsException:
            logger.warning(f"Profile not found: {handle}")
            return {
                'success': False,
                'error': f'Profile @{handle} not found',
                'error_code': 'PROFILE_NOT_FOUND'
            }
            
        except instaloader.exceptions.ConnectionException as e:
            logger.error(f"Connection error for {handle}: {e}")
            return {
                'success': False,
                'error': 'Connection error - Instagram may be rate limiting',
                'error_code': 'CONNECTION_ERROR'
            }
            
        except instaloader.exceptions.LoginRequiredException:
            logger.warning(f"Login required for {handle} - profile may be private")
            return {
                'success': False,
                'error': f'Profile @{handle} is private or requires login',
                'error_code': 'PRIVATE_PROFILE'
            }
            
        except Exception as e:
            logger.error(f"Unexpected error fetching {handle}: {e}")
            return {
                'success': False,
                'error': str(e),
                'error_code': 'UNKNOWN_ERROR'
            }


# Singleton instance
_enricher: Optional[InstagramEnricher] = None


def get_enricher() -> InstagramEnricher:
    """Get or create the singleton enricher instance"""
    global _enricher
    if _enricher is None:
        _enricher = InstagramEnricher()
    return _enricher


def enrich_instagram(handle: str) -> Dict[str, Any]:
    """
    Convenience function to enrich Instagram data.
    
    Args:
        handle: Instagram username
        
    Returns:
        Dict with profile data or error
    """
    return get_enricher().get_profile_data(handle)
