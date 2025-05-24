from fastapi import FastAPI, Query, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from docling.document_converter import DocumentConverter
import httpx
from io import BytesIO
from docling_core.types.io import DocumentStream
from dotenv import load_dotenv
import os

load_dotenv(".env.local")

app = FastAPI()
converter = DocumentConverter()
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or credentials.credentials != os.getenv("SERVICE_PASS"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials

@app.get("/convert/")
async def convert_document(
    token: str = Depends(verify_token),
    source: str = Query("https://arxiv.org/pdf/2408.09869", description="The URL of the document to convert")
):
    async with httpx.AsyncClient() as client:
        response = await client.get(source)
        response.raise_for_status()

        # Create document stream
        stream = BytesIO(response.content)
        doc_stream = DocumentStream(name=str(source.split("/")[-1]), stream=stream)
        
        result = converter.convert(doc_stream)
        return result.document.export_to_markdown()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
