FROM python:3.12-slim

WORKDIR /app

RUN pip install poetry==1.8.0

COPY pyproject.toml poetry.lock ./
RUN poetry install --no-dev --no-interaction

COPY src/ ./src/

EXPOSE 8001

CMD ["poetry", "run", "uvicorn", "wcp_data.main:app", "--host", "0.0.0.0", "--port", "8001"]
