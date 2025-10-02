from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .settings import get_settings
from .api import matches as matches_router
from .api import stats as stats_router
from .api import ws as ws_router
from .api import clubs as clubs_router
from .api import teams as teams_router
from .api import players as players_router
from .api import dev as dev_router


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(title="Football Voice Backend", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    app.include_router(clubs_router.router, prefix="/api", tags=["clubs"])
    app.include_router(teams_router.router, prefix="/api", tags=["teams"])
    app.include_router(players_router.router, prefix="/api", tags=["players"])
    app.include_router(matches_router.router, prefix="/api", tags=["matches"])
    app.include_router(stats_router.router, prefix="/api", tags=["stats"])
    app.include_router(ws_router.router, tags=["ws"])
    app.include_router(dev_router.router, prefix="/api", tags=["dev"])

    # Expose settings for debugging if needed (not an endpoint)
    app.state.settings = settings

    return app


app = create_app()


