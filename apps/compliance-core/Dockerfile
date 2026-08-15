FROM python:3.12-slim

WORKDIR /app

ENV POETRY_VIRTUALENVS_CREATE=false \
    PYTHONPATH=/app/src

RUN pip install --no-cache-dir poetry==1.8.5

COPY pyproject.toml poetry.lock ./
RUN poetry install --only main --no-interaction --no-root

COPY src/ ./src/

EXPOSE 8000

CMD ["uvicorn", "wcp_compliance.main:app", "--host", "0.0.0.0", "--port", "8000"]
