FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install python and OpenCV dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip
RUN python3 -m pip install --upgrade pip

# Copy the unified requirements file
COPY requirements.txt .

# Install Python dependencies (this will install Torch, TF, FastAPI, OpenCV-headless)
RUN pip3 install --no-cache-dir -r requirements.txt

# InsightFace specifically for Linux
RUN pip3 install --no-cache-dir insightface==0.7.3

# Copy the rest of the application
COPY . .

# Expose the unified API port
EXPOSE 8000

# Run the unified server
CMD ["uvicorn", "unified_api:app", "--host", "0.0.0.0", "--port", "8000"]
