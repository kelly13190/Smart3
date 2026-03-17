FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# ติดตั้ง numpy 1.24.4 ก่อน และ pin ไว้
RUN pip install --no-cache-dir "numpy==1.24.4"

# ติดตั้ง insightface แบบไม่ build จาก source
RUN pip install --no-cache-dir --only-binary=:all: insightface==0.7.3 || \
    pip install --no-cache-dir \
    "numpy==1.24.4" \
    "insightface==0.7.3" \
    --no-build-isolation

RUN pip install --no-cache-dir -r requirements.txt --no-deps

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]