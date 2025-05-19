from fastapi import FastAPI, Query, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy
from dotenv import load_dotenv
import os

load_dotenv(".env.local")

app = FastAPI()
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or credentials.credentials != os.getenv("SERVICE_PASS"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials

@app.get("/crawl/")
async def crawl(
    token: str = Depends(verify_token),
    url: str = Query("https://docs.crawl4ai.com/core/deep-crawling/", description="The URL to crawl"),
    max_depth: int = Query(2, description="The maximum depth for crawling")
):
    # Configure a 2-level deep crawl
    config = CrawlerRunConfig(
        deep_crawl_strategy=BFSDeepCrawlStrategy(
            max_depth=max_depth, 
            include_external=False
        ) if max_depth > 0 else None,
        verbose=True
    )

    async with AsyncWebCrawler() as crawler:
        results = await crawler.arun(url, config=config)
        if len(results) > 0:
            return [{"url": result.url, "markdown": result.markdown} for result in results]
        else:
            return {
                "url": results.url,
                "markdown": results.markdown,
            }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5002)
