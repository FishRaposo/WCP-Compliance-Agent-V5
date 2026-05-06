from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from wcp_data.main import create_app


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest.fixture
def mock_session():
    session = AsyncMock(spec=["execute", "commit", "close", "__aenter__", "__aexit__"])
    session.commit = AsyncMock()
    session.close = AsyncMock()
    session.__aenter__ = AsyncMock(return_value=session)
    session.__aexit__ = AsyncMock(return_value=False)
    return session
