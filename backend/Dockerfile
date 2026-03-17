FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# ติดตั้ง build tools + numpy ก่อน
RUN pip install --no-cache-dir "numpy==1.24.4" "Cython" "setuptools" "wheel"

# ติดตั้ง insightface พร้อม build tools
RUN pip install --no-cache-dir "insightface==0.7.3" --no-build-isolation

# ติดตั้ง dependencies ที่เหลือ
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]