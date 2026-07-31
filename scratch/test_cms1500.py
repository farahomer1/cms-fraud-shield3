import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path("/Users/farahomer/antigravity_projects/cms-pivot/cms-pivot/backend")))

from services.normalization_service import parse_cms1500

async def main():
    try:
        res = await parse_cms1500()
        print("RESULT:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
