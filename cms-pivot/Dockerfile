FROM python:3.13-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY data/ ./data/

# Run as a non-root user for security (DS-0002).
RUN useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser

WORKDIR /app/backend

EXPOSE 8080

# Basic container health check (DS-0026).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0) if urllib.request.urlopen('http://127.0.0.1:8080/api/health').status == 200 else sys.exit(1)"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
