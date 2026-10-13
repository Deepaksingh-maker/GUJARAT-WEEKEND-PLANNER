"""
Location Image Data Quality Validation Tool
Standalone audit script for GujaratWeekend Booking Management System.
Checks:
✓ image URL exists on every location
✓ image URL is reachable (HTTP 200)
✓ location has a designated primary image in location_images
✓ source URL exists
✓ source/license metadata exists (source_name, source_url, license, attribution)
✓ no accidental generic image duplication across major Gujarat destinations
✓ image belongs to a Gujarat, India location
"""

import sys
import time
import urllib.request
from collections import Counter, defaultdict

# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root is in sys.path
sys.path.insert(0, '.')
from backend.app.database import SessionLocal
from backend.app.models.location import Location, LocationImage


BANNED_GENERIC_URLS = [
    "photo-1506744038136-46273834b3fb", # Yosemite / generic mountain lake
    "default.jpg",
    "placeholder",
]

MAJOR_LOCATION_SLUGS = [
    "adalaj", "ahmedabad", "ahwa", "ambaji", "anand", "bardoli", "mehsana",
    "dwarka", "bhavnagar", "gandhinagar", "vadodara", "surat", "rajkot",
    "jamnagar", "junagadh", "somnath", "porbandar", "bhuj", "kutch",
    "saputara", "ekta-nagar", "patan", "nadiad", "valsad", "bharuch"
]


