FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY requirements.txt main.py ./
RUN pip install --no-cache-dir -r requirements.txt
RUN adduser --disabled-password --gecos '' voiceuser && chown -R voiceuser:voiceuser /app
USER voiceuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s CMD curl -f http://localhost:8000/health || exit 1
CMD ["python", "main.py"]
