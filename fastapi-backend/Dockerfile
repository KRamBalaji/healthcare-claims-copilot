# fastapi-backend/Dockerfile
FROM python:3.10-slim

WORKDIR /app

# System deps (if you ever need them; slim base is enough for scikit-learn)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY app ./app
COPY data ./data
COPY models ./models
COPY policies ./policies

# Env
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]