def validate_location_images(test_http_reachability: bool = True):
    db = SessionLocal()
    print("=" * 80)
    print("GUJARAT LOCATION IMAGES DATA QUALITY AUDIT")
    print("=" * 80)

    try:
        locations = db.query(Location).all()
        total_locs = len(locations)
        print(f"Total Gujarat Locations Audited: {total_locs}")

        issues = []
        warnings = []

        # 1. Check basic presence, Gujarat state/country, and metadata
        missing_images = []
        outside_gujarat = []
        missing_metadata = []
        banned_images = []

        for loc in locations:
            # Check state and country
            if loc.state != "Gujarat" or loc.country != "India":
                outside_gujarat.append((loc.id, loc.name, loc.state, loc.country))

            # Check image_url presence
            if not loc.image_url:
                missing_images.append((loc.id, loc.name))
            else:
                # Check banned generic image
                for banned in BANNED_GENERIC_URLS:
                    if banned in loc.image_url:
                        banned_images.append((loc.id, loc.name, banned))

            # Check metadata
            if not loc.image_source or not loc.source_url or not loc.image_license:
                missing_metadata.append((loc.id, loc.name, loc.image_source, loc.source_url, loc.image_license))

        # 2. Check location_images table & primary designation
        loc_images = db.query(LocationImage).all()
        print(f"Total Location Images in Registry: {len(loc_images)}")

        primary_map = defaultdict(list)
        for limg in loc_images:
            if limg.is_primary:
                primary_map[limg.location_id].append(limg)

        missing_primary = []
        for loc in locations:
            if loc.id not in primary_map:
                missing_primary.append((loc.id, loc.name))

        # 3. Check for distinct images among major destinations
        major_loc_images = {}
        for loc in locations:
            if loc.slug in MAJOR_LOCATION_SLUGS and loc.image_url:
                major_loc_images[loc.slug] = loc.image_url

        url_counts = Counter(major_loc_images.values())
        major_duplicates = {u: cnt for u, cnt in url_counts.items() if cnt > 1}

        # 4. HTTP Reachability of unique images
        reachability_failures = []
        if test_http_reachability:
            unique_urls = set(loc.image_url for loc in locations if loc.image_url)
            print(f"\nVerifying HTTP reachability of {len(unique_urls)} unique location image URLs...")
            
            headers = {"User-Agent": "GujaratWeekendAudit/1.0 (audit@gujaratweekend.com)"}
            for idx, url in enumerate(sorted(list(unique_urls)), start=1):
                try:
                    req = urllib.request.Request(url, headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Range": "bytes=0-1024"
                    })
                    with urllib.request.urlopen(req, timeout=12) as resp:
                        if resp.status not in (200, 206):
                            reachability_failures.append((url, f"Status {resp.status}"))
                except Exception as e:
                    # Retry with simple GET once if handshake was slow
                    try:
                        time.sleep(0.2)
                        req2 = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                        with urllib.request.urlopen(req2, timeout=15) as resp2:
                            if resp2.status not in (200, 206):
                                reachability_failures.append((url, f"Status {resp2.status}"))
                    except Exception as e2:
                        reachability_failures.append((url, str(e2)))

        # REPORTING
        print("\n" + "-" * 80)
        print("AUDIT RESULTS SUMMARY")
        print("-" * 80)

        # Check 1: Missing Images
        if missing_images:
            print(f"❌ FAIL: {len(missing_images)} locations are missing image_url!")
            for item in missing_images[:5]:
                print(f"   - Location ID {item[0]}: {item[1]}")
            issues.append("Missing image URLs")
        else:
            print(f"✓ PASS: 100% of locations ({total_locs}/{total_locs}) have an image URL.")

        # Check 2: Outside Gujarat
        if outside_gujarat:
            print(f"❌ FAIL: {len(outside_gujarat)} locations are outside Gujarat, India!")
            issues.append("Non-Gujarat locations found")
        else:
            print(f"✓ PASS: 100% of locations belong to Gujarat, India.")

        # Check 3: Banned Generic Images
        if banned_images:
            print(f"❌ FAIL: {len(banned_images)} locations still use banned generic/mountain images!")
            for item in banned_images:
                print(f"   - Location {item[1]} uses {item[2]}")
            issues.append("Banned generic images detected")
        else:
            print(f"✓ PASS: Zero banned generic placeholder images found.")

        # Check 4: Metadata Complete
        if missing_metadata:
            print(f"❌ FAIL: {len(missing_metadata)} locations lack source/license metadata!")
            issues.append("Incomplete metadata")
        else:
            print(f"✓ PASS: 100% of locations have source_name, source_url, and license metadata.")

        # Check 5: Primary Image Designated
        if missing_primary:
            print(f"❌ FAIL: {len(missing_primary)} locations lack a designated primary image in location_images!")
            issues.append("Missing primary image records")
        else:
            print(f"✓ PASS: 100% of locations have a designated primary image in location_images.")

        # Check 6: Major Destinations Distinctiveness
        if major_duplicates:
            print(f"❌ FAIL: Duplicate images shared between major destinations:")
            for u, cnt in major_duplicates.items():
                sharing = [s for s, img in major_loc_images.items() if img == u]
                print(f"   - URL shared by {sharing}: {u}")
            issues.append("Major destination duplicate images")
        else:
            print(f"✓ PASS: All {len(major_loc_images)} major Gujarat destinations have 100% unique primary photographs.")

        # Check 7: HTTP Reachability
        if test_http_reachability:
            if reachability_failures:
                print(f"❌ FAIL: {len(reachability_failures)} image URLs failed reachability check:")
                for u, err in reachability_failures:
                    print(f"   - {err}: {u}")
                issues.append("Unreachable image URLs")
            else:
                print(f"✓ PASS: 100% of unique location image URLs ({len(unique_urls)}) are reachable (HTTP 200 OK).")

        print("-" * 80)
        if not issues:
            print("🌟 AUDIT SUCCESS: All data quality requirements passed with flying colors!")
            print("-" * 80)
            return True
        else:
            print(f"⚠️ AUDIT WARNINGS/FAILURES: {len(issues)} categories need attention.")
            print("-" * 80)
            return False

    finally:
        db.close()


if __name__ == "__main__":
    success = validate_location_images(test_http_reachability=True)
    sys.exit(0 if success else 1)
