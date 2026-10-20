import logging

from Frontier_platform.platform.backend.app import jobs_registry  # noqa: F401
from Frontier_platform.platform.backend.app import models_registry  # noqa: F401
from Frontier_platform.platform.backend.app.core.jobs import mark_worker_mode, proc_app


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    mark_worker_mode()
    proc_app.run_worker(wait=True, install_signal_handlers=True)


if __name__ == "__main__":
    main()